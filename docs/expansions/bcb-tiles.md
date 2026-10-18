# Bridges, Castles & Bazaars – tile verification notes

> **Arbitrated 2026-10-17.** The tiles below were adopted unchanged into the final spec `bridges-castles-bazaars.json`
> (which converts cleanly: 11 types, 12 tiles). Changes made here: the converter now maps `castle_base: false` to
> `noCastle: true` (it no longer ignores it), and the same flag is required on two existing tiles — `IC/C!` feature 0
> and `DG/CCc+.p` feature 0 (MASTER BC16). The inns of `BB/R.bi` and `BB/RFR.bi` count only with Inns & Cathedrals
> (MASTER BC14).

Machine-readable twin: `bcb-tiles.json`. This file covers only the **tiles**. The rules are in the rules researcher's file.

**Edition:** our "3rd edition" is WikiCarpedia **C2**: Hans im Glück 2017 (German), Z-Man English 2018, new art by Anne Pätzke. The tiles are JCloisterZone tile set `bridges-castles-and-bazaars:2`. The 1st edition (HiG 2010, set `:1`) has the same 12 tiles with the same geometry. The only feature change is the garden on the pointed-city tile: `BB/CFR!` became `BB/CFR!G`.

## Result

| JCZ id | # | C2 scan | C1 scan | Features (canonical orientation, north up) | Bazaar |
|---|---|---|---|---|---|
| BB/Cccc.b | 2 | D | 01 | city N+E+S+W, no pennant | yes (in the city) |
| BB/CCCR | 1 | H | 02 | caps W, N, E (3 cities) · road S ends at the E cap's gate · field SR → W,N,E · field SL → E | – |
| BB/CFc.b | 1 | K | 03 | city W–E band · field NL NR → city · field SL SR → city | yes (in the city) |
| BB/CFR!G | 1 | I | 06 (as CFR!) | pointed city W (`castle_base: false`) · road E ends at the city gate · **garden** · field NL NR → city · field EL → city · field ER SL SR → city | – |
| BB/CFR.b | 1 | B | 05 | cap N · road S ends at the bazaar · field EL ER SL SR WL WR → city | yes (road end) |
| BB/F.b | 1 | A | 07 | field (all 8 halves) | yes (in the field) |
| BB/LCFc | 1 | G | 04 | city W–E band · **monastery inside the city** · field NL NR → city · field SL SR → city | – |
| BB/LRFr | 1 | F | 11 | road W–E (U-curve) · monastery · field WR NL NR EL · field ER SL SR WL | – |
| BB/R.bi | 1 | J | 08 | road S **with inn**, ends at the bazaar · field (all 8 halves) | yes (road end) |
| BB/RFR.b | 1 | E | 09 | road N ends at the bazaar · road S ends at the bazaar · field SR WL WR NL · field NR EL ER SL | yes (road ends) |
| BB/RFR.bi | 1 | C | 10 | road N ends at the bazaar · road S **with inn** ends at the bazaar · fields as RFR.b | yes (road ends) |

**Totals:** 12 tiles (11 layouts). **8 bazaar tiles**, 2 inns, 2 monasteries, 1 garden (3rd edition), 0 pennants.

## How it was checked

* **Script 1** (a copy of the `dev/build-expansions.mjs` conversion, plus extra checks; kept outside the repo in the session scratchpad as `validate_bcb.mjs`, not committed). It found no port claimed twice, every centre port resolved and no unassigned port. Every pair of features passes a planarity test (no two features interleave around the tile edge, so every field is one connected region and no road crosses a field). Every field that touches a city at a corner lists that city, and both halves of a through-road side lie in different fields. Summary line: `11 tile types, 12 tiles; bazaar tiles 8, gardens 1, monasteries 2, inns 2, pennants 0; problems: 0`. As a control, the same script flags exactly the known bridge and tunnel tiles in the other expansions (TB/RRrr, TO/CRcr, DG/CRcr.d).
* **Script 2** (`cmp_jcz.py`, also in the scratchpad) compares every tile with the JCloisterZone XML (commit 0f66860). Cities and pennants, roads and inns, field halves and the cities each field borders, monastery, garden, bazaar flag and the set-`:2` counts all match (**ALL MATCH**). Set `:1` differs from set `:2` only by `BB/CFR!` vs `BB/CFR!G`, and `BB/CFR!` = `BB/CFR!G` minus the garden.
* **Counts, from 4 independent sources:**
  * JCZ sets: 12 tiles.
  * WikiCarpedia C2 list: D ×2, the other 10 ×1.
  * WikiCarpedia C1 list: 01 ×2, the other 10 ×1. The site-wide *Carcassonne Tile List* gives the same counts.
  * S-CAR v7.3 tile appendix: CCCC 2, CCCR 1, CFCF 2, CFRF 2, FFFF 1, FFFR 1, FRFR 3; 8 bazaars, 2 monasteries, 2 inns.
  * Official rulebooks (EN 2018, DE 2017) say "12 land tiles … including 8 with a bazaar".
* **Art:** I looked at the C2 scans (WikiCarpedia, 110 px), the C1 scans (WikiCarpedia and the JCZ classic package) and the 3rd-edition box backs on BGG. The Z-Man 2018 and Mindok 2017 backs show C, K and J, matching the scans. Coordinates in `art` were measured on a 0.1 grid over the C2 scans (accuracy about ±0.03). All C2 scans are in the same orientation as the JCZ ids.

## Per tile

* **BB/Cccc.b ×2:** JCZ, both WikiCarpedia lists, S-CAR (CCCC 2) and the C1/C2 images agree. **Uncertain:** WikiCarpedia lists the two C2 copies as "(water tower; none)", so only one copy has the round blue-roofed tower north of the bazaar. I found a scan of the tower copy only. Paint the second copy the same without the tower, or paint both alike.
* **BB/CCCR:** JCZ, both lists, S-CAR, the C1 misprint photo on BGG (pic2915488) and the C2 scan agree: three separate caps, and the road ends at the **east** cap's gate. The C1 gate is higher on the cap than the C2 gate; topology is unchanged.
* **BB/CFc.b:** JCZ, both lists and the box backs agree. The bazaar is drawn inside the city and splits nothing.
* **BB/CFR!G:** JCZ (set :2), the WikiCarpedia C2 list ("(garden)", tile I), the WikiCarpedia *Abbot* garden list (the only BCB garden tile) and the C2 scan agree.
  * The pointed ("witch-hat") city touches the NE corner, so the N strip and the small EL triangle are **separate** fields.
  * WikiCarpedia (HiG 7/2010, Christof Tisch on BGG) and JCZ `castle-base="false"`: this city can never be part of a castle. Our new city property is `"castle_base": false`; the converter maps it to `noCastle: true`. In our scope JCZ also marks **IC/C!** and **DG/CCc+.p** this way, and MASTER BC16 adopts both: their feature 0 needs the same flag in `inns-cathedrals.json` / `princess-dragon.json`.
  * Its outline is the same as I&C `C!` (layout.js `capSpike`), turned so the city is on the west.
  * The C1 art differs: there is no garden, the wall bulges towards the south-east and the gate sits near the E edge.
* **BB/CFR.b:** JCZ, both lists, S-CAR (CFRF) and both scans agree. The bazaar does not touch the city wall, so one field wraps around it.
* **BB/F.b:** JCZ, both lists, S-CAR (FFFF 1) and both scans agree. The C2 art adds a farmhouse (decoration), and its bazaar sits up and to the left of centre (C1: centred).
* **BB/LCFc:** JCZ, both lists ("monastery in a city"), S-CAR (CFCF 2, monasteries 2) and both scans agree. The city is **one** feature from W to E, and the monastery is a separate feature inside it. Official WikiCarpedia note: you may place a monk even if knights are in the city and vice versa, and the monastery is complete when surrounded even if the city is not. The knight spot must avoid the church.
* **BB/LRFr:** JCZ, both lists, S-CAR (FRFR) and both scans agree. There is one continuous W–E road; the church stands in the north field.
* **BB/R.bi:** JCZ (`inn="true"`), both lists ("bazaar + inn"), S-CAR (FFFR 1, inns 2), both scans and the box backs agree. The inn and lake are west of the road.
* **BB/RFR.b:** JCZ, both lists, S-CAR (FRFR) and both scans agree: two roads, each ending at the bazaar, and two fields.
  * **WikiCarpedia's C2 list labels this tile (E) "bazaar + (garden)". I think that label is wrong.** The drawing in the east field is the official C2 *highwaymen* icon (robbers behind a bush; compared with `Feature_Highwayman_C2.png`).
  * Supporting evidence: the same page's legend includes "H = highwaymen", which fits no other tile. WikiCarpedia's own *Abbot* page lists only tile I as a BCB garden tile. JCZ's garden set has no garden version of this tile.
  * If a printed garden ever turns up, add `{type: garden}` with its centre at about (0.80, 0.75).
  * The C1 art puts the bazaar in the lower half.
* **BB/RFR.bi:** JCZ (inn on the **S** road only), both lists, S-CAR, both scans and the box backs agree. The inn only counts for the south road (WikiCarpedia FAQ 1/2021: "the inn only counts for a road segment printed next to it").

## Special geometry, all in the JSON `art`

* **Bazaar = road end.** Official clarification (10/2013): "the yellow ground of a bazaar ends a road", so a wagon cannot pass. On RFR.b and RFR.bi the bazaar plus two road stubs split the meadow in two. On CFR.b and R.bi a single road ends there and the meadow wraps around. On F.b, CFc.b and Cccc.b the bazaar is decoration in a field or city.
* **City split in three:** CCCR (three caps meeting only at corner points).
* **Road into a city gate:** CCCR (into the E cap) and CFR!G (into the pointed city).
* **Pointed city:** CFR!G. Its tip separates the N strip from the EL field.
* **Monastery inside a city:** LCFc.
* No bridges, tunnels, underpasses or enclosed inner fields on any BCB tile.

## Other boxes and editions

* The same tiles were in HiG **Big Box 3** (2010, C1), Hobby World's **Wheel of Fortune bundle** (2012, C1) and Hobby World's **Russian Big Box 2 "Royal Gift"** (2019, C2). No BCB tile appears in any other expansion.
* **3rd-edition misprint:** in the first HiG (Germany) and Mindok (CZ/SK) print runs, C (BB/RFR.bi) and I (BB/CFR!G) were missing and E (BB/RFR.b) and J (BB/R.bi) were included twice, giving 9 bazaars and no garden. We use the correct distribution.
* **C2 art changes (topology unchanged):** a garden on CFR!; a farmhouse on F.b; a water tower on one Cccc.b; highwaymen on RFR.b; bazaars moved (RFR.b bottom → top, F.b centre → upper left); the CFR! gate moved from the E edge to mid-tile; tents on brown earth instead of a yellow oval with three canopies.
* The 2025 *Castles & Bridges* (C3.1) replaces this expansion with 16 different tiles and no bazaars. It is not in scope.

## Extra JSON fields

* `castle_base: false` on the city of BB/CFR!G — **used** by the converter (→ `noCastle: true`).

Ignored by the converter:

* `first_edition_id` on BB/CFR!G.
* `note` on some features.
* `refs`: the scan file names.
* `layout_hint`: suggestions in the format of `public/js/layout.js` `H`, with feature indexes matching the `features` arrays. Keys:
  * existing keys: `cities` (depth/top/bottom/shape), `roads` (end/c1/c2), `monastery`, `garden`, `inns`;
  * new decoration keys: `bazaar: [x, y, r]` (centre and radius of the market patch), `farmhouse`, `water_tower` (one copy only), `highwaymen`, `shrub`.
