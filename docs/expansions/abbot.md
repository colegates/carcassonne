# The Abbot: rules spec (3rd edition)

The Abbot is a mini-expansion that ships inside the 3rd-edition base game: Hans im Glück 2014 new artwork, Z-Man ZM7810, called **C2** on WikiCarpedia. It adds:

* **one abbot per player**, a meeple that may only stand on **monasteries and gardens**, and
* the **gardens** printed on 8 of the 72 base tiles (and on some expansion tiles).

The 2021 refresh (WikiCarpedia **C3**, 20th Anniversary Edition) keeps the same rules and the same garden tiles. Abbots are also called *abbesses* there.

Machine-readable data: [`abbot.json`](abbot.json).

---

## 1. Quick answers

| Question | Answer | Source |
|---|---|---|
| Where can the abbot be placed? | Only on the **monastery or garden of the tile you just placed** (the normal "only on the new tile" rule). The magic portal is the only exception. | Z-Man Supplementary Rules p.2; Big Box 2021 p.9 |
| Can normal meeples use gardens? | **No.** "A normal meeple cannot be placed on a garden." The large meeple, builder and pig can't either. Normal meeples may still be monks. | Big Box p.9; Z-Man p.2 ("only an abbot may be placed on them"); JCZ `SmallFollower`/`BigFollower` |
| Can the abbot use other features? | **No.** Never on a road, city, field or tower. | Z-Man p.2; WikiCarpedia The Abbot and The Tower |
| Garden / abbot scoring during play | When the abbot's monastery or garden is surrounded by **8 tiles**, it scores **9 points** like a monastery and the abbot returns. Gardens without an abbot never score. | Z-Man p.2; Big Box p.9 |
| Final scoring | The abbot scores **like a monk**: 1 for its tile + 1 per neighbouring tile (orthogonal and diagonal). | Z-Man p.2; Big Box p.9 |
| Calling the abbot home | In phase 2, **instead of placing a meeple**, take your abbot back from any monastery or garden that is **not yet finished**. You **immediately** score 1 + number of neighbours (2–8 points). | Z-Man p.2; Big Box p.9; WikiCarpedia (11/2020) |
| Same turn as placing something else? | **No.** It is one of the phase-2 options. It rules out placing a meeple, the abbot, the large meeple, builder, pig, a tower floor, a meeple on a tower, or moving the fairy. Builder double turns have two phase-2 steps. | Big Box turn summary p.24; WikiCarpedia (12/2014, 3/2015, 9/2018); Order of Play |
| Does the abbot count as a follower? | **Yes, it is a meeple** with placement limits. The dragon eats it, a tower captures it (ransom 3), the fairy can stand by it, and it can use the magic portal. It never enables the builder or pig, and can't go on a tower. | WikiCarpedia P&D and Tower; CAR figure table; JCZ `Abbot extends Follower` |

---

## 2. Components and setup

* **Abbot**: one per player colour, in the player's supply next to the 7 normal meeples (the 8th normal meeple is the score marker). The base box has 5. The pink 6th-player abbot is in the C2 *Inns & Cathedrals* box; Big Box 6 counts it as base game. In our app, every player (up to 6) simply gets one.
* **Gardens are not extra tiles.** In the 3rd-edition base set, **one copy each of E, H, I, M, N, R, U and V shows a garden**. The total stays **72**:

| Base letter (tiles.js) | Classic count | 3rd ed.: plain + garden | JCZ id of garden copy |
|---|---|---|---|
| E – City edge | 5 | 4 + 1 | `BA/CG` |
| H – Two city caps | 3 | 2 + 1 | `BA/CFCG` |
| I – Corner city caps | 2 | 1 + 1 | `BA/CCG` |
| M – City corner with shield | 2 | 1 + 1 | `BA/Cc+G` |
| N – City corner | 3 | 2 + 1 | `BA/CcG` |
| R – Big city | 3 | 2 + 1 | `BA/CccG` |
| U – Straight road | 8 | 7 + 1 | `BA/RFrG` |
| V – Curved road | 9 | 8 + 1 | `BA/RrG` |

Four sources agree, and all other counts are unchanged:

* JCZ `basic:1` vs `basic:2`: both sum to 72; e.g. `BA/C` ×5 becomes `BA/C` ×4 + `BA/CG` ×1.
* The HiG/Z-Man Big Box 2021 tile list marks the illustrations as `V3-E 5× (G; B; T)`, `V3-H 3× (G; T)`, `V3-I 2× (G)`, `V3-M 2× (G)`, `V3-N 3× (G; T)`, `V3-R 3× (G; T)`, `V3-U 8× (G; …)`, `V3-V 9× (G; …)`, where G = garden.
* WikiCarpedia's C2 and C3 distribution lists show the same.
* CAR v7.3 says "8 tiles have had gardens added".

Without the Abbot, gardens do nothing; they are decoration. Showing the garden art in every game is still true to the 3rd edition.

---

## 3. The garden tiles

All 8 base garden tiles are **exactly the matching tiles.js tile plus a garden feature**. The JSON lists their features in the *same orientation and order* as tiles.js, with the garden appended last. A script check confirmed the ports match E/H/I/M/N/R/U/V exactly. For **H, I and U**, the JCZ XML (and the printed tile list) shows the tile a quarter turn anticlockwise from our orientation. The JSON gives the geometry turned 90° clockwise so that it matches tiles.js, and `jcz_orientation` says so.

The garden itself is a rectangular flower bed seen at an angle: rows of red, yellow, pink, blue and purple flowers inside a low brown border, about 45–50% of the tile wide. It always lies **inside a field**, touches no edge, road or city, and does **not** split or join fields. Positions below are in our orientation (x→east, y→south, 0–1). They were measured from the WikiCarpedia scans of the printed C2 tiles.

| Tile | Look (our orientation) | Garden centre (box) |
|---|---|---|
| E + garden | City cap along N | (0.35, 0.58), left of centre below the city (x .10–.59, y .46–.69) |
| H + garden | Caps on E and W, meadow strip N–S | (0.46, 0.32), in the strip, a bit north of centre |
| I + garden | Caps on N and E; meadow S and W | (0.37, 0.64), tilted diamond, left of and below centre |
| M + garden | NW city corner, diagonal wall NE→SW, shield near NW corner | (0.75, 0.68), SE meadow |
| N + garden | As M without the shield | (0.76, 0.66), SE meadow |
| R + garden | City on N, E, W; wall across the lower third | (0.49, 0.78), centred under the wall |
| U + garden | Wavy road N→S | (0.31, 0.65), **west** meadow, lower half, beside the road |
| V + garden | Road W→S curve | (0.62, 0.22), large outer meadow, NE quarter |

(JCZ's "simplified" art puts the garden on the same side for every tile: E centre-south, H centre, I SE of centre, M/N SE, R south, U south field of its W–E road, V NE.)

---

## 4. Rules

### 4.1 Placing the abbot

Official text, Z-Man Supplementary Rules (ZM7810):

> "When placing a tile with a monastery or a garden, you may place **either** a meeple **or** your abbot. The meeple is placed as usual whereas the abbot must be placed on the monastery or garden you've just placed."

The Big Box 2021 adds: "A normal meeple cannot be placed on a garden."

* The abbot goes only on a monastery or garden, only on the tile just placed (except via the magic portal).
* Never on a road, city, field or tower.
* Gardens are abbot-only: no normal meeple, large meeple, builder or pig.
* A monastery may still take a normal meeple as a monk. When you place a monastery tile you pick **one**: monk, abbot, meeple elsewhere on the tile, or nothing.
* One figure per monastery or garden. The feature on a just-placed tile is always free.
* You may place the abbot on a monastery or garden that the tile surrounds at once (dropped into a fully enclosed hole). It scores 9 in phase 3 of the same turn.

### 4.2 Calling the abbot home (the abbot's special ability)

Z-Man Supplementary Rules:

> "On your turn during action 2 (Placing a meeple), if you decide **not to place a meeple**, you are allowed to take back your abbot. If you do so, you score as many points as the abbot is worth at that time, exactly like an end game monastery final scoring."

Big Box 2021:

> "If you did not place a meeple during Step 2 of your turn, you can return your abbot from a tile to your supply. You immediately go to Step 3 of your turn and score points from that monastery or garden based on the number of tiles surrounding it as normal. You resolve all other feature scoring during that step as normal."

Exact conditions:

1. It is **your** turn, phase 2, after you placed your tile.
2. You take **no other phase-2 action** this turn. That means no meeple, no abbot placement, no large meeple, no builder or pig, no tower floor or meeple on a tower, and no fairy move.
   * The Big Box turn summary lists "Remove and score Abbot" as one Step-2 alternative.
   * WikiCarpedia clarifies that "not placing a meeple" means "not performing any other placing-a-meeple action at all" (12/2014, updated 3/2015 and 9/2018).
   * The Order of Play says "one and only one of the following".
3. Having **no meeples left** also counts as not placing one, so you may still call the abbot home (WikiCarpedia; HiG wording).
4. Your abbot is on a monastery or garden **that is not yet surrounded by 8 tiles** (official clarification 11/2020; JCZ `AbbotCapability`). If this turn's tile is its 8th neighbour, there is no call-home: it scores 9 in phase 3, and you may place a meeple as usual.
5. The abbot can be **anywhere** on the board; it need not be near the new tile.
6. **Score at once**: 1 for the abbot's tile + 1 for each tile in its 8 neighbour spaces, counting the tile just placed (official example: 6 points). The range is 2–8.
   * This is scored in phase 2, before the P&D dragon moves and before regular phase-3 scoring (WikiCarpedia 3/2015, updated 10/2024).
   * It scores "the abbot", not the feature, so there is no fairy +3.
7. Then phase 3 runs normally for whatever the tile completed.

### 4.3 Scoring during the game

* A monastery or garden **surrounded by 8 tiles** (orthogonal and diagonal) scores **9 points** to the owner of the abbot on it. This happens in phase 3 of whoever placed the 8th tile, and the abbot returns. An abbot on a monastery is just like a monk.
* Gardens with no abbot are never scored.
* Points from calling the abbot home: see 4.2.

### 4.4 Final scoring

* An abbot on an unfinished monastery or garden scores **1 + number of neighbouring tiles**, exactly like a monk ("During final scoring, abbots are scored in the same manner").
* Empty gardens score 0.

### 4.5 Where it hooks into a turn

```
1. Place tile (unchanged; gardens have no edges)
2. ONE of: place meeple (not on garden) | place abbot (monastery/garden of new tile)
           | CALL ABBOT HOME -> +1+neighbours now | other expansion action | pass
2b. (P&D) dragon moves
3. Score completed features; monastery or garden with 8 neighbours -> 9 to its abbot/monk
Game end: abbot = monk (1 + neighbours)
```

---

## 5. Edge cases and official clarifications

| # | Case | Ruling | Source |
|---|---|---|---|
| 1 | Your tile surrounds your abbot's garden with the 8th tile | No call-home allowed. It scores 9 in phase 3, and you may still place a meeple. | WikiCarpedia (11/2020); JCZ |
| 2 | Place a meeple **and** call the abbot home in one turn | Not allowed. The same goes for any other phase-2 action. | Z-Man / Big Box wording; WikiCarpedia (12/2014–9/2018) |
| 3 | No meeples left in supply | The call-home is still allowed. | WikiCarpedia |
| 4 | Place the abbot and call it home in the same turn | Not allowed: placing it was this turn's phase-2 action. Builder double turn: see 6. | Z-Man |
| 5 | Abbot far from the new tile | It may still be called home. | Rules text ("return your abbot from a tile") |
| 6 | The new tile neighbours the abbot | It counts toward the points. | Official 6-point example |
| 7 | Score range of a call-home | 2–8 (9 is impossible: a finished feature can't be called home). | Derived |
| 8 | Fairy next to the called-home abbot | No +3 fairy bonus. | WikiCarpedia P&D |
| 9 | Abbot eaten, captured or otherwise removed | Scores nothing. | P&D and Tower rules |
| 10 | Monk and abbot on the same monastery | Impossible: one figure per monastery or garden. | Base rule |
| 11 | Gardens and rules that mention "monasteries" | Gardens are **not** monasteries (e.g. Messages, vineyards). Nothing like this is in our scope, but keep the feature types separate. | HiG, Christof Tisch on BGG, 10/2018, via WikiCarpedia |
| 12 | The "abbot" of the German / Dutch & Belgian Monasteries expansions | Unrelated rule. | WikiCarpedia; CAR |

---

## 6. Interactions with the expansions in scope

**Base game.** Gardens sit on 8 base tiles; without the Abbot they are decoration. Normal meeples keep every usual spot except gardens. Fields and farmers are unaffected.

**River** (3rd-ed. River I, 12 tiles)
* One garden tile, `RI.1/IIG` (a river bend). It replaces one of the two plain bends `RI.1/II`.
* The abbot may go on that garden, or on the river monastery tile, during the river phase. Calling the abbot home is also allowed then.
* The river itself is never occupied; the garden is not river.

**Inns & Cathedrals**
* The **large meeple can't go on a garden** (only the abbot can). It may be a monk.
* Placing the large meeple is the phase-2 action, so no call-home that turn.
* Garden tiles: `IC/CCCCG` (garden in the inner field enclosed by 4 caps) and `IC/RFr.iG` (inn road).
* The C2 box contains the pink abbot.
* Inns and cathedrals don't affect gardens.

**Traders & Builders**
* The builder needs one of your meeples on that road or city; the pig needs one of your farmers in that field. The abbot is never there, so it **never enables a builder or pig**.
* Placing the builder or pig is "instead of placing a meeple", so no call-home in that part of the turn.
* **Double turn**: each part has its own phase 2 (WikiCarpedia: "meeple, figure or token placement" happens twice). You may call the abbot home in one part and place it on a garden or monastery drawn in the other.
* Placing it in part 1 and calling it home in part 2 is allowed by the rules as written, and JCZ allows it, but there is **no official ruling**.
* Garden tiles: `TB/CcRR.wG` and `TB/CcR.cG`.

**Princess & Dragon**
* **Volcano tile**: no figure, the abbot included, may be placed on it. You *may* call your abbot home that turn (WikiCarpedia lists it as allowed).
* **Dragon**:
  * It eats the abbot, which goes back to its owner with no points.
  * The dragon moves *after* phase 2, so calling the abbot home on a dragon-tile turn saves it.
  * The dragon can't enter the fairy's tile.
* **Fairy**:
  * It may be placed next to your abbot. That is your phase-2 action, so no call-home that turn.
  * While there it gives +1 at the start of each of your turns, and +3 when the abbot's feature is scored on completion **or at final scoring**.
  * It gives **no +3 when the abbot is called home**.
* **Princess**: if you remove a knight with a princess tile, you may take **no** phase-2 action, so no abbot placement and no call-home. The princess can never hit the abbot, which is never in a city.
* **Magic portal**: the abbot may use it, but only onto an **unoccupied, unfinished monastery or garden** on any tile (official clarification 3/2015).
* Garden tiles: `DG/C.dG` (dragon tile: the dragon moves right after you may have put the abbot on its garden) and `DG/Cc.pG` (princess tile).

**Tower**
* The abbot **may not be placed on a tower**.
* It **can be captured** like any meeple, including by your own tower (which returns it to your supply with no points).
* A captured abbot is exchanged, or bought back for **3 points** like any figure. It may be used again the same turn.
* Placing a tower floor or a meeple on a tower is the phase-2 action, so no call-home that turn. Paying ransom is not a phase-2 action, so it can be combined with a call-home.
* The fairy doesn't protect against capture.
* Garden tiles: `TO/FG` and `TO/RRG`. Each has a tower foundation **and** a garden; you still pick only one phase-2 action.

---

## 7. Edition differences

* **1st edition (2000)**: no gardens, no abbot.
* **2014 (our "3rd edition", C2)**: introduced The Abbot. Tile counts are identical to the classic A–X list apart from the 8 garden copies. CAR v7.3 claimed a city-bridge pennant moved in C2, but no other source confirms it.
* **2021 (C3, 20th Anniversary)**: same rules and the same base garden tiles; "abbesses".
* **Wording**: Z-Man says "if you decide not to place a meeple"; HiG 2021 says "if you did not place a meeple". HiG means the call-home also works with an empty supply.
* **C3.1 expansions** (Dragon & Fairy, Towers & Thieves, new I&C/T&B): different garden tiles, out of scope.

---

## 8. Implementation notes for our engine

* Add the feature type `{ type: 'garden', sides: [], ports: [] }`, like `monastery`, and keep it **distinct** from monastery.
* For each base garden tile, take the tiles.js letter's features and append `garden()`. The `anchor` / `art_box` fields in the JSON say where to paint it and where the abbot stands.
* `PIECES.abbot = { weight: 1, follower: true }`; `supply.abbot = 1`.
* `followerOptions()`:
  * Offer `{kind:'follower', k:'abbot'}` on each monastery or garden of the new tile if the abbot is in supply.
  * Never offer `k:'meeple'` on a garden.
  * Offer `{kind:'recall', key, fi, k:'abbot'}` for the current player's abbot if `monasteryNeighbours(...) < 8`, counted with this turn's tile already on the board.
  * Every option is mutually exclusive, as it is today.
* Recall handling: add `1 + monasteryNeighbours` points at once and return the abbot to supply. Then run the dragon (if any) and the normal `scoreAfterPlacement()`.
* `scoreAfterPlacement()` and final scoring: treat pieces on `garden` exactly like pieces on `monastery`.
* Consider a `garden` / `abbot` bucket in `breakdown` for the results screen.

## 9. AI hints

* Targets are scarce: about 20% of base draws are monasteries or gardens (6 + 8 of 71). A deployed abbot can't take a new one, so **turnover matters**. Fan advice (Carcassonne Central): place it whenever possible and cash it in on otherwise dead turns.
* If the abbot is in supply, prefer it over a monk on a monastery: same points, it can be cashed in any time, and it keeps normal meeples free.
* **Value model** (plugs into `estimate()`):
  * Keep: `9p + (1+n)(1-p)`, using the monastery completion chance. Set `p = 0` if a neighbour space is a dead hole that no remaining tile type can fill.
  * Call home: `(1+n)` now + abbot in supply ≈ `min(1, myRemainingDraws × 0.2) × 5`.
  * Generate the call-home as a candidate phase-2 action and compare it against the best meeple move on the drawn tile.
* **Call home when**:
  * it's a dead turn (no useful meeple spot, or no meeples) and n ≥ 3;
  * n ≥ 5–6 and the missing neighbours are hard or impossible to fill;
  * there is a threat: the dragon tile just placed can reach the abbot's tile within 6 moves and the fairy isn't there, or an opponent's open tower could reach it in a straight line next turn;
  * it is mid-game and a redeploy is still likely.
* **Don't**:
  * offer a call-home from a feature this tile completed (illegal);
  * in the last turns, give up a good meeple move to call home (the points equal final scoring);
  * call home an abbot that has the fairy (you'd lose +1 per turn and +3 at the end).
* Placement: neighbours of your own abbot are worth +1 each. Avoid giving an opponent's abbot its 8th neighbour.
* Builder double turn: call home in one part and redeploy in the other.
* Magic portal: send the abbot to the free, unfinished monastery or garden with the most neighbours.
* Tower: an opponent's deployed abbot is a good capture.

## 10. In-app rules (kid-friendly)

See `rules.kid_rules_text` in the JSON. It covers: the abbot only on monasteries and gardens; gardens abbot-only; 9 points when surrounded; the call-home trick (one or the other, allowed with no meeples, not needed if the garden just finished); end-of-game scoring; and one-liners for the dragon, fairy, portal, tower, builder/pig and large meeple.

## 11. Figure ideas

1. The abbot next to a normal meeple, plus the 8 garden tiles with the gardens circled.
2. Allowed and not allowed: abbot on a garden ✓, abbot on a monastery ✓, abbot on a road/city/field ✗, meeple on a garden ✗.
3. A finished garden: a 3×3 block numbered 1–9, "+9".
4. **The official example**: a new tile (red outline) placed with no meeple; the abbot lifted off a garden with 5 neighbours: 1 + 5 = **6**.
5. A turn flowchart: tile → [meeple | abbot | call home] → score.
6. A "not allowed" case: the 8th neighbour just placed, so no call-home; it scores 9 instead.
7. End of game: an abbot on a monastery with 3 neighbours = 4; an empty garden = 0.
8. With expansions: the dragon's path toward an abbot ("call him home first!"), a tower capturing an abbot, a portal arrow to a far garden.

## 12. Garden tiles of the other expansions (for cross-checking)

These are JCZ ids from the 3rd-edition (`:2`) sets. Each replaces the named plain tile one for one.

| Expansion | Garden tile id | Replaces | What it is |
|---|---|---|---|
| River | `RI.1/IIG` | one `RI.1/II` | River bend W–S |
| Inns & Cathedrals | `IC/CCCCG` | `IC/CCCC` | 4 separate caps around an enclosed inner field |
| Inns & Cathedrals | `IC/RFr.iG` | `IC/RFr.i` | Straight inn road (inn north, garden south) |
| Traders & Builders | `TB/CcRR.wG` | `TB/CcRR.w` | Wine city corner, roads S and E |
| Traders & Builders | `TB/CcR.cG` | `TB/CcR.c` | Cloth city corner, road E |
| Princess & Dragon | `DG/C.dG` | `DG/C.d` | City cap + dragon symbol |
| Princess & Dragon | `DG/Cc.pG` | `DG/Cc.p` | Princess city corner |
| Tower | `TO/FG` | `TO/F` | Field + tower foundation |
| Tower | `TO/RRG` | `TO/RR` | Roads W and S end at the foundation |

I checked all nine against the WikiCarpedia C2 tile scans (River I tile J, I&C B and H, T&B K and U, P&D B and J, Tower E and I).

Out of scope: `RI.2/IIG` (River II), `AM/RG` (Abbey & Mayor), the Hills & Sheep hill tile, and others.

## 13. Sources

1. Z-Man Games, *Carcassonne Supplementary Rules* (ZM7810 box sheet, PDF 2016), p. 2 "The Abbot": https://lot.ahml.info/Carcassone%20Supplementary%20Rules.pdf
2. Hans im Glück / Z-Man, *Carcassonne Big Box* rulebook EN (2021), pp. 9, 22–24: https://www.hans-im-glueck.de/wp-content/uploads/2023/06/Carc-Big-Box_Rulebook_EN-komprimiert.pdf-komprimiert_1.pdf
3. WikiCarpedia: [The Abbot](https://wikicarpedia.com/car/The_Abbot), [The Princess & the Dragon](https://wikicarpedia.com/car/The_Princess_and_The_Dragon), [The Tower](https://wikicarpedia.com/car/The_Tower), [Traders and Builders](https://wikicarpedia.com/car/Traders_and_Builders), [Inns and Cathedrals](https://wikicarpedia.com/car/Inns_and_Cathedrals), [Order of Play](https://wikicarpedia.com/car/Order_of_Play), [Base game](https://wikicarpedia.com/car/Base_game). These carry dated official clarifications; fetched 2026-10-17.
4. *Carcassonne Complete Annotated Rules* v7.3 (Dec 2014): https://www.dover.nh.gov/Assets/government/city-operations/library/borrow/library-of-things/carcassonne-rules.pdf
5. JCloisterZone-Client tile data (`expansions/*.xml`, `addons/jcz/simplified/jsons`), commit 0f66860: https://github.com/farin/JCloisterZone-Client
6. JCloisterZone engine (`AbbotCapability`, `Abbot`, `SmallFollower`, `BigFollower`, `Garden`, `ActionPhase`, `AbstractActionPhase`, `TowerCapturePhase`), commit 29a1561: https://github.com/farin/JCloisterZone
7. Carcassonne Central, "Maximizing Use of the Abbot (Carcassonne II)" (strategy only): https://www.carcassonnecentral.com/community/index.php?topic=1446

## 14. Uncertainties

* **Placing and calling home the abbot in the two parts of one builder double turn.** The rules as written and JCZ allow it; I found no official ruling.
* The **11/2020 "only from unfinished features"** clarification is known only through WikiCarpedia and the JCZ code comment; I couldn't open the original post. It matches common sense, though: the abbot scores 9 in phase 3 anyway.
* **Garden positions** were measured from 110 px scans. They are ±0.05 tile, which is fine for art and not relevant to the rules.
* I couldn't download the Z-Man 2014 base *rulebook* PDF (its CDN has an expired certificate). The Z-Man *supplementary* rules sheet from the same box holds the Abbot text and was used instead.
