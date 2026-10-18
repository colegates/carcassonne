#!/usr/bin/env python3
"""Contact sheets for QA: one JPEG per sprite sheet (each sprite on mid-grey
with its id, bounding box and a red foot cross) and one 2x2 tiling per texture.

Usage: python3 dev/minis/contact.py [SHEET_ID ...]   (writes to MINIS_WORK/contact)
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(__file__))
from common import CONTACT, OUT  # noqa: E402

CELL = 400


def font(size):
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
              '/usr/share/fonts/dejavu/DejaVuSans.ttf'):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def sprite_sheets(man, only):
    by = {}
    for sid, s in man['sprites'].items():
        by.setdefault(s['sheet'], []).append((sid, s))
    f = font(15)
    for sheet, items in by.items():
        if only and sheet not in only:
            continue
        cols = 4
        rows = (len(items) + cols - 1) // cols
        img = Image.new('RGB', (cols * CELL, rows * (CELL + 24)), (128, 128, 128))
        d = ImageDraw.Draw(img)
        for k, (sid, s) in enumerate(items):
            r, c = divmod(k, cols)
            sp = Image.open(os.path.join(OUT, s['file'])).convert('RGBA')
            sc = min((CELL - 16) / sp.width, (CELL - 16) / sp.height)
            tw, th = max(1, int(sp.width * sc)), max(1, int(sp.height * sc))
            sp2 = sp.resize((tw, th), Image.LANCZOS)
            ox, oy = c * CELL + (CELL - tw) // 2, r * (CELL + 24) + (CELL - th) // 2
            img.paste(sp2, (ox, oy), sp2)
            d.rectangle([ox, oy, ox + tw - 1, oy + th - 1], outline=(150, 150, 150))
            fx, fy = ox + s['foot'][0] * sc, oy + s['foot'][1] * sc
            d.line([fx - 6, fy, fx + 6, fy], fill=(255, 0, 0), width=2)
            d.line([fx, fy - 6, fx, fy + 6], fill=(255, 0, 0), width=2)
            lab = f"{sid} [{s['kind']}{' flat' if s.get('flat') else ''}] {s['w']}x{s['h']}"
            d.text((c * CELL + 6, r * (CELL + 24) + CELL + 2), lab, fill=(255, 255, 255), font=f)
        img.save(os.path.join(CONTACT, f'{sheet}.jpg'), quality=85)
        print('wrote', os.path.join(CONTACT, f'{sheet}.jpg'))


def texture_sheets(man, only):
    f = font(18)
    by = {}
    for tid, t in man['textures'].items():
        by.setdefault(t.get('sheet', 'textures'), []).append((tid, t))
    for sheet, items in by.items():
        if only and sheet not in only:
            continue
        for tid, t in items:
            tex = Image.open(os.path.join(OUT, t['small'])).convert('RGB')
            w, h = tex.size
            img = Image.new('RGB', (2 * w, 2 * h + 28), (40, 40, 40))
            for dy in (0, 1):
                for dx in (0, 1):
                    img.paste(tex, (dx * w, dy * h))
            ImageDraw.Draw(img).text((6, 2 * h + 4), f'{tid} (2x2 tiling of @512)', fill=(255, 255, 255), font=f)
            img.save(os.path.join(CONTACT, f'tex_{tid}.jpg'), quality=85)
        print('wrote textures for', sheet)


def main(argv):
    os.makedirs(CONTACT, exist_ok=True)
    with open(os.path.join(OUT, 'manifest.json')) as fh:
        man = json.load(fh)
    sprite_sheets(man, set(argv))
    texture_sheets(man, set(argv))


if __name__ == '__main__':
    main(sys.argv[1:])
