#!/usr/bin/env python3
"""Merge the animation strips' metadata (dev/anim/meta/*.json) into the miniature manifest.

Usage: python3 dev/anim/manifest.py [--check]

Writes public/assets/minis/manifest.json with a top-level "anims": { id: meta } (everything
else in the manifest is kept as it is; running it twice changes nothing). A meta is only
listed when its strip exists and its numbers are sane. For walk loops it also measures
`cycle`: the ground covered by one loop, in still-sprite px, from how fast the planted foot
slides backwards in the footage (the renderer advances the frames by distance walked, so the
feet stay put on the road). --check prints what would change without writing.
"""
import argparse
import glob
import json
import os

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MINIS = os.path.join(ROOT, 'public', 'assets', 'minis')
MANIFEST = os.path.join(MINIS, 'manifest.json')
META = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'meta')
KEYS = ('file', 'n', 'fw', 'fh', 'foot', 'scale', 'period', 'mode')


def runs(col, gap=3):
    xs = np.nonzero(col)[0]
    out = []
    if not len(xs):
        return out
    s = p = xs[0]
    for x in xs[1:]:
        if x > p + gap:
            out.append((s, p))
            s = x
        p = x
    out.append((s, p))
    return out


def walk_cycle(alpha, meta):
    """Ground covered per loop (strip px), from the planted foot's slide; None if unclear."""
    n, fw, fh = meta['n'], meta['fw'], meta['fh']
    fy = meta['foot'][1]
    y0, y1 = int(max(0, fy - 0.03 * fh)), int(min(fh, fy + 3))
    frames = []
    for i in range(n):
        band = alpha[y0:y1, i * fw:(i + 1) * fw] > 0.5
        frames.append(runs(band.any(0)))
    dxs = []
    for i in range(n):
        a, b = frames[i], frames[(i + 1) % n]
        for (l0, r0) in a:
            best = None
            for (l1, r1) in b:
                for d in (l1 - l0, r1 - r0):
                    if abs(d) < fw * 0.15 and (best is None or abs(d) < abs(best)):
                        best = d
            if best is not None:
                dxs.append(best)
    dxs = np.array(dxs, dtype=float)
    if len(dxs) < n // 2:
        return None
    sign = 1 if np.median(dxs) >= 0 else -1
    v = np.median(np.abs(dxs[dxs * sign > 0])) if (dxs * sign > 0).any() else 0
    if v <= 0:
        return None
    # the figure's height in strip px, to sanity-check the stride
    rows = np.nonzero((alpha[:, :fw] > 0.5).any(1))[0]
    h = (rows.max() - rows.min()) if len(rows) else fh
    cyc = v * n
    if not (0.3 * h <= cyc <= 3.0 * h):
        return None
    return float(cyc)


def load_meta(path):
    sid = os.path.splitext(os.path.basename(path))[0]
    try:
        m = json.load(open(path))
    except Exception as e:  # a meta still being written
        print('skip', sid, e)
        return sid, None
    if not all(k in m for k in KEYS):
        print('skip', sid, 'missing keys')
        return sid, None
    strip = os.path.join(MINIS, m['file'])
    if not os.path.exists(strip):
        print('skip', sid, 'no strip')
        return sid, None
    try:
        im = Image.open(strip)
        W, H = im.size
    except Exception as e:
        print('skip', sid, e)
        return sid, None
    if W < m['n'] * m['fw'] or H < m['fh'] or m['n'] < 2 or m['period'] <= 0 or m['scale'] <= 0:
        print('skip', sid, 'bad numbers', (W, H), m['n'], m['fw'], m['fh'])
        return sid, None
    out = {k: m[k] for k in KEYS}
    out['foot'] = [round(float(m['foot'][0]), 1), round(float(m['foot'][1]), 1)]
    for k in ('face', 'cycle', 'hit'):  # optional hints from the generator
        if k in m:
            out[k] = m[k]
    if m['mode'] == 'walk' and 'cycle' not in out and not sid.endswith(('_toward', '_away')):  # (those use their side loop's)
        alpha = np.asarray(im.convert('RGBA'))[..., 3] / 255.0
        c = walk_cycle(alpha, m)
        if c:
            out['cycle'] = round(c * m['scale'], 1)  # still-sprite px per loop
    if m['mode'] == 'idle' and 'hit' not in out:
        # the low point of the action (a hammer on the anvil): the frame whose top is lowest
        alpha = np.asarray(im.convert('RGBA'))[..., 3]
        tops = []
        for i in range(m['n']):
            rows = np.nonzero((alpha[:, i * m['fw']:(i + 1) * m['fw']] > 128).any(1))[0]
            tops.append(rows.min() if len(rows) else 0)
        out['hit'] = round(int(np.argmax(tops)) / m['n'], 3)
    out['mtime'] = int(os.path.getmtime(strip))
    return sid, out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    args = ap.parse_args()
    man = json.load(open(MANIFEST))
    sprites = man.get('sprites', {})
    anims = {}
    for path in sorted(glob.glob(os.path.join(META, '*.json'))):
        sid, meta = load_meta(path)
        if not meta:
            continue
        if sid not in sprites and sid.replace('_toward', '').replace('_away', '') not in sprites:
            print('note', sid, 'has no still sprite of that id (listed anyway)')
        anims[sid] = meta
    old = man.get('anims', {})
    added = sorted(set(anims) - set(old))
    changed = sorted(k for k in anims if k in old and old[k] != anims[k])
    removed = sorted(set(old) - set(anims))
    print(f'{len(anims)} anims; added {added or "-"}; changed {changed or "-"}; removed {removed or "-"}')
    for k in sorted(anims):
        a = anims[k]
        print(f'  {k:28s} {a["mode"]:4s} n={a["n"]:2d} {a["fw"]}x{a["fh"]} period={a["period"]:.2f}' + (f' cycle={a["cycle"]}' if 'cycle' in a else ''))
    if args.check or (not added and not changed and not removed and 'anims' in man):
        return
    man['anims'] = anims
    tmp = MANIFEST + '.tmp'
    with open(tmp, 'w') as f:
        json.dump(man, f, indent=1)
        f.write('\n')
    os.replace(tmp, MANIFEST)
    print('wrote', MANIFEST)


if __name__ == '__main__':
    main()
