#!/usr/bin/env python3
"""Cut transparent sprite sheets into game-ready WebP sprites.

Usage:
  python3 dev/minis/slice.py            # every sprite entry in sheets.json
  python3 dev/minis/slice.py NAME ...   # only the named sheets.json entries

For each sheets.json entry {name, sheet, raw, grid?, items?, sheets?, boxes?, strict?, skip?, desc?}
(a re-roll lists its items and, per item, the prompt sheet it belongs to;
`strict` items keep only pieces touching the main object, to drop stray specks):
  * label connected components of alpha > 12 over the whole sheet on a
    max-pooled (downscaled) mask;
  * each grid cell (or `boxes` override, fractions of the sheet) takes as its
    main object the component with most area inside it; every other component
    joins the nearest main object if close enough (a cart's ox, a sower's
    seeds; up to half a cell for multi-piece items), so a neighbour's stray
    bits are dropped;
  * bleed colour outward from the opaque interior (removes white halos), trim
    with 4 px padding, resize on premultiplied colour to <= 768 px, save WebP
    q82 to public/assets/minis/sprites/<id>.webp;
  * record size, foot point, kind, flat and desc in meta/<name>.json, which
    build.py merges into the manifest.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from common import (META, OUT, RAW, load_prompts, load_sheets, parse_grid,  # noqa: E402
                    short_desc, write_json_atomic)

ALPHA_T = 12
PAD = 4
CAP = 768
QUALITY = 82
NEAR = 0.10        # keep components within this fraction of the cell from the main one
TOUCH = 0.03       # pieces this close to an object belong to it

# Items made of several separate pieces: keep every piece whose centre is in the cell.
MULTI = {
    'merlon_set', 'sheep_group', 'chickens', 'goats', 'sow_piglets', 'goose_girl',
    'doves', 'sparrows_mouse', 'pennons', 'laundry_pieces', 'butterflies_bee', 'props',
    'water_life', 'ducks', 'children_wading', 'washerwomen', 'fish_traps', 'orchard_cluster',
    'fairy_ring', 'sower', 'highwaymen', 'pottery_stall', 'grain_stall', 'poultry_produce',
    'woad_stall', 'bee_bench', 'ploughman_oxen_ard', 'hay_cart', 'straw_target',
    'garrigue_clump', 'bear_leader', 'dyer', 'mason', 'carpenter', 'laundry_drying',
    'wayside_cross', 'lay_brother_beekeeper', 'money_changer', 'spice_salt_stall', 'cooper',
}
# Lying flat on the ground, or drawn flat face-on for rotation/waving: foot = centre.
FLAT_EXTRA = {'fairy_ring', 'fishpond'}

# Hand-written descriptions where the prompt's first clause reads badly.
DESC = {
    'house_shop_eaves': 'wide two-storey town house, long side front, two shop openings, balcony',
    'cottage_small': 'small single-storey rubble-stone cottage with patchy lime-wash',
    'bakehouse': 'low stone communal bakehouse with a domed bread oven and faggots',
    'tower_round_hoarding': 'round late-Roman tower fitted with a timber hoarding gallery',
    'gatehouse_outer': 'city gate between two round towers, outer face, doors open',
    'gatehouse_inner': 'city gate seen from inside the town, stair to the wall-walk',
    'gatehouse_side': 'city gatehouse seen from the side, passage running left to right',
    'wall_outer': 'straight curtain wall, outer face, brick-banded base, merlons',
    'wall_inner': 'straight curtain wall seen from the town side with wall-walk',
    'merlon_set': 'loose parapet pieces: plain merlons, slit merlons, hoarding beam-ends',
    'turret_small': 'small round corner turret of banded masonry, low tile cone roof',
    'mason': 'stonemason in leather apron dressing a block on a trestle',
    'handbarrow_labourers': 'two labourers carrying a handbarrow of squared stones',
    'townswoman': 'married townswoman in a madder-red gown and wimple, jug on her hip',
    'boy_running': 'barefoot boy in a russet tunic running, arms outstretched',
    'girl_hoop': 'barefoot girl with braids driving a wooden hoop with a stick',
    'princess': 'young princess with gold circlet, rose gown and ermine-lined azure mantle',
    'merchant': 'prosperous merchant in green tunic and surcoat with purse and wax tablet',
    'old_woman_spinning': 'old woman in a brown gown spinning with distaff and drop spindle',
    'nobleman_falcon': 'young nobleman in blue tunic and red surcoat with a hooded falcon',
    'dominican_friar': 'Dominican friar in white habit and black cloak with staff and book',
    'bishop': 'bishop in red chasuble and white mitre with crozier, blessing',
    'canon': 'cathedral canon in white surplice and black cloak with processional cross',
    'ploughman_oxen_ard': 'ploughman behind two tawny oxen pulling a wooden ard',
    'sheep_group': 'three small coarse-wooled sheep: cream ewe, brown ewe, dark ram',
    'shepherd': 'shepherd in a hooded cloak with a spade-tipped crook and satchel',
    'hay_cart': 'two-wheeled hay cart pulled by a mule, carter walking beside',
    'mule_packed': 'dark bay pack mule with panniers, wineskins and a bell',
    'pig_running': 'dark bristly long-legged medieval pig trotting',
    'chickens': 'hens, a rooster and three chicks',
    'palfrey_rider': 'traveller in a hooded cloak riding a bay palfrey',
    'sower': 'sower in a straw hat broadcasting seed from a linen bag',
    'sheaf_binder': 'woman in a straw hat tying a wheat sheaf',
    'donkey_rider': 'old peasant riding sideways on a grey donkey with a sack',
    'crossbowman_shooting': 'crossbowman in gambeson and kettle hat aiming a crossbow',
    'crossbowman_spanning': 'crossbowman spanning his crossbow with foot in the stirrup',
    'rope_haulers': 'two sergeants in coifs hauling hard on a rope',
    'pierriere_frame': 'timber frame of a traction trebuchet, no arm',
    'pierriere_arm': 'throwing arm of the traction trebuchet with ropes and sling',
    'straw_target': 'straw practice butt on a stand with bolts, heap of round stones',
    'knight_mounted': 'mounted knight in mail and great helm, gold shield with red chevron',
    'banner_bearer': 'sergeant carrying a blue banner with gold fleurs-de-lis',
    'horn_watchman': 'watchman in gambeson and nasal helm blowing a curved horn',
    'archer': 'archer in a short tunic drawing a wooden self bow',
    'engineer': 'master engineer in a long tunic with a measuring rod, pointing',
    'trabuquet_frame': 'heavy timber frame of a counterweight trebuchet with winch, no arm',
    'trabuquet_arm': 'counterweight trebuchet arm with stone-filled box and sling',
    'knight_foot': 'knight on foot in mail hauberk and nasal helm with sword and shield',
    'holm_oak': 'holm oak with a dense rounded dark evergreen crown',
    'downy_oak': 'downy oak with a broad spreading light green crown',
    'black_poplar': 'tall native black poplar with a broad irregular crown',
    'pollard_willow': 'pollarded willow with a knobbly trunk and a ball of shoots',
    'goblet_vine': 'free-standing goblet-trained grapevine on one stake',
    'olive': 'old olive tree with a twisted hollow trunk and silver-green crown',
    'apple_tree': 'old apple tree with red and green apples and a ladder',
    'white_poplar': 'white poplar with a silvery trunk and two-tone leaves',
    'cypress': 'slim dark green Italian cypress',
    'almond': 'young almond tree with an open crown and green fruits',
    'garrigue_clump': 'garrigue scrub: kermes oak, rosemary and thyme among limestone',
    'parish_church': 'small Romanesque parish church with apse and bell-gable',
    'cathedral': 'Romanesque cathedral of Saint-Nazaire as in 1220, with cloister',
    'inn': 'roadside inn with gallery, stable, well and a pine-bush sign',
    'farmhouse': 'long low farmhouse with thatched barn, walled yard and bread oven',
    'castle': 'compact stone castle: square keep, curtain wall, gate towers, hall',
    'village_well': 'village well with pulley frame, bucket and stone trough',
    'wayside_cross': 'disc-headed stone wayside cross and a worn Roman milestone',
    'threshing_floor': 'round paved threshing floor with straw, sheaves and a rick',
    'highwaymen': 'robbers\' hideout: two hooded outlaws behind a bush, lean-to, campfire',
    'monastery_complex': 'Cistercian abbey: church, cloister, ranges and gatehouse',
    'priory_small': 'small Benedictine priory: chapel, tiny cloister and stone range',
    'herb_garden': 'monastery herb garden of wattle-edged beds around a small well',
    'monk_hoeing': 'Cistercian monk in a greyish-white habit hoeing the soil',
    'lay_brother_beekeeper': 'bearded lay brother with a smoking pot beside two bee skeps',
    'bell': 'bronze church bell on its wooden headstock, side-on',
    'orchard_cluster': 'pear, quince and cherry trees with a ladder and a basket',
    'wine_stall': 'wine stall under a linen awning with small casks and jugs',
    'cloth_stall': 'cloth stall under a linen awning with dyed wool bolts',
    'grain_stall': 'grain merchant with open sacks of grain and a bushel measure',
    'juggler': 'jongleur in a parti-coloured tunic and striped hose',
    'bear_leader': 'bear-leader with a muzzled brown bear on a chain',
    'minstrel': 'hooded minstrel playing a vielle',
    'money_changer': 'money changer at a green-covered table with balance and coins',
    'blacksmith_up': 'blacksmith at the anvil, hammer raised',
    'blacksmith_down': 'blacksmith at the anvil, hammer striking',
    'pottery_stall': 'pots, jugs and tall storage jars laid out on straw',
    'woad_stall': 'baskets of woad balls, a steelyard and skeins of dyed wool',
    'spice_salt_stall': 'spice and salt seller at a small table with balance',
    'poultry_produce': 'cages of hens and ducks, eggs, garlic, onions and cheeses',
    'cooper': 'cooper driving a hoop onto a wine cask',
    'bridge_lr': 'narrow three-arched stone bridge spanning left to right',
    'bridge_front': 'narrow stone bridge seen end-on with a small wayside cross',
    'angler': 'angler on a stone with a wooden rod and a creel',
    'punt_fishermen': 'punt with two fishermen, one poling and one hauling a net',
    'dyer': 'dyer lifting blue wool from a vat, skeins drying on a pole',
    'footbridge': 'timber plank footbridge on trestle legs with a hand rail',
    'ferry': 'flat ferry boat with a mule, its owner and the ferryman poling',
    'fish_traps': 'wicker eel and fish traps and a woven fish weir',
    'laundry_drying': 'linen spread on a bush and hung from a cord between poles',
    'water_life': 'leaping trout, green frog, dragonfly and kingfisher',
    'dragon_wings_up': 'great red manuscript-style dragon flying, wings raised',
    'dragon_wings_down': 'great red manuscript-style dragon flying, wings down',
    'fairy': 'fairy lady in a pale-blue gown with hawthorn sprig, softly glowing',
    'volcano': 'small basalt volcanic cone with a glowing crater and lava cracks',
    'dolmen_portal': 'megalithic dolmen with a shimmering pale-blue passage',
    'fairy_ring': 'faintly glowing ring of pale mushrooms and tiny white flowers',
    'tower_base': 'round tower base storey under construction with scaffold poles',
    'tower_floor': 'stackable middle storey of the round tower',
    'tower_top': 'top storey of the round tower: merlons, hoarding and banner pole',
    'stork_wings_up': 'white stork flying, wings raised',
    'stork_wings_down': 'white stork flying, wings down',
    'stork_nest': 'white stork on a big stick nest',
    'doves': 'five grey rock doves, pecking and taking off',
    'cat_stalking': 'tabby cat crouched and stalking',
    'banner_france': 'banner of France: azure with gold fleurs-de-lis',
    'banner_toulouse': 'banner of Toulouse: gold cross of Toulouse on red',
    'banner_trencavel': 'Trencavel banner: red and ermine-spotted white bands',
    'banner_foix': 'banner of Foix: gold with three red pales',
    'pennons': 'four small triangular lance pennons',
    'laundry_pieces': 'laundry for hanging: linen shirt, braies and a sheet',
    'butterflies_bee': 'swallowtail, brimstone butterfly and a bee',
    'props': 'small props: wheat sheaf, basket of loaves, cask, sack of grain',
}

KIND = {}
def base_id(i):
    """The item a pose variant belongs to: 'townsman_b' -> 'townsman' (second walking pose)."""
    return i[:-2] if i.endswith('_b') else i


def _k(kind, ids):
    for i in ids.split():
        KIND[i] = kind

_k('building', 'house_shop_gable house_shop_eaves house_merchant_stone row_houses house_courtyard '
   'cottage_small village_house_tall bakehouse smithy parish_church cathedral inn farmhouse castle '
   'monastery_complex priory_small mill_house bridge_lr bridge_front footbridge')
_k('wall', 'tower_roman_round tower_round_hoarding tower_square_watch gatehouse_outer gatehouse_inner '
   'gatehouse_side wall_outer wall_inner hoarding_segment wall_stair_postern merlon_set turret_small '
   'tower_base tower_floor tower_top')
_k('person', 'mason carpenter handbarrow_labourers townsman townswoman boy_running girl_hoop pilgrim '
   'princess merchant noble_lady benedictine_monk water_carrier old_woman_spinning nobleman_falcon '
   'dominican_friar nun bishop canon shepherd reaper sower sheaf_binder goose_girl sergeant_spear '
   'crossbowman_shooting crossbowman_spanning rope_haulers banner_bearer horn_watchman archer engineer '
   'knight_foot highwaymen monk_hoeing lay_brother_beekeeper juggler bear_leader minstrel '
   'blacksmith_up blacksmith_down cooper fishwife tumbler angler washerwomen dyer children_wading '
   'money_changer')
_k('animal', 'ploughman_oxen_ard sheep_group mule_packed pig_running chickens palfrey_rider guard_dog '
   'goats sow_piglets donkey_rider knight_mounted ducks heron stork_wings_up stork_wings_down doves '
   'cat_sitting cat_stalking hound_running sparrows_mouse hay_cart')
_k('tree', 'holm_oak downy_oak black_poplar pollard_willow olive apple_tree white_poplar cypress almond '
   'fig walnut orchard_cluster')
_k('plant', 'goblet_vine hedge_segment reed_clump broom garrigue_clump')
_k('siege', 'pierriere_frame pierriere_arm trabuquet_frame trabuquet_arm treadwheel_crane')
_k('prop', 'straw_target quintain village_well wayside_cross bee_bench bell wine_stall cloth_stall '
   'grain_stall pottery_stall woad_stall spice_salt_stall poultry_produce mill_wheel punt_fishermen '
   'ferry fish_traps laundry_drying props')
_k('fantasy', 'dragon_wings_up dragon_wings_down fairy volcano dolmen_portal fairy_ring')
_k('detail', 'stork_nest banner_france banner_toulouse banner_trencavel banner_foix pennons '
   'laundry_pieces butterflies_bee water_life')
_k('ground', 'threshing_floor herb_garden fishpond')


def label(mask):
    """Connected components (8-way) of a boolean mask by min-label propagation."""
    h, w = mask.shape
    big = np.int64(h * w + 1)
    lab = np.where(mask, np.arange(h * w).reshape(h, w), big)
    while True:
        p = np.pad(lab, 1, constant_values=big)
        m = lab.copy()
        for dy in (0, 1, 2):
            for dx in (0, 1, 2):
                m = np.minimum(m, p[dy:dy + h, dx:dx + w])
        m = np.where(mask, m, big)
        # pointer jumping speeds convergence on long shapes
        flat = m.ravel()
        idx = np.where(flat < big, flat, 0)
        jumped = np.where(flat < big, np.minimum(flat, flat[idx]), big).reshape(h, w)
        if np.array_equal(jumped, lab):
            break
        lab = jumped
    uniq = np.unique(lab[mask])
    out = np.zeros((h, w), np.int32)
    remap = {u: i + 1 for i, u in enumerate(uniq)}
    for u, i in remap.items():
        out[lab == u] = i
    return out, len(uniq)


def pixel_dist(a, b):
    """Smallest distance between two point sets (n x 2 arrays), chunked."""
    if len(a) > len(b):
        a, b = b, a
    if len(a) > 400:
        a = a[np.linspace(0, len(a) - 1, 400).astype(int)]
    best = np.inf
    for s in range(0, len(b), 4000):
        d = ((a[:, None, :] - b[None, s:s + 4000, :]) ** 2).sum(-1)
        best = min(best, float(d.min()))
    return best ** 0.5


def bbox_gap(a, b):
    """Gap between boxes (y0, x0, y1, x1), 0 if they touch or overlap."""
    dy = max(0, max(a[0], b[0]) - min(a[2], b[2]))
    dx = max(0, max(a[1], b[1]) - min(a[3], b[3]))
    return max(dy, dx)


def assign_components(alpha, cores, multi, cell, strict=None):
    """Global component assignment for a whole sheet.

    alpha: full sheet alpha. cores: list of (y0, x0, y1, x1) full-res cell boxes
    (None for skipped cells). Each cell's main object is the component with the
    largest area inside its box; every other component goes to the main object
    it touches, else the one whose cell holds its centre, else the nearest, and is kept when it is
    within NEAR of the cell size (half a cell for multi-piece items).
    Returns (low-res label image, f, list of kept label ids per cell)."""
    H, W = alpha.shape
    f = max(1, int(np.ceil(cell / 160)))
    hh, ww = (H + f - 1) // f, (W + f - 1) // f
    pad = np.zeros((hh * f, ww * f), np.uint8)
    pad[:H, :W] = alpha
    low = pad.reshape(hh, f, ww, f).max(axis=(1, 3)) > ALPHA_T
    lab, n = label(low)
    boxes, areas, cents, coords = {}, {}, {}, {}
    for i in range(1, n + 1):
        yy, xx = np.nonzero(lab == i)
        coords[i] = np.stack([yy, xx], 1)
        boxes[i] = (yy.min(), xx.min(), yy.max() + 1, xx.max() + 1)
        areas[i] = len(yy)
        cents[i] = (yy.mean(), xx.mean())
    mains = []
    for core in cores:
        if core is None:
            mains.append(None)
            continue
        y0, x0, y1, x1 = [int(round(v / f)) for v in core]
        sub = lab[y0:y1, x0:x1]
        ids, cnt = np.unique(sub[sub > 0], return_counts=True)
        mains.append(int(ids[np.argmax(cnt)]) if len(ids) else None)
    kept = [[m] if m else [] for m in mains]
    groups = [list(boxes[m]) if m else None for m in mains]
    taken = {m for m in mains if m}
    # Assign the rest in passes so groups grow piece by piece: first only pieces
    # that touch an object or lie in its cell, repeated until nothing changes;
    # then a last pass for pieces just outside their cell.
    rest = [i for i in range(1, n + 1) if i not in taken and areas[i] >= 2]
    phase = 0
    while True:
        changed = False
        for i in sorted(rest, key=lambda i: -areas[i]):
            cy, cx = cents[i]
            opts = []
            for k, g in enumerate(groups):
                if g is None:
                    continue
                gap = bbox_gap(boxes[i], g)
                y0, x0, y1, x1 = [v / f for v in cores[k]]
                inside = y0 <= cy < y1 and x0 <= cx < x1
                touch = gap <= TOUCH * cell / f
                if touch:  # bounding boxes are close: check the real pixel distance
                    touch = pixel_dist(coords[i], np.argwhere(np.isin(lab, kept[k]))) <= TOUCH * cell / f
                    if not touch and strict and strict[k]:
                        continue
                thr = (0.5 if multi[k] else NEAR) * cell / f
                if strict and strict[k]:
                    thr = TOUCH * cell / f
                if gap > thr or not (inside or gap <= NEAR * cell / f):
                    continue
                if phase == 0 and not (inside or touch):
                    continue
                # touching an object wins, then the cell holding the piece's centre, then distance
                opts.append(((0 if touch else 1, 0 if inside else 1, gap), k))
            if not opts:
                continue
            _, k = min(opts)
            kept[k].append(i)
            rest.remove(i)
            b = boxes[i]
            g = groups[k]
            groups[k] = [min(g[0], b[0]), min(g[1], b[1]), max(g[2], b[2]), max(g[3], b[3])]
            changed = True
        if phase == 1:
            break
        if not changed:
            phase = 1
    return lab, f, kept


def keep_mask(lab, f, ids, shape):
    km = np.isin(lab, ids)
    hh, ww = km.shape
    p = np.pad(km, 1)
    km = np.zeros_like(km)
    for dy in (0, 1, 2):
        for dx in (0, 1, 2):
            km |= p[dy:dy + hh, dx:dx + ww]
    return np.repeat(np.repeat(km, f, 0), f, 1)[:shape[0], :shape[1]]


def bleed_colour(rgb, alpha, iters=24, edge=2):
    """Dilate colour outward from the solid interior (alpha >= 235): fully
    transparent pixels get the nearest interior colour (clean filtering and no
    background fringe), and semi-transparent pixels within `edge` px of the
    interior (the anti-aliased rim, where a white halo would sit) take it too.
    Semi-transparent content further out (splashes, glows) keeps its colour."""
    rgb = rgb.astype(np.float32)
    known = (alpha >= 235).astype(np.float32)
    dist = np.where(known > 0, 0, 999).astype(np.int32)
    acc = rgb * known[..., None]
    H, W = alpha.shape
    for it in range(1, iters + 1):
        if known.min() > 0:
            break
        pk = np.pad(known, 1)
        pa = np.pad(acc, ((1, 1), (1, 1), (0, 0)))
        sk = np.zeros_like(known)
        sa = np.zeros_like(acc)
        for dy in (0, 1, 2):
            for dx in (0, 1, 2):
                sk += pk[dy:dy + H, dx:dx + W]
                sa += pa[dy:dy + H, dx:dx + W]
        new = (known == 0) & (sk > 0)
        acc[new] = sa[new] / sk[new][:, None]
        known[new] = 1
        dist[new] = it
    use = (known > 0) & ((alpha == 0) | (dist <= edge))
    out = np.where(use[..., None], acc, rgb)
    # keep some of the original colour on mostly-opaque rim pixels
    a = (alpha.astype(np.float32) / 255.0)[..., None]
    w = np.clip((a - 0.6) / 0.35, 0, 1)
    out = out * (1 - w) + rgb * w
    return np.clip(out, 0, 255).astype(np.uint8)


def resize_premul(arr, size):
    a = arr[..., 3:4].astype(np.float32) / 255.0
    pm = np.concatenate([arr[..., :3].astype(np.float32) * a, arr[..., 3:4].astype(np.float32)], -1)
    chans = [np.asarray(Image.fromarray(pm[..., i]).resize(size, Image.LANCZOS)) for i in range(4)]
    pm2 = np.stack(chans, -1)
    al = np.clip(pm2[..., 3], 0, 255)
    rgb = np.where(al[..., None] > 0.5, pm2[..., :3] / np.maximum(al[..., None] / 255.0, 1e-6), 0)
    out = np.concatenate([np.clip(rgb, 0, 255), al[..., None]], -1)
    return np.round(out).astype(np.uint8)


def foot_point(alpha, flat):
    h, w = alpha.shape
    if flat:
        return [round(w / 2), round(h / 2)]
    ys, xs = np.nonzero(alpha > ALPHA_T)
    y0, y1 = ys.min(), ys.max()
    band = max(1, int(round((y1 - y0 + 1) * 0.08)))
    sel = ys > y1 - band
    x = float(xs[sel].mean())
    y = y1 - 0.02 * h
    return [int(round(x)), int(round(y))]


def upper_centroid(alpha):
    """Mean x of the middle band of a figure (body, load): steady between walking poses."""
    ys, xs = np.nonzero(alpha > ALPHA_T)
    y0, y1 = ys.min(), ys.max()
    sel = (ys > y0 + (y1 - y0) * 0.3) & (ys < y0 + (y1 - y0) * 0.65)
    return float(xs[sel].mean())


def process_entry(entry, prompts, out_dir):
    sheet = entry['sheet']
    p = prompts[sheet]
    grid = entry.get('grid', p['grid'])
    rows, cols = parse_grid(grid)
    descs = {n: d for q in prompts.values() for n, d in q['items']}
    ids = entry.get('items') or [n for n, _ in p['items']]
    skip = set(entry.get('skip', []))
    im = Image.open(os.path.join(RAW, entry['raw'])).convert('RGBA')
    arr = np.asarray(im)
    H, W = arr.shape[:2]
    ch, cw = H / rows, W / cols
    cell = min(ch, cw)
    meta = {}
    os.makedirs(os.path.join(out_dir, 'sprites'), exist_ok=True)
    cores, multi = [], []
    centroids = {}
    for k, item_id in enumerate(ids):
        r, c = divmod(k, cols)
        y0, y1 = int(round(r * ch)), int(round((r + 1) * ch))
        x0, x1 = int(round(c * cw)), int(round((c + 1) * cw))
        box = entry.get('boxes', {}).get(item_id or '')
        if box:  # [x0, y0, x1, y1] as fractions of the sheet, for items off the grid
            x0, y0, x1, y1 = int(box[0] * W), int(box[1] * H), int(box[2] * W), int(box[3] * H)
        cores.append((y0, x0, y1, x1))
        multi.append(base_id(item_id) in MULTI)
    strict = [i in set(entry.get('strict', [])) for i in ids]
    lab, f, kept = assign_components(arr[..., 3], cores, multi, cell, strict)
    for k, item_id in enumerate(ids):
        if item_id is None or item_id in skip:
            continue
        if not kept[k]:
            print(f'  !! {item_id}: empty cell')
            continue
        km = keep_mask(lab, f, kept[k], (H, W))
        ys, xs = np.nonzero(km & (arr[..., 3] > ALPHA_T))
        ey0, ex0 = max(0, ys.min() - PAD), max(0, xs.min() - PAD)
        ey1, ex1 = min(H, ys.max() + 1 + PAD), min(W, xs.max() + 1 + PAD)
        sub = arr[ey0:ey1, ex0:ex1].copy()
        sub[..., 3] = np.where(km[ey0:ey1, ex0:ex1], sub[..., 3], 0)
        by0, by1, bx0, bx1 = 0, sub.shape[0], 0, sub.shape[1]
        touches = ys.min() <= 1 or xs.min() <= 1 or ys.max() >= H - 2 or xs.max() >= W - 2
        crop = sub[by0:by1, bx0:bx1].copy()
        crop[..., 3] = np.where(crop[..., 3] <= 3, 0, crop[..., 3])
        crop[..., :3] = bleed_colour(crop[..., :3], crop[..., 3])
        h, w = crop.shape[:2]
        s = min(1.0, CAP / max(h, w))
        if s < 1.0:
            size = (max(1, round(w * s)), max(1, round(h * s)))
            crop = resize_premul(crop, size)
        if item_id in entry.get('flip', []):  # faces the wrong way on the sheet
            crop = crop[:, ::-1].copy()
        h, w = crop.shape[:2]
        desc = descs.get(item_id, '')
        flat = desc.startswith('flat, face-on') or base_id(item_id) in FLAT_EXTRA
        foot = foot_point(crop[..., 3], flat)
        cx = upper_centroid(crop[..., 3])
        centroids[item_id] = (cx, foot, s)
        base = base_id(item_id)
        if base != item_id and base in centroids:
            # a second walking pose: line its body up with the first pose's, so swapping poses
            # moves the legs, not the figure (the foot is where the first pose's foot falls)
            bcx, bfoot, bs = centroids[base]
            foot = [int(round(cx + (bfoot[0] - bcx) * s / bs)), foot[1]]
        path = os.path.join(out_dir, 'sprites', f'{item_id}.webp')
        Image.fromarray(crop, 'RGBA').save(path, 'WEBP', quality=QUALITY, method=6, alpha_quality=90)
        rec = {'file': f'sprites/{item_id}.webp', 'w': w, 'h': h, 'foot': foot,
               'kind': KIND.get(item_id) or KIND.get(base_id(item_id), 'prop'), 'sheet': entry.get('sheets', {}).get(item_id, sheet)}
        if flat:
            rec['flat'] = True
        rec['desc'] = entry.get('desc', {}).get(item_id) or DESC.get(item_id) or short_desc(desc)
        meta[item_id] = rec
        warn = ' (touches sheet edge)' if touches else ''
        print(f'  {item_id:24s} {w:4d}x{h:<4d} foot={foot} {rec["kind"]}{" flat" if flat else ""}{warn}')
    return meta


def main(argv):
    prompts = load_prompts()
    entries = [e for e in load_sheets() if prompts[e['sheet']]['kind'] == 'sprites']
    # items re-rolled by a later entry are skipped in the earlier one
    later = {}
    seen = set()
    for e in reversed(entries):
        later[e['name']] = set(seen)
        seen |= set(e.get('items') or [n for n, _ in prompts[e['sheet']]['items']])
    if argv:
        entries = [e for e in entries if e['name'] in argv]
    for e in entries:
        print(f'[{e["name"]}] {e["raw"]}')
        e = dict(e, skip=list(set(e.get('skip', [])) | later[e['name']]))
        meta = process_entry(e, prompts, OUT)
        write_json_atomic(os.path.join(META, e['name'] + '.json'), meta)


if __name__ == '__main__':
    main(sys.argv[1:])
