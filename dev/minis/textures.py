#!/usr/bin/env python3
"""Cut ground-texture sheets into seamless, tileable WebP swatches.

Usage:
  python3 dev/minis/textures.py            # every texture entry in sheets.json
  python3 dev/minis/textures.py NAME ...   # only the named sheets.json entries

For each swatch:
  * find the grey gutters (rows/columns with almost no variation) and cut the
    swatch between them, falling back to the even grid;
  * crop 3% off every edge to drop seams, borders and gutter bleed;
  * make it tile with image quilting: the last `OVL` of each axis is laid over
    the start, and the two are joined along a minimum-error cut that starts and
    ends at the same offset (so the other axis still wraps), feathered over a
    few pixels. Unlike a cross-fade this never doubles stones or tiles;
  * resize to 1024 (WebP q80) and 512 (<id>@512.webp).
Metadata goes to meta/<name>.json for build.py.
"""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from common import META, OUT, RAW, load_prompts, load_sheets, parse_grid, write_json_atomic  # noqa: E402

CROP = 0.03
OVL = 0.14
FEATHER = 6
SIZE = 1024
SMALL = 512
QUALITY = 80


def find_bands(prof, n, length):
    """Split [0, length) into n segments at low-variation gutter runs."""
    thr = 0.2 * np.median(prof)
    low = prof < thr
    runs, i = [], 0
    while i < length:
        if low[i]:
            j = i
            while j < length and low[j]:
                j += 1
            runs.append((i, j))
            i = j
        else:
            i += 1
    # keep inner gutters near the expected cut positions
    cuts = []
    for k in range(1, n):
        exp = k * length / n
        best = None
        for a, b in runs:
            mid = (a + b) / 2
            if abs(mid - exp) < length / n * 0.25 and (best is None or abs(mid - exp) < abs((best[0] + best[1]) / 2 - exp)):
                best = (a, b)
        cuts.append(best or (int(exp) - 1, int(exp) + 1))
    # outer border gutters, if any
    start = runs[0][1] if runs and runs[0][0] == 0 and runs[0][1] < length / n * 0.2 else 0
    end = runs[-1][0] if runs and runs[-1][1] == length and runs[-1][0] > length - length / n * 0.2 else length
    segs, prev = [], start
    for a, b in cuts:
        segs.append((prev, a))
        prev = b
    segs.append((prev, end))
    return segs


def _trace(back, s):
    h = back.shape[0]
    path = np.zeros(h, int)
    x = s
    for y in range(h - 1, -1, -1):
        path[y] = x
        x = x + back[y, x]
    return path


def min_cut(cost):
    h, w = cost.shape
    best = None
    endc = cost[0] + cost[-1]
    for s in np.argsort(endc[2:-2])[:6] + 2:
        acc = np.full(w, np.inf)
        acc[s] = cost[0, s]
        back = np.zeros((h, w), np.int8)
        for y in range(1, h):
            left = np.concatenate([[np.inf], acc[:-1]])
            right = np.concatenate([acc[1:], [np.inf]])
            stack = np.stack([left, acc, right])
            arg = np.argmin(stack, 0)
            acc = cost[y] + stack[arg, np.arange(w)]
            back[y] = arg - 1          # -1: came from x-1, 0: same, +1: from x+1
        if np.isfinite(acc[s]) and (best is None or acc[s] < best[0]):
            best = (acc[s], _trace(back, s))
    return best[1]


def wrap_x(img):
    """Make img (h, w, 3 float) wrap horizontally. Output width w - ovl."""
    h, w, _ = img.shape
    ovl = int(w * OVL)
    a = img[:, w - ovl:]   # end strip: becomes the left part of the overlap
    b = img[:, :ovl]       # start strip: continues to the right
    cost = ((a - b) ** 2).sum(-1)
    # smooth cost a little so the cut follows broad gaps, not single pixels
    k = np.ones(5) / 5
    cost = np.apply_along_axis(lambda r: np.convolve(r, k, 'same'), 1, cost)
    # keep the cut away from the strip ends
    cost[:, :FEATHER + 2] = 1e9
    cost[:, -FEATHER - 2:] = 1e9
    path = min_cut(cost)
    xs = np.arange(ovl)[None, :]
    d = xs - path[:, None]                     # <0: use a, >0: use b
    m = np.clip(0.5 + d / (2.0 * FEATHER), 0, 1)[..., None]
    blend = a * (1 - m) + b * m
    out = np.concatenate([blend, img[:, ovl:w - ovl]], 1)
    return out


def make_tileable(img):
    img = wrap_x(img)
    img = wrap_x(img.transpose(1, 0, 2)).transpose(1, 0, 2)
    return img


def process_entry(entry, prompts):
    sheet = entry['sheet']
    p = prompts[sheet]
    rows, cols = parse_grid(entry.get('grid', p['grid']))
    ids = entry.get('items') or [n for n, _ in p['items']]
    skip = set(entry.get('skip', []))
    im = np.asarray(Image.open(os.path.join(RAW, entry['raw'])).convert('RGB')).astype(np.float32)
    H, W, _ = im.shape
    lum = im.mean(-1)
    ysegs = find_bands(lum.std(1), rows, H)
    xsegs = find_bands(lum.std(0), cols, W)
    meta = {}
    os.makedirs(os.path.join(OUT, 'textures'), exist_ok=True)
    for k, tid in enumerate(ids):
        if tid is None or tid in skip:
            continue
        r, c = divmod(k, cols)
        (y0, y1), (x0, x1) = ysegs[r], xsegs[c]
        sw = im[y0:y1, x0:x1]
        crop = entry.get('crops', {}).get(tid)
        if crop:  # [x0, y0, x1, y1] as fractions of the swatch, to drop a non-uniform border
            h, w = sw.shape[:2]
            sw = sw[int(crop[1] * h):int(crop[3] * h), int(crop[0] * w):int(crop[2] * w)]
        h, w = sw.shape[:2]
        cy, cx = int(h * CROP), int(w * CROP)
        sw = sw[cy:h - cy, cx:w - cx]
        n = min(sw.shape[:2])
        sw = sw[:n, :n]
        t = make_tileable(sw)
        tone = entry.get('tone', {}).get(tid)
        if tone:  # shift the colour to a target mean (keeps a re-roll in the palette of the set)
            m = t.reshape(-1, 3).mean(0)
            t = t - m + np.array(tone['mean'], np.float32)
            if 'sat' in tone:
                g = t.mean(-1, keepdims=True)
                t = g + (t - g) * tone['sat']
        size = entry.get('size', {}).get(tid, SIZE)
        t8 = Image.fromarray(np.clip(np.round(t), 0, 255).astype(np.uint8), 'RGB')
        big = t8.resize((size, size), Image.LANCZOS)
        small = t8.resize((SMALL, SMALL), Image.LANCZOS)
        big.save(os.path.join(OUT, 'textures', f'{tid}.webp'), 'WEBP', quality=QUALITY, method=6)
        small.save(os.path.join(OUT, 'textures', f'{tid}@512.webp'), 'WEBP', quality=QUALITY, method=6)
        meta[tid] = {'file': f'textures/{tid}.webp', 'small': f'textures/{tid}@512.webp', 'size': size}
        print(f'  {tid:16s} swatch {x1 - x0}x{y1 - y0} -> tile {t.shape[1]}x{t.shape[0]}')
    return meta


def main(argv):
    prompts = load_prompts()
    entries = [e for e in load_sheets() if prompts[e['sheet']]['kind'] == 'texture']
    if argv:
        entries = [e for e in entries if e['name'] in argv]
    for e in entries:
        print(f'[{e["name"]}] {e["raw"]}')
        meta = process_entry(e, prompts)
        write_json_atomic(os.path.join(META, e['name'] + '.json'), meta)


if __name__ == '__main__':
    main(sys.argv[1:])
