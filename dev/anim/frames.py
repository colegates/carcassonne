#!/usr/bin/env python3
"""Turn a generated chroma-key video of one miniature into a looping frame strip.

The video starts from the sprite itself (prep.py puts it on a flat key colour), so its
first frame lines up with the still sprite: every frame is mapped into the still's pixel
space, the best seamless loop is found, and N evenly spaced frames of it are written side
by side as one WebP strip, with the numbers the renderer needs.

Usage:
  python3 dev/anim/frames.py ID VIDEO [--mode walk|idle] [--n 12] [--key green|magenta]
                             [--min 0.7] [--max 2.0] [--height 360]

Writes public/assets/minis/anim/<ID>.webp and dev/anim/meta/<ID>.json:
  { file, n, fw, fh, foot: [x, y], scale, period, mode }
  frame i occupies x in [i*fw, (i+1)*fw); `scale` is still-sprite px per strip px, so a
  frame drawn at (fw*scale, fh*scale) still-sprite px with `foot` on the ground point
  matches the still exactly. `period` is the loop length in seconds as filmed.
"""
import argparse
import glob
import json
import os
import shutil
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SPRITES = os.path.join(ROOT, 'public', 'assets', 'minis', 'sprites')
MANIFEST = os.path.join(ROOT, 'public', 'assets', 'minis', 'manifest.json')
OUT = os.path.join(ROOT, 'public', 'assets', 'minis', 'anim')
META = os.path.join(os.path.dirname(__file__), 'meta')


def key_alpha(rgb, key):
    """Soft matte and spill removal for a flat green or magenta backdrop."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    if key == 'green':
        k = g - np.maximum(r, b)          # how much greener than the figure could be
    else:
        k = np.minimum(r, b) - g          # magenta: red and blue over green
    a = 1.0 - np.clip((k - 28.0) / 70.0, 0.0, 1.0)
    out = rgb.copy()
    if key == 'green':
        out[..., 1] = np.minimum(g, np.maximum(r, b) + 6)
    else:
        lim = g + 6
        out[..., 0] = np.minimum(r, np.maximum(lim, r - np.maximum(k, 0)))
        out[..., 2] = np.minimum(b, np.maximum(lim, b - np.maximum(k, 0)))
    # drop specks: anything faint is background
    a[a < 0.08] = 0
    return out, a


def bbox(a, t=0.5):
    ys, xs = np.nonzero(a > t)
    if not len(ys):
        return None
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('id')
    ap.add_argument('video')
    ap.add_argument('--mode', default='walk', choices=['walk', 'idle'])
    ap.add_argument('--n', type=int, default=12)
    ap.add_argument('--key', default='green', choices=['green', 'magenta'])
    ap.add_argument('--min', type=float, default=0.7, help='shortest loop, s')
    ap.add_argument('--max', type=float, default=2.0, help='longest loop, s')
    ap.add_argument('--height', type=int, default=360, help='cap on strip frame height, px')
    ap.add_argument('--start-max', type=float, default=1.2, help='latest loop start, s')
    ap.add_argument('--start-min', type=float, default=0.0, help='earliest loop start, s (skip a turn at the start)')
    ap.add_argument('--quality', type=int, default=80, help='WebP quality')
    ap.add_argument('--out-id', default=None, help='write anim/<out-id>.webp and meta/<out-id>.json (still id still sets scale and foot)')
    args = ap.parse_args()

    man = json.load(open(MANIFEST))['sprites']
    info = man[args.id]
    still = np.asarray(Image.open(os.path.join(SPRITES, os.path.basename(info['file']))).convert('RGBA')).astype(np.float32)
    sb = bbox(still[..., 3] / 255.0)

    tmp = tempfile.mkdtemp()
    try:
        fps = 24.0
        probe = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate',
                                '-of', 'csv=p=0', args.video], capture_output=True, text=True).stdout.strip()
        if '/' in probe:
            n_, d_ = probe.split('/')
            fps = float(n_) / float(d_) if float(d_) else fps
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', args.video, os.path.join(tmp, 'f%04d.png')], check=True)
        files = sorted(glob.glob(os.path.join(tmp, 'f*.png')))
        frames = []
        for f in files:
            rgb = np.asarray(Image.open(f).convert('RGB')).astype(np.float32)
            c, a = key_alpha(rgb, args.key)
            frames.append((c, a))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    # map video px -> still px using the first frame (it is the still, resampled)
    fb = bbox(frames[0][1])
    sx = (sb[2] - sb[0]) / (fb[2] - fb[0])
    sy = (sb[3] - sb[1]) / (fb[3] - fb[1])

    # per-frame stabilisation, in video px
    def anchors(a):
        b = bbox(a)
        if b is None:
            return None
        x0, y0, x1, y1 = b
        top = a[y0:y0 + max(1, int((y1 - y0) * 0.55))]
        cols = top.sum(0)
        cx = (cols * np.arange(len(cols))).sum() / max(cols.sum(), 1e-6)
        return cx, y1
    a0 = anchors(frames[0][1])
    offs = []
    for c, a in frames:
        an = anchors(a)
        if an is None or args.mode == 'idle':
            offs.append((0.0, 0.0))
        else:
            offs.append((a0[0] - an[0], a0[1] - an[1]))
    if args.mode == 'idle':
        # a static camera: only remove slow drift of the whole figure, measured on the feet line
        pass

    # best loop: compare small, stabilised copies
    def small(i):
        c, a = frames[i]
        dx, dy = offs[i]
        im = Image.fromarray(np.dstack([c * a[..., None], a * 255]).clip(0, 255).astype(np.uint8), 'RGBA')
        im = im.transform(im.size, Image.AFFINE, (1, 0, -dx, 0, 1, -dy), resample=Image.BILINEAR)
        return np.asarray(im.resize((im.width // 8, im.height // 8), Image.BILINEAR)).astype(np.float32)
    smalls = [small(i) for i in range(len(frames))]
    best = None
    lo, hi = int(round(args.min * fps)), int(round(args.max * fps))
    for s in range(int(round(args.start_min * fps)), min(len(frames) - lo, int(args.start_max * fps) + 1)):
        for p in range(lo, min(hi, len(frames) - 1 - s) + 1):
            d = np.abs(smalls[s] - smalls[s + p]).mean()
            # a frame either side must match too, so the motion carries through the seam
            if s + p + 1 < len(frames):
                d += 0.5 * np.abs(smalls[s + 1] - smalls[s + p + 1]).mean()
            if best is None or d < best[0]:
                best = (d, s, p)
    d, s, p = best
    print(f'{args.id}: loop from frame {s}, {p} frames ({p / fps:.2f} s), seam diff {d:.2f}')

    picks = [s + round(i * p / args.n) for i in range(args.n)]
    # canvas in still px: union of every picked frame's footprint
    rgba = []
    for i in picks:
        c, a = frames[i]
        dx, dy = offs[i]
        im = Image.fromarray(np.dstack([c, a * 255]).clip(0, 255).astype(np.uint8), 'RGBA')
        # video px -> still px: x' = (x + dx - fb0) * sx + sb0
        W = int(round(im.width * sx)) + 2
        H = int(round(im.height * sy)) + 2
        ox = sb[0] - (fb[0] - dx) * sx
        oy = sb[1] - (fb[1] - dy) * sy
        im = im.resize((max(1, W), max(1, H)), Image.LANCZOS)
        rgba.append((im, ox, oy))
    boxes = []
    for im, ox, oy in rgba:
        b = bbox(np.asarray(im)[..., 3] / 255.0, 0.05)
        boxes.append((b[0] + ox, b[1] + oy, b[2] + ox, b[3] + oy))
    X0 = int(np.floor(min(b[0] for b in boxes))) - 2
    Y0 = int(np.floor(min(b[1] for b in boxes))) - 2
    X1 = int(np.ceil(max(b[2] for b in boxes))) + 2
    Y1 = int(np.ceil(max(b[3] for b in boxes))) + 2
    cw, ch = X1 - X0, Y1 - Y0
    k = min(1.0, args.height / ch)
    fw, fh = int(round(cw * k)), int(round(ch * k))
    strip = Image.new('RGBA', (fw * args.n, fh), (0, 0, 0, 0))
    for j, (im, ox, oy) in enumerate(rgba):
        canvas = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
        canvas.alpha_composite(im, (int(round(ox - X0)), int(round(oy - Y0))))
        strip.alpha_composite(canvas.resize((fw, fh), Image.LANCZOS), (j * fw, 0))
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(META, exist_ok=True)
    oid = args.out_id or args.id
    path = os.path.join(OUT, oid + '.webp')
    strip.save(path, 'WEBP', quality=args.quality, method=6)
    meta = {
        'file': 'anim/' + oid + '.webp', 'n': args.n, 'fw': fw, 'fh': fh,
        'foot': [round((info['foot'][0] - X0) * k, 1), round((info['foot'][1] - Y0) * k, 1)],
        'scale': round(1 / k, 4), 'period': round(p / fps, 3), 'mode': args.mode,
    }
    json.dump(meta, open(os.path.join(META, oid + '.json'), 'w'), indent=1)
    print(json.dumps(meta), f'{os.path.getsize(path) // 1024} KB')


if __name__ == '__main__':
    sys.exit(main())
