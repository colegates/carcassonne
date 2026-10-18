#!/usr/bin/env python3
"""Merge the per-sheet metadata written by slice.py and textures.py into
public/assets/minis/manifest.json (written atomically: temp file + rename).

Usage:
  python3 dev/minis/build.py            # manifest only
  python3 dev/minis/build.py --all      # re-run slice.py and textures.py first

Entries are merged in sheets.json order, so a later re-roll overrides the
items it re-generates. Sprite files no longer referenced are reported.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from common import META, OUT, load_prompts, load_sheets, write_json_atomic  # noqa: E402


def main(argv):
    if '--all' in argv:
        import slice as slicer
        import textures
        slicer.main([])
        textures.main([])
    prompts = load_prompts()
    sprites, texs = {}, {}
    for e in load_sheets():
        mp = os.path.join(META, e['name'] + '.json')
        if not os.path.exists(mp):
            continue
        with open(mp) as f:
            meta = json.load(f)
        if prompts[e['sheet']]['kind'] == 'sprites':
            sprites.update(meta)
        else:
            texs.update(meta)
    # stable order: prompts.json order
    order = [n for p in prompts.values() for n, _ in p['items']]
    rank = {n: i for i, n in enumerate(order)}
    sprites = dict(sorted(sprites.items(), key=lambda kv: rank.get(kv[0], 1e9)))
    texs = dict(sorted(texs.items(), key=lambda kv: rank.get(kv[0], 1e9)))
    manifest = {'version': 1, 'sprites': sprites, 'textures': texs}
    write_json_atomic(os.path.join(OUT, 'manifest.json'), manifest)
    for sub, known in (('sprites', {v['file'] for v in sprites.values()}),
                       ('textures', {v['file'] for v in texs.values()} | {v['small'] for v in texs.values()})):
        d = os.path.join(OUT, sub)
        if os.path.isdir(d):
            for fn in os.listdir(d):
                if f'{sub}/{fn}' not in known:
                    print('unreferenced:', f'{sub}/{fn}')
    print(f'manifest: {len(sprites)} sprites, {len(texs)} textures')


if __name__ == '__main__':
    main(sys.argv[1:])
