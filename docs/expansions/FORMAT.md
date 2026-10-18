# Expansion research format

Every expansion researcher writes two files in `docs/expansions/`:

* `<slug>.json` – machine-readable tile list + structured rules (format below)
* `<slug>.md` – human-readable rules spec, edge cases, interactions, sources

We implement the **3rd edition** (Hans im Glück / Z-Man, 2014+, the edition with
gardens printed on some tiles) unless stated otherwise. Note any differences to
earlier editions.

## How our engine models a tile

A tile is drawn in its canonical orientation (north up). Every edge is split
into three *ports*:

```
        0  1  2              N side = ports 0 1 2 (0 = west part, 1 = centre, 2 = east part)
    11           3           E side = ports 3 4 5 (3 = north part)
    10  (tile)   4           S side = ports 6 7 8 (6 = east part)
     9           5           W side = ports 9 10 11 (9 = south part)
        8  7  6
```

A *feature* is a city, road, river, field, monastery or garden; it lists the
ports it touches. Roads and rivers use the centre port of a side. Cities use all
three ports of a side. Fields use the outer ports (and the centre port when that
side carries no road/river). Edge types must match between neighbours
(city/road/field/river).

Instead of ports, researchers describe fields with **half-edges** exactly like
JCloisterZone: `NL NR EL ER SL SR WL WR`. `L` is the half that comes first
going clockwise from the north-west corner:

* `NL` = west half of the north edge, `NR` = east half
* `EL` = north half of the east edge, `ER` = south half
* `SL` = east half of the south edge, `SR` = west half
* `WL` = south half of the west edge, `WR` = north half

A field that touches no edge at all (e.g. enclosed by four city caps) has
`"inner": true` and an empty `halves` list.

## JSON format

```jsonc
{
  "slug": "inns-cathedrals",
  "name": "Inns & Cathedrals",
  "edition": "3rd edition (2014+)",
  "sources": [{ "title": "...", "url": "...", "used_for": "..." }],
  "components": [
    { "name": "Large meeple", "per_player": 1, "notes": "counts as 2 followers" }
  ],
  "tiles": [
    {
      "id": "IC/Cccc.c",            // keep the JCloisterZone id for traceability
      "count": 2,
      "name": "Cathedral city",
      "features": [
        // city: sides, pennants (int), cathedral, goods ("wine"|"grain"|"cloth"), princess,
        //       castle_base: false when the segment can never be half of a castle (Bridges, Castles & Bazaars;
        //       the converter writes noCastle: true)
        { "type": "city", "sides": ["N", "E", "S", "W"], "pennants": 0, "cathedral": true },
        // road: sides (1 side = the road ends on this tile), inn
        { "type": "road", "sides": ["W", "E"], "inn": true },
        // river: sides (1 side = spring or lake)
        { "type": "river", "sides": ["W", "E"] },
        // field: halves, inner, cities = indexes (into this features array) of cities it borders
        { "type": "field", "halves": ["NL", "NR", "EL"], "cities": [0] },
        { "type": "monastery" },
        { "type": "garden" }
      ],
      // tile-level symbols: "volcano", "dragon", "portal", "tower" (tower foundation),
      // "spring", "lake", "start", "bazaar"
      "tags": [],
      // What the printed tile looks like, precisely enough to paint it:
      // city shape (cap / corner / band / three-sided / full / small cap ...),
      // where a road ends (at a city gate, a junction house, a monastery...),
      // which side of the road an inn/lake is on, where a garden/cathedral/goods
      // symbol/princess/portal/volcano/tower foundation sits, and anything that
      // separates fields without being a road (e.g. a city wall reaching a corner).
      "art": "..."
    }
  ],
  "rules": {
    "setup": ["..."],
    "turn_sequence": ["..."],          // exactly where the expansion hooks into a turn
    "placement": ["..."],
    "followers": ["..."],
    "scoring_during_game": ["..."],
    "scoring_end": ["..."],
    "edge_cases": ["..."],             // official FAQ / clarifications, with source
    "interactions": {                  // with base and each other expansion in scope
      "base": ["..."], "river": [], "abbot": [], "inns-cathedrals": [],
      "traders-builders": [], "princess-dragon": [], "tower": []
    },
    "edition_differences": ["..."],
    "ai_hints": ["..."],               // strategy notes for our computer players
    "kid_rules_text": "...",           // accurate, friendly in-app rules for a 12-year-old
    "figures": ["..."]                 // illustrations worth drawing in the in-app rules
  }
}
```

## Expansions in scope (slugs)

`river`, `abbot`, `inns-cathedrals`, `traders-builders`, `princess-dragon`, `tower`, `bridges-castles-bazaars`
(engine expansion id `bridges`; arbitrated in `MASTER.md` §H)
