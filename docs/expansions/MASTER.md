# Master rules arbitration — River, Abbot, Inns & Cathedrals, Traders & Builders, Princess & Dragon, Tower

*3rd edition (Hans im Glück 2014–2017 / Z-Man; WikiCarpedia "C2"). Arbitrated 2026-10-17 against the six specs in
this folder, the official rulebooks, the official clarifications recorded by WikiCarpedia/S-CAR, and JCloisterZone
(JCZ) as a reference implementation.*

**This file is authoritative.** Where the six expansion specs disagreed, they have been patched to agree with it (§D).
Developers implement from §A (turn sequence), §B (rulings) and §F (P&D + Tower spec); testers use §G.

**Precedence used for every ruling:** (1) the 3rd-edition rulebook text (verified verbatim where quoted: P&D EN 2016 +
DE 2016, Tower EN 2017, T&B EN 2017, base supplement 2014, I&C EN 2015 via the I&C spec); (2) official publisher
clarifications (HiG FAQ, marked "official clarification" on WikiCarpedia or quoted in S-CAR); (3) WikiCarpedia
community interpretations; (4) JCZ behaviour.

## Rulings at a glance

| # | Ruling | Changed something? |
|---|---|---|
| 1 | Recalling the abbot never earns the fairy +3. | P&D spec said yes → fixed; **engine gives +3 → bug E1** |
| 2 | A princess removal *is* the follower step: no figure, portal, fairy, recall or tower action that part. | agreed |
| 3 | No meeple on a tower top on the dragon's tile (official clarification); floors there are fine. | upgraded from "interpretation" |
| 4 | Portal: one meeple/large/abbot onto any unoccupied, uncompleted feature anywhere (abbot only monastery/garden), never the dragon's tile; builder and pig never. | agreed |
| 5 | Volcano turn: no figure of any kind on the volcano tile; fairy, recall and tower actions elsewhere allowed; the tile's completed features score. | agreed |
| 6 | 6th colour is pink (app already correct). | I&C spec text fixed |
| 7 | The large meeple may close a tower (official Tower p.4). | I&C spec said "community" → fixed |
| 8 | Prisoner exchange is 1-for-1 regardless of kind; the owner of the returning figures picks; ransom 3 for any figure, once per turn. | agreed |
| 9 | Dragon eats meeples, large meeples, abbots, builders, pigs and tower-top meeples; never the fairy, floors or tiles; it may enter tower tiles; an emptied tower reopens. | agreed |
| 10 | River II is out of scope. | agreed |
| 11 | `DG/Ccc+.g` (three-sided portal city) has **0** pennants — confirmed by the WikiCarpedia C2 scan. | confirmed |
| 12 | `IC/RRR.i`: the inn serves the W and E roads, not S (3rd-ed rule; JCZ has the 1st-ed version). | confirmed |
| 13 | **River: no third consecutive same-way bend** (straights ignored), in addition to the printed no-immediate-U-turn rule. | **new** → River spec fixed, **engine bug E2** |
| 14 | The dragon's "no revisit" list is per flight (a second flight in a double turn starts fresh). | agreed |
| 15 | The builder's double turn is optional. | **engine deviation E3** (low) |

---

## A. Unified turn sequence (all six expansions on)

### A.1 Setup

1. **Tiles.** 72 base tiles (3rd edition: one copy each of E, H, I, M, N, R, U, V shows a garden; counts unchanged).
   Start tile `D` at (0,0) — **except with the River**: the start tile goes back in the box, the spring is the start
   tile, and a separate river stack (10 shuffled river tiles, lake underneath) is drawn first. Land deck = 71 base
   + I&C 18 + T&B 24 + P&D 30 + Tower 18 = up to 161 tiles (+11 river draws).
2. **Each player's supply:** 7 meeples; Abbot: +1 abbot; I&C: +1 large meeple; T&B: +1 builder and +1 pig (no pig if
   the "farmers" option is off); Tower: floors 10/9/7/6/5 for 2/3/4/5/6 players, empty prisoner area.
3. **Neutral:** dragon and fairy beside the board (P&D); goods tokens 9 wine / 6 grain / 5 cloth (T&B).
4. **Players:** 2–5; 6 only with I&C (pink). Turn order = increasing seat index ("clockwise").

### A.2 One turn of player P (part 1, plus part 2 if the builder grants it)

**Step 0 — Start of turn** *(once per turn; skipped for part 2; only if P actually gets a tile, otherwise the game ends)*
- P&D: if the fairy is assigned to one of P's followers, P scores **+1**.
- Tower: P's "ransom used this turn" flag is reset.

**Step 1 — Draw**
- River: while river tiles remain, draw from the river stack (this includes a builder part-2 draw).
- P&D: a tile showing the **dragon** symbol drawn while the dragon is not in play (no volcano placed yet) is **set
  aside** (before any placeability check); draw again.
- A tile with no legal placement is removed from the game; draw again.
- No tile available → game end (§A.4). Set-aside dragon tiles that never re-entered stay unused.

**Step 2 — Place the tile** (mandatory) and resolve placement effects in this order
- 2a *Legality:* every edge matches. River tiles: must continue the single open river end; no immediate U-turn (two
  adjacent bends turning the same way); **no third consecutive same-way bend** (straights ignored; ruling B13).
- 2b *T&B builder trigger (part 1 only):* if the new tile now belongs to a road or city containing P's builder
  (extends, joins or completes it), the double turn is earned now — it stands even if the builder leaves later this
  turn.
- 2c *Tower:* a tile with a foundation creates an empty tower (height 0).
- 2d *P&D volcano:* the dragon jumps onto this tile (eats nothing). If it is the **first** volcano, all set-aside
  dragon tiles are shuffled back into the remaining stack now.

**Step 3 — Optional ransom (Tower; not an action):** at most once per whole turn, P may buy back one of P's prisoners
for 3 points paid to its holder (P needs ≥ 3 points). The figure returns to P's supply and is usable in step 4.

**Step 4 — Follower step: exactly ONE of the following, or pass**
- 4a **Princess** (princess tile): if the princess's city segment belongs to a city holding knights, remove one knight
  (any player's, own allowed; a large meeple is one knight). This uses up the step.
- 4b **Place a figure on the tile just placed** — never if the dragon stands on it (volcano turn):
  meeple / large meeple on an unoccupied road, city, field (if farmers on) or monastery, never a garden;
  abbot on the tile's monastery or garden; builder on a road/city of this tile whose group holds P's meeple/large and
  is not completed; pig on a field of this tile whose group holds P's farmer.
- 4c **Magic portal** (portal tile): instead, one meeple / large / abbot onto an unoccupied, uncompleted feature of any
  other tile (abbot: monastery/garden; meeple/large never a garden; farmers only if on; never the dragon's tile;
  builder/pig never).
- 4d **Recall the abbot** (Abbot): from a monastery/garden with < 8 neighbours anywhere → score 1 + neighbours (2–8)
  now. It scores the abbot, not the feature: **no fairy +3**.
- 4e **Move the fairy** (P&D): next to one of P's followers anywhere (meeple, large, abbot, tower-top meeple; not
  builder/pig). Needs ≥ 1 follower on the board.
- 4f **Tower floor** (Tower): one of P's floors onto any empty foundation or open tower (no meeple on top), height + 1;
  then optionally **capture** one follower (meeple, large, abbot; on a feature or another tower's top; any owner incl.
  P) on the tower's tile or up to *h* tiles straight N/E/S/W (*h* = new height; nothing blocks). Own figure → supply;
  opponent's → P's prisoner, then automatic exchange if the victim holds P's figures (P picks which of his returns,
  the victim gets the captured one back). A captured tower-top meeple reopens its tower.
- 4g **Tower top** (Tower): P's meeple or large meeple onto an open tower with ≥ 1 floor, not on the dragon's tile →
  closed.
- *After any removal (4a, 4d, 4f):* a builder/pig whose owner no longer has a meeple/large in its feature goes home.

**Step 5 — Dragon flight (P&D)**, only if the placed tile shows the dragon (it is then always in play). Starting with
P and going round, each player **must** move the dragon one tile orthogonally onto a placed tile that is not yet
visited in this flight (the start tile counts as visited) and not the fairy's tile, until 6 moves or a dead end.
Every figure on an entered tile is eaten (returns to its owner); floors and the fairy are never eaten; a tower that
loses its top meeple reopens; lonely builders/pigs go home after each step.

**Step 6 — Scoring of the features completed by the placed tile** (with the figures that are still there)
- Road 1/tile (inn 2/tile); city 2/(tile+pennant) (cathedral 3/(tile+pennant)); monastery/garden with a figure and
  8 neighbours: 9. Strength: meeple 1, large 2, abbot 1, builder/pig 0; ties all score.
- P&D: **+3** to the owner of the follower the fairy is assigned to, if it is in a scored feature (regardless of
  majority); the follower goes home, the fairy stays on her tile unassigned.
- T&B: for each completed city, P (the placer) takes one goods token per goods symbol in it, knights or not.
- Return all figures of scored features (builders leave with their road/city); then lonely builder/pig check.

**Step 7 — Builder double turn (T&B):** if earned in 2b and a tile can be drawn, P may play part 2 = steps 1–6 again
(no step 0; ransom still once per turn; the tile may go anywhere; no further trigger; its own symbols resolve — a
second flight starts a fresh visited list). Optional.

**Step 8 — End of turn:** next player.

### A.3 Once per turn vs. once per tile

| Once per turn (double turn = one turn) | For each tile / part |
|---|---|
| fairy +1 (step 0) · ransom (step 3) · builder trigger (part 1 only) | draw (incl. set-aside/discard) · placement + tile effects (volcano jump, reinsertion, tower creation) · one follower step (incl. princess, portal, fairy, recall, floor/capture, tower top) · dragon flight · scoring · lonely checks · automatic exchanges |

### A.4 Game end and final scoring

The game ends when no tile can be drawn for a turn or part 2. Score (display order; totals are order-independent):
1. incomplete roads: 1/tile, **0 if it has an inn**;
2. incomplete cities: 1/(tile+pennant), **0 if it has a cathedral**;
3. monasteries and gardens with a figure: 1 + neighbours (abbot = monk); empty gardens 0;
4. fields: 3 per completed adjacent city to the farmer majority (large = 2); a winner with a pig there +1 per city;
5. fairy: +3 for her assigned follower if its feature is scored in 1–4 (also when it scores 0);
6. goods: 10 per type to the player(s) with most tokens (ties all; needs ≥ 1 token).

Towers, floors, tower-top meeples and prisoners score nothing; prisoners stay with their captors.

---

## B. Conflicts found and final rulings

| # | Question | What the specs / JCZ said | Final ruling | Basis |
|---|---|---|---|---|
| B1 | Fairy +3 when the abbot is recalled | Abbot: no. P&D: yes ("our interpretation"). JCZ: no. | **No.** The recall is scored at once in step 4 and scores the abbot, never the feature; the fairy stays on that tile, unassigned. | WikiCarpedia *The Abbot*, official clarifications 3/2015 (upd. 10/2024: "scoring occurs immediately during the 2. Placing a meeple phase") and 11/2020 ("you always score the abbot … never the feature itself"); P&D EN p.5 puts the +3 under "3. Scoring a feature"; WikiCarpedia P&D ("not applicable to an abbot when removed"); JCZ `ActionPhase.handleReturnMeeple`. |
| B2 | Does a princess removal use up the follower step? | All six: yes. | **Yes.** Afterwards no meeple/large/abbot/builder/pig, no portal, no fairy, no recall, no floor, no tower top in that part. Ransom (not an action) is still allowed; the other part of a double turn is unaffected. | P&D EN p.4 ("may not place a meeple this turn, not even on a different segment") and p.6; P&D DE p.6 ("keine andere Figur … oder Fee"); WikiCarpedia P&D list (incl. tower piece, abbot removal); JCZ. |
| B3 | Meeple on a tower top on the dragon's tile | P&D, Tower: forbid ("interpretation"). JCZ: allows. | **Forbidden** while the dragon stands there. Floors there are allowed (and may capture). | Official clarification (Carcassonne I rules, Big Boxes 1–3) in WikiCarpedia P&D footnote 6: none of the figures on the dragon's menu may occupy the dragon's tile "by any means"; "Meeple on a tower" is on the menu (P&D EN p.3). |
| B4 | What may the portal place, and where? | Abbot, P&D, I&C agree. | One meeple, large meeple or abbot onto an **unoccupied, uncompleted** feature of any tile other than the portal tile; on the portal tile itself normal placement applies (it may take a feature the tile just completed). Abbot: monastery/garden only; meeple/large: never gardens; fields only with farmers; uncompleted monastery/garden = < 8 neighbours; never the dragon's tile, never a river, never a tower top (that is action 4g). | P&D EN p.4; WikiCarpedia *The Abbot* official 3/2015; WikiCarpedia P&D official 7/2014 (upd. 1/2019), 1/2021 (closed fields OK); JCZ `AbstractActionPhase`. |
| B5 | Builder/pig via the portal? On a volcano tile? | T&B, P&D agree. | **Neither.** They may be placed normally on a portal or dragon tile. | P&D EN p.6 ("A magic portal may not be used to place a builder or pig"); P&D EN p.2 + B3. |
| B6 | 6th player colour | I&C: pink, and claimed the app used grey. | **Pink.** The app already uses pink (`PLAYER_COLORS.pink`, `COLOR_ORDER`); 6 players only with I&C. | I&C 3rd-ed components; WikiCarpedia I&C. |
| B7 | Large meeple on a tower top | Tower: official. I&C: "community, uncertain". | **Allowed.** Abbot, builder, pig: never. | Tower EN p.4 "Figures you may place on a tower: Large meeple" (abbot listed under may NOT); action C places "one of your meeples". |
| B8 | Captured large meeple; exchange; ransom | Tower, I&C agree. | Exchange is immediate and automatic, one figure for one regardless of kind; if the victim holds several of the captor's figures, the captor (their owner) picks which returns; 3-player cycles never exchange. Ransom = 3 points for any figure, once per turn, payer needs ≥ 3 (score never below 0). | Tower EN pp.3–4; WikiCarpedia I&C official ("it may be big, but it's still only one person"); WikiCarpedia Tower official (once per turn even in a double turn); JCZ `TowerCapturePhase`, `PayRansom`. |
| B9 | What the dragon eats; may it enter tower tiles? | All agree. | Eats meeples, large meeples, abbots, builders, pigs, tower-top meeples of every player (incl. the mover's new meeple). Not: fairy, floors, tiles. Enters any placed tile incl. tower tiles, never the fairy's tile (assigned or not); a tower whose top meeple is eaten reopens. | P&D EN p.3 (menu / diet plan); Tower EN p.4; WikiCarpedia Tower official 11/2013 (reopening). |
| B10 | River II material | River: reference only; P&D mentions the River II volcano lake. | **Out of scope.** Only the 12 River I tiles: no fork, no volcano lake, no River II extra-tile rule. | FORMAT.md scope. |
| B11 | Pennants on `DG/Ccc+.g` | P&D: 0 (one BGG photo). JCZ / 1st ed.: 1. | **0.** | WikiCarpedia C2 scan `Princess_And_Dragon_C2_Tile_S`: no coat of arms, while the C2 scans of `CCc+.p` (F) and `CFc+.d` (N) clearly show theirs; BGG 2969451. |
| B12 | Inn on `IC/RRR.i` | I&C: W + E. JCZ: E only. | **W and E roads** (not S). | I&C 3rd-ed rulebook tile notes; WikiCarpedia I&C "The inn counts for the road heading left and the road heading right, but not the road heading down." JCZ encodes the 1st edition. |
| B13 | River: three same-way bends with straights in between | River spec: only immediate U-turns are banned. | Banned: two adjacent same-way bends (printed rule) **and a third consecutive same-way bend, straights ignored** (R–S–R–S–R is illegal; an opposite bend resets the count). A wide U (two same-way bends with straights between) stays legal; the official example (L, R, S, R, L) is legal. | HiG FAQ answer as recorded on WikiCarpedia *The River* (EN and DE): "Only immediate U-turns are explicitly forbidden. Naturally, there can also be problems if a straight river tile lies between. **Turning river the same way three times should also be considered prohibited.**" S-CAR v7.3 (2014) quotes the answer without the last sentence. The C3.1 (2025) sentence about bends "opposite to the flow direction of the river source" is not 3rd edition and is not adopted. |
| B14 | Dragon "already visited" scope (two dragon tiles in one double turn) | P&D: per flight. EN 2016 says "this turn". | **Per flight**: part 2's flight starts a fresh list; its start tile counts as visited. | DE 2016 "Er darf kein Plättchen zweimal betreten" within one *Drachenzug*; ZM 2012 "during one movement phase"; JCZ. |
| B15 | Volcano turn alternatives; does the volcano tile score? | P&D, Abbot, Tower agree. | No figure on the volcano tile; P may move the fairy, recall the abbot, place a floor (+capture) or a tower-top meeple elsewhere, or pass. Features completed by the volcano tile score ("Then it is the next player's turn" = no flight). | P&D EN p.2; WikiCarpedia P&D footnote 5 and "3. Scoring: no effect". |
| B16 | Fairy +3 at final scoring, on 0-point features, for tower-top followers | I&C, P&D, Tower agree. | +3 whenever the assigned follower is in a feature being scored, during play or at the end, regardless of majority or value (incomplete inn road / cathedral city = 0 still pays; farms pay). Never for a tower-top follower (towers never score), never on a recall (B1). Flat 3 for a large meeple. | P&D EN p.5; WikiCarpedia P&D footnotes 24–25; JCZ `FairyCapability`. |
| B17 | When can ransom be paid? | Tower, T&B agree. | On one's own turn before the follower step of either part; at most once per whole turn; ≥ 3 points at payment; the figure is usable at once. | Tower EN p.3; WikiCarpedia Tower official; Order of Play; JCZ (`RANSOM_PAID` cleared at turn end). |
| B18 | Is the double turn optional? | T&B spec: yes. Engine: automatic. | **Optional** ("you may immediately draw"). | T&B EN p.4. |
| B19 | Double turn if the builder leaves later in the same tile's steps | T&B, P&D: stands. | **Stands** (triggered at placement), e.g. the tile completes the road, or the dragon/princess removes the builder's support. | WikiCarpedia T&B official 3/2015 (upd. 12/2018); JCZ `TilePhase`. |
| B20 | Lonely builder/pig | All agree. | Goes home immediately whenever its owner has no meeple/large left in its feature — after scoring, princess, each dragon step, capture. | T&B EN pp.3, 6; P&D EN p.6. |
| B21 | Fairy when her follower leaves | P&D. | She stays on that tile, unassigned (still blocks the dragon, scores nothing) until moved; she is not re-attached to a follower placed there later. | P&D EN p.5; JCZ `UndeployMeeple`. |
| B22 | Dragon tiles drawn before the first volcano; determinism | P&D: set aside + reshuffle. JCZ: inactive tile group. | Set aside; on the first volcano placement reinsert them at random positions of the remaining stack, using randomness fixed at game creation (seeded RNG stored in the state, or precomputed numbers) — never fresh randomness mid-game. | P&D EN p.2 "Important"; lockstep requirement. |
| B23 | Abbot placed in part 1 and recalled in part 2 | Abbot: allowed by the rules as written, no ruling; JCZ allows. | **Allowed.** | T&B EN p.4 (each tile gets the full steps). |
| B24 | Whom can the princess remove? | P&D, Tower agree. | Only knights (meeple/large) in the city that contains the princess segment after placement (the whole merged city). Not tower-top meeples, not the `LCcc.d` monk, not prisoners, not builders. On `DG/CCc+.p` the pennant city only if the tile joins the two. | P&D EN p.4; WikiCarpedia P&D official (two-city tile); WikiCarpedia Tower official ("the tower is not a part of the city"). |
| B25 | What blocks tower range? | Tower. | Nothing: gaps, other towers and the river do not block. Plus shape, distance ≤ new height, the tower's own tile included, no diagonals. | Tower EN p.3; Tower DE p.3 ("… und den Fluss hinweg"). |
| B26 | Fairy targets and when she may move | P&D. | Any own follower on the board (meeple, large, abbot, tower-top meeple); not builder/pig; needs ≥ 1 follower; allowed on volcano and dragon-tile turns and with an empty supply; not after a princess removal. | P&D EN pp.5–6; WikiCarpedia P&D. |
| B27 | Start tile with the River | River. | Returned to the box: the land deck keeps 71 base tiles. | Z-Man 2014 sheet; HiG 2014; WikiCarpedia River. |

---

## C. Interaction matrix

| Pair | What changes |
|---|---|
| River × Abbot | `RI.1/IIG` (garden) and `RI.1/LIRI` (monastery) take the abbot during the river phase; recall allowed then; holes left by river bends can make completion impossible (recall gives partial points). |
| River × I&C | No rule interaction. The large meeple may stand on river-tile roads/cities/fields/monastery (never the water). Inn lakes are decoration. |
| River × T&B | Builder/pig on river-tile features (the river splits fields; the spring/lake field wraps round). A double turn during the river phase draws the next **river** tile. No river city has goods. |
| River × P&D | No P&D tile comes up during the river phase (no set-aside then). The fairy may still be moved then. The dragon flies over river tiles (not gaps) and eats there; the portal may target river-tile features. |
| River × Tower | No foundation on river tiles. Range crosses river tiles and the river; followers on river tiles can be captured. |
| Abbot × I&C | Large meeple never on a garden, may be a monk. Gardens on `IC/CCCCG`, `IC/RFr.iG`. The pink abbot belongs to the 6th player. |
| Abbot × T&B | The abbot never supports a builder/pig; builder/pig never on monastery/garden. Recall is a step-4 action (no builder/pig that part); each part has its own step 4 (place in one part, recall in the other). Gardens on `TB/CcRR.wG`, `TB/CcR.cG`. |
| Abbot × P&D | Dragon eats the abbot (no points); recalling before the flight saves it. Portal can place the abbot on any free, uncompleted monastery/garden (not the dragon's tile). Fairy may stand by the abbot: +1/turn, +3 on completion or final scoring, **no +3 on recall**. No abbot placement or recall after a princess removal; recall allowed on a volcano turn. Gardens on `DG/C.dG`, `DG/Cc.pG`. |
| Abbot × Tower | Abbot never on a tower; capturable (own capture → supply without points); exchange/ransom 3. Recall excludes tower actions that part; ransom combines with anything. `TO/FG`, `TO/RRG`: garden + foundation, still one action. |
| I&C × T&B | Large meeple supports builder/pig and counts 2 (also in the pig's field). Cathedral cities award goods normally on completion. 6 players need I&C (T&B has 6 builders/pigs). |
| I&C × P&D | Large meeple: eaten, removable by the princess as one knight, portal-placeable (not on gardens), fairy-assignable (flat +1/+3). Fairy +3 on a 0-point incomplete inn road or cathedral city at the end. |
| I&C × Tower | Large meeple capturable (removes 2 strength), ransom 3, may close a tower, exchanged 1-for-1. 6 players → 5 floors. |
| T&B × P&D | Dragon eats builder/pig; lonely return after dragon or princess. Portal cannot place builder/pig; none on a volcano tile; fairy cannot be assigned to them; fairy move or princess removal excludes them. Fairy +1 once per double turn; each part resolves its own symbol (second flight, fresh visited list). A volcano that extends the builder's feature triggers the double turn; the double turn stands if the builder is eaten. Goods still go to the completer if the dragon emptied the city. |
| T&B × Tower | Builder/pig cannot be captured or put on towers; capturing their last support sends them home. One tower action per part; ransom once per turn; exchanges whenever triggered. |
| P&D × Tower | Dragon eats tower-top meeples, never floors; the tower reopens. No tower-top meeple on the dragon's tile (floors OK). Capture resolves before the flight. The fairy gives no protection against capture; she may stand by a tower-top meeple (+1, dragon protection, never +3). The princess cannot remove tower-top meeples; a removal excludes tower actions. Volcano turns allow tower actions elsewhere. Prisoners are safe from dragon and princess. The portal does not target tower tops. |

Triple combinations worth testing: **T&B × P&D × Tower** (part 1: floor + capture, then the part-1 flight; part 2:
tower top; ransom once; fairy +1 once); **Abbot × P&D × Tower** (an abbot with the fairy can still be captured — the
fairy stays unassigned); **I&C × T&B × Tower** (capturing a large meeple that is a builder's only support sends the
builder home).

---

## D. Tile data validation and spec fixes applied

### D.1 Tile data — validated, no tile changes needed

- `node dev/build-expansions.mjs` converts all six specs with no port errors: River 12 (11 types), Abbot 8,
  I&C 18 (17 types), T&B 24, P&D 30 (29 types), Tower 18 (17 types). It regenerated `public/js/data/*.js`
  (`dragon.js` and `tower.js` now hold the 30/18 tiles).
- A tile-by-tile diff against JCZ (`/tmp/claude-0/master/scripts/cmp-jcz.mjs`) shows every tile identical to the
  3rd-edition tile sets (`river/1:2`, `basic:2` gardens, `inns-and-cathedrals:2`, `traders-and-builders:2`,
  `princess-and-dragon:2`, `tower:2`) in cities (sides, pennants, cathedral, goods, princess), roads (inn), rivers,
  fields (halves, inner fields, adjacent cities), monasteries, gardens, tags and counts. Only two deliberate,
  now-confirmed deviations: `IC/RRR.i` (B12) and `DG/Ccc+.g` (B11). Base garden tiles `BA/CFCG`, `BA/CCG`,
  `BA/RFrG` are a quarter turn from JCZ on purpose (they equal tiles.js H, I, U plus a garden; verified).
- Garden lists agree: abbot.json's list equals the gardens in every expansion spec (`RI.1/IIG`; `IC/CCCCG`,
  `IC/RFr.iG`; `TB/CcRR.wG`, `TB/CcR.cG`; `DG/C.dG`, `DG/Cc.pG`; `TO/FG`, `TO/RRG`) plus the 8 base tiles.
- Tallies: P&D 6 volcano / 12 dragon / 6 portal / 6 princess; T&B 9 wine / 6 grain / 5 cloth; I&C 6 inn tiles,
  2 cathedrals, 3 pennants; Tower 18 foundations.

### D.2 Rule-text fixes in the specs (to make them consistent with §B)

| File | Change |
|---|---|
| `princess-dragon.json` | `scoring_during_game`: fairy +3 on recall → **no** (B1). `interactions.abbot`: same. `followers` (dragon's tile) and `interactions.tower`: tower-top ban cited as official clarification (B3). `edition_differences`: pennant 0 confirmed by the C2 scan (B11). `kid_rules_text`: portal also reaches gardens (abbot), never builders/pigs. |
| `princess-dragon.md` | §6 Abbot (recall: no +3), §6 Tower (official clarification), §8 JCZ differences, §10 decisions 1, 2, 4. |
| `inns-cathedrals.json` / `.md` | Large meeple on a tower top: official (Tower p.4), not "community" (B7); the app already uses pink (B6); open-points entry resolved. |
| `tower.json` / `.md` | Dragon's-tile tower-top ban cited as official clarification (B3). |
| `traders-builders.json` | Tower interaction: citation corrected (not capturable per Tower p.4 list; not on towers because action C places "meeples" and builder/pig are not meeples). |
| `river.json` / `.md` | New placement rule "no third same-way bend" + algorithm + edge case/FAQ wording (B13). |

---

## E. Engine review

**Scope.** `public/js/game.js` and `tiles.js` as of this review — the working tree on top of commit `400ef49`, which
already contains the main developer's in-progress P&D and Tower code — plus `ai.js` and `controller.js` where they
touch rules. Nothing in `public/js` or `tests` was edited.

**How it was checked.** `npm test` (44/44 pass); targeted probes in `/tmp/claude-0/master/probe/`
(`probe1.mjs`: River/Abbot/I&C/T&B, 11 scenarios; `probe2.mjs`: P&D/Tower, 10 scenarios; `river3.mjs`;
`river-rule-sim.mjs`); random stress: `stress.mjs` (192 games, the 16 old combinations) and `stress2.mjs`
(256 games, all 64 combinations, 2–6 players) checking legality of every offered option, nothing on the dragon's tile,
fairy ≠ dragon, set-aside only before the dragon arrives, non-negative scores, score breakdown sums and exact tile
accounting. No crashes or invariant breaks.

### E.1 Findings

| # | Severity | Where | Finding | Failing scenario | Fix |
|---|---|---|---|---|---|
| E1 | **Rules bug** | `game.js:654-664` (recall branch of `finishTurn`); `ai.js` `evaluate()` recall branch (`addPts(me, 3)` when the fairy is by the abbot, ≈ line 232) | The recall awards the fairy +3 (`fairyEvent` on the recall event). Contradicts B1. | Abbot on monastery `B` at (0,0), fairy assigned to it; place `B` at (1,0); recall → engine scores **5**, ruling **2** (`probe2.mjs` #1). | Remove the `fairyEvent`/`award(... 'fairy')` lines from the recall branch (keep `returnPieces`, whose `syncFairy` leaves the fairy unassigned on her tile). In `ai.js` `evaluate()` drop the `+3` for recall (the AI should instead count the lost +1/turn). Add a test. |
| E2 | **Rules bug** (new ruling) | `game.js:179-190` (`canPlace`), `336-340` (`placeTile`) | No "third same-way bend" check (B13). | Spring r0 (0,0) → `RI.1/IFI` (1,0) r0 → `RI.1/II` (2,0) r0 [right] → `IFI` (2,1) r1 → `RI.1/IIG` (2,2) r1 [right] → `IFI` (1,2) r0 → `RI.1/RrII` (0,2) **r2 [third right] is accepted**; must be refused, r3 [left] stays legal (`river3.mjs`). | Keep `state.river.run = { dir, n }` (bends only). Bend direction: `turn = (exit − open.side + 4) % 4`, right if 1, left if 3. Refuse if `dir === d && n >= 2`; after a bend: same dir → `n + 1`, else `{dir: d, n: 1}`; straights and the lake leave it unchanged. Default `{dir: 0, n: 0}` in `newGame` and `migrate`. The official example stays legal (verified in `river-rule-sim.mjs`). |
| E3 | Rules deviation (low) | `game.js:353-365`, `816-831` | The double turn is taken automatically; the rule says "may" (B18). | Rare: a player who would rather not draw a tile that can only help others is forced to. | Accept an opt-out in the part-1 action (e.g. `act`-independent flag `{ t:'turn', …, noBonus: true }` that clears `state.bonus` before `endPart`); UI asks only when a bonus was earned; AI always accepts. |
| E4 | OK (note) | `game.js:39-44`, used at `349` | Set-aside dragon tiles are reinserted with an RNG stored in the state (`state.rng`, seeded once in `newGame`). This is deterministic for lockstep and covered by the replay test. | — | Keep; document that `state.rng` is never re-seeded and that rules code never calls `Math.random`. |
| E5 | AI quality | `ai.js` `estimate()` (`const remaining = state.deck.length / 71`) | With expansions the land deck reaches 161 tiles, so early `remaining` ≈ 2.3 saturates completion chances and inflates hand value. | — | Normalise by the deck size at game start (store it in the state). |
| E6 | UI — resolved during this review | `controller.js` `ghostLabel`, `pump`, `startTurn`/`dragonPhase`, ransom button; `expansions.js` | While this review ran, the controller gained the dragon phase (moves routed by `G.dragonMover`), the ransom button, labels for `fairy`/`princess`/`recall`/`floor`/`towerTop`/portal options, and all six expansions were set `ready: true`. Remaining cosmetic nit: `beginActionPhase` says "You have no followers left" only when `supply.meeple === 0`, ignoring large meeple/abbot. | — | Optional wording fix. Make sure E1–E3 land before release since P&D/Tower are now selectable. |

### E.2 Verified conformant (no change needed)

- **River:** spring start, start tile out (71 land), 10 random river tiles then the lake; continue-the-open-end;
  no immediate U-turn (official "Watch out!" case refused, official completed example accepted); unplaceable tiles
  discarded; lake closes the river; no options on water; river tiles on top of the deck so a builder part 2 in the
  river phase gets a river tile.
- **Abbot:** 8 base garden copies replacing plain ones (72 tiles); abbot only on the placed tile's monastery/garden;
  meeple/large never on gardens; recall 1 + neighbours, also with an empty supply, not when this tile is the 8th
  neighbour (then 9 in scoring); abbot placed in part 1 can be recalled in part 2; final 1 + neighbours.
- **I&C:** inn ×2 / 0 if incomplete; cathedral ×3 / 0 if incomplete; large weight 2, ties, never doubled; `IC/RRR.i`
  W+E inn data.
- **T&B:** builder needs own meeple/large in the group and an uncompleted feature; trigger at placement in part 1
  only, also when the tile completes the feature; opponents' extensions never trigger; no chain; builder returns with
  scoring; lonely return; pig with own farmer, +1/city when its owner wins or ties; goods to the placer even without
  knights; goods majorities with ties and the ≥ 1 rule; no pig without farmers.
- **P&D / Tower (new code):** set-aside before the placeability check and reinsertion at the first volcano; no
  placement on the dragon's tile (covers volcano turns and builder/pig); princess options = knights of the princess
  city, removal before scoring, builder lonely return; portal targets exactly as B4 (own tile via normal options,
  completed groups excluded elsewhere, dragon tile excluded, no builder/pig); fairy targets incl. tower tops; +1 only
  at a real turn start and not in part 2; +3 in scoring and final scoring (0-point inn road pays); fairy stays
  unassigned when her follower leaves; dragon mover = active player + moves, start tile visited, fairy tile blocked,
  6 steps, dead ends, eats builders/pigs/tower tops, lonely checks, fresh visited list in part 2; double turn stands
  after the builder is eaten or removed by the princess; floors 10/9/7/6/5; floor/top options (tops never on the
  dragon's tile, only meeple/large); capture range with the new height; own capture to supply; exchange with the
  captor's choice (`swap`, default large > abbot > meeple); capture before the flight; tower reopens; ransom once per
  turn across both parts, ≥ 3 points; prisoners and tower tops count in piece conservation; breakdown buckets `fairy`
  and `tower`.

---

## F. Implementation spec — The Princess & the Dragon and The Tower

Status marks refer to the current working tree: ✔ implemented as specified · ✘ must change · ○ optional.

### F.1 State

| Field | Meaning | Status |
|---|---|---|
| `state.version = 4` + `migrate()` defaults for all fields below | save compatibility | ✔ |
| `state.rng` (int) | seeded once in `newGame` from the initial random source; advanced only by rules code (B22) | ✔ |
| `state.dragon: null \| 'x,y'` | null until the first volcano; then the dragon's tile | ✔ |
| `state.setAside: string[]` | dragon tiles drawn before the dragon arrived | ✔ |
| `state.flight: null \| { visited: ['x,y'…], moves }` | during `phase === 'dragon'`; `visited` starts with the start tile | ✔ |
| `state.fairy: null \| { key, f, k, p }` | the follower she stands by (`f` = feature index or `'top'`); unassigned = `{ key, f: null, k: null, p: null }` | ✔ |
| `state.towers: { 'x,y': { h, top: null \| { p, k } } }` | created when a foundation tile is placed; **tower-top meeples live here, never in `tile.pieces`** | ✔ |
| `players[i].floors`, `players[i].prisoners: [{ p: owner, k }]` | Tower supply and figures held by player i | ✔ |
| `state.ransomPaid` | reset only at the start of a turn | ✔ |
| `breakdown.fairy`, `breakdown.tower` (ransom ±3) | results screen adds up | ✔ |
| `state.river.run = { dir, n }` | River third-bend rule (E2) | ✘ |
| `phase ∈ 'place' \| 'action' \| 'dragon' \| 'over'` | | ✔ |

### F.2 Draw (`drawTile`)
Pop; if P&D is on, the dragon is not in play and the tile is tagged `dragon` → push to `setAside`, continue (before
the placeability check); else if no legal placement → `discarded`; else `drawn`. ✔

### F.3 Place (`placeTile`) — order matters
1. Legality incl. River rules (✘ add B13). 2. Put the tile; River bookkeeping (✘ update `run`). 3. Tower foundation →
`towers[k] = { h: 0, top: null }` ✔. 4. Volcano → `dragon = k`; if it was not yet in play, reinsert every set-aside
tile at `floor(rand(state) × (deck.length + 1))` ✔. 5. Builder trigger (part 1 only) ✔.

### F.4 Follower-step options (`followerOptions`) — all mutually exclusive, one per part
1. Normal placement on `state.last` unless `state.dragon === state.last` (meeple/large/abbot/builder/pig as §A.2-4b) ✔
2. Recall `{ kind: 'recall', key, fi }` if own abbot on a monastery/garden with < 8 neighbours ✔
3. Portal `{ kind: 'follower', key, fi, k, portal: true }` for every other tile ≠ dragon tile (B4) ✔
4. Princess `{ kind: 'princess', key, fi, k, p }` for each knight in the princess segment's city group ✔
5. Fairy `{ kind: 'fairy', key, fi, k }` for each own follower (incl. `fi: 'top'`) except the one she is assigned to ✔
6. Floor `{ kind: 'floor', key }` for each tower without a top if `floors > 0` ✔
7. Tower top `{ kind: 'towerTop', key, k }` for each tower with `h > 0`, no top, `key !== state.dragon`, `k ∈ {meeple, large}` in supply ✔

### F.5 Actions (all serialisable; lockstep-safe)
- `{ t: 'turn', x, y, r, act }` — `act` from F.4 or `null`; a floor may add `capture: { key, fi, k, p }` (validated
  against `captureTargets(state, key)` after the height increase) and `swap: kind` (which of the captor's own
  figures returns in an exchange when the victim holds several kinds). ✔ — ○ add `noBonus: true` (E3).
- `{ t: 'dragon', key }` — the mover (`dragonMover(state)`) moves the dragon; validated by `dragonMoves(state)`. ✔
  ○ The controller may auto-send a step when exactly one move exists (deterministic either way).
- `{ t: 'ransom', from, k }` — current player, phase `place` or `action`, not yet paid this turn, score ≥ 3. ✔

### F.6 `finishTurn(act)` resolution order
1. Validate `act` against F.4 (and `capture`). 2. Apply: follower → piece; recall → `1 + neighbours`, **no fairy
bonus** (✘ E1), abbot home; princess → knight home; fairy → `state.fairy = { key, f, k, p: current }`; floor →
`floors−1, h+1`, optional capture (F.7); tower top → `towers[key].top`. 3. Lonely builder/pig sweep. 4. If the placed
tile is a dragon tile and the dragon is in play → `phase = 'dragon'`, `flight = { visited: [dragon], moves: 0 }`;
return (or score at once if no move exists). 5. Otherwise score (F.9), sweep, `endPart`. ✔ apart from E1.

### F.7 Capture and exchange (`capture`)
Remove the target (tile piece, or tower top → tower reopens). Own figure → own supply. Opponent's figure: if the
victim holds prisoners of the captor → captor's chosen (`swap`) figure → captor's supply and the captured figure →
victim's supply; else push `{ p: victim, k }` to the captor's prisoners. Then `syncFairy`; the lonely sweep runs in
`finishTurn`. ✔

### F.8 Dragon flight (`dragonMoves`, `moveDragon`)
Moves = orthogonal neighbours that are placed, not in `flight.visited`, not the fairy's tile. Move: `dragon = k`,
push `k`, `moves + 1`; eat every piece on `k` plus the tower top; `returnPieces` (which syncs the fairy); lonely sweep;
if `moves === 6` or no move → `flight = null`, score (F.9), `endPart`. Mover = `(current + moves) % players`. ✔

### F.9 Scoring hooks
- `scoreAfterPlacement`: after each scored feature event, a fairy event `{ kind: 'fairy', points: 3 }` if her assigned
  follower is among that event's figures; then return figures (fairy becomes unassigned). ✔
- `finalScoring`: the same check for every event (roads, cities, monasteries/gardens, fields). ✔
- Recall: none (B1). ✘ E1.
- `endTurn`: after the next player's tile is drawn, `+1` (`breakdown.fairy`) if `fairy.p === current`; nothing in
  part 2 or at game end. ✔

### F.10 Interactions with the already-implemented expansions
- Every path that removes figures (scoring, princess, dragon, capture, final scoring) goes through `returnPieces` or
  `capture` so the fairy is unassigned and the lonely sweep sees the change. ✔
- Code that indexes `features[pc.f]` for `tile.pieces` stays safe because tower tops are not in `tile.pieces`. ✔
- Builder trigger is independent of volcano/princess/portal and survives the builder's later removal (B19). ✔
- River phase: no P&D/Tower tiles appear; nothing special to do. ✔
- Goods: unchanged (the placer of the completing tile, even if the dragon emptied the city). ✔

### F.11 AI requirements
Dragon steps (`chooseDragonMove`, a max-n search over ≤ 6 steps) ✔; ransom choice ✔; portal options pruned to the best
spots ✔; floor options expanded per capture target ✔; volcano simulated by `withTile` ✔. ✘ remove the recall +3 in
`evaluate()` (E1); ○ normalise `remaining` (E5).

### F.12 Controller / UI requirements (E6)
Dragon phase UI (highlight `dragonMoves`, route input to the mover, bots via `chooseDragonMove`) ✔; ransom button
(`ransomOptions`) ✔; option rendering for `princess`, `fairy` (incl. tower tops), `floor`, `towerTop`, portal targets
on other tiles ✔ (verify the capture-target and exchange-choice (`swap`) pickers when the victim holds several kinds);
event animations for `dragon`, `princess`, `fairyMove`, `fairy`, `floor`, `capture`, `ransom`; tower heights, tops and
prisoners on the board and player cards (prisoner/floor counts shown on player cards ✔).

---

## G. Test checklist (for testing agents)

"(exists)" marks behaviour already covered in `tests/`; everything else needs a test.

### River
- R1 Deck: spring is the start tile, start tile out, 71 land + 11 river, river tiles first, lake last. (exists)
- R2 Only at the open end; all edges match; land tiles never fill the open end. (exists)
- R3 Official completed example legal in order (exists); "Watch out!" second same-way bend refused.
- R4 **Third same-way bend refused** (R–S–R–S–R), opposite bend allowed, wide U allowed (E2).
- R5 First tile after the spring may bend either way; spring/lake fields wrap round; river splits fields.
- R6 Unplaceable river tile (incl. the lake) is discarded; game continues with land tiles.
- R7 No follower option on water; options on river-tile roads/cities/fields/monastery/garden.

### Abbot
- A1 72 base tiles with 8 garden copies (E 4+1 … V 8+1). (exists)
- A2 Abbot only on monastery/garden of the placed tile; meeple/large never on a garden; builder/pig never on monastery/garden. (exists, partly)
- A3 Recall = 1 + neighbours, abbot to supply (exists); allowed with an empty supply; not offered when this tile is the 8th neighbour (then 9 points).
- A4 Recall excludes every other action; place in part 1 + recall in part 2 allowed.
- A5 Final: abbot = 1 + neighbours; empty garden 0.

### Inns & Cathedrals
- I1 Inn road 2/tile complete, 0 incomplete, two inns = one (exists, partly). `IC/RRR.i`: W and E roads are inn roads, S is not.
- I2 Cathedral city 3/(tile+pennant), 0 incomplete (exists).
- I3 Large meeple strength 2, ties, never doubled; allowed on monasteries, never gardens (exists, partly).
- I4 6 players only with I&C; pink.

### Traders & Builders
- T1 Builder options: own meeple/large in group, road/city, not completed (exists, partly).
- T2 Trigger in part 1 incl. completing tile; not for opponents' tiles; no chain; part 2 placed anywhere (exists, partly).
- T3 Builder returns with scoring and when lonely; pig needs own farmer; pig +1 per city for winners incl. ties (exists, partly).
- T4 Goods to the placer without knights; final 10 per type, ties all, ≥ 1 token (exists, partly).
- T5 Farmers off → no pig. Double turn optional (after E3).

### Princess & Dragon
- P1 Set-aside before the first volcano, reinsertion at it, never during the river phase. (exists, partly)
- P2 Volcano: dragon jumps, no figure of any kind on the tile; fairy/recall/tower actions allowed; completed features score. (exists, partly)
- P3 Flight: mover order, 6 steps, start tile visited, no revisits, fairy tile blocked even unassigned, dead end, eats every figure incl. builder/pig/abbot/large/tower top, lonely return per step, flight before scoring. (exists, partly)
- P4 Dragon's tile blocks normal, portal and tower-top placement at any time. (exists, partly)
- P5 Princess: optional, any knight incl. own/large, only the princess city (`DG/CCc+.p`), uses the step (no fairy/recall/tower/builder that part), before scoring, builder lonely return; tower tops and the `LCcc.d` monk untouchable. (exists, partly)
- P6 Portal: as B4 — completed groups only via the portal tile's own segment; abbot to monastery/garden; no builder/pig; no dragon tile; fields only with farmers. (exists, partly)
- P7 Fairy: targets incl. tower tops, not builder/pig; +1 at turn start, not in part 2, not after game end; +3 in play and at the end, regardless of majority, on 0-point features; **no +3 on recall** (E1); stays unassigned when her follower leaves; no protection from princess or tower. (exists, partly)
- P8 Data: `DG/Ccc+.g` 0 pennants; `DG/CRcr.d` one road, two whole fields; `DG/LCcc.d` monastery separate from the city.

### Tower
- W1 Floors 10/9/7/6/5. (exists)
- W2 Options: floor on any foundation/open tower; tower top (meeple/large only) on `h ≥ 1`, not on the dragon's tile. (exists, partly)
- W3 Range: plus shape, new height, own tile, gaps/towers/river don't block, no diagonals; optional, max 1. (exists, partly)
- W4 Own capture → supply; opponent → prisoner; exchange with captor's choice; 3-player cycle never exchanges. (exists, partly)
- W5 Tower-top capture and dragon meal reopen the tower; floors never removed. (exists)
- W6 Ransom: once per turn across both parts, ≥ 3 points, −3/+3, usable at once. (exists, partly)
- W7 Capture before scoring (snatch) and before the flight.
- W8 No tower scoring; prisoners and tops stay at the end; breakdown sums including negative ransom.

### Combinations and invariants
- C1 Random games for all 64 combinations, 2–6 players: no exception, game ends, piece conservation (supply + board + tower tops + prisoners), builders/pigs always supported, nothing on the dragon's tile, fairy ≠ dragon, breakdown sums, scores ≥ 0. (exists)
- C2 Exact tile accounting: board + discarded + set-aside + deck + drawn = total.
- C3 Lockstep: replaying the JSON action log on a clone of the initial state gives an identical final state, with dragon and tower actions. (exists)
- C4 T&B × P&D × Tower double turn: part-1 capture → part-1 flight → part-2 tower top; ransom once; fairy +1 once.
- C5 Abbot × P&D × Tower: abbot with the fairy captured → fairy unassigned, no +3.
- C6 I&C × T&B × Tower: capturing the large meeple that is a builder's only support sends the builder home.

---

## Sources

- **P&D EN 2016** — *The Princess & the Dragon*, 3rd ed., HiG/F2Z (text extracted and quoted):
  <https://www.hans-im-glueck.de/wp-content/uploads/2023/08/carcassonne-expansion-3-the-princess-the-dragon-rulebook.pdf>
- **P&D DE 2016** — *Burgfräulein und Drache*, HiG 2016:
  <https://www.hans-im-glueck.de/_Resources/Persistent/80fc117f79052213dfca1bebf62ce03a60767512/Carc_II_D_Erw3_Regel_low.pdf>
- **Tower EN 2017** — *The Tower*, 3rd ed., HiG/F2Z:
  <https://www.hans-im-glueck.de/wp-content/uploads/2023/07/carcassonne-ii-ext4-rules.pdf>
- **T&B EN** — *Traders & Builders*, 3rd ed., Z-Man ZM7812:
  <https://cdn.svc.asmodee.net/production-zman/uploads/2024/09/zm7812_carcassonne_exp2_rules.pdf>
- **I&C EN** and **base supplement (River/Abbot)** — as cited in `inns-cathedrals.md`, `river.md`, `abbot.md`.
- **WikiCarpedia** (fetched 2026-10-17; "official clarification" vs "community" markers respected):
  [The Princess & the Dragon](https://wikicarpedia.com/car/The_Princess_and_The_Dragon) (incl. C2 tile scans),
  [The Abbot](https://wikicarpedia.com/car/The_Abbot), [The Tower](https://wikicarpedia.com/car/The_Tower),
  [Inns and Cathedrals](https://wikicarpedia.com/car/Inns_and_Cathedrals),
  [Traders and Builders](https://wikicarpedia.com/car/Traders_and_Builders),
  [The River](https://wikicarpedia.com/car/The_River) (and its German version),
  [Order of Play](https://wikicarpedia.com/car/Order_of_Play).
- **S-CAR v7.3** (Dec 2014):
  <https://www.dover.nh.gov/Assets/government/city-operations/library/borrow/library-of-things/carcassonne-rules.pdf>
- **JCloisterZone** engine and tile XML (`/tmp/claude-0/ext/JCloisterZone`, `/tmp/claude-0/ext/JCloisterZone-Client`):
  `ActionPhase`, `AbstractActionPhase`, `DragonCapability`, `DragonMovePhase`, `FairyCapability`, `FairyPhase`,
  `PrincessCapability`, `PortalCapability`, `TowerCapability`, `TowerCapturePhase`, `PayRansom`, `TilePhase`,
  `CleanUpTurnPartPhase`, `UndeployMeeple`, `AbbotCapability`, `RiverCapability`; `*.xml` tile sets.
- Verification scripts (throwaway): `/tmp/claude-0/master/scripts/cmp-jcz.mjs`, `/tmp/claude-0/master/probe/*.mjs`.
