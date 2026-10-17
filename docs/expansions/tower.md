# The Tower (Expansion 4) – rules spec, 3rd edition

Machine-readable twin: `tower.json` (same slug). This file explains the rules, the decisions behind them, the edge cases and the sources.

**Edition implemented:** the 3rd edition with gardens (Hans im Glück 2016 German rules; Z-Man / F2Z English 2017; new artwork with red and blue roofs). The tiles are JCloisterZone tile-set `tower:2`. The 2025 *Towers & Thieves* redesign is a different game and is **not** implemented (see §12).

---

## 1. Summary of the rules decisions

| Question | Answer (3rd edition) | Source |
|---|---|---|
| Tower floors per player | 2p **10**, 3p **9**, 4p **7**, 5p **6**, 6p **5** (30 neutral floors in the box; the rest go back in the box) | Rulebook p.1 |
| What can I do after placing my tile? | **Exactly one** of: a meeple on the new tile (normal rules) · a floor on **any** empty foundation · a floor on **any** open tower · a meeple (normal or large) on top of **any** open tower, which closes it | Rulebook p.2; German "genau eine" |
| When can I capture? | Right after placing a floor. It is optional, and you take at most 1 figure. | Rulebook p.2 |
| Capture range | The tower's own tile plus up to **h** tiles straight N/E/S/W, where h = height after your floor. No diagonals. Gaps count and don't block; neither do other towers or the river. | Rulebook pp.2–3; German p.3 |
| Can I capture my own meeple? | **Yes.** It goes back to your supply. | Rulebook p.2 |
| What can be captured? | Normal meeples, the large meeple and the abbot, on any feature (farmers too) **and on top of other towers**. **Not:** builder, pig, fairy, dragon, floors. | Rulebook pp.2–4 |
| Is a meeple on top of a tower safe? | **No.** Another tower can capture it (you can capture your own), and the dragon eats it. When it leaves, the tower is **open again**. | Rulebook p.3; S-CAR fn 200 (11/2013) |
| Prisoners | An opponent's meeple sits in front of the captor. When two players hold each other's meeples they swap **at once, automatically**; with several, the **owner** picks which comes back. | Rulebook p.3 |
| Ransom / buy back | During **your** turn, **once per turn**, pay **3 points** to the holder for one of your prisoners. Only if your score is ≥ 3 (never below 0). You may use him the same turn. Any figure costs 3. | Rulebook pp.3–4; S-CAR fn 208/209 |
| Points from towers | **None**, during the game or at the end. Tower-top meeples and prisoners score nothing. | Rulebook (no scoring section) |
| Fairy | Gives **no** protection against capture. It may stand next to a tower-top meeple. | Rulebook p.4; S-CAR fn 124 |
| Dragon | **Eats** a meeple on a tower; never eats floors. | Rulebook p.4; P&D dragon menu |

---

## 2. Sources

1. **Official 3rd-edition English rulebook**, HiG/Z-Man, © 2005, 2016 HiG, English © 2017 F2Z, 4 pp.: <https://www.hans-im-glueck.de/wp-content/uploads/2023/07/carcassonne-ii-ext4-rules.pdf>. Byte-identical copies are on Z-Man's CDN (<https://cdn.svc.asmodee.net/production-zman/uploads/2024/09/carcassonne-ii-ext4-rules.pdf>) and in HiG's C&Co archive (<https://cundco.de/media/b3/fd/26/1715104332/cc-2-1-4-exp-en.pdf>). This is the primary source for everything in §1.
2. **Official 3rd-edition German rulebook** *Der Turm* (HiG © 2006, 2016), C&Co `cc-2-1-4-erw-de.pdf`: <https://cundco.de/media/62/72/ca/1715104329/cc-2-1-4-erw-de.pdf>. It is the same rulebook, with three extra sentences used here: "genau eine der 4 Möglichkeiten"; capture works "über Löcher in der Auslage, über andere Türme jeglicher Höhe **und den Fluss** hinweg"; "Nach dem Rückkauf darfst du nicht weniger als null Punkte haben".
3. **Carcassonne Standard Complete Annotated Rules (S-CAR) v7.3**, Chris Ober, Dec 2014 (HiG Big Box rule text with dated official clarifications), Tower pp. 67–71: <https://www.dover.nh.gov/Assets/government/city-operations/library/borrow/library-of-things/carcassonne-rules.pdf>. Used for: tower reopening (11/2013), no meeple on an empty foundation, a short tower capturing from a tall one, capture before the dragon moves, floor after a volcano, fairy next to a tower meeple, princess vs. tower meeple, once-per-turn buy back in double turns, big-meeple ransom, builder/pig returning home, edition table.
4. **1st-edition English rules** (Z-Man 2012 printing of the 2006 rules), C&Co `cc-1-0-4-exp-en.pdf`: <https://cundco.de/media/bf/8d/05/1715104320/cc-1-0-4-exp-en.pdf>. Edition differences.
5. **1st-edition German rules** (HiG 2006): <https://www.hans-im-glueck.de/wp-content/uploads/2023/07/Spielanleitung_Carcassonne_Der_Turm.pdf>. Edition differences.
6. **The Princess & the Dragon**, 3rd-edition English rulebook (C&Co `cc-2-1-3-exp-en.pdf`): <https://cundco.de/media/37/c7/21/1715104337/cc-2-1-3-exp-en.pdf>. Dragon menu ("Meeple on a tower" eaten, "Tower piece" not), "The fairy does not protect a meeple from capture by a tower", builder/pig go home.
7. **Traders & Builders**, 3rd-edition English rulebook (C&Co `cc-2-1-2-exp-en.pdf`): <https://cundco.de/media/83/0d/e3/1715104336/cc-2-1-2-exp-en.pdf>. "Your builder is always returned to your supply if you no longer have meeples on that feature."
8. **3rd-edition base game rules with River and Abbot** (C&Co `base-game-2-1-rules.pdf`): <https://cundco.de/media/06/fa/39/1715104334/base-game-2-1-rules.pdf>. Abbot and gardens.
9. **JCloisterZone-Client tile data** `expansions/tower.xml`, commit 0f66860: <https://github.com/farin/JCloisterZone-Client/blob/master/src/extraResources/expansions/tower.xml>. Geometry and counts; `tower:1` (no gardens) vs `tower:2` (gardens). Our 18 tiles match `tower:2` exactly (checked by script).
10. **JCloisterZone engine**, commit 29a1561: <https://github.com/farin/JCloisterZone>. `TowerCapability`, `TowerCapturePhase`, `ActionPhase`, `CaptureMeeple`, `PayRansom`, `PrisonersExchage`, `AbstractUndeploy`, `Follower`. Reference implementation (§13).
11. **JCloisterZone "classic" artwork package** `classic-6-5.9.0.jca`: <https://jcloisterzone.com/packages/classic/classic-6-5.9.0.jca>. Foundation box and meeple point for every tile (1st-edition art); images inspected.
12. **BoardGameGeek photos** of the new-art tiles (<https://boardgamegeek.com/image/3016718>, <https://boardgamegeek.com/image/4531883>) and 2016+ box backs (images 3600707, 6931286). I identified 12 of the 17 layouts in the photos. Their foundations sit where the 1st-edition art has them, which confirms the positions below. These photos are of a pre-garden print.
13. **John Sweeney's Carcassonne FAQ** (2006–07): <https://modernjive.com/carcassonne/carcassonnefaq.htm>. Old rulings for §12, plus still-valid ones (unlocking, fairy, princess, capture before the dragon).
14. **Towers & Thieves 2025 rules** (HiG): <https://www.hans-im-glueck.de/wp-content/uploads/2025/11/CC_ERW_4_2025_rules_EN.pdf>. Used only for §12.

WikiCarpedia was not used: it is behind an anti-bot wall and I found no cache. The neighbouring research file `abbot.json` independently lists the same two Tower garden tiles (TO/FG, TO/RRG).

---

## 3. Components and setup

* **18 land tiles** with a tower foundation: 17 layouts, TO/C twice. Each carries a small tower-silhouette expansion mark, which is decoration only.
* **30 tower floors**, neutral wood, one colour. Each player takes **10 / 9 / 7 / 6 / 5** for 2 / 3 / 4 / 5 / 6 players; the rest go back in the box. Floors are a personal supply; when yours are gone, you can't build. 6 players need Inns & Cathedrals for the 6th colour.
* **Tile Tower** (cardboard tile dispenser): no rules effect.
* Each player has a **prisoner area** "in front of them".
* Shuffle the tower tiles into the land tiles. With the River, the river is laid first as usual; no river tile has a foundation.

---

## 4. The tiles

Notation: half-edges as in `FORMAT.md`; coordinates are fractions of the tile (x east, y south, north up); "box" = foundation `art_box` `[x0, y0, x1, y1]`. Every feature in the JSON has an `anchor` (meeple spot). All anchors lie **outside** the foundation box, which the build script checks, so the foundation never hides a meeple spot.

**Foundation look (all tiles):** a square ring of beige stone blocks seen from above, about 0.29 × 0.25 of the tile. The earth inside is grey-brown, one corner of the ring is broken open, and a few loose blocks lie beside it. The 1st-edition art adds a ladder. The foundation is only the `tower` tag and the place where floors are stacked. It is not a feature, and it splits nothing except where a road visibly ends at it.

| ID | # | Cities | Roads | Fields (halves → borders) | Foundation box / on |
|---|---|---|---|---|---|
| TO/C | 2 | N | – | EL ER SL SR WL WR → N | 0.57-0.86, 0.53-0.78 / field (SE) |
| TO/FG | 1 | – | – | all 8 · **garden** | 0.40-0.69, 0.33-0.58 / field (centre) |
| TO/L | 1 | – | – | all 8 · **monastery** | 0.60-0.89, 0.12-0.37 / field (NE) |
| TO/RRG | 1 | – | W (ends at tower), S (ends at tower) | WR NL NR EL ER SL · WL SR · **garden** | 0.40-0.69, 0.33-0.58 / field |
| TO/RRR | 1 | – | W, N, E (each ends at tower) | WR NL · NR EL · ER SL SR WL | 0.37-0.66, 0.37-0.62 / centre |
| TO/RrRr.2 | 1 | – | N–W curve, S–E curve | NL WR · SL ER · NR EL SR WL | 0.60-0.89, 0.10-0.35 / middle band (NE) |
| TO/RRRR.1 | 1 | – | N, E, S, W (each ends at tower) | WR NL · NR EL · ER SL · SR WL | 0.39-0.68, 0.36-0.61 / centre |
| TO/CRcr | 1 | W–E band | N–S over a bridge | NL · NR · SL · SR → city | 0.11-0.40, 0.13-0.38 / **city** (NW) |
| TO/CFR | 1 | N | S (ends at tower) | WL WR SR → N · EL ER SL → N | 0.27-0.56, 0.29-0.54 / field under the wall |
| TO/RrC | 1 | N | S–W curve | WR EL ER SL → N · WL SR | 0.60-0.89, 0.40-0.65 / field (E) |
| TO/RCr | 1 | N | W–E straight | WR → N · EL → N · WL SL SR ER | 0.34-0.63, 0.61-0.86 / field (S) |
| TO/Cc | 1 | N+W corner | – | EL ER SL SR → city | 0.60-0.89, 0.60-0.85 / field (SE) |
| TO/CcR! | 1 | N+W pointed | E (ends at city gate) | EL · ER · SL SR (all → city) | 0.14-0.43, 0.10-0.35 / **city** (NW) |
| TO/CC.2 | 1 | N · W (separate) | – | EL ER SL SR → both | 0.57-0.86, 0.53-0.78 / field (SE) |
| TO/CRCr.2 | 1 | N · S (separate) | W–E | WR EL → N · ER WL → S | 0.65-0.94, 0.08-0.33 / **N city** wall (NE) |
| TO/CccR | 1 | N+W+E | S (ends at city gate) | SL → city · SR → city | 0.60-0.89, 0.10-0.35 / **city** (NE) |
| TO/CccC+ | 1 | N+W+E (1 pennant) · S | – | inner field (no halves) → both | 0.14-0.43, 0.10-0.35 / **city** (NW) |

Notes on particular tiles:

* **TO/CRcr is the rulebook's "special case".** The road crosses the city on a bridge: one continuous road, one unsplit city, and **four** separate corner fields. The 1st-edition German note says the same ("the road over the bridge divides both meadows").
* **TO/RCr:** the city's gatehouse wall touches the road in the middle. So the two little strips north of the road (WR, EL) are **separate** fields, unlike base tile D where they are one.
* **TO/RRG, TO/RRR, TO/RRRR.1 and TO/CFR:** the roads **end at the foundation**, like at a house. They are separate roads, not bends, junctions or crossroads. On TO/RRG the two road stubs plus the foundation close off the SW corner field. On TO/CFR the foundation stands against the city wall, so wall + foundation + road split the meadow in two.
* **TO/CcR!:** the city wall runs down to the SE corner, so the field south of the gate road (ER) is cut off from the south strip (SL SR).
* **TO/CccC+:** the meadow between the big city and the small S cap only touches the two southern corners, so it is an `inner` field. The coat of arms is in the NE of the big city (about x 0.74-0.89, y 0.05-0.25).
* **Gardens (3rd edition only):** TO/FG and TO/RRG are the 1st-edition TO/F and TO/RR with an abbot garden added; the geometry is otherwise identical. **I could not find a scan of the printed garden tiles.** The garden position in the JSON (north-east corner, box ≈ 0.62-0.95 × 0.04-0.30) is JCloisterZone's overlay position. It is clear of the foundation and of the farmer spot, but it is not verified against the printed tile.
* The foundation positions come from the JCZ classic artwork (1st-edition art). The new art keeps them: 12 layouts were checked in BGG photos, and the special-case tile in the 3rd-edition rulebook.

---

## 5. Turn structure

```
any time in your own turn: buy back ≤ 1 prisoner (3 points, needs score ≥ 3)
1. place tile                (tower tiles: normal rules; nothing happens yet)
2. figure action – EXACTLY ONE of:
     a) meeple on the new tile (normal rules)  – or another expansion's alternative
        (abbot, builder, pig, take abbot back, move fairy, magic portal …)
     b) floor on ANY empty foundation (the new tile's own foundation counts)
     c) floor on ANY open tower (≥ 1 floor, nobody on top)
     d) meeple (normal or large) on top of ANY open tower → tower closed
   2b. after (b)/(c): optional capture of 1 figure in range
       → own figure: back to supply; opponent's: becomes your prisoner
       → automatic exchange check → builder/pig orphan check
3. score completed features (normal) — captures already happened!
```

* "Exactly one" comes from the rulebook ("you now have 4 actions to choose from") and the German text ("genau eine"). The other expansions' alternatives are also "instead of a meeple", so all of them are mutually exclusive (S-CAR fn 119; JCZ behaves the same).
* **Ransom is not the figure action.** You can pay and then place that very meeple in step 2, or pay and take your abbot back.
* **Builder double turn:** steps 1–3 happen for each tile, so you may take a tower action (and capture) with each tile. Buy back stays **once per turn**; exchanges happen whenever they are triggered (S-CAR p.39).
* **Dragon tile:** the tower action and capture come **before** the dragon moves (S-CAR fn 138/193).

---

## 6. Floors and capturing

* The first floor goes on an empty foundation (height 0 → 1). Later floors go on an open tower. There is no height limit.
* Any tower anywhere is a legal target. Nothing has to be next to your tile, and the magic portal plays no part.
* **Range:** let `h` be the height after your floor (the level you just placed). Reachable positions are `(tx, ty ± d)` and `(tx ± d, ty)` for `0 ≤ d ≤ h`. That is the tower's own tile plus `h` tiles in each orthogonal direction: 5 tiles at h = 1, 9 at h = 2, +4 per floor. Diagonals are never reachable. Empty board positions count towards the distance and do not block, and neither do other towers or the river.

```
h = 2:        . . X . .        X = reachable tile (if a tile is there)
              . . X . .        T = the tower's own tile (always reachable)
              X X T X X
              . . X . .
              . . X . .
```

* **Targets:** any normal meeple, the large meeple or the abbot of **any** player, including yourself. They can be on a road, city, monastery, garden or field (farmers), or **on top of another tower**. Height only sets range, so a 1-floor tower can capture the meeple on a 5-floor tower (S-CAR fn 197).
* **Never capturable:** builder, pig, fairy, dragon, floors.
* Capturing is optional, and you take at most one figure per floor. You choose which one if several are in range or on the same tile.
* **Your own figure** goes back to your supply. This is the official way to recover a stuck meeple. **An opponent's figure** goes into your prisoner area, out of play.
* After any removal, if the owner has no meeple left in the road or city where their **builder** stands, or no farmer in the field with their **pig**, that builder/pig goes home (T&B p.3; S-CAR p.70).

---

## 7. Meeple on top of a tower

* Allowed: a normal meeple or the **large meeple**. Not allowed: abbot, builder, pig (rulebook p.4).
* The tower needs ≥ 1 floor; you can't block an empty foundation (S-CAR fn 190). The tower must not already have a meeple on top.
* The meeple is **not in any feature**. It never scores, never counts for majority, and can't be taken back voluntarily. It stays until the end of the game **unless captured by another tower** (yours included) **or eaten by the dragon**.
* While someone stands on it, the tower is closed: no floors, no second meeple. **When the top meeple leaves, the tower is open again.** It can be built higher or closed by someone else. The official clarification (S-CAR fn 200, 11/2013): "it is the follower's presence on the tower that halts tower growth, not the act of placement."
* With P&D: no meeple may be put on a tower on the **dragon's current tile**, because followers may never share the dragon's tile (S-CAR p.54). Adding a floor there is fine.

---

## 8. Prisoners

* **Exchange:** whenever two players each hold at least one meeple of the other, they swap at once, automatically and without negotiation. The swap is one for one whatever the type. If one side holds several, the **owner** of those meeples picks which comes back. Because swaps are immediate, this can only arise right after a capture: the captor gets one of theirs back (their choice), and the victim gets the just-captured meeple back. A three-player cycle (A holds B's, B holds C's, C holds A's) triggers nothing.
* **Buy back (ransom):** during your own turn, **at most once per turn** (a builder double turn is one turn), you may pay **3 points** to the holder for one of your prisoners. It costs 3 for any figure: large meeple, abbot, normal. You need a score ≥ 3, because your score may not drop below 0. The bought-back meeple may be used the same turn.
* At game end prisoners stay where they are and score nothing.

---

## 9. Scoring

* The Tower has **no scoring of its own**: no points for floors, height, captures or prisoners, and none at the end.
* The only point movement is ransom: −3 for the payer, +3 for the holder.
* Its effect on scoring is indirect but large. A captured meeple no longer counts, and **captures happen in step 2, before step 3 scoring**, so you can remove an opponent's meeple from a feature your tile has just completed before it is scored.
* At game end, tower-top meeples, prisoners and unused floors are worth 0. Everything else is scored normally with the meeples still on the board.

---

## 10. Edge cases and FAQ

1. You may place the first floor on the foundation of the tile you have just placed and capture right away (rulebook "on any placed tile").
2. Two meeples on one tile are normal: one on the tower top, one on a feature of that tile. The tower-top meeple doesn't count for that tile's features (S-CAR figure table).
3. You may capture your own tower-top meeple from another tower to get it back. The tower it stood on reopens.
4. A closed tower takes no floors, so the meeple on top of it can only be captured by placing a floor on **another** tower in range.
5. Large meeple: it may close a tower; capturing it removes its whole 2-strength; ransom is 3, not 6 (S-CAR fn 48).
6. A player with no floors may still put a meeple on a tower. A player with no meeples may still place floors.
7. **Snatch before scoring:** your tile completes a city where an opponent has the majority. Instead of placing a meeple, raise a tower in range and capture their knight; the city is then scored without them. If you had a knight there you may now win it.
8. **Volcano:** you may not place a meeple on the volcano tile, but you may place a floor, or a meeple on a tower elsewhere (S-CAR fn 134). The 2006–07 Sweeney FAQ said no; that ruling is outdated.
9. **Princess:** a tower-top meeple is not in the city and can't be removed by the princess. Using the princess spends your figure action, so no tower action that turn (S-CAR; JCZ).
10. **Fairy:** it gives no protection from capture. It may be placed next to your tower-top meeple, where it gives dragon protection and +1 point at the start of your turn, but never the +3 bonus because towers are never scored. If its meeple is captured, the fairy stays on the tile unassigned.
11. **Dragon:** it eats the tower-top meeple and everything else on the tile. Floors stay, and the tower reopens.
12. Floors are never removed or returned, whatever happens to the tower's meeple.
13. Farmers can be captured like any meeple. This is often the most valuable capture late in the game.
14. Paying ransom is not "placing a meeple" and does not use the figure action.

---

## 11. Interactions with the other expansions in scope

**Base game.** All meeples on all feature types can be captured, and majorities change at once. The monastery on TO/L is a normal monastery. A tower-top meeple on a monastery tile is not a monk. Prisoners and tower-top meeples are out of their owner's supply.

**River.** No river tile has a foundation. Range runs straight across river tiles, and the river doesn't block it (German rulebook). Meeples on river tiles can be captured, including an abbot in the river garden.

**Abbot.** The abbot can't go on a tower. It can be captured; as a prisoner it is exchanged or bought back for 3 like any meeple. Capturing your own abbot returns it **without** points, which is not the same as the scoring "take the abbot back" action. Taking the abbot back is the figure action, so no tower action that turn; paying ransom can be combined with it. TO/FG and TO/RRG have both a foundation and a garden: when you place one, you may put your abbot on its garden instead of a meeple.

**Inns & Cathedrals.** The large meeple may be placed on a tower top. This is official (rulebook p.4 "Figures you may place on a tower: Large meeple"), not just a community reading. It can be captured; its ransom is 3. In an exchange it counts as one figure, and the owner chooses if several are held. I&C enables 6 players, with 5 floors each. Late in the game an incomplete inn road or cathedral city scores 0, so a self-capture can rescue a meeple from one.

**Traders & Builders.** The builder and pig can't be captured or put on towers. If a capture removes a player's last meeple from the builder's road/city, or the last farmer from the pig's field, that builder/pig goes home. Placing builder or pig is the figure action. In a double turn each tile has its own figure step, e.g. floor + capture with tile 1, then close a tower with tile 2. Buy back is still once per turn. Goods are unaffected.

**Princess & Dragon.** The dragon eats tower-top meeples, never floors, and the tower reopens. The fairy gives no protection against capture, may stand by a tower-top meeple, and moving it is the figure action. The princess can't touch a tower-top meeple, and using her rules out tower actions that turn. After a volcano, floors and tower meeples elsewhere are allowed. With a dragon tile, capture comes before the dragon moves. No meeple may be put on a tower on the dragon's tile; floors there are fine. The magic portal is irrelevant to towers (JCZ). Prisoners are off the board, so they are safe from dragon and princess.

**Tower (itself).** Other towers never block range. Raising one tower can capture the meeple on top of another, which reopens that one. Height only sets range.

---

## 12. Edition differences

| | 1st ed. (HiG 2006 / RGG 2006 / Z-Man 2012) | HiG Big Box era (≈2010–14) | **3rd ed. (HiG 2016 / Z-Man 2017) – implemented** | Towers & Thieves (2025) |
|---|---|---|---|---|
| Tiles | 18 layouts, no gardens (TO/F, TO/RR) | same | TO/F → **TO/FG**, TO/RR → **TO/RRG** (garden added) | 13 land + 5 tower tiles, new layouts |
| Capture own meeple | **no** (opponents only) | yes | **yes**, goes to supply | no captures at all |
| Tower-top meeple capturable | German silent (FAQ: yes); RGG 2006 & Z-Man 2012: **no** | yes | **yes** | – |
| Tower reopens when top meeple removed | FAQ: yes | yes (11/2013) | yes (not restated) | watchmen are removed every thief round |
| Builder / pig | were followers: capturable, could close towers, stayed when alone | not followers | not capturable, can't close towers, go home when alone | – |
| Floor after a volcano | FAQ: no | yes | yes | – |
| Buy back | 3 points, one per turn; Z-Man 2012: needs 3 points | same | same, "never below 0", owner picks in exchanges | – |

The 2014–15 new-art prints (e.g. HiG German 2014) have the new artwork but no gardens (JCZ `tower:1`).

The 2025 redesign is a different game. You must put a floor on a foundation when you place it, and floors come from a 20-piece neutral supply. Meeples become watchmen on towers in range of your tile. Thief tiles add floors and score watchmen, which earn 5 points each at the end and 2 points when displaced. There are no prisoners or ransom.

---

## 13. What JCloisterZone does (reference)

JCZ matches the 3rd-edition rules on every point checked. Floors are 10/9/7/6/5 (plus 4 for 7 players and 3 for 8+, unofficial). Capture is optional, in the same row or column with Manhattan distance ≤ height, and includes the tower tile. Any `Follower` can be captured: small, big, abbot, and tower-top meeples. Builder, pig and other `Special` figures cannot. An own capture is returned to supply. The exchange happens inside the capture step; if the victim holds the captor's figures of different types, the captor chooses. `PayRansom` is allowed once per **whole** turn (the flag is cleared only in `CleanUpTurnPhase`, not between builder sub-turns) and requires score ≥ 3. "Open tower" means no meeple on it, so towers reopen. A lonely builder/pig is returned on capture. Tower tops accept small and big followers only. The fairy may stand by a tower meeple.

The one difference from our spec: JCZ lets a meeple be put on a tower on the dragon's tile. We forbid it (S-CAR p.54).

---

## 14. Implementation notes for our engine

* **State.** `towers['x,y'] = { height, top: null | { player, kind } }` is created when a tile tagged `tower` is placed. `players[i].floors` starts at `FLOORS[n] = {2:10, 3:9, 4:7, 5:6, 6:5}`. `players[i].prisoners = [{ owner, kind }]` holds the figures held **by** player i. `turn.ransomPaid` resets at the start of each player's turn.
* **Figure-step options.** Offer `floor` for every tower with `top === null` when `floors > 0`. Offer `towerTop` for every tower with `height ≥ 1 && top === null` that is not on the dragon's tile, for kinds `meeple` and `large` in supply. Offer neither after a princess removal. These sit beside the normal options, and picking any one ends the step.
* **Capture.** After `height++`, the targets are every deployed meeple/large/abbot with `(fx === tx && |fy − ty| ≤ h) || (fy === ty && |fx − tx| ≤ h)`, plus "no capture". To resolve one:
  * remove the figure, and if it stood on a tower top set that tower's `top = null`;
  * if it is your own, return it to supply; otherwise push it to your prisoners;
  * exchange check: if the victim holds any of yours, you pick one to get back (automatic if all the same kind), and the victim gets the just-captured figure back;
  * run the builder/pig orphan check.
* **Dragon** eating a tower-top meeple sets `top = null`.
* **`payRansom`.** Allowed when it is your turn, `!ransomPaid`, `score ≥ 3`, and someone holds one of yours. You lose 3 points, the holder gains 3, the figure returns to your supply, and `ransomPaid = true`. The UI should suggest it before step 2.
* **Final scoring:** nothing extra. Track ransom in the score breakdown so totals add up.
* **Art.** Draw the foundation in `tower_foundation.art_box`, and the floor stack (neutral wood, height badge) plus any top meeple at `tower_foundation.anchor`. Each feature's `anchor` is its meeple spot.
* **UI.** Show tower heights, highlight capture targets and the plus-shaped range while choosing, show prisoners on the captor's player card, and add a "Buy back (−3)" button on your turn.

---

## 15. AI hints

* **Threat map.** An open tower or empty foundation at height `h` (a foundation counts as 0) can be raised to `h+1` next turn by anyone with floors. Any meeple on the same row or column within `h+1` is at risk, including tower-top meeples. Weight the risk by the opponents' remaining floors.
* **Capture value** ≈ the victim's expected points from that meeple, plus your gain if the majority flips, plus their tempo loss, plus a small chance of ransom income. The best targets are farmers in big fields late in the game, knights in big cities, monks with 6–7 neighbours, and anything in a feature your tile completes this turn.
* **Don't feed opponents:** your floor at height `h` lets the next player reach `h+1`. Check your own meeples first.
* **Close towers** that threaten your big features with a meeple on top. That meeple is gone for good unless you capture it back later.
* **Self-capture** rescues meeples stuck in hopeless features or on tower tops you no longer need.
* **Spend floors** before the deck ends, since they are worth nothing afterwards. Keep 1–2 as a deterrent mid-game.
* **Ransom economics.** In a 2-player game, paying costs 6 relative points; in multiplayer it costs 3 plus a 3-point gift to one rival. Pay only if you will use the meeple soon for clearly more than that, never to the leader for a marginal gain, and rarely in the last turns.
* **Exchanges.** If an opponent holds your meeple, capturing any of theirs gets yours back for free.
* **Levels.** Easy captures the best target in range. Medium also avoids exposure and closes threatening towers. Hard looks ahead on tower growth, exchanges and ransom.

---

## 16. Kid rules text (in-app)

> **THE TOWER:** 18 new tiles show a square stone tower foundation, and everyone gets wooden tower floors (2 players: 10 each, 3: 9, 4: 7, 5: 6, 6: 5). Place your tile as usual. Then choose ONE: put a meeple on your new tile like normal, OR stack one of your floors on ANY foundation or unfinished tower on the map, OR put one of your meeples on top of ANY tower to finish it (nobody can build it higher while he stands there, and he stays up there for the rest of the game, scoring nothing). Every time you add a floor you may capture ONE meeple. Count the tower's floors now, say 2: you can grab a meeple on the tower's own tile or up to 2 tiles straight up, down, left or right. No diagonals, and empty gaps still count. You may even take a meeple standing on another tower, or one of your own to get it back home. A captured meeple from another player sits in front of you as your prisoner. If you and another player hold each other's meeples, swap them back straight away. Once on your turn you may buy one of your meeples back: give the player holding it 3 of your points (only if you have at least 3). Builders, pigs, the fairy and the dragon can't be captured. Towers and prisoners score no points at the end, but grabbing a meeple just before its city is scored can win you the game!

---

## 17. Figures worth drawing

1. A tower tile: the empty foundation, then 1, 2 and 3 floors, then 3 floors with a red meeple on top (closed).
2. Range plus-sign for heights 1, 2 and 3 (5, 9 and 13 tiles), with a gap still counted and a diagonal crossed out.
3. Rulebook example: the first floor captures the blue meeple on the tile above, which moves to the prisoner area.
4. Own capture: your meeple hops back into your supply.
5. Prisoner exchange: blue ↔ red arrow, labelled "automatic swap".
6. Buy back: your score marker −3, the captor's +3, and your meeple coming home.
7. The figure-step chooser: four icons, "pick ONE".
8. Snatch before scoring: a completed city, the blue knight captured, then scoring without him.
9. The special-case bridge tile with its 4 fields coloured, one road and one city.
10. The dragon landing on a tower tile and eating the meeple on top while the floors stay.

---

## 18. Open questions and uncertainties

* **Garden position on TO/FG and TO/RRG.** Which tiles carry gardens is solid (JCZ `tower:2`; `abbot.json` agrees). Where the garden is drawn is unverified: I found no scan of the 2016+ garden prints. The NE-corner box is JCZ's choice and keeps all meeple spots clear.
* **Princess + tower action in the same turn.** The 3rd-edition English P&D text says only "you may not place a meeple this turn". Its exclusion list doesn't name tower floors. I treat the princess as using up the figure action (Big Box wording "may not deploy or move any other figure"; JCZ; tower floors are neutral figures in HiG's own terms).
* **Meeple on a tower on the dragon's tile.** This rests on the Big Box sentence "At no point may followers occupy the same tile as the dragon", which is not in the 3rd-edition English P&D book. JCZ allows it. We forbid it, to stay consistent with `princess-dragon.json`.
* **Reopening.** The 3rd-edition rulebook doesn't restate it. It rests on the 11/2013 official clarification (S-CAR) and the old FAQ, and JCZ does the same.
* Foundation boxes come from the 1st-edition art (JCZ). The new art matched in every photo I could check, but sizes may differ by a few percent.
