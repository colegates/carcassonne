# Inns & Cathedrals (Expansion 1) — rules spec, 3rd edition

Machine-readable data: [`inns-cathedrals.json`](inns-cathedrals.json) (tiles + structured rules).
Source keys like **(ZM3 p.2)** are listed under [Sources](#sources).

## 1. Summary

| Element | Rule (3rd edition) |
|---|---|
| Inn (6 tiles) | A road with **one or more** inns scores **2 points per tile** when completed. If it is **incomplete at game end it scores 0**. Extra inns add nothing. |
| Cathedral (2 tiles) | A city with **one or both** cathedrals scores **3 per tile + 3 per pennant** when completed. **Incomplete at game end: 0.** A second cathedral adds nothing. |
| Large meeple (1 per player) | Placed **instead of** a normal meeple, same placement rules. Counts as **2 followers for majority** (roads, cities, fields). Never multiplies points. It is **one figure** for every other effect (capture, 3-point ransom, dragon, princess, fairy, portal). Cannot go on a garden. |
| 6th player | Pink set: 8 meeples (7 followers + score marker), pink large meeple, pink abbot. |
| Points tiles 50/100 | Score-track lap markers only — irrelevant for the app. |

**Edition naming.** The FORMAT's "3rd edition" (Hans im Glück 2014 base / 2015 I&C, new art, gardens, pink 6th colour) is what Wikicarpedia calls **C2**. The 2021 graphics refresh (**C3**, Big Box 2021: "cities with clipped buildings") has identical tiles and rules. The original 2002 edition is **C1**.

## 2. Components (ZM3 p.1)

* 18 land tiles, marked with a small meeple symbol: 6 inns, 2 cathedrals, 2 gardens, 1 monastery, 3 pennants (17 tile types; the cathedral tile appears twice).
* 6 large meeples (yellow, red, green, blue, black, pink).
* 8 pink meeples + 1 pink abbot (6th player).
* 6 points tiles 50/100.

There are **two** garden tiles, not one: IC/CCCCG (four caps) and IC/RFr.iG (straight road with inn). Both replace their 1st-edition versions, which had no garden (JCZ tile-set `inns-and-cathedrals:2`; WIC; WAB).

## 3. Tiles

All descriptions use the canonical (north-up) orientation of the JCloisterZone data, which matches our half-edge notation. The 3rd-edition scans on Wikicarpedia use the same orientation except **IC/C!**, which is pictured rotated 90° counter-clockwise (city on the W edge). Positions are given as (x, y), from 0 to 1, with x pointing east and y pointing south. They are approximate, measured from the 110 px 3rd-edition scans.

| # | JCZ id | n | Name | Edges N E S W | Special | C2 scan / C3 code | Decoration |
|---|---|---|---|---|---|---|---|
| 1 | IC/Cccc.c | 2 | Cathedral city | C C C C | cathedral | Ka, Kb / V3-EKa, EKb | market stalls |
| 2 | IC/LRFR | 1 | Monastery on the road | F R F R | monastery | D / V3-ED | — |
| 3 | IC/CCCCG | 1 | Four city caps with garden | C C C C | inner field, garden | H / V3-EH | garden |
| 4 | IC/CCC | 1 | Three city caps | C C F C | — | O / V3-EO | farmhouse |
| 5 | IC/CRCR | 1 | Village between two city caps | C R C R | 4 fields | I / V3-EI | village |
| 6 | IC/CCc+ | 1 | Corner city with pennant + opposite cap | C F C C | 1 pennant | P / V3-EP | water tower |
| 7 | IC/C! | 1 | City wedge with wall to the corner | C F F F | 2 fields | G / V3-EG | water tower |
| 8 | IC/CFR | 1 | City cap with road from its gate | C F R F | — | J / V3-EJ | highwaymen |
| 9 | IC/CcR | 1 | Corner city with gate road | C R F C | — | F / V3-EF | donkey stable |
| 10 | IC/CRcR+ | 1 | City band with pennant, two gate roads | R C R C | 1 pennant | Q / V3-EQ | — |
| 11 | IC/RCc.i | 1 | Corner city, gate road with inn | C F R C | inn | N / V3-EN | — |
| 12 | IC/RrC.i | 1 | City cap, curved road with inn | C F R R | inn | M / V3-EM | bush |
| 13 | IC/CcRr+.i | 1 | Corner city with pennant, curved road with inn | C R R C | inn, 1 pennant | L / V3-EL | — |
| 14 | IC/RRR.i | 1 | Junction without village, with inn | F R R R | inn (W+E roads) | C / V3-EC | pigsty |
| 15 | IC/RFr.iG | 1 | Straight road with inn and garden | F R F R | inn, garden | B / V3-EB | garden |
| 16 | IC/Rr.i | 1 | Curved road with inn | F F R R | inn | A / V3-EA | highwaymen |
| 17 | IC/RrRr | 1 | Two curved roads | R R R R | — | E / V3-EE | farmhouse |

The decorations (farmhouse, pigsty, donkey stable, "water tower" = the round tower with a grey conical roof, highwaymen) have no rules effect in any expansion in scope. Gardens matter only with The Abbot.

### Feature lists (half-edges)

Field `cities` give the indexes of the cities the field borders, as in the JSON. Features are ordered cities, roads, monastery/garden, fields.

| Tile | Features |
|---|---|
| IC/Cccc.c | 0 city NESW, cathedral |
| IC/LRFR | 0 road W · 1 road E · 2 monastery · 3 field NL NR EL WR · 4 field ER SL SR WL |
| IC/CCCCG | 0 city N · 1 city E · 2 city S · 3 city W · 4 garden · 5 field **inner** (no halves) → cities 0,1,2,3 |
| IC/CCC | 0 city N · 1 city E · 2 city W · 3 field SL SR → 0,1,2 |
| IC/CRCR | 0 city N · 1 city S · 2 road W · 3 road E · 4 field WR → 0 · 5 field EL → 0 · 6 field ER → 1 · 7 field WL → 1 |
| IC/CCc+ | 0 city NW (1 pennant) · 1 city S · 2 field EL ER → 0,1 |
| IC/C! | 0 city N · 1 field EL ER → 0 · 2 field SL SR WL WR → 0 |
| IC/CFR | 0 city N · 1 road S · 2 field SR WL WR → 0 · 3 field EL ER SL → 0 |
| IC/CcR | 0 city NW · 1 road E · 2 field EL → 0 · 3 field ER SL SR → 0 |
| IC/CRcR+ | 0 city EW (1 pennant) · 1 road N · 2 road S · 3 field NL → 0 · 4 field NR → 0 · 5 field SL → 0 · 6 field SR → 0 |
| IC/RCc.i | 0 city NW · 1 road S (inn) · 2 field SR → 0 · 3 field EL ER SL → 0 |
| IC/RrC.i | 0 city N · 1 road WS (inn) · 2 field EL ER SL WR → 0 · 3 field SR WL |
| IC/CcRr+.i | 0 city NW (1 pennant) · 1 road ES (inn) · 2 field EL SR → 0 · 3 field ER SL |
| IC/RRR.i | 0 road W (**inn**) · 1 road E (**inn**) · 2 road S (no inn) · 3 field NL NR EL WR · 4 field SR WL · 5 field ER SL |
| IC/RFr.iG | 0 road WE (inn) · 1 garden · 2 field NL NR EL WR · 3 field ER SL SR WL |
| IC/Rr.i | 0 road WS (inn) · 1 field NL NR EL ER SL WR · 2 field SR WL |
| IC/RrRr | 0 road NW · 1 road ES · 2 field NL WR · 3 field ER SL · 4 field NR EL SR WL |

Validated by script: on every tile each of the 12 ports belongs to exactly one feature, each half of every non-city side belongs to exactly one field, and every field `cities` index points to a city. Compared against JCloisterZone `inns_and_cathedrals.xml` (set `inns-and-cathedrals:2`), all cities, roads, fields, pennants, gardens and counts are identical. The only difference is intentional: IC/RRR.i has the inn on the **W and E** roads (3rd-edition rule), whereas JCZ has it on E only (1st-edition rule).

### Art notes per tile

**IC/Cccc.c ×2 — Cathedral city.** All four edges are city, with no wall visible inside the tile and ochre/brown city ground. A large cathedral fills the middle ~70% of the tile, centred: cream stone, buttresses, tall arched windows, red cross-shaped roofs and a bell tower. Market stalls with coloured awnings stand around it. No pennant. The two copies are drawn differently. Copy "Ka" has a fortress-like front block centre-left, a small annex bottom-left, the nave to the upper right and a round chapel on the right. Copy "Kb" is a cruciform Gothic cathedral seen diagonally, with a twin-towered façade top-left, the transept upper right and a long side aisle bottom-left.

**IC/LRFR — Monastery on the road.** The monastery stands in the centre, on the road line: a cream church with a tall red spire at its west end. One road runs from the middle of the W edge to the monastery's west door. A second road runs from the monastery's east side to the middle of the E edge. These are **two separate roads** ("this monastery cuts the road in 2 segments", ZM3 p.3). Monastery plus roads form a barrier from W to E, so the **north and south fields are separate**.

```
 +-----------+
 |   north   |   field NL NR EL WR
 |=====M=====|   road W ends at M | road E ends at M
 |   south   |   field ER SL SR WL
 +-----------+
```

**IC/CCCCG — Four city caps with garden.** Four separate small caps, one per edge. Each wall bows ~25% into the tile from corner to corner, so the caps meet exactly at the corners and form **four different cities**. The enclosed field touches no edge (inner field) and borders all four cities. A garden plot (fenced vegetable/flower bed, drawn as a diamond) sits in the very centre.

```
 +-----------+
 |\CCCCCCCCC/|
 |C\       /C|   4 separate one-edge cities
 |CC  [G]  CC|   enclosed field + garden [G] (abbot only)
 |C/       \C|
 |/CCCCCCCCC\|
 +-----------+
```

**IC/CCC — Three city caps.** Separate caps on the N, E and W edges, each running corner to corner and touching at the NW and NE corners. The field opens onto the whole S edge and borders all three cities. A farmhouse stands at about (0.45, 0.8).

**IC/CRCR — Village between two city caps.** City caps sit on the N and S edges (~28% deep), each with a gate facing the centre. A small round walled village (red roofs, radius ~0.15) is in the centre. The W road and the E road each end at the village. Two very short stubs connect the village to the N and S gates. **They are not roads** and nobody may stand on them (red X in ZM3 p.3), but they split the grass into **four corner fields**: NW and NE border the N city, SW and SE border the S city.

```
 +-----------+
 |CCCCC^CCCCC|   N cap, gate ^
 | NW  |  NE |   | = decorative stub, not a road
 |=====V=====|   W road and E road end at the village V
 | SW  |  SE |
 |CCCCCvCCCCC|   S cap, gate v
 +-----------+
```

**IC/CCc+ — Corner city with pennant and opposite cap.** A two-sided corner city covers the N and W edges, with a pennant top-left at (0.12, 0.12). Its diagonal wall runs from the NE corner to the W edge just above the SW corner. A separate small cap sits on the S edge (SW corner to SE corner, ~22% deep). Between them is a wedge of field that touches only the E edge and tapers to a point at the SW corner. It borders both cities. A round grey-roofed tower stands in the corner city at about (0.35, 0.15). The 2021 Big Box picture shows this tile rotated 90° clockwise.

**IC/C! — City wedge with wall to the corner.** The city on the N edge is a wedge. Its west wall runs **straight from the NW corner to the SE corner**. Its east wall runs from the NE corner to the SE corner, bowing only slightly inward, so **both walls meet in the SE corner**. A thin lens of field (at most ~12% wide) along the E edge forms field EL ER. The big triangle below the diagonal covers the S and W edges (field SL SR WL WR). Because the wall reaches the corner these are **separate fields** ("the field ends here", ZM3 p.3); both border the city. A round grey-roofed tower stands near the middle of the N edge. No pennant.

```
 +-----------+   C = city (N edge only), : = strip field on E edge (EL ER)
 |\CCCCCCCCC:|   . = big field (SL SR WL WR)
 |.\CCCCCCCC:|   \ = west wall, NW corner -> SE corner
 |..\CCCCCCC:|
 |....\CCCCC:|
 |......\CCC:|
 |........\C:|
 |..........\|   <- both walls meet in the SE corner
 +-----------+
```

**IC/CFR — City cap with road from its gate.** A shallow N cap (~25% deep) has a gate in the middle of its wall. A winding road runs from the gate to the middle of the S edge and ends at the gate. The west and east fields both border the city. Highwaymen sit under a tree in the east field at (0.78, 0.72).

**IC/CcR — Corner city with gate road.** A corner city covers N and W, with its diagonal wall from the NE corner to the SW corner. The gate is near (0.38, 0.58). A road runs from the middle of the E edge to the gate and ends there. North of the road is a small triangle field that touches only EL. South of the road is the big field ER SL SR. A donkey stable stands in the SE at (0.72, 0.8).

**IC/CRcR+ — City band with pennant, two gate roads.** The city crosses the tile from the W edge to the E edge, with its pennant on the east side at (0.85, 0.5). The north wall sags to ~38% depth at the centre and the south wall rises to ~78%. A road from the middle of the N edge ends at a gate in the north wall, and a road from the middle of the S edge ends at a gate in the south wall. These are two separate roads. Together they split the grass into four small fields, each bordering the city.

**IC/RCc.i — Corner city, gate road with inn.** A corner city covers N and W, with its wall from the NE corner to the SW corner. A road runs from a gate a little below the centre straight down to the S edge. The **inn stands east of the road** at (0.78, 0.65), with chimney smoke. **Its lake is just south of the inn**, also east of the road, near the S edge at (0.78, 0.88). The small field west of the road touches only SR.

**IC/RrC.i — City cap, curved road with inn.** An N cap dips to ~40% depth. The road enters at mid-W, runs east to x ≈ 0.35 and bends south to mid-S. The **inn is on the outer side of the bend**, at the tile centre just below the city at (0.55, 0.53). **The lake is south-east of the inn**, east of the road's southern leg, at (0.75, 0.68). A dark bush sits inside the bend, in the SW field, which does not border the city.

**IC/CcRr+.i — Corner city with pennant, curved road with inn.** A corner city covers N and W, with its pennant top-left. The road enters at mid-E, runs west to x ≈ 0.75 and bends south to mid-S. The **inn and lake are inside the bend**, in the SE-corner field (ER SL, not bordering the city). The inn sits just below the road's east leg at (0.72, 0.65), the lake below it near the S edge at (0.68, 0.88), and a bush near the E edge. The narrow band between the wall and the road (EL SR) borders the city. 1st-edition art put the inn in that band instead; this is art only.

**IC/RRR.i — Junction without village, with inn.** Roads from mid-W, mid-E and mid-S meet slightly below the centre at a **clump of trees, with no village or house**. All three roads still **end** there, so there are three roads ("a crossroads without a village in the middle also splits roads", WIC). North of the W–E line, the **lake** lies at upper left-centre (x 0.28–0.7) and the **inn** directly to its right at (0.75, 0.38). Together they sit above both the W and the E road, so **the inn counts for the W road and the E road, not the S road** (ZM3 p.2; BB21 p.11). A pigsty stands in the SW field.

```
 +-----------+
 | ~lake~ INN|   north field
 |=====T=====|   W road (inn) and E road (inn) end at the trees T
 |  SW  |  SE|   S road (NO inn) ends at T
 +------|----+
```

**IC/RFr.iG — Straight road with inn and garden.** A gently wavy road runs from mid-W to mid-E. **North of the road** the inn stands at (0.33, 0.27), with chimney smoke, and its **lake lies directly east of it** at (0.6, 0.38). Both are just above the road. **South of the road** is a garden plot at (0.6, 0.8).

**IC/Rr.i — Curved road with inn.** The road enters at mid-W, runs east to x ≈ 0.45 and bends to mid-S. The **inn** is at top centre-right (0.65, 0.18) with the **lake south-east of it** at (0.72, 0.45). Both are on the **outer (north-east) side** of the bend, the lake close to it. Highwaymen under a tree sit inside the bend at (0.2, 0.7).

**IC/RrRr — Two curved roads.** One road runs from mid-N to mid-W and cuts off the NW corner field. The other runs from mid-E to mid-S and cuts off the SE corner field. The two roads do not touch. The broad diagonal band between them is one field (NR EL SR WL) with a farmhouse in the centre.

## 4. Rules

### Setup
1. Shuffle the 18 tiles into the base stack. There is no new start tile (ZM3 p.1).
2. Each player adds the large meeple of their colour to their supply, giving 7 normal + 1 large meeple (ZM3 p.3).
3. Up to 6 players. The 6th colour is **pink** in the 3rd edition and was grey in the 1st edition. The app already uses pink (`PLAYER_COLORS.pink` in game.js, `COLOR_ORDER` in lobby.js), which is the authentic 3rd-edition choice.

### Where the expansion hooks into a turn
1. **Place a tile:** unchanged.
2. **Place a meeple:** add the option "large meeple" to every legal road, city, field or monastery spot on the tile just placed, if it is still in the player's supply. It is **instead of** a normal meeple, so still one figure per turn. It is never allowed on a garden.
3. **Score:** road points ×2 if the road contains any inn. City points ×3 instead of ×2 if the city contains any cathedral. Majority uses strength: normal meeple 1, large meeple 2. Return all figures, including the large meeple.
4. **Final scoring:** an incomplete road with an inn scores 0 and an incomplete city with a cathedral scores 0. A large-meeple farmer counts as 2 farmers.

### Inns (ZM3 pp.1–2; BB21 p.10)
* Completed road with ≥1 inn: **2 points per tile** ("per tile with a segment of this completed road": tiles are counted, not segments). Example: 5 tiles → 10, with one inn or two.
* Incomplete at game end: **0 points**, for everybody, even the majority holder.
* An inn only affects the road segment(s) it is drawn next to (WIC note; CAR note 50). Only IC/RRR.i has more than one road; its inn affects the W and E roads.

### Cathedrals (ZM3 p.2; BB21 p.10)
* Completed city with one or both cathedrals: **3 points per tile + 3 per pennant**. Example: 7 tiles + 2 pennants = 27.
* Incomplete at game end: **0 points**.
* The cathedral is part of the city: a meeple on a cathedral tile is a knight, not a monk.

### Large meeple (ZM3 p.3; BB21 p.11; CAR p.32)
* Placed instead of a normal meeple, under exactly the same rules: only into an unoccupied feature of the tile just placed.
* It counts as 2 when majorities are decided in roads, cities and fields (lying down as a farmer).
* **It never multiplies points** (official: "the only function of the large meeple is to obtain the majority more quickly"). On a monastery it is just a monk.
* Ties follow the usual rule. Large (2) vs one normal (1): the large meeple's owner alone scores (ZM3 example, 8 points). Large (2) vs two normal (2): both score in full (BB21 example, 12 each).
* After scoring it returns to the supply. As a farmer it stays until game end.
* It is **one figure** for all other effects. A tower captures it in one go, its ransom is 3 points ("it may be big, but it's still only one person"), the dragon eats it, the princess removes it as one knight, the fairy can be assigned to it, and it can travel through a magic portal.
* It cannot be placed on a garden: "a normal meeple cannot be placed on a garden" (BB21 p.9). JCZ enforces this too.

### Scoring formulas for our engine (`groupPoints`)
```
road complete:   tiles * (hasInn ? 2 : 1)
road incomplete: hasInn ? 0 : tiles
city complete:   (tiles + pennants) * (hasCathedral ? 3 : 2)
city incomplete: hasCathedral ? 0 : (tiles + pennants)
majority weight: meeple 1, large 2 (abbot 1 on its monastery/garden)
farms:           unchanged (3 per adjacent completed city; 4 with T&B pig)
```
`hasInn` / `hasCathedral` = any feature in the group carries `inn: true` / `cathedral: true`. Our `getGroup` already counts unique tiles (`g.tiles.size`), so a road crossing one tile twice is counted once, as required.

## 5. Edge cases and FAQ

1. **Junction inn (IC/RRR.i):** three separate roads. The inn counts for left and right (W, E), not down (S) (ZM3 p.2 picture; BB21 p.11).
2. **Several inns / both cathedrals in one feature:** no extra effect (ZM3 p.2).
3. **Sabotage is legal:** you may attach an inn to an opponent's road or a cathedral to an opponent's city, threatening them with 0 at game end. This is an official clarification (WIC; CAR p.33 note 51).
4. **No meeple "on" an inn or cathedral.** They are not features (WIC, community interpretation).
5. **Village stubs (IC/CRCR) are not roads.** No highwayman may stand on them; they only split the fields (ZM3 p.3).
6. **Monastery on the road (IC/LRFR):** it ends both roads; the north and south fields are separate (ZM3 p.3; JCZ-T).
7. **Wall to the corner (IC/C!):** the E-edge strip and the S/W field are separate (ZM3 p.3).
8. **Four caps (IC/CCCCG):** four separate cities. The enclosed field can never be joined, so a farmer there scores 3 per completed cap (max 12) without contest (ZM3 p.2).
9. The **large meeple can't join an occupied feature directly.** It only gets there when a later tile merges two features, and then it counts 2.
10. **Only the large meeple left in supply:** you may still place it.
11. **Large meeple on a monastery:** allowed, but no advantage (official, WIC note 4).
12. **Fairy (P&D) and 0-point features:** the fairy's 3 points are paid when the fairy's meeple's feature is scored "regardless of whether or not you score points" (WPD). That includes an incomplete inn road or cathedral city in final scoring; the JCZ engine test `fairy-endgame-incomplete-inn` expects exactly this. This is an interpretation, not an explicit official FAQ.

## 6. Interactions with the other expansions in scope

**Base game.** Farm scoring is unchanged. A completed cathedral city is one ordinary completed city for farmers (3 points), and incomplete cathedral cities give farmers nothing. A large meeple counts as 2 farmers. The I&C monastery is a normal monastery.

**River.** No rule interaction. River tiles come first, then the normal stack. Inn lakes are decoration and never connect to river lakes. Roads on river tiles extend normally into inn roads.

**Abbot.**
* Gardens appear on IC/CCCCG (enclosed field) and IC/RFr.iG (south field). Only an abbot may occupy them, and they score like a monastery (WAB; BB21 p.9).
* The large meeple can't go on a garden, but it may be a monk on the IC/LRFR monastery, as may the abbot.
* Recalling the abbot replaces meeple placement, so no large meeple can be placed that turn.
* The pink abbot comes with I&C.

**Traders & Builders.**
* The builder needs one of your meeples on the road or city; a large meeple counts. HiG says "meeple"; the ZMG text "normal meeple" is a known error (WTB).
* The pig needs your farmer; a large-meeple farmer counts. The pig itself never counts toward majority. With the pig, each completed city is worth 4, cathedral or not.
* Goods go to whoever completes the city, as usual, including cathedral cities.
* In a double turn, a large meeple freed by the first tile's scoring may be placed on the second tile.

**Princess & Dragon.**
* The **dragon eats the large meeple**, which returns to its owner. The fairy's tile is protected.
* A **princess tile may remove a large meeple** from the extended city: any one knight, yours or an opponent's. If you remove one, you place no figure that turn. An early 1st-edition FAQ protected the big follower; that was superseded (CAR p.59 note 162).
* A **magic portal may place the large meeple** on any unoccupied, unfinished feature anywhere. That excludes gardens and the dragon's tile.
* The **fairy may be assigned to a large meeple**: 1 point at the start of your turn, dragon protection, and 3 points on scoring. The fairy gives no protection from the princess.
* No meeple at all may be placed on a volcano tile.
* The dragon does not affect printed inns or cathedrals (WPD).

**Tower.**
* A tower can capture the large meeple: one capture removes 2 majority strength.
* **Ransom stays 3 points** (official).
* Prisoner exchange is automatic and figure for figure, so a large meeple can be swapped for a normal one. With several prisoners, the owner chooses which to take back (WTW).
* The large meeple may be placed on top of a tower to close it. This is official: The Tower 3rd-edition rulebook p.4, "Figures you may place on a tower: Large meeple" (JCZ allows it too).
* No I&C tile has a tower foundation.

## 7. Edition differences

* **IC/RRR.i inn:** in the 1st edition "the inn lies on the right-hand road segment", so only the E road counts (WIC1; CAR p.31). In the 3rd edition both the W and E roads count (ZM3; BB21). **JCloisterZone encodes the 1st-edition version.** We follow the 3rd edition.
* **Gardens:** only the 3rd edition has them, on the four-caps tile and the straight inn road (1st edition: IC/CCCC, IC/RFr.i).
* **6th colour:** grey in the 1st edition, pink + abbot in the 3rd. In Big Box 6/7 the pink set belongs to the base game.
* **IC/CRCR:** the 2002 print did not clearly show the village ending the roads; later prints fixed the art, and the rule is unchanged.
* **IC/CcRr+.i art:** the inn sits between the city and the road in the 1st edition and inside the bend in the 3rd. No rules effect.
* **Terminology:** the 1st edition says "big follower" and "thief"; the 3rd says "large meeple" and "highwayman".
* **C3 (2021) vs C2 (2015):** new graphics only. The Big Box wording adds "per tile with a segment of this completed road".

## 8. AI hints

* Treat the large meeple as a trump for contested or soon-to-merge features (2 beats 1; 2 ties with 2), big late farms, and high-stakes cathedral cities or inn roads. Don't waste it on monasteries or tiny features, and don't hoard it: in 5–6 player games each player gets only ~15–18 turns.
* Value inn roads and cathedral cities as p × 2 × tiles and p × 3 × (tiles + pennants), where p is the chance of completion. At game end they are worth 0 if open. Estimate p from the number of open ends and how many remaining tiles fit them.
* Late game: don't add an inn or cathedral to your own open feature unless it can close now. Do add one to an opponent's big open road or city.
* The cathedral tile has 4 city edges and usually adds open edges. Use it to fill holes (2–4 city neighbours) in your own cities, and as sabotage on an opponent's city late in the game.
* IC/RRR.i: only its W and E roads are inn roads.
* IC/CCCC(G) and IC/CCC spawn cheap 1-edge caps (a 2-tile city is worth 4). The enclosed field of IC/CCCC(G) is an uncontestable farm worth up to 12.
* Tower: keep the large meeple out of range, and prioritise capturing opponents' large meeples. Princess: removing an opponent's large meeple is a big swing. Dragon: put the fairy next to your large meeple. T&B: pair the builder with a large meeple, and the pig with a large-meeple farmer.

## 9. In-app rules text (age 12)

> Inns & Cathedrals adds 18 new tiles, a big meeple for every player and pink meeples so up to 6 people can play.
>
> **Inns:** Some roads pass a little inn by a lake. When a road with an inn is finished, it is worth 2 points for every tile instead of 1. But careful: if that road is still unfinished when the game ends, it is worth nothing at all! Two inns on one road are not better than one.
>
> **Cathedrals:** Two tiles show a huge cathedral in the middle of a city. A finished city with a cathedral scores 3 points for every tile and every shield instead of 2. If it is still unfinished at the end of the game, it scores 0. A second cathedral does not add more. You may also add an inn or a cathedral to someone else's road or city — if they cannot finish it, they get nothing!
>
> **The big meeple:** You place it instead of a normal meeple, with the normal rules: on the tile you just put down, and never on a road, city or field that already has a meeple. When the game checks who has the most meeples somewhere, your big meeple counts as two. It does not give double points, it just helps you win. If it is a tie, everyone tied gets the points. After scoring it comes back to you like any meeple. It cannot stand on a garden; only the abbot can.
>
> **Tricky tiles:** The crossroads with the inn ends all three roads. The inn counts for the left and right roads, but not the one going down. The monastery sits in the middle of a road and cuts it in two. On the tile with the little village, the short paths to the city gates are not roads, so nobody can stand on them. The tile with four small cities has four separate cities and a closed field in the middle.

## 10. Figures worth drawing

1. A finished 5-tile road with an inn = 10 points; the same road with 2 inns = still 10.
2. An unfinished inn road at game end = 0.
3. A cathedral city of 7 tiles + 2 shields = 9 × 3 = 27.
4. An unfinished cathedral city at game end = 0.
5. Large meeple vs one meeple in a 4-tile city: 8 points to the large meeple's owner, 0 to the other.
6. Large meeple vs two meeples: a tie, 12 points each.
7. A large-meeple farmer vs one blue farmer: only you score 9 for 3 finished cities.
8. A normal meeple next to the large meeple ("as thick as two").
9. IC/RRR.i: the W and E roads glowing as inn roads, the S road plain.
10. IC/CRCR: a red X on the stubs, arrows showing the roads end at the village, four fields coloured.
11. IC/LRFR: two roads ending at the monastery, north and south fields coloured.
12. IC/C! next to a city: an arrow at the corner, "the field ends here".
13. IC/CCCCG: four separately coloured cities and the enclosed field with its garden (abbot only).
14. Sabotage: a cathedral dropped into an opponent's big open city near the end of the game.

## 11. Open points / uncertainties

* **Fairy bonus on a 0-point feature** (incomplete inn road or cathedral city at game end): we pay it. This follows the Wikicarpedia wording and the JCZ engine test, but there is no explicit official FAQ.
* **Large meeple on top of a tower:** resolved by the master arbiter: allowed, and it *is* stated in the Tower 3rd-edition rulebook (p.4 "Figures you may place on a tower: Large meeple").
* **Tower prisoner exchange with a large meeple:** follows from the general automatic figure-for-figure rule; no specific ruling exists.
* **Art coordinates** were measured from 110 px scans (±0.05). The identity of the decorations, e.g. the round grey-roofed tower as the "water tower", follows Wikicarpedia's letter list.
* The brief mentioned "one garden variant"; the 3rd edition actually has **two** garden tiles (IC/CCCCG and IC/RFr.iG).

## Sources

* **ZM3** — Inns & Cathedrals rulebook, 3rd ed., Z-Man ZM7811 (© 2002/2015 HiG/F2Z): <https://images.zmangames.com/filer_public/2c/91/2c91bb85-e2a9-41ba-9ca4-3f3bf458e13b/zm7811_carcassonne_exp1_rules.pdf> (read via the identical copy at <https://cdn.1j1ju.com/medias/fb/bd/f5-carcassonne-expansion-1-inns-cathedrals-rulebook.pdf>). Used for all core rules, components and the tile clarification pictures.
* **BB21** — Carcassonne Big Box rulebook EN (HiG/Z-Man 2021) pp. 9–11 and 22: <https://www.hans-im-glueck.de/wp-content/uploads/2023/06/Carc-Big-Box_Rulebook_EN-komprimiert.pdf-komprimiert_1.pdf>. Used for the C3 wording, the tie example, the Abbot garden rule and the C3 tile list.
* **WIC** — Wikicarpedia, Inns and Cathedrals: <https://wikicarpedia.com/car/Inns_and_Cathedrals>. Used for the C2/C3 tile scans, official and community clarifications and the tile distribution with decoration letters.
* **WIC1** — Wikicarpedia, Inns and Cathedrals (1st edition): <https://wikicarpedia.com/car/Inns_and_Cathedrals_(1st_edition)>.
* **CAR** — Complete Annotated Rules v7.3 (2014): <https://www.dover.nh.gov/Assets/government/city-operations/library/borrow/library-of-things/carcassonne-rules.pdf>.
* **WPD** — Wikicarpedia, The Princess & the Dragon: <https://wikicarpedia.com/car/The_Princess_and_The_Dragon>.
* **WTW** — Wikicarpedia, The Tower: <https://wikicarpedia.com/car/The_Tower>.
* **WTB** — Wikicarpedia, Traders and Builders: <https://wikicarpedia.com/car/Traders_and_Builders>.
* **WAB** — Wikicarpedia, The Abbot: <https://wikicarpedia.com/car/The_Abbot>.
* **WBG** — Wikicarpedia, Base game: <https://wikicarpedia.com/car/Base_game>.
* **JCZ-T** — JCloisterZone tile data `inns_and_cathedrals.xml`: <https://github.com/farin/JCloisterZone-Client/blob/master/src/extraResources/expansions/inns_and_cathedrals.xml>.
* **JCZ-E** — JCloisterZone engine (`Road.java`, `City.java`, `BigFollower.java`, `TowerCapability.java`, `FairyCapability.java`, plus engine tests): <https://github.com/farin/JCloisterZone>.
* **JCZ-A** — JCloisterZone simplified artwork (`IC.json`, `features/*.json`, `resources.svg`) and the classic (1st-edition) artwork package: <https://github.com/farin/JCloisterZone-Client/tree/master/src/extraResources/addons/jcz/simplified>, <https://jcloisterzone.com/packages/classic/classic-6-5.9.0.jca>.
