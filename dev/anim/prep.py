#!/usr/bin/env python3
"""Put a still sprite on a flat key colour, ready to animate with an image-to-video model.

Usage: python3 dev/anim/prep.py ID [ID ...] [--out DIR]
Writes DIR/<ID>.png (default /tmp/claude-0/anim/start) and prints the key colour chosen:
green, or magenta when the figure itself has a lot of green in it (frames.py --key ...).
The figure fills about 80% of the frame height (wide groups fill 85% of the width) with
room underneath, on a 3:4 canvas, or 4:3 for wide sprites.
"""
import argparse
import json
import os

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SPRITES = os.path.join(ROOT, 'public', 'assets', 'minis', 'sprites')
MANIFEST = os.path.join(ROOT, 'public', 'assets', 'minis', 'manifest.json')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('ids', nargs='+')
    ap.add_argument('--out', default='/tmp/claude-0/anim/start')
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    man = json.load(open(MANIFEST))['sprites']
    for sid in args.ids:
        info = man[sid]
        im = Image.open(os.path.join(SPRITES, os.path.basename(info['file']))).convert('RGBA')
        a = np.asarray(im).astype(np.float32)
        op = a[..., 3] > 128
        r, g, b = a[..., 0][op], a[..., 1][op], a[..., 2][op]
        mx = np.maximum(np.maximum(r, g), b)
        greenish = ((g >= mx - 2) & (g - np.minimum(r, b) > 0.15 * mx)).mean() if op.any() else 0  # green-hued, not grey
        key = 'magenta' if greenish > 0.04 else 'green'
        wide = im.width > im.height * 1.15
        W, H = (960, 720) if wide else (720, 960)
        s = min(H * 0.8 / im.height, W * 0.85 / im.width)
        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        bg = Image.new('RGBA', (W, H), (0, 255, 0, 255) if key == 'green' else (255, 0, 255, 255))
        bg.alpha_composite(im, ((W - im.width) // 2, H - im.height - round(H * 0.08)))
        bg.convert('RGB').save(os.path.join(args.out, sid + '.png'))
        print(sid, key, f'{greenish:.3f}')


if __name__ == '__main__':
    main()
