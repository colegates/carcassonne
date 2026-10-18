#!/usr/bin/env python3
"""Build the photographed game pieces in public/assets/pieces/ from raw renders.

Usage:  python3 dev/pieces/build.py

Reads dev/pieces/sources.json: raw transparent sheets (downloaded into
$PIECES_WORK, default /tmp/claude-0/pieces-raw, when missing) and, for each
piece, the grid cell it comes from. For each piece:
  * keep the largest connected blob of alpha in its cell (stray specks go);
  * bleed colour outward under the soft rim (no light halo), trim with padding,
    resize on premultiplied colour so the longer side is at most `cap` px;
  * tintable pieces (painted ivory, tinted per player colour in the browser by
    public/js/pieces.js) are stored as grey luminance, with the 3rd/97th
    percentile of the opaque luminance in the manifest so the tint can
    stretch it to the colour ramp;
  * save WebP (alpha) and write public/assets/pieces/manifest.json.
The dragon, fairy and tower drums are the miniatures in public/assets/minis.
"""
import json
import os
import sys
import urllib.request

import numpy as np
from PIL import Image

sys.dont_write_bytecode = True  # (no __pycache__ in dev/minis)
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'minis'))
from common import REPO, write_json_atomic  # noqa: E402
from slice import bleed_colour, label, resize_premul  # noqa: E402

WORK = os.environ.get('PIECES_WORK', '/tmp/claude-0/pieces-raw')
OUT = os.path.join(REPO, 'public', 'assets', 'pieces')
PAD = 3
QUALITY = 86


def fetch(name, url):
    path = os.path.join(WORK, name + '.png')
    if not os.path.exists(path):
        os.makedirs(WORK, exist_ok=True)
        print('downloading', name)
        urllib.request.urlretrieve(url, path)
    return Image.open(path)


def raw_sheet(name, info):
    """The sheet as RGBA. With a `hires` url (a 4k upscale, which comes back flattened
    on black) the colour comes from the upscale and the alpha from the original render,
    resized to match."""
    img = fetch(name, info['url']).convert('RGBA')
    if not info.get('hires'):
        return np.asarray(img)
    big = fetch(name + '_4k', info['hires']).convert('RGB')
    alpha = img.getchannel('A').resize(big.size, Image.LANCZOS)
    big.putalpha(alpha)
    return np.asarray(big)


def main_blob(cell):
    """Mask of the largest alpha blob in the cell (labelled at 1/4 scale)."""
    a = cell[..., 3]
    f = 4
    h, w = a.shape
    low = a[:h - h % f, :w - w % f].reshape(h // f, f, w // f, f).max(axis=(1, 3)) > 12
    lab, n = label(low)
    if n == 0:
        raise SystemExit('empty cell')
    sizes = np.bincount(lab.ravel())[1:]
    keep = lab == (int(np.argmax(sizes)) + 1)
    p = np.pad(keep, 1)
    grow = np.zeros_like(keep)
    for dy in (0, 1, 2):
        for dx in (0, 1, 2):
            grow |= p[dy:dy + keep.shape[0], dx:dx + keep.shape[1]]
    m = np.repeat(np.repeat(grow, f, 0), f, 1)
    full = np.zeros_like(a, bool)
    full[:m.shape[0], :m.shape[1]] = m
    return full


def process(pid, spec, sheet, grid):
    rows, cols = grid
    H, W = sheet.shape[:2]
    r, c = spec['cell']
    y0, y1 = H * r // rows, H * (r + 1) // rows
    x0, x1 = W * c // cols, W * (c + 1) // cols
    cell = sheet[y0:y1, x0:x1].copy()
    keep = main_blob(cell)
    cell[..., 3] = np.where(keep, cell[..., 3], 0)
    ys, xs = np.nonzero(cell[..., 3] > 8)
    cell = cell[max(0, ys.min() - PAD):ys.max() + PAD + 1, max(0, xs.min() - PAD):xs.max() + PAD + 1]
    rgb = bleed_colour(cell[..., :3], cell[..., 3], edge=4)  # (the upscales' rims are wider)
    arr = np.concatenate([rgb, cell[..., 3:4]], -1)
    h, w = arr.shape[:2]
    k = min(1.0, spec['cap'] / max(h, w))
    if k < 1:
        arr = resize_premul(arr, (max(1, round(w * k)), max(1, round(h * k))))
    entry = {'file': pid + '.webp', 'w': int(arr.shape[1]), 'h': int(arr.shape[0])}
    if spec.get('tint'):
        lum = arr[..., :3].astype(np.float32) @ np.array([0.299, 0.587, 0.114], np.float32)
        solid = arr[..., 3] > 200
        lo, hi = np.percentile(lum[solid], [3, 97])
        g = np.clip(np.round(lum), 0, 255).astype(np.uint8)
        arr = np.concatenate([np.stack([g, g, g], -1), arr[..., 3:4]], -1)
        entry['tint'] = True
        entry['lum'] = [round(float(lo) / 255, 3), round(float(hi) / 255, 3)]
    Image.fromarray(arr, 'RGBA').save(os.path.join(OUT, entry['file']), 'WEBP', quality=QUALITY, method=6)
    return entry


def main():
    with open(os.path.join(HERE, 'sources.json')) as f:
        src = json.load(f)
    os.makedirs(OUT, exist_ok=True)
    sheets = {}
    pieces = {}
    for pid, spec in src['pieces'].items():
        name = spec['sheet']
        if name not in sheets:
            sheets[name] = raw_sheet(name, src['sheets'][name])
        pieces[pid] = process(pid, spec, sheets[name], src['sheets'][name]['grid'])
        print(pid, pieces[pid])
    write_json_atomic(os.path.join(OUT, 'manifest.json'), {'version': 1, 'pieces': pieces})


if __name__ == '__main__':
    main()
