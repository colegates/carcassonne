"""Shared helpers for the minis asset pipeline (slice.py, textures.py, build.py).

Paths, the sheet registry and the atomic JSON writer live here so every script
agrees on where things go.
"""
import json
import os
import tempfile

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PROMPTS = os.path.join(REPO, 'docs', 'art', 'prompts.json')
SHEETS = os.path.join(os.path.dirname(__file__), 'sheets.json')
OUT = os.path.join(REPO, 'public', 'assets', 'minis')
WORK = os.environ.get('MINIS_WORK', '/tmp/claude-0/art')
RAW = os.path.join(WORK, 'raw')
META = os.path.join(WORK, 'meta')
CONTACT = os.path.join(WORK, 'contact')


def load_prompts():
    with open(PROMPTS) as f:
        data = json.load(f)
    out = {}
    for e in data:
        items = []
        for it in e['items']:
            name, _, desc = it.partition(':')
            items.append((name.strip(), desc.strip()))
        out[e['id']] = {'kind': e['kind'], 'grid': e['grid'], 'items': items}
    return out


def load_sheets():
    """sheets.json: list of raw sheets to process, in order. Later entries
    override earlier ones for the same item id (re-rolls)."""
    with open(SHEETS) as f:
        return json.load(f)


def parse_grid(g):
    r, c = g.lower().split('x')
    return int(r), int(c)


def write_json_atomic(path, obj):
    d = os.path.dirname(path)
    os.makedirs(d, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix='.tmp-', suffix='.json', dir=d)
    with os.fdopen(fd, 'w') as f:
        json.dump(obj, f, indent=1, ensure_ascii=False)
        f.write('\n')
    os.chmod(tmp, 0o644)
    os.replace(tmp, path)


def short_desc(desc, limit=79):
    """A short description from the prompt text: first clause, cut on a word."""
    s = desc
    for prefix in ('flat, face-on: ',):
        if s.startswith(prefix):
            s = s[len(prefix):]
    for sep in (';', ':', ' (', ', '):
        i = s.find(sep)
        if 20 <= i <= limit:
            s = s[:i]
            break
    if len(s) > limit:
        s = s[:limit].rsplit(' ', 1)[0]
    return s.strip().rstrip(',.')
