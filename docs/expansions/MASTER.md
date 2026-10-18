# Master rules arbitration — River, Abbot, Inns & Cathedrals, Traders & Builders, Princess & Dragon, Tower, Bridges Castles & Bazaars

*3rd edition (Hans im Glück 2014–2018 / Z-Man; WikiCarpedia "C2"). Arbitrated 2026-10-17 against the six specs in
this folder, the official rulebooks, the official clarifications recorded by WikiCarpedia/S-CAR, and JCloisterZone
(JCZ) as a reference implementation. Bridges, Castles & Bazaars (BCB, the seventh expansion) was arbitrated later the
same day against its three research files (`bcb-rules.md`, `bcb-tiles.json`/`.md`, `bcb-interactions.md`); its
final spec is `bridges-castles-bazaars.json`/`.md` and its rulings, engine spec, AI, UI and tests are §H.*

**This file is authoritative.** Where the expansion specs disagreed, they have been patched to agree with it (§D, and
the notes at the top of the three BCB research files). Developers implement from §A (turn sequence), §B (rulings),
§F (P&D + Tower spec) and §H (BCB); testers use §G and §H.5.

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
| 16 | **BCB bridge:** chosen together with the tile (one action, before the follower step), one per tile placement, on the new tile or an orthogonal neighbour, both ends on printed field edges, every edge matching afterwards. A spot/rotation that fits only with a bridge fits with exactly **one** bridge; an optional bridge always starts a new road (BC3–BC8). | agreed; one-bridge fact proved + probed |
| 17 | **A tile that fits only with a bridge is placeable**, but the player may throw it away and draw again; with no bridge left it is unplaceable. A tile with any bridge-free spot must be placed (BC9). | settled open question; **engine: add `discard`** |
| 18 | Bridges may cross rivers (ends on field edges) and are allowed during the river phase; optional bridges are allowed on a neighbour too (BC7, BC13). | settled (JCZ differs on neighbours) |
| 19 | **Small city** = two semicircular one-edge caps; `BB/CFR!G`, `IC/C!`, `DG/CCc+.p` (feature 0 each) are excluded via `castle_base: false` → `noCastle` (BC16). | **data: flag IC/C! and DG/CCc+.p** |
| 20 | The castle is decided by the owner of the city's single knight (possibly not the active player) after the follower step and the dragon flight, before scoring; no castle token → it scores 4; ties cannot occur (BC17–BC19). | settled |
| 21 | A castle scores from the **next tile placement** on (builder part 2 and bazaar-round turns count): first completed road/city with a tile in its 6-square area, monastery **or garden** whose own tile is there (empty ones too, 9), or a scoring castle (chain, best value). Never fields, abbot recall or final scoring (BC21–BC25). | settled open questions |
| 22 | The castellan lives outside `tile.pieces`: never eaten, captured, removed by the princess or targeted by the portal; the fairy may stand by it (+1/turn, +3 when the castle scores, nothing at the end) and stays with a converted knight (BC27–BC28). | settled |
| 23 | Final scoring: castellans home first (0, no fairy +3); every castle = 4 per field, 5 for a winning pig owner (BC29–BC30). | agreed |
| 24 | Bazaar after the whole part with a drawn bazaar tile; skipped if fewer **drawable** tiles than players; reveal sets dragon tiles aside before the first volcano (BC32–BC35). | settled |
| 25 | Auction: next chooser = next clockwise after the **previous chooser** without a tile; bids may exceed your score, scores may go negative (app cap 99); ransom still needs ≥ 3 and never during an auction (BC36–BC38). | settled (EN3 "previous buyer" not adopted) |
| 26 | Bazaar round = full normal turns from the host's left to the host (fairy +1, ransom, builder part 2 drawn at once, dragon flies at once); bazaars placed in it are ignored; the host's own part 2 comes **after** the round; then play resumes left of the host (BC39–BC43). | settled (JCZ differs on part 2) |
| 27 | Unplaceable bought tile → removed, draw from the stack, empty → that bazaar turn skipped, no refund; the game never ends inside a bazaar round (BC44–BC46). | settled |
| 28 | BCB inns (`BB/R.bi`, `BB/RFR.bi`) count only with Inns & Cathedrals (BC14). | **engine: add `noInn`** |

---

## A. Unified turn sequence (all seven expansions on)

Lines marked **[BCB]** are Bridges, Castles & Bazaars (§H); a switched-off BCB part (bridges, castles, bazaars) simply
drops its lines.

### A.1 Setup

1. **Tiles.** 72 base tiles (3rd edition: one copy each of E, H, I, M, N, R, U, V shows a garden; counts unchanged).
   Start tile `D` at (0,0) — **except with the River**: the start tile goes back in the box, the spring is the start
   tile, and a separate river stack (10 shuffled river tiles, lake underneath) is drawn first. Land deck = 71 base
   + I&C 18 + T&B 24 + P&D 30 + Tower 18 + **[BCB]** 12 = up to 173 tiles (+11 river draws).
2. **Each player's supply:** 7 meeples; Abbot: +1 abbot; I&C: +1 large meeple; T&B: +1 builder and +1 pig (no pig if
   the "farmers" option is off); Tower: floors 10/9/7/6/5 for 2/3/4/5/6 players, empty prisoner area; **[BCB]**
   3 bridges + 3 castle tokens with 2–4 players, 2 + 2 with 5–6 (BC1).
3. **Neutral:** dragon and fairy beside the board (P&D); goods tokens 9 wine / 6 grain / 5 cloth (T&B).
4. **Players:** 2–5; 6 only with I&C (pink). Turn order = increasing seat index ("clockwise").
5. **[BCB]** Scores may become negative (bazaar bids). BCB's two inns count only with I&C (BC2, BC14).

### A.2 One turn of player P (part 1, plus part 2 if the builder grants it)

**Step 0 — Start of turn** *(once per turn; skipped for part 2; only if P actually gets a tile, otherwise the game ends)*
- P&D: if the fairy is assigned to one of P's followers, P scores **+1**.
- Tower: P's "ransom used this turn" flag is reset.
- **[BCB]** Step 0 also runs at the start of **every bazaar-round turn** (step 6½), for that turn's player, once that
  player has a tile; a bazaar turn without a tile is skipped. It does not run for the host's part 2 after a bazaar
  round, which belongs to the host's original turn (BC39, BC41).

**Step 1 — Draw**
- **[BCB]** Bazaar-round turn: P takes the tile P got at the bazaar instead of drawing. If it has no legal placement
  for P it is removed from the game and P draws normally (bullets below); if nothing can be drawn, P's bazaar turn is
  skipped (BC44).
- River: while river tiles remain, draw from the river stack (this includes a builder part-2 draw).
- P&D: a tile showing the **dragon** symbol drawn while the dragon is not in play (no volcano placed yet) is **set
  aside** (before any placeability check); draw again.
- A tile with no legal placement is removed from the game; draw again. **[BCB]** Legal placements include those that
  need one of P's bridges. If **every** legal placement needs a bridge, P may throw the tile away and draw again
  (BC9).
- No tile available → game end (§A.4). Set-aside dragon tiles that never re-entered stay unused. **[BCB]** Inside a
  bazaar round a failed draw only skips (a replacement or a part 2); the game never ends there (BC46).

**Step 2 — Place the tile** (mandatory) and resolve placement effects in this order
- 2a *Legality:* every edge matches. River tiles: must continue the single open river end; no immediate U-turn (two
  adjacent bends turning the same way); **no third consecutive same-way bend** (straights ignored; ruling B13).
  **[BCB]** The placement may carry **one bridge** from P's supply, as part of the same choice: on the new tile or on
  an orthogonal neighbour without a bridge, N–S or E–W, both end edges printed field (never city, road, river); after
  it every edge matches (each end continues a road or faces an empty square). It can make a road-against-field
  placement legal — then exactly one bridge position works — or be optional (it then starts a new road). Fields and
  cities under it are not split (BC3–BC8, BC13).
- 2b *T&B builder trigger (part 1 only):* if the new tile now belongs to a road or city containing P's builder
  (extends, joins or completes it), the double turn is earned now — it stands even if the builder leaves later this
  turn. **[BCB]** Evaluated after the bridge (BC15).
- 2c *Tower:* a tile with a foundation creates an empty tower (height 0).
- 2d *P&D volcano:* the dragon jumps onto this tile (eats nothing). If it is the **first** volcano, all set-aside
  dragon tiles are shuffled back into the remaining stack now.
- 2e **[BCB] Bazaar mark:** a bazaar tile that was drawn (not bought) and placed while no bazaar is running marks an
  auction for step 6½ of this part (BC32, BC33).

**Step 3 — Optional ransom (Tower; not an action):** at most once per whole turn, P may buy back one of P's prisoners
for 3 points paid to its holder (P needs ≥ 3 points). The figure returns to P's supply and is usable in step 4.
**[BCB]** Never during an auction; a score below 3, negative included, cannot pay (BC38).

**Step 4 — Follower step: exactly ONE of the following, or pass**
- 4a **Princess** (princess tile): if the princess's city segment belongs to a city holding knights, remove one knight
  (any player's, own allowed; a large meeple is one knight). This uses up the step. **[BCB]** A castellan is not a
  knight in a city; removing a small city's knight here prevents its castle (BC48).
- 4b **Place a figure on the tile just placed** — never if the dragon stands on it (volcano turn):
  meeple / large meeple on an unoccupied road, city, field (if farmers on) or monastery, never a garden;
  abbot on the tile's monastery or garden; builder on a road/city of this tile whose group holds P's meeple/large and
  is not completed; pig on a field of this tile whose group holds P's farmer. **[BCB]** A bridge on this tile is a
  road of this tile: meeple, large meeple or builder may stand on it (road rules); never the abbot or pig; never on a
  bridge built on a neighbour (BC10).
- 4c **Magic portal** (portal tile): instead, one meeple / large / abbot onto an unoccupied, uncompleted feature of any
  other tile (abbot: monastery/garden; meeple/large never a garden; farmers only if on; never the dragon's tile;
  builder/pig never). **[BCB]** A bridge road on another tile is a valid target; a castle never is (BC11).
- 4d **Recall the abbot** (Abbot): from a monastery/garden with < 8 neighbours anywhere → score 1 + neighbours (2–8)
  now. It scores the abbot, not the feature: **no fairy +3**.
- 4e **Move the fairy** (P&D): next to one of P's followers anywhere (meeple, large, abbot, tower-top meeple; not
  builder/pig). Needs ≥ 1 follower on the board. **[BCB]** Also next to one of P's castellans (BC28).
- 4f **Tower floor** (Tower): one of P's floors onto any empty foundation or open tower (no meeple on top), height + 1;
  then optionally **capture** one follower (meeple, large, abbot; on a feature or another tower's top; any owner incl.
  P) on the tower's tile or up to *h* tiles straight N/E/S/W (*h* = new height; nothing blocks). Own figure → supply;
  opponent's → P's prisoner, then automatic exchange if the victim holds P's figures (P picks which of his returns,
  the victim gets the captured one back). A captured tower-top meeple reopens its tower. **[BCB]** A figure on a
  bridge can be captured; a castellan never (BC27, BC49).
- 4g **Tower top** (Tower): P's meeple or large meeple onto an open tower with ≥ 1 floor, not on the dragon's tile →
  closed.
- *After any removal (4a, 4d, 4f):* a builder/pig whose owner no longer has a meeple/large in its feature goes home.

**Step 5 — Dragon flight (P&D)**, only if the placed tile shows the dragon (it is then always in play). Starting with
P and going round, each player **must** move the dragon one tile orthogonally onto a placed tile that is not yet
visited in this flight (the start tile counts as visited) and not the fairy's tile, until 6 moves or a dead end.
Every figure on an entered tile is eaten (returns to its owner); floors and the fairy are never eaten; a tower that
loses its top meeple reopens; lonely builders/pigs go home after each step. **[BCB]** Figures on bridges are eaten
(they stand on the tile); castellans, bridges and castle tokens never (BC11, BC27).

**Step 6 — Scoring of the features completed by the placed tile** (with the figures that are still there)
- 6a **[BCB] Castle decisions** — before anything of this placement scores: for each **small city** (two semicircular
  caps, BC16) completed by this tile that holds exactly one follower whose owner still has a castle token, that owner
  (possibly not P) chooses castle or score, in seat order from P. A castle turns the knight into its castellan; the
  city is then not completed (no points, no fairy +3, no goods) (BC17–BC20).
- 6b Score the completed features: road 1/tile (inn 2/tile); city 2/(tile+pennant) (cathedral 3/(tile+pennant));
  monastery/garden with a figure and 8 neighbours: 9. Strength: meeple 1, large 2, abbot 1, builder/pig 0; ties all
  score. **[BCB]** Unoccupied completed roads, cities, monasteries and gardens are recorded too, at full value (they
  matter for castles).
- P&D: **+3** to the owner of the follower the fairy is assigned to, if it is in a scored feature (regardless of
  majority); the follower goes home, the fairy stays on her tile unassigned.
- T&B: for each completed city, P (the placer) takes one goods token per goods symbol in it, knights or not.
- 6c **[BCB] Castle scoring:** every castle built **before** this placement that still has its castellan and whose
  6-square area holds a tile of a road/city completed in 6b, the tile of a monastery/garden completed in 6b, or a tile
  of a castle that scores now (chain), scores the best such value for its owner; fairy +3 if she is by that
  castellan; the castellan goes home (BC21–BC26).
- Return all figures of scored features (builders leave with their road/city); then lonely builder/pig check.

**Step 6½ — [BCB] Bazaar** *(only if 2e marked one in this part)*: if at least as many drawable tiles as players
remain, reveal one tile per player (P&D set-aside rule applies), auction them (no ransom, no other actions), then the
**bazaar round**: from P's left neighbour round to P, every player plays a full turn (steps 0–8, incl. a builder part 2
drawn at once and an immediate dragon flight) with their tile; bazaars placed during the round are ignored (BC32–BC43).

**Step 7 — Builder double turn (T&B):** if earned in 2b and a tile can be drawn, P may play part 2 = steps 1–6 again
(no step 0; ransom still once per turn; the tile may go anywhere; no further trigger; its own symbols resolve — a
second flight starts a fresh visited list). Optional. **[BCB]** If part 1 held a bazaar, part 2 comes after the whole
bazaar round; a bazaar drawn in part 2 is held after it (BC41, BC45).

**Step 8 — End of turn:** next player. **[BCB]** After a bazaar round, the next player is still P's left neighbour
(BC42).

### A.3 Once per turn vs. once per tile

| Once per turn (double turn = one turn) | For each tile / part |
|---|---|
| fairy +1 (step 0) · ransom (step 3) · builder trigger (part 1 only) · **[BCB]** each bazaar-round turn is a turn of its own (own fairy +1, ransom, builder trigger); the host's part 2 after a bazaar round still belongs to the host's original turn | draw (incl. set-aside/discard) · placement + tile effects (volcano jump, reinsertion, tower creation) · one follower step (incl. princess, portal, fairy, recall, floor/capture, tower top) · dragon flight · scoring · lonely checks · automatic exchanges · **[BCB]** at most one bridge · castle decisions · castle scoring and chains · the bazaar mark (a bought tile, or any tile placed inside a bazaar round, never marks) · a new castle never scores in the placement that built it |

### A.4 Game end and final scoring

The game ends when no tile can be drawn for a turn or part 2 (**[BCB]** never inside a bazaar round, BC46). Score
(display order; totals are order-independent):
0. **[BCB]** every castellan goes home first: 0 points, no fairy +3; castle tokens stay (BC29);
1. incomplete roads: 1/tile, **0 if it has an inn** (**[BCB]** bridge tiles count as road tiles);
2. incomplete cities: 1/(tile+pennant), **0 if it has a cathedral**;
3. monasteries and gardens with a figure: 1 + neighbours (abbot = monk); empty gardens 0;
4. fields: 3 per completed adjacent city to the farmer majority (large = 2); a winner with a pig there +1 per city;
   **[BCB]** every adjacent castle (scored or not) counts **4**, and +1 more for a winning pig owner (5) (BC30);
5. fairy: +3 for her assigned follower if its feature is scored in 1–4 (also when it scores 0);
6. goods: 10 per type to the player(s) with most tokens (ties all; needs ≥ 1 token).

Towers, floors, tower-top meeples and prisoners score nothing; prisoners stay with their captors. **[BCB]** Bridges
and castles score nothing by themselves; final scores may be negative.

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

**BCB × each expansion:** see §H.1 (BC10–BC15, BC27–BC31, BC39–BC50) and the matrix in `bridges-castles-bazaars.md`
§7; tests in §H.5.

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

"(exists)" marks behaviour already covered in `tests/`; everything else needs a test. Bridges, Castles & Bazaars:
§H.5.

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

## H. Bridges, Castles & Bazaars

*Arbitrated 2026-10-17 against `bcb-rules.md`, `bcb-tiles.json`/`.md`, `bcb-interactions.md`, the 3rd-edition rulebook
texts (RB-DE3 = German original © 2010/2017, RB-EN3 = English © 2010/2018; re-read for every ruling), the WikiCarpedia
BCB wikitext, S-CAR v7.3, the BCB lines of the P&D and Tower rulebooks, and JCZ (`CastleCapability`, `CastlePhase`,
`ScoringPhase`, `ScoreCastle`, `BazaarPhase`, `PlacementsMixin`). Code reviewed at commit `f6200a7`, which already
implements most of the bridges. Final spec: `bridges-castles-bazaars.json` (tiles + rules; `node
dev/build-expansions.mjs bridges-castles-bazaars` → 11 types, 12 tiles, no errors) and `bridges-castles-bazaars.md`.*

*Labels: **RB** rulebook · **OC** official clarification (date) · **OC\*** HiG staff answer on BGG · **COM**
WikiCarpedia / S-CAR community · **JCZ** · **DER** derived from the rules and the existing MASTER rulings (the simplest
consistent reading). ★ = an open question of the research, settled here. Ruling ids are BC1–BC50.*

### H.1 Rulings

| # | Ruling | Basis | Label |
|---|---|---|---|
| | **Setup** | | |
| BC1 | Each player: 3 bridges + 3 castle tokens with 2–4 players, 2 + 2 with 5–6. Personal supply; none left → cannot build. | RB-DE3/EN3 p.1; JCZ | RB |
| BC2 | Bridges, castles and bazaars may each be switched off (`options.bcb.{bridges, castles, bazaars}`, default on); `options.bcb.auction = false` selects the official no-bidding variant (BC47). Scores may become negative. | RB-DE3 p.1 ("komplett oder teilweise"), p.5, p.6 | RB |
| | **Bridges** | | |
| BC3 | ★ The bridge is part of placing the tile: tile + optional bridge are **one action**, decided before the follower step, never after it. **One bridge per tile placement** (two in a builder double turn, one per bazaar-round turn). | RB-DE3 p.1 (bridge under "1. Plättchen legen", meeple under "2."); S-CAR fn 360; JCZ (per turn part). S-CAR fn 356 / WiCa *Order of Play* "any time" (1st-ed. text) not adopted | RB |
| BC4 | On the new tile or a tile sharing a side with it; that tile has no bridge yet (one per tile, so none cross); straight N–S or E–W; both end edges are **printed field** edges (never city, road, river); it may cross anything (city, road, river, monastery, garden, figures). | RB-DE3 p.1–2 + figures; RB-EN1 p.3; JCZ `EdgePattern.isBridgeAllowed` | RB |
| BC5 | After the bridge every edge matches: each end continues a road/bridge already in play or faces an empty square. | OC 12/2014 | OC |
| BC6 | A road may run into a field edge if the bridge built with the tile carries it on: a bridge on the **new** tile (new field vs. neighbour road on its axis; fixes one or both ends) or on the **neighbour** (new road vs. neighbour field; the neighbour's far end faces an empty square). Nothing else can be fixed. Hence a spot + rotation that fits only with a bridge fits with **exactly one** bridge position (H.2.3). | RB-DE3 p.1–2 figs 1–3; OC 12/2014; DER (proof + probe: 100,054 cases, never two) | RB |
| BC7 | ★ An **optional** bridge (placement legal without it) is allowed on the new tile **or on a neighbour**. It always has both ends on empty squares: it starts a new road and never touches an existing one (on a neighbour it runs parallel to the shared side). | RB-DE3 p.1 (no condition); OC\* C. Tisch BGG 542577; S-CAR fn 356. JCZ (new tile only) not adopted | RB |
| BC8 | Fields and cities under a bridge are not split: the bridge is an extra road feature (last index) and the field keeps both halves of each bridged edge, so the fields on both sides of a road that ends at a bridged edge join. | RB-DE3 p.2 | RB |
| BC9 | ★ A tile that fits **only with a bridge** is placeable (drawn normally, no automatic discard); the player may place it with the bridge **or throw it away and draw again** (removed from the game). A tile with any bridge-free placement must be placed. A player without bridges sees no bridge placements, so for them such a tile is unplaceable and auto-discarded. | OC 10/2014 ("the player has the choice to use the bridge … or just discard the tile"); JCZ `TilePhase` (pass) | OC |
| BC10 | Figures on a bridge: only on a bridge on the tile just placed, as the normal single figure, under road rules (whole road unoccupied): meeple, large meeple, builder (with P's meeple in that road). Never abbot or pig; never on a bridge built on a neighbour. The bridge comes first, so a bridge that joins your new road to an occupied road stops you claiming it. | RB-DE3 p.2, p.6; WiCa examples 6–7 | RB |
| BC11 | Bridges are never removed, eaten or captured and belong to nobody. The portal may target an unoccupied, unfinished bridge road on another tile (never the dragon's tile); the dragon eats and a tower captures figures standing on bridges. | RB-DE3 p.1; P&D EN p.3 diet plan; Tower EN p.4; JCZ (portal); MASTER B4 | RB |
| BC12 | Scoring: a bridge is a road segment of its tile — 1/tile, 2 on an inn road; a tile counts once even if the road crosses it twice; incomplete at the end 1/tile (inn road 0). A bridge built on a neighbour never completes a road (its far end is always open). | RB-DE3 p.2 (6-point example); WiCa 2/2014; DER (probe: 229 neighbour bridges, none complete) | RB |
| BC13 | ★ Rivers: bridge ends never on river edges; a bridge may cross the river between two field edges (`RI/s`, `RI.1/IFI`, `RI.1/I.e`); bridges are allowed during the river phase, also to let a river tile's road meet a field edge; all river rules still apply and the river still splits fields. | RB-DE3 p.1; RB-EN1 p.3 caption ("over roads, monasteries, rivers"); JCZ `RiverCapability` (no restriction) | RB |
| BC14 | Inns: an inn affects only its printed road; a bridge road is an inn road only when connected to a printed inn segment. The inns on `BB/R.bi` and `BB/RFR.bi` count **only with I&C** (engine `tile.noInn`). | OC FAQ 1/2021; WiCa BCB tile notes | OC |
| BC15 | T&B: a bridge that brings the new tile into P's builder road triggers the double turn (2b is evaluated after the bridge). | OC (WiCa *T&B*); S-CAR fn 57; JCZ | OC |
| | **Castles** | | |
| BC16 | Small city = a completed city of exactly two tiles, each a **semicircular one-edge cap**. Excluded (`castle_base: false` → `noCastle`): `BB/CFR!G` #0 (pointed), `IC/C!` #0 (wedge to the corner), `DG/CCc+.p` #0 (cap running on as a band). Every other one-edge cap qualifies (large 3rd-ed. caps, `BB/CCCR`'s three, `TO/RCr`, `DG/CRRR.p`, River caps). No one-edge cap has a pennant or goods, so a small city is worth 4. EN3 "only 2 tiles" not adopted. | RB-DE3 p.3 ("zwei halbrunden Stadtteilen"); OC 7/2010 (C. Tisch, BGG 538079); WiCa (tile list); JCZ `castle-base="false"` | OC |
| BC17 | ★ The **owner** decides: the player whose single knight (meeple or large) is in the small city — active or not, whoever completed it, whichever cap the knight stands on. It needs a castle token, otherwise the city scores 4 (no choice). No knight → no castle. A small city never holds more than one follower in our scope (the second cap can only be claimed if the city is empty; portal and tower need unoccupied features; a builder needs an unfinished feature); the engine offers a castle only with exactly one follower, so ties cannot occur. | RB-DE3 p.3 ("darf der Besitzer der Kleinstadt …", "eines seiner Burgplättchen aus seinem Vorrat"); JCZ `CastlePhase` | RB |
| BC18 | When: after the follower step (4) and the dragon flight (5), **before anything of that placement scores**. A princess removal, tower capture or dragon meal of the knight before then means no castle. | RB-DE3 p.3 (under "3."); JCZ phase order Dragon → Castle → Scoring; S-CAR order of play 7a | RB |
| BC19 | Several small cities completed by one tile: one decision each, in seat order from the active player, then feature order on the tile; an owner who has just used his last castle is not asked again. | DER; JCZ (turn player first) | DER |
| BC20 | Conversion: the token covers the city and the knight becomes its **castellan**. The city is **not completed**: no 4 points, no fairy +3, no goods, and it is never a completed city for other castles. | RB-DE3 p.3 ("Eine Burg mit Meeple ist noch nicht abgeschlossen"); S-CAR 7a | RB |
| BC21 | Area: the castle's 2 tiles plus the 2 squares beside each across the long sides (a 2×3 block); empty squares belong to it and count once filled. | RB-DE3 p.3 + figure; JCZ `Castle.getVicinity` | RB |
| BC22 | ★ A castle can first score at the **next tile placement** after the one that built it — part 2 of the same builder double turn and bazaar-round turns count. It must take the first completion. | RB-DE3 p.3 "in einem späteren Zug", read as a later placement: COM WiCa fn 13 ("a later round of scoring"); OC\* BGG 569109 concerned the same tile; JCZ `getOccupiedCastles`. The strict "later turn" (S-CAR) is not adopted: it would switch a castle off and on again around a bazaar round | COM |
| BC23 | ★ Triggers, occupied or not and whoever completed them: a **road or city** with ≥ 1 tile in the area (bridge tiles count; a small city that was scored counts, a converted one not); a **monastery** whose own tile is in the area; a **garden** likewise; a **castle scoring now** with one of its 2 tiles in the area (BC25). Never fields, an abbot recall, or final scoring. | RB-DE3 p.3–4 ("auch Punkte für ein abgeschlossenes Bauwerk, für das niemand sonst Punkte bekommt"; the monastery's own tile); RB-DE1 p.4 (other castles); WiCa trigger table and JCZ (gardens); MASTER B1 (recall) | RB (gardens COM) |
| BC24 | Value = the feature's full points as scored (pennants, inn ×2, cathedral ×3; monastery/garden 9; a scored small city 4); never the fairy's +3, never goods. Feature owner and castle owner both score (owning both pays twice). Several features at once → the castle owner picks one → the engine takes the **highest**. One completion may trigger several castles (each the full value). A large castellan scores once. | RB-DE3 p.3–4, p.6; WiCa 4/2014, fn 18; JCZ (highest) | RB |
| BC25 | ★ Chains: a castle that scores counts as a completed feature for every other waiting castle whose area contains one of its two tiles (directional); those score the same value; repeat. A castle reachable from several values takes the highest; every castle scores at most once; castles built in this placement never take part. | RB-DE3 p.4 ("zählt sie für die Burg daneben als abgeschlossenes Bauwerk. Alle Burgbesitzer bekommen gleich viele Punkte"); WiCa fn 20; JCZ `scoreCastles`. WiCa fn 21 ("the active player decides") not adopted: best value = owner's choice | RB |
| BC26 | After scoring the castellan goes home; the castle stays, complete, and never scores again; nothing is ever placed on a castle. Breakdown bucket `castle`. | RB-DE3 p.3 | RB |
| BC27 | ★ The castellan stands on the castle, not on a tile (engine: outside `tile.pieces`): never eaten (the dragon may still enter the castle's tiles), never captured, never removed by the princess, never a portal target. | RB-DE3 p.6; P&D EN p.3, p.6; Tower EN p.4; WiCa *P&D* ("a castle is between two tiles") | RB |
| BC28 | ★ Fairy: may be moved next to a castellan; a fairy assigned to the knight that becomes the castellan **stays assigned**; +1 at the start of each of the owner's turns, +3 when the castle scores during play, nothing at the end. Her tile (which the dragon may not enter) is the tile the knight stood on. | RB-DE3 p.6 ("… sie bringt dir die üblichen Feen-Punkte ein"); WiCa; JCZ `CastlePhase` (fairy pointer moved) | RB |
| BC29 | End: castellans are removed before final scoring: 0 points, no fairy +3. | RB-DE3 p.4; WiCa (fairy) | RB |
| BC30 | ★ Farmers: every castle bordering a field — scored or not — is worth **4** to the field's winner (a city 3), **5** to a winning farmer owner with a pig there; once per field. A castle separates fields like the small city did. | RB-DE3 p.4, p.6; S-CAR fn 375; JCZ `Field.getCityPoints` | RB |
| BC31 | Never on a castle: builder, pig, abbot (and no builder can ever be in a small city). T&B goods are moot. A castle may cover a cap with a tower foundation and a bridge may share a tile with a tower; both keep working. | RB-DE3 p.6 (figure lists); WiCa (tower tiles); DER | RB |
| | **Bazaars** | | |
| BC32 | After the **complete** part — placement, follower, dragon, castles, scoring — in which a **drawn** bazaar tile was placed. A discarded bazaar tile (unplaceable, or thrown away under BC9) holds no bazaar. | RB-DE3 p.4–5; S-CAR fn 345; OC 10/2014 | RB |
| BC33 | No chain reaction: a bought bazaar tile, and any bazaar placed while a bazaar round runs (a replacement draw, a builder part 2 inside the round), is ignored — not delayed. | RB-DE3 p.5; OC 2/2021; WiCa FAQ | OC |
| BC34 | ★ Skipped if fewer **drawable** tiles than players remain (with P&D before the first volcano, dragon tiles in the stack do not count). Exactly as many: all are auctioned and the game ends after the round. | RB-EN3 p.5 (RB-DE3 silent); RGG BB3 (S-CAR); JCZ `tilePack.size() < players` | RB |
| BC35 | ★ Reveal: pop one tile per player from the deck in order; a dragon tile revealed while the dragon is not in play is set aside and replaced; no placeability check at the reveal. | P&D EN p.2; MASTER B22; JCZ (inactive group); DER | DER |
| BC36 | Auction: the host's left neighbour chooses a tile and opens with ≥ 0; each other player without a tile, clockwise from the chooser, raises (strictly higher) or passes, once; then the chooser **buys** (pays the high bidder) or **sells** (the high bidder pays him); nobody raised → he pays his bid to the bank. | RB-DE3 p.5 | RB |
| BC37 | ★ Players with a tile drop out. The next chooser is the next player clockwise **after the previous chooser** who has no tile (after a sale the choice moves on). The last player takes the last tile free. | RB-DE3 p.5 (literal); WiCa fn 26 ("from the previous auctioneer"); JCZ `nextSelectingPlayer`. RB-EN3 "from the previous buyer" — a slip like "starting with the first buyer" in the same paragraph — not adopted | RB |
| BC38 | ★ Bids are whole points and may exceed the bidder's score; scores may go below 0 (no lower limit); app cap 99 per bid (never binding in practice). Nothing else happens during an auction (no ransom). A ransom still needs ≥ 3 points. | RB-DE3 p.5 ("Du darfst auch mehr Punkte bieten, als du bisher gesammelt hast"); Tower EN p.3; MASTER B17 | RB |
| BC39 | ★ Bazaar round: from the **host's left** round to the host, each player plays a **full normal turn** with his tile: step 0 (fairy +1, fresh ransom allowance), bridge, follower step with every expansion action, dragon flight, castle decisions, scoring, builder double turn. | RB-DE3 p.5 ("einen normalen Zug"; "Es beginnt der Spieler nach dem Spieler, der das Basarplättchen gelegt hat"); OC\* BGG 498317, 570930; WiCa 2/2010; JCZ | RB |
| BC40 | A builder double turn inside the round: part 2 is drawn from the stack at once, before the next bazaar player; empty stack → no part 2, the round goes on; a bazaar on that tile is ignored (BC33). | OC\* BGG 498317; WiCa FAQ; OC 2/2021 | OC |
| BC41 | ★ The host's own builder part 2 (the bazaar tile extended the host's builder) comes **after the whole round** and belongs to the host's original turn (no step 0; a ransom only if unused in part 1). | RB-DE3 p.6 ("ziehst du nach Ende der Basar-Runde dein zweites Plättchen"); WiCa FAQ. CAR 5/2013 / JCZ reverse order (HiG 08/2016: "valid alternative") not adopted | RB |
| BC42 | After the round play resumes with the **host's left neighbour** (the round replaces nobody's turn). | RB-EN3 p.5; RB-DE3 p.5 | RB |
| BC43 | ★ A dragon tile placed in the round: the dragon flies at once (movers start with that player), then the round continues. A volcano placed there: the dragon jumps; if it is the first, the set-aside tiles go back into the stack (seeded RNG). | RB-DE3 p.6; MASTER B22 | RB |
| BC44 | ★ A bought tile with no legal placement: removed from the game; the player draws from the stack under the normal draw rules; nothing to draw → that bazaar turn is skipped (no step 0). No refund. A bought tile that fits only with a bridge may be thrown away the same way (BC9). | JCZ `TilePhase`; DER (base rule for unplaceable tiles) | JCZ |
| BC45 | ★ A bazaar tile placed in a part 2 outside a round (including the host's part 2 after a round): its auction follows that part. | RB-EN3 p.5 ("after you have placed a bazaar and completed your turn"); WiCa FAQ | RB |
| BC46 | ★ The game never ends inside a bazaar round: a draw that fails there only skips a part 2 or a replacement. It ends when, after the round, the host's part 2 or the next normal turn finds no tile. | DER (every player holds a tile during the round) | DER |
| BC47 | ○ Variant without bidding: reveal as usual; from the host's left each player takes one revealed tile and plays it at once; the host takes the last one. | RB-DE3 p.6 | RB |
| | **Interactions not covered above** | | |
| BC48 | Princess: cannot remove a castellan (a castle is not a city); a princess removal of the small city's knight in step 4 prevents its castle. `DG/CCc+.p` is no castle base. | S-CAR fn 94; MASTER order; BC16 | COM |
| BC49 | Tower: castellans are never captured; ransom never during an auction, allowed in one's own bazaar turn; tower actions allowed in bazaar turns. | Tower EN p.3–4; OC\* BGG 570930 | RB |
| BC50 | Bridges may be built on a volcano tile or on the dragon's tile (no figure may stand on that bridge). A small city completed by a volcano tile may become a castle (the castellan is not on a tile). | WiCa *P&D* ("a bridge can be placed on a volcano tile"); S-CAR fn 134; MASTER B3, B15 | COM |

**Research files.** Where they contradicted these rulings they were patched (note at the top of each): `bcb-rules.md`
(alternative bridge spots, engine notes, open-question status), `bcb-interactions.md` (bridge variants per spot,
castellan reference with the castle id, open-question status), `bcb-tiles.md` (the two existing tiles that need
`castle_base: false`).

### H.2 Engine spec for our code

Status marks refer to commit `f6200a7`: ✔ implemented · ✘ to do · ○ optional. Function names are those of
`public/js/game.js`.

*Validated:* the whole design below was prototyped on a throwaway copy of the engine (session scratchpad
`proto/js/game.js`, produced by `master/proto_patch.py`). 149 random games — all 128 combinations of the seven
expansions, 2–6 players with everything on, and the no-bidding variant — kept every invariant of H.2.11 and replayed
identically from their action logs; 21 targeted rule scenarios (`master/proto-scen.mjs`) pass; the existing 57 tests pass
on the prototype unchanged.

#### H.2.1 Options, constants, helpers

```js
// options.expansions.bridges = true   → the 12 tiles are in the deck (buildDeck ✔) and the three parts exist
// options.bcb = { bridges, castles, bazaars, auction }   absent / undefined = true
export const BRIDGES = (n) => (n >= 5 ? 2 : 3);                                                        // ✔ (castles too)
export const bcbOn = (state, part) => hasExp(state, 'bridges') && state.options.bcb?.[part] !== false; // ✘
const auctionOn = (state) => state.options.bcb?.auction !== false;                                     // ✘
export const BAZAAR_MAX_BID = 99;                                                                      // ✘ app limit
```
✘ `newGame`: `bridges: exp.bridges && opts.bcb?.bridges !== false ? BRIDGES(n) : 0`, `castles: exp.bridges &&
opts.bcb?.castles !== false ? BRIDGES(n) : 0` (today both follow `exp.bridges` ✔). ✘ `bridgeSpots`/`validPlacements` test `bcbOn(state, 'bridges')` instead of
`hasExp(state, 'bridges')`.

#### H.2.2 State (version 5)

| Field | Meaning | Status |
|---|---|---|
| `players[i].bridges`, `players[i].castles` | supply counts | ✔ |
| `players[i].breakdown.castle`, `.bazaar` | castle points; bazaar payments (±) | ✘ |
| `board[k].bridge: 0 \| 1` | world axis (0 N–S, 1 E–W); the bridge is the last feature (`bridgeFeature`) | ✔ |
| `board[k].noInn: true` | set by `placeTile` when I&C is off and the tile type has an inn; `typeOf` then returns a cached variant without `inn` flags (key `t\|axis\|noinn`) | ✘ |
| `state.lastBridge` | key of the tile that got this placement's bridge (feeds a neighbour-bridge scoring path that can never fire on a legal board: keep or drop) | ✔ |
| `state.castles: Castle[]` | every castle ever built, index = id, never removed | ✘ |
| `state.castleAsk: [{ fi, p }]` | pending castle decisions on `state.last` (phase `'castle'`) | ✘ |
| `state.bazaarDue: bool` | this part placed a drawn bazaar tile while no bazaar ran | ✘ |
| `state.bazaar: null \| Bazaar` | the running auction or bazaar round | ✘ |
| `phase` | `'place' \| 'action' \| 'dragon' \| 'castle' \| 'bazaar' \| 'over'` | ✘ (`castle`, `bazaar`) |
| `version: 5`, `migrate` (H.2.10) | | ✘ |

```js
Castle = { id, nodes: [[k1, f1], [k2, f2]],    // the two city caps
           tiles: [k1, k2], area: [6 keys],     // castleArea(tiles)
           owner: p,                            // who built it (token colour, stats)
           k: 'meeple' | 'large' | null,        // castellan kind; null once it has gone home
           key,                                 // tile the knight stood on = the fairy's tile
           born }                               // board[state.last].n of the placement that built it
Bazaar = { host,                                // seat that placed the bazaar tile
           tiles: [{ t, owner: null | seat, price: 0, how: null | 'buy' | 'sell' | 'bank' | 'free' | 'take', played: false }],
           stage: 'pick' | 'bid' | 'decide' | 'take' | 'round',
           chooser, item: null | i, high: null | { p, bid }, bidder: null | seat,
           queue: [seat, …],                    // stage 'round': seats still to play
           ret: { part, bonus, ransomPaid } }   // the host's own turn, resumed after the round
```

#### H.2.3 Bridges: legality, placement, discard

- ✔ `bridgeFits(tile, axis)`; `bridgeSpots(state, x, y, t, r)` (every spot for the current player: new tile + 4
  neighbours × 2 axes, filtered by `edgesMatch(…, bridge)` incl. the neighbour's far end); `canPlace(state, x, y, t,
  r, bridge)`; `validPlacements` → `{ x, y, rots, needsBridge?: { [r]: [spot] } }` (rots include bridge-only
  rotations); `placeTile(state, x, y, r, bridge)` (sets `board[bridge.key].bridge`, `bridges−1`); `applyAction` passes
  `a.bridge`; the builder trigger is computed after the bridge.
- **Facts to rely on** (proved; confirmed by the throwaway probe `master/probe-bridges.mjs` in the session scratchpad:
  60 random games, 100,054 bridge-only and 332,486 printed placements, 229 neighbour bridges, 0 exceptions):
  1. *The needed bridge is unique.* A bridge on the new tile needs every mismatch to be "new field / neighbour road" on
     its axis; a bridge on neighbour T needs exactly one mismatch, "new road / T field", on T's side. Both cannot
     hold, a mismatch side lies on one axis, and the neighbour case names one tile → `needsBridge[r].length === 1`.
  2. *Optional bridges start new roads.* In a printed-legal placement every neighbour edge already matches, so a bridge
     end facing an existing tile would be road against field; optional spots have both ends on empty squares (on a
     neighbour: parallel to the shared side). At most 1 (new tile) + 4 (neighbours).
  3. *A neighbour bridge never completes a road:* its far end faces an empty square (any tile there matched T's field
     edge). The `state.lastBridge` path in `scoreAfterPlacement` never fires on a legal board (the test "a bridge next
     door can finish a road…" builds a board that cannot arise in play). Harmless; keep or remove.
- ✘ **Bridge-only tiles (BC9).**
  ```js
  export const hasPlainPlacement = (state, t) =>
    frontier(state.board).some(([x, y]) => [0, 1, 2, 3].some((r) => canPlace(state, x, y, t, r)));
  export const canDiscard = (state) => state.phase === 'place' && !!state.drawn && !hasPlainPlacement(state, state.drawn);
  // drawTile keeps its test validPlacements(state, t).length (it already counts the current player's bridges)
  function discardDrawn(state) {                     // applyAction { t: 'discard' } — the current player
    if (!canDiscard(state)) throw new Error('This tile fits without a bridge: it must be placed');
    const events = [{ kind: 'discard', winners: [], points: 0, nodes: [], meeples: [], tile: state.drawn, player: state.current }];
    state.discarded.push(state.drawn);
    drawTile(state);                                 // same player, same part
    if (!state.drawn) { if (state.bazaar) nextBazaarTurn(state, events); else gameOver(state); }
    return events;                                   // phase stays 'place' when a new tile was drawn
  }
  ```
- ✘ **Inns without I&C (BC14):** `placeTile`: `if (!hasExp(state, 'inns') && TILE_TYPES[t].features.some((f) => f.inn))
  board[k].noInn = true;` and `typeOf(tile)` returns a cached copy without `inn` flags for such tiles (so `getGroup`,
  `groupPoints`, labels and the AI all agree). AI `withTile` and the controller's `previewPoints` set the same flag on
  their trial tiles (or share a helper `boardTile(state, t, r)`).

#### H.2.4 Follower step

- ✔ The bridge on the new tile is offered automatically (a road feature of `state.last`); portal options include
  bridge roads elsewhere; captures and dragon meals include figures on bridges.
- ✘ Castellans as fairy targets: `followersOf(state, p)` also returns `{ key: c.key, fi: 'castle', c: c.id, k: c.k }`
  for each castle with `owner === p && k`; fairy options carry `c`; `sameAction` (and the controller's `sameOpt`)
  also compare `(a.c ?? null) === (b.c ?? null)`, and so does the "already assigned here" skip in `followerOptions`;
  the fairy branch of `finishTurn` stores `{ key, f: act.fi, k, p }` plus `c: act.c` for a castellan (`f === 'castle'`).

#### H.2.5 Resolution of one placement: castle decisions

```js
// finishTurn: its last lines `events.push(...scoreAndEnd(state)); return events;` (reached without a flight or after
//             'dragonStuck') become                     return resolvePlacement(state, events);
// moveDragon: at the end of the flight, `events.push(...scoreAndEnd(state))` becomes   resolvePlacement(state, events);
function resolvePlacement(state, events) {                  // step 6 begins: once per placement
  state.castleAsk = bcbOn(state, 'castles') ? castleCandidates(state) : [];
  return continueResolution(state, events);
}
function continueResolution(state, events) {
  while (state.castleAsk.length && state.players[state.castleAsk[0].p].castles < 1) state.castleAsk.shift();
  if (state.castleAsk.length) { state.phase = 'castle'; return events; }     // wait for { t: 'castle' }
  state.phase = 'action';
  events.push(...scoreAndEnd(state));   // 6b features + 6c castles (scoreAfterPlacement) → lonely sweep → endPart
  return events;
}
export function decideCastle(state, fi, build) {           // applyAction { t: 'castle', fi, build }
  const ask = state.castleAsk?.[0];
  if (state.phase !== 'castle' || !ask || ask.fi !== fi) throw new Error('Illegal castle decision');
  state.castleAsk.shift();
  const events = build ? [buildCastle(state, state.last, fi)] : [];
  const loose = unsupportedFigures(state);                  // defensive: nothing can rest on a castellan
  if (loose.length) { returnPieces(state, loose); events.push({ kind: 'return', winners: [], points: 0, nodes: [], meeples: loose }); }
  return continueResolution(state, events);
}
const isCastleCap = (f) => f.type === 'city' && f.sides.length === 1 && !f.noCastle;
function castleCandidates(state) {
  const k = state.last, board = state.board, n = state.players.length, out = [];
  featuresOf(board[k]).forEach((f, fi) => {
    if (!isCastleCap(f)) return;
    const g = getGroup(board, k, fi);
    if (!g.complete || g.nodes.length !== 2 || g.tiles.size !== 2) return;
    if (!g.nodes.every(([nk, nf]) => isCastleCap(featuresOf(board[nk])[nf]))) return;
    const fol = g.meeples.filter(isFollower);
    if (fol.length !== 1 || state.players[fol[0].p].castles < 1) return;
    out.push({ fi, p: fol[0].p });
  });
  const d = (p) => (p - state.current + n) % n;
  return out.sort((a, b) => d(a.p) - d(b.p) || a.fi - b.fi);
}
```

#### H.2.6 Castles: building, area, triggers, chains

```js
export function castleArea([a, b]) {
  const [ax, ay] = parseKey(a), [bx, by] = parseKey(b);
  return ax === bx    // one above the other: the squares west and east of each
    ? [a, b, key(ax - 1, ay), key(ax + 1, ay), key(bx - 1, by), key(bx + 1, by)]
    : [a, b, key(ax, ay - 1), key(ax, ay + 1), key(bx, by - 1), key(bx, by + 1)];
}
export const castleAt = (state, [k, fi]) => state.castles?.find((c) => c.nodes.some(([a, b]) => a === k && b === fi)) || null;
function buildCastle(state, k, fi) {
  const g = getGroup(state.board, k, fi);
  const m = g.meeples.find(isFollower);
  const tiles = [...g.tiles];
  const c = { id: state.castles.length, nodes: g.nodes.map(([a, b]) => [a, b]), tiles, area: castleArea(tiles),
              owner: m.p, k: m.k, key: m.key, born: state.board[k].n };
  state.castles.push(c);
  const tile = state.board[m.key];
  tile.pieces.splice(tile.pieces.findIndex((pc) => pc.p === m.p && pc.f === m.f && pc.k === m.k), 1);
  state.players[m.p].castles--;
  const fy = state.fairy;                                   // the fairy goes along with her knight (BC28)
  if (fy && fy.p === m.p && fy.key === m.key && fy.f === m.f && fy.k === m.k) state.fairy = { key: m.key, f: 'castle', c: c.id, k: m.k, p: m.p };
  return { kind: 'castleBuilt', winners: [], points: 0, nodes: c.nodes, meeples: [], castle: c.id, player: m.p };
}
```
`scoreAfterPlacement(state, k, apply)` ✘ changes:
1. Roads/cities: skip a city group that is a castle — `if (g.type === 'city' && castleAt(state, g.nodes[0])) return;`
   (unoccupied complete roads/cities already produce events with `winners: []` ✔).
2. `completedCloisters(board, x, y)` reports **every** monastery and garden in the 3×3 around `k` that now has 8
   neighbours, with `winners` = owners of the follower on that feature (or `[]`) and `meeples` = the pieces on it.
   Consumers already tolerate events without winners (the controller glows them white; the AI ignores them).
3. After the existing loop (awards, fairy +3, returns, goods), append the castle events:
```js
const featureEvents = events.filter((e) => ['road', 'city', 'monastery', 'garden'].includes(e.kind));
const castleEvents = bcbOn(state, 'castles') ? castleTriggers(state, k, featureEvents) : [];
for (const ce of castleEvents) {
  out.push(ce);
  const fe = fairyEvent(state, ce);                      // fairy by that castellan: +3 (BC28)
  if (fe) out.push(fe);
  if (!apply) continue;
  award(state, ce.winners, ce.points, 'castle');
  if (fe) award(state, fe.winners, fe.points, 'fairy');
  returnPieces(state, ce.meeples);                       // castellan home; the fairy becomes unassigned
}
function castleTriggers(state, k, featureEvents) {       // pure
  const now = state.board[k].n;
  const waiting = state.castles.filter((c) => c.k && c.born < now);          // BC22
  if (!waiting.length) return [];
  const feats = featureEvents.map((e) => ({ v: e.points, keys: new Set(e.nodes.map(([nk]) => nk)), kind: e.kind }));
  const val = new Map();                                 // castle id → { v, from }
  const offer = (c, v, from) => { const o = val.get(c.id); if (o && o.v >= v) return false; val.set(c.id, { v, from }); return true; };
  for (const c of waiting) for (const f of feats) if (c.area.some((a) => f.keys.has(a))) offer(c, f.v, f.kind);     // BC23, BC24
  for (let changed = true; changed;) {                   // chains (BC25): the best value spreads; ≤ |castles| rounds
    changed = false;
    for (const c of waiting) for (const d of waiting) {
      if (c !== d && val.has(d.id) && c.area.some((a) => d.tiles.includes(a))) changed = offer(c, val.get(d.id).v, 'castle') || changed;
    }
  }
  return waiting.filter((c) => val.has(c.id)).map((c) => ({
    kind: 'castle', winners: [c.owner], points: val.get(c.id).v, nodes: c.nodes, castle: c.id, from: val.get(c.id).from,
    meeples: [{ key: c.key, f: 'castle', c: c.id, p: c.owner, k: c.k }], label: `Castle +${val.get(c.id).v}`,
  }));
}
```
✘ `returnPieces`: for `m.f === 'castle'`: `const c = state.castles[m.c]; if (!c || c.k !== m.k || c.owner !== m.p)
continue; c.k = null;` then supply +1 as usual. ✘ `syncFairy`: for `fy.f === 'castle'` her follower is there iff
`state.castles[fy.c]?.k === fy.k` and its `owner === fy.p`. ✘ `fairyEvent`: also require `m.c === fy.c` when
`fy.f === 'castle'`. The fairy's +1 in `endTurn` needs no change. `moveDragon` and `captureTargets` need no change
(castellans are not in `tile.pieces`); `dragonMoves` already avoids `state.fairy.key` (= the knight's tile).

#### H.2.7 Bazaars

`endPart` ✘ (replaces the current body):
```js
function endPart(state, events) {
  if (state.bazaarDue) {                                  // the bazaar comes before the builder's part 2 (BC41)
    state.bazaarDue = false;
    if (startBazaar(state, events)) return;
  }
  if (state.bonus && state.part === 1) {
    state.part = 2; state.bonus = false;
    drawTile(state);
    if (state.drawn) { state.phase = 'place'; events.push({ kind: 'bonus', winners: [], points: 0, nodes: [], meeples: [], player: state.current }); return; }
    if (state.bazaar) { nextBazaarTurn(state, events); return; }     // in a bazaar round: no part 2, go on (BC40, BC46)
    gameOver(state); return;
  }
  if (state.bazaar) { nextBazaarTurn(state, events); return; }
  endTurn(state, events);
}
```
`placeTile` ✘: after the volcano block, `state.bazaarDue = bcbOn(state, 'bazaars') && hasTag(t, 'bazaar') &&
!state.bazaar;` (a bought tile is only ever placed inside a round, so it never marks — BC33).
```js
export function drawableCount(state) {
  const held = hasExp(state, 'dragon') && !state.dragon;
  return held ? state.deck.filter((t) => !hasTag(t, 'dragon')).length : state.deck.length;
}
function startBazaar(state, events) {
  const n = state.players.length, host = state.current;
  if (drawableCount(state) < n) { events.push({ kind: 'bazaarSkip', winners: [], points: 0, nodes: [], meeples: [], host }); return false; }  // BC34
  const tiles = [];
  while (tiles.length < n) {                              // deck order; P&D set-aside rule (BC35)
    const t = state.deck.pop();
    if (!state.dragon && hasExp(state, 'dragon') && hasTag(t, 'dragon')) { state.setAside.push(t); continue; }
    tiles.push({ t, owner: null, price: 0, how: null, played: false });
  }
  state.bazaar = { host, tiles, stage: 'pick', chooser: (host + 1) % n, item: null, high: null, bidder: null, queue: [],
                   ret: { part: state.part, bonus: state.bonus, ransomPaid: state.ransomPaid } };
  state.bonus = false;
  events.push({ kind: 'bazaarOpen', winners: [], points: 0, nodes: [], meeples: [], host, tiles: tiles.map((x) => x.t) });
  if (auctionOn(state)) { state.phase = 'bazaar'; return true; }
  beginRound(state, events);                              // variant: take-and-play (BC47)
  return true;
}
```
Auction — `applyAction({ t: 'bazaar', … })` → `bazaarAction(state, a)`; the acting seat is `actingSeat(state)`:

| Stage | Acting seat | Action | Validation | Effect |
|---|---|---|---|---|
| `pick` | `chooser` | `{ t:'bazaar', pick: i, bid: b }` | tile i unowned; b integer, 0 ≤ b ≤ 99 | `item = i`, `high = { p: chooser, bid: b }`, `bidder = nextBidder(chooser)`, stage `bid` |
| `bid` | `bidder` | `{ t:'bazaar', bid: b }` | integer, `high.bid < b ≤ 99` | `high = { p: bidder, bid: b }`; advance the lap |
| `bid` | `bidder` | `{ t:'bazaar', pass: true }` | — | advance the lap |
| `decide` | `chooser` | `{ t:'bazaar', sell: false \| true }` | `high.p !== chooser` | buy: chooser −b, `high.p` +b, owner = chooser; sell: `high.p` −b, chooser +b, owner = `high.p` |
| `take` | `chooser` (= current) | `{ t:'bazaar', take: i }` | variant only; tile i unowned | owner = current, then `beginBazaarTurn` (or skip) |

- `nextBidder(from)`: the next seat clockwise after `from` that has no tile and is not the chooser. When the scan
  reaches the chooser the lap is over: if `high.p === chooser` the chooser pays `high.bid` to the bank (`how: 'bank'`)
  and owns the tile; otherwise stage `decide`.
- After a deal (`award(…, 'bazaar')` for both sides; the tile's `price`/`how` recorded; event `bazaarDeal`): let `free`
  be the seats without a tile. `free.length === 1` → that seat takes the last tile (`how: 'free'`), then `beginRound`.
  Otherwise `chooser` = the next seat clockwise after the previous chooser that is in `free` (BC37); stage `pick`.
  (Invariant: unowned tiles = seats without a tile; an auction always has ≥ 2 such seats.)
- Every bazaar step returns events (`bazaarPick`, `bazaarBid`, `bazaarPass`, `bazaarDeal { i, t, how, chooser,
  owner, payee, price }`, `bazaarRound { order }`, `bazaarTurn { seat, t, replaced }`, `bazaarEnd`) with
  `winners: []`, `points: 0`, `nodes: []`, `meeples: []`; scores are already updated when they are returned.

Bazaar round:
```js
function beginRound(state, events) {
  const bz = state.bazaar, n = state.players.length;
  bz.stage = 'round';
  bz.queue = Array.from({ length: n }, (_, i) => (bz.host + 1 + i) % n);       // host's left … host (BC39)
  events.push({ kind: 'bazaarRound', winners: [], points: 0, nodes: [], meeples: [], order: [...bz.queue] });
  nextBazaarTurn(state, events);
}
function nextBazaarTurn(state, events) {
  const bz = state.bazaar;
  while (bz.queue.length) {
    const seat = bz.queue.shift();
    state.current = seat; state.part = 1; state.bonus = false; state.ransomPaid = false; state.turn++;
    const free = bz.tiles.filter((x) => x.owner === null);
    if (free.length > 1) { bz.stage = 'take'; bz.chooser = seat; state.phase = 'bazaar'; return; }   // variant only
    if (free.length === 1) { free[0].owner = seat; free[0].how = 'take'; }                            // variant: last tile
    if (beginBazaarTurn(state, seat, events)) return;
  }
  finishBazaar(state, events);
}
function beginBazaarTurn(state, seat, events) {           // true when the seat now has a tile to play
  const bz = state.bazaar;
  bz.stage = 'round';
  const item = bz.tiles.find((x) => x.owner === seat && !x.played);
  item.played = true;
  state.drawn = validPlacements(state, item.t).length ? item.t : null;   // as printed or with one of seat's bridges
  const replaced = !state.drawn;
  if (replaced) { state.discarded.push(item.t); drawTile(state); }       // BC44
  if (!state.drawn) return false;                                        // nothing to play: skipped, no step 0
  state.phase = 'place';
  events.push({ kind: 'bazaarTurn', winners: [], points: 0, nodes: [], meeples: [], seat, t: state.drawn, replaced });
  const fy = state.fairy;                                                // step 0 of this bazaar turn (BC39)
  if (fy && fy.p === seat) {
    award(state, [seat], 1, 'fairy');
    events.push({ kind: 'fairy', winners: [seat], points: 1, nodes: [], meeples: [], key: fy.key, label: 'Fairy +1', start: true });
  }
  return true;
}
function finishBazaar(state, events) {
  const { host, ret } = state.bazaar;
  state.bazaar = null;
  state.current = host; state.part = ret.part; state.bonus = ret.bonus; state.ransomPaid = ret.ransomPaid;
  events.push({ kind: 'bazaarEnd', winners: [], points: 0, nodes: [], meeples: [] });
  endPart(state, events);            // the host's part 2 (BC41), or endTurn → the host's left neighbour (BC42)
}
```
Notes: a bazaar-round turn ends through the normal `scoreAndEnd → endPart`, which plays that player's part 2 first
(BC40) and then calls `nextBazaarTurn`. `{ t: 'discard' }` and an unplaceable bought tile use `drawTile` for the same
seat. A bazaar on any tile placed while `state.bazaar` is set is ignored by construction. During phase `'bazaar'`
`ransomOptions` returns `[]` (its phase check ✔). In a bazaar turn the dragon's movers start with `state.current` ✔.

#### H.2.8 Final scoring ✘

```js
// first in display order, and never a fairy event for these (BC29):
for (const c of state.castles) if (c.k) events.push({ kind: 'castleEnd', winners: [], points: 0, nodes: c.nodes,
  meeples: [{ key: c.key, f: 'castle', c: c.id, p: c.owner, k: c.k }], label: 'Castle not scored', complete: false });
// fields (BC30):
const cities = fieldCities(board, g).filter((c) => c.complete);
const castles = cities.filter((cg) => castleAt(state, cg.nodes[0])).length;
// field event: points = 3 * cities.length + castles; cityCount = cities.length; castleCount = castles
// pig event (winning pig owners): points = cities.length   (+1 per city AND per castle → 4 / 5)
```
The sort `order` gets `castleEnd: -1`; the fairy loop skips `castleEnd`; applying the events returns the castellans
(`returnPieces` handles `f === 'castle'`).

#### H.2.9 Actions, acting seat, helpers

| Action | Sent by | Phase | Engine |
|---|---|---|---|
| `{ t:'turn', x, y, r, bridge?: { key, axis } \| null, act, noBonus? }` | current | `place` | `placeTile` + `finishTurn` ✔ (may stop in `dragon`, `castle` or `bazaar`) |
| `{ t:'discard' }` | current | `place` and `canDiscard` | `discardDrawn` ✘ |
| `{ t:'castle', fi, build }` | `actingSeat` (the city's owner) | `castle` | `decideCastle` ✘ |
| `{ t:'bazaar', pick, bid }` · `{ bid }` · `{ pass: true }` · `{ sell }` · `{ take }` | `actingSeat` | `bazaar` | `bazaarAction` ✘ |
| `{ t:'dragon', key }` | `dragonMover` | `dragon` | ✔ |
| `{ t:'ransom', from, k }` | current | `place` / `action` | ✔ |
| `{ t:'kind', seat, kind, level }` | any phone | any | ✔ |

```js
export function actingSeat(state) {         // whose decision it is now; null when the game is over
  switch (state.phase) {
    case 'dragon': return dragonMover(state);
    case 'castle': return state.castleAsk[0].p;
    case 'bazaar': return state.bazaar.stage === 'bid' ? state.bazaar.bidder : state.bazaar.chooser;
    case 'over': return null;
    default: return state.current;
  }
}
export function castleOptions(state)        // phase 'castle': { seat, fi, nodes, tiles, area }
export function bazaarOptions(state)        // phase 'bazaar': { seat, stage, item, high,
                                            //   pick: [i…] | null, minBid, maxBid: 99, canPass, canSell }
```
Exported helpers: `bcbOn`, `BRIDGES` ✔, `BAZAAR_MAX_BID`, `bridgeSpots` ✔, `hasPlainPlacement`, `canDiscard`,
`castleArea`, `castleAt`, `castleOptions`, `bazaarOptions`, `drawableCount`, `actingSeat`. Lockstep: every decision
above is one serialisable action from one seat; the only randomness is the deck order and `rand(state)` (set-aside
reinsertion) ✔; the server needs no change (it relays any seat's action in order).

#### H.2.10 `migrate` and `newGame` ✘

```js
if (s.version < 5) {
  s.castles = s.castles || []; s.castleAsk = s.castleAsk || []; s.bazaar = s.bazaar ?? null;
  s.bazaarDue = !!s.bazaarDue; s.lastBridge = s.lastBridge ?? null;
  for (const p of s.players) {
    p.bridges = p.bridges ?? 0; p.castles = p.castles ?? 0;
    p.breakdown.castle = p.breakdown.castle || 0; p.breakdown.bazaar = p.breakdown.bazaar || 0;
  }
  s.version = 5;
}
```
`newGame`: `version: 5`, the fields above with these initial values, breakdown buckets `castle` and `bazaar`.

#### H.2.11 Invariants (for tests)

- Figures: supply + `tile.pieces` + tower tops + prisoners + castellans (castles with `k`) is constant.
- Tiles: board + discarded + setAside + deck + (drawn ? 1 : 0) + unplayed bazaar tiles = the initial total.
- Bridges: ≤ 1 per tile; Σ players (`BRIDGES(n)` − `bridges`) = number of tiles with a bridge; both ends of every
  bridge are printed field edges; every pair of neighbouring tiles matches.
- Castles: no castellan in `tile.pieces`; each castle's `nodes` are two complete one-edge caps on its two `tiles`; a
  castle's city never produces a scoring event; `fairy.f === 'castle'` ⇒ `castles[fairy.c].k === fairy.k`.
- Scores ≥ 0 unless bazaars are on; the breakdown (incl. `castle`, `bazaar`) sums to the score.
- In phase `'bazaar'` exactly one seat acts and `ransomOptions` is empty; in phase `'castle'` `castleAsk` is non-empty.

### H.3 AI requirements

- **Placement & bridges.** ✔ `chooseMove` tries the needed bridge (`needsBridge[r]`, always one spot) with cost
  `P.bridge = 1.2`. ✘ Make the cost depend on scarcity and time: `P.bridge × (bridges left === 1 ? 1.6 : 1) × (0.5 +
  deck.length / deckSize)` (≈ 1.8 early, 0.6 late; 2.9 for the last bridge early). ✘ **Discard decision** when
  `canDiscard(state)`: best move value v* vs the baseline v0 = `valueFor(estimate(state, emptyAdjust), me, opp)`; if
  v* < v0 − 0.5 (the tile helps rivals more than me, bridge cost included) return `{ discard: true }` and the
  controller sends `{ t: 'discard' }`, then thinks again with the new tile. Easy bots never discard while they have a
  bridge. ○ Optional bridges are not considered (rarely worth a scarce bridge); hard bots may later try the new tile's
  optional spot with a thief on it.
- **Castle decision** ✘ `chooseCastle(state, level)` → `{ t: 'castle', fi, build }` for `castleAsk[0]`:
  ```
  easy: build with probability 0.5 if ≥ 20 drawable tiles remain, else score
  left = drawableCount(state); if left < max(10, 3 × players) → score
  area = castleArea(the small city's two tiles)
  candidates: every unfinished road/city with a tile in the area (not the small city itself):
                v = value if finished now ((tiles + pennants) × 2|3, or tiles × 1|2), p = completionChance(openEdges, remaining)
              every monastery/garden on an area tile: v = 9, p = 0.8 (≥ 6 neighbours) | 0.5 (≥ 4) | 0.25
              every empty area square: v = 3, p = 0.35
  sort by p descending; EV = Σ p_i v_i Π_{j<i} (1 − p_j)            (the FIRST completion pays)
  cheap = some candidate with v ≤ 4 and p ≥ 0.5;  farm = fields bordering the city that I win now (+1 each: castle 4 vs 3)
  keep  = 2.5 if I hold ≤ 1 meeple else 1                           (the castellan is tied up)
  build ⇔ EV + farm − keep > 4 + (hard ? 0.3 : 1) and not (cheap and EV < 6)
  ```
- **Bazaar** ✘ `chooseBazaarAction(state, level, rnd)` → one bazaar action for `actingSeat(state)`:
  - `bazaarValues(state)` (lazy, cached): `val[i][p]` for an unowned tile i and a player p without a tile, from a light
    `quickValue(state, t, p)`: with `state.current = p` temporarily (restored in `finally`), over `validPlacements(state,
    t)` (incl. the needed bridge) take the best of: p's immediate points from `scoreAfterPlacement(state, k, false)`
    (castle events included) − 0.5 × points to rivals + the best simple follower value on the new tile (road tiles ×
    0.8, city (tiles + pennants) × 1.6, monastery 1 + neighbours, farm 1.5 × completed cities, each × completion
    chance) − bridge cost; return max(0, best). No `estimate()` (that is the expensive part). Cache per auction (key
    `state.placed` + the revealed tiles): the board does not change during the auction.
  - Fallback `f_p` = the median of p's values over the unowned tiles (what p expects otherwise).
  - `pick`: argmax over i of `val[i][me] − f_me + 0.3 × max_{q≠me}(val[i][q] − f_q)`; open with 0.
  - `bid`: surplus `s = val[item][me] − f_me`; raise to `high.bid + 1` if that is ≤ `s × (hard 0.9 | medium 0.7 |
    easy 0.5)` and ≤ 99, else pass (easy: raise with probability 0.3 when s > 0).
  - `decide` (rival q bid b): buy if `(val[item][me] − f_me) + (val[item][q] − f_q) > 4b`, else sell (relative swing;
    also right with 2 players).
  - `take` (variant): argmax `val[i][me]`.
- **Evaluation** ✘ `estimate()`: a waiting castle adds about `0.7 × max(4, best open feature value in its area) ×
  min(1, 2 × remaining)` to its owner; a castle bordering a field counts 4 (pig 5) instead of 3. Castle trigger points
  reach `evaluate()` automatically through `scoreAfterPlacement(…, false)` once the engine emits castle events
  (`pieceId` works with `f: 'castle'`). Negative scores need no change.
- **Budget.** `chooseMove` measured 17–260 ms (desktop Node, four players, six expansions, `f6200a7`); keep it under
  ~300 ms (phones are ~3–4× slower): if placements × rotations exceed ~400, keep only the 40 bridge-requiring
  placements with the best immediate points. Bazaar valuation: a prototype of `quickValue` (session scratchpad
  `master/quickvalue.mjs`) took 4–16 ms per (tile, player) on desktop Node in a 6-player game (the full 6 × 6 matrix
  0.13 s early, 0.57 s late) — so compute **lazily and cache per auction** (each pair at most once: a bot needs its own
  values for the unowned tiles plus the bidders' values for the current item, ≤ 2N pairs per decision), and if one
  decision would still exceed ~250 ms on the device, consider only the 40 placements with the best immediate points.
  Castle choice < 5 ms; bots wait ~600–700 ms before each castle/bazaar action so people can follow.

### H.4 UI requirements

- **Plumbing** ✘ Replace the controller's local `actingSeat` with `G.actingSeat(state)` everywhere (`isLocal`, active
  chip in `renderPlayers`, `kick`, `remoteWaiting`, the "Let a bot play" takeover). `startTurn` routes phase
  `'castle'` → `castlePhase()` and `'bazaar'` → `bazaarPhase()` like `'dragon'`. `pumpLoop` accepts `castle` in phase
  `castle`, `bazaar` in phase `bazaar`, `discard` in phase `place` (apply with `G.applyAction`, `record`, animate,
  `startTurn`). `aiTurn` handles `mv.discard`. `startGame` resumes phases `castle`/`bazaar` through `startTurn`.
- **Placing a bridge.** ✔ Board draws bridges; a needed bridge is drawn translucent on the right tile with the dock
  text "🌉 Fits here with a bridge (you have N)"; a "🌉 Bridge" picker group in the action phase builds, moves or
  takes back an optional bridge (re-placing from the snapshot); a bridge on the new tile then offers a road ghost on
  it; a tap on a bridge picks its road. ✘ Candidate squares where the current rotation needs a bridge get a small 🌉
  badge. ✘ **Bridge-only tile:** when `G.canDiscard(state)`, toast "This tile only fits with a bridge" and a dock
  button "🗑 Throw it away" (confirm with `ask()` while bridges remain) → `{ t: 'discard' }`. ○ `bridgeChoices`' branch
  for several needed spots can go (there is always one).
- **Castle decision** ✘ `castlePhase()`: highlight the small city (gold) and outline the 6 area squares (dashed, empty
  ones too) using `castleOptions`; list what lies in reach ("a 7-tile city with 2 open ends, a monastery with 6
  neighbours"). On the deciding seat's phone: `ask('🏰 Build a castle?', …, [{ label: '🏰 Build a castle (N left)', value:
  true }, { label: 'Take 4 points', value: false }])` → `sendMove({ t: 'castle', fi, build })` → apply → animate. Bots:
  `chooseCastle` after ~600 ms. Others: "Waiting for Blue to decide about a castle…". Animations: `castleBuilt` drops the
  token on the shared edge and hops the knight onto it; `castle` glows the castle and the triggering feature, floats
  "+v · 🏰 Castle" and flies the castellan home (chains one after another); `castleEnd` lifts the castellan off with "0".
- **Board** ✘ Draw each castle (`state.castles`) with `drawCastle` at the midpoint of its shared edge, along the edge,
  above tiles and bridges; the castellan on top (`figureWorld` / `tileAnchor` / ghost positions handle `f ===
  'castle'`); the fairy by a castellan beside the castle. Scored castles stay (no figure).
- **Auction screen** ✘ `bazaarPhase()` on every phone: a bottom sheet over the board (board still visible): header
  "🛒 Bazaar — hosted by Red"; the N revealed tiles as cards (tap to enlarge/rotate), each with owner and price once
  settled ("Blue · paid Red 3", "Black · free") and "⚠ fits nowhere right now" when it fits nowhere for anyone; a status
  line naming whose decision it is, the high bid and bidder, and the choosing order still to come. Controls only for the
  acting seat (`bazaarOptions`): pick = tap a card + stepper 0–99 (default 0) + "Pick & bid"; bid = stepper (min
  high + 1) + "Raise" / "Pass"; decide = "Buy it (pay Blue 3)" / "Sell it (Blue pays you 3)"; take (variant) = tap a
  card. Pass-and-play: banner "👉 Blue: your bid" before the controls. Every step animates (banner, chips bump for
  transfers; negative scores allowed).
- **Bazaar round** ✘ The sheet collapses into a strip above the dock: "Bazaar round: Blue ▸ Black ▸ Red" with each tile,
  the current player highlighted; the preview shows the current player's bought tile and a banner "🛒 Blue plays the
  tile they bought"; toast when a bought tile is swapped for a drawn one.
- **Player cards and scores** ✔ 🌉N and castle-icon N counters while the expansion is on (✘ hide each when its part is
  off). ✘ Negative scores with a minus sign (red). ✘ Score-table columns `castle` 🏰 and `bazaar` 🛒 (the tower-ransom
  column becomes ⛓️ so 🏰 means castles). ✘ The deck counter adds unplayed bazaar tiles. ✘ Final scoring section
  "🏰 Castles still waiting (0 points)".
- **Rules page** ✘ A section "🌉 Bridges, Castles & Bazaars" with the kid rules text and the 12 figures of
  `bridges-castles-bazaars.md` §13 (`renderMini` learns a `bridge` axis per tile and `extras` of kind `'bridge'` and
  `'castle'`), the BCB tile gallery, and in "Mixing Expansions": "A bridge goes down with your tile, before your
  figure. Castles are decided after the dragon, before scoring. The bazaar comes after the whole turn, before the
  builder's bonus tile."
- **Lobby** ✘ `EXPANSIONS` entry `{ id: 'bridges', name: 'Bridges, Castles & Bazaars', icon: '🌉', blurb: 'Bridges carry
  roads over anything, tiny cities become castles that score their neighbours, and bazaars auction tiles.', ready: true
  }`; ○ sub-options under the toggle (bridges / castles / bazaars / bidding).

### H.5 Test checklist (for testing agents)

"(exists)" = covered by `tests/bridges.test.mjs` at `f6200a7`; everything else needs a test.

**Bridges**
- BR1 Supply 3/2; none without the expansion or with `bcb.bridges` off. (exists, partly)
- BR2 Legality: new-tile bridge fixing one end and both ends; neighbour bridge with an empty far end; far end against a
  meadow refused; ends on road/city/river refused; a second bridge on a tile refused; two mismatches on different axes
  refused. (exists, partly)
- BR3 `needsBridge[r]` has exactly one spot and optional spots have both ends on empty squares (random boards);
  `placeTile` refuses a bridge not in `bridgeSpots`; supply −1.
- BR4 Fields join at a bridged edge; a river still splits fields; the city under a bridge stays one city. (exists, partly)
- BR5 Figures on the new tile's bridge: meeple, large, builder (with own meeple); not abbot or pig; not on a neighbour's
  bridge; a bridge joining an occupied road blocks the claim. (exists, partly)
- BR6 Scoring: tile counted once; a connected inn doubles, a separate inn does not; incomplete inn road 0; BCB inns
  ignored without I&C (`noInn`).
- BR7 Discard: a bridge-only tile can be thrown away, a tile with a bridge-free spot cannot; without bridges a
  bridge-only tile is auto-discarded; discarding in part 2, in a bazaar turn and with an empty deck (game over vs. next
  bazaar turn).
- BR8 River: a bridge across `RI.1/IFI` in the river phase; never an end on the river; the river rules unchanged.
- BR9 Builder trigger by a new-tile bridge joining the builder's road; two bridges in one double turn; a neighbour
  bridge never completes a road (random games).
- BR10 Portal onto a bridge road elsewhere; dragon eats a figure on a bridge; tower captures it; a bridge on a volcano
  tile is legal and offers no figure on it.

**Castles**
- CA1 Candidates: two one-edge caps only; `noCastle` caps (`BB/CFR!G`; `IC/C!`, `DG/CCc+.p` after the data patch)
  refused; 3-tile city never; empty city never; owner without castles not asked; `bcb.castles` off → never.
- CA2 Decision by a non-active owner (phase `castle`, `actingSeat` = owner); two small cities on one tile → two
  decisions in seat order; the second skipped when the owner just used his last castle.
- CA3 Building: knight leaves `tile.pieces`; castle entry with the right `area`; castles −1; the city gives no points,
  no fairy +3, no goods; lonely sweep.
- CA4 Order: princess removal, tower capture or dragon meal before the decision removes the option; the flight comes
  before the decision.
- CA5 Area keys for vertical and horizontal castles; squares filled later count.
- CA6 Triggers: road/city with one tile in the area; empty road/city; empty monastery and garden (9); monastery outside
  with neighbours inside → none; scored small city (4) triggers; converted small city does not; abbot recall does not;
  fields do not; the creating placement does not; part 2 of the same double turn does; a bazaar-round turn does.
- CA7 Value: inn ×2, cathedral ×3, pennants; the higher of two simultaneous features; one feature scoring two castles;
  owner of both scores twice; breakdown `castle`; large castellan once.
- CA8 Chains: directional trigger; same value; best value from two sources; each castle once; castles built this
  placement excluded.
- CA9 The castellan is never in dragon meals, `captureTargets`, princess or portal options; the dragon may enter a
  castle tile.
- CA10 Fairy: moved to a castellan (`fi: 'castle'`, `c`); stays with a converted knight; +1 per turn; +3 when the castle
  scores; unassigned afterwards; nothing at the end; blocks the dragon on the knight's tile.
- CA11 Final: castellans home first with 0 and no fairy; a field with 1 castle + 1 city = 7; with the winner's pig 9;
  castles separate fields.

**Bazaars**
- BZ1 Start: drawn bazaar → auction after the part's scoring (after castle decisions); bought / in-round bazaars
  ignored; discarded bazaar → none; too few drawable tiles → skipped (dragon tiles not counted before the volcano);
  exactly N → all revealed, game over after the round.
- BZ2 Reveal: deck pop order, N tiles, dragon tiles set aside before the first volcano.
- BZ3 Auction with 2, 3, 4 and 6 players: chooser = host's left; one lap; raises strictly higher; pass; nobody raised →
  bank; buy and sell transfers; drop-out; next chooser after a buy and after a sale (4-player case where BC37 and
  "previous buyer" differ); last tile free; illegal actions (wrong stage or seat state, bid ≤ high, bid > 99,
  non-integer, owned tile, `sell` when the chooser is the high bidder) throw.
- BZ4 Negative scores after bids; ransom refused below 3; `ransomOptions` empty during the auction; breakdown `bazaar`
  sums.
- BZ5 Round order host+1 … host; each bazaar turn: fairy +1, fresh ransom, bridges, castles, immediate dragon flight;
  afterwards play resumes with host+1.
- BZ6 Builder: host's bazaar tile triggers → round first, then part 2 with the host's `ransomPaid` restored; a bought
  tile triggers part 2 at once; empty stack → no part 2, the round goes on; a bazaar drawn in an in-round part 2 is
  ignored, one drawn in the host's part 2 is held.
- BZ7 Unplaceable bought tile → replacement draw; empty deck → turn skipped (no fairy +1); a bridge-only bought tile can
  be thrown away.
- BZ8 Bought volcano → the dragon jumps, set-aside tiles reinserted with `rand(state)`; bought dragon tile (dragon in
  play) → flies at once.
- BZ9 The game never ends inside a round; after the round with an empty deck → over.
- BZ10 Variant: take-and-play order; the last tile is automatic.

**Combinations, invariants, online**
- CI1 Random games for every combination of the seven expansions (128), 2–6 players: the driver handles phases
  `castle`/`bazaar` (random legal decisions via `castleOptions`/`bazaarOptions`), `discard`, needed and optional
  bridges; all invariants of H.2.11.
- CI2 Lockstep replay (JSON round-trip of the action log) with bridges, discards, castle decisions and bazaar actions.
- CI3 T&B × P&D × BCB: bazaar tile extends the builder → auction → round with a dragon tile → host's part 2 draws a
  bazaar → second auction.
- CI4 Abbot × P&D × BCB: fairy by a castellan; an empty garden completes in the area → castle 9 + fairy 3; a recall in
  the area does nothing.
- CI5 I&C × T&B × BCB: large castellan; castle 5 for a pig winner; inn road over a bridge.
- CI6 Tower × BCB: figure on a bridge captured; castellan not capturable; ransom in a bazaar turn; castle on a foundation
  cap; tower actions in bazaar turns.
- CI7 River × BCB: bridges in the river phase; no bazaar during the river phase.
- ON1 Online, 3 phones + 1 bot (`dev/online-*.mjs`): an auction where every phone acts in turn (pick on B, raise on C,
  bot passes, buy/sell on B), a castle decided on a non-active phone, a bridge-only discard; all phones end identical and
  the room's action list replays.
- ON2 A phone offline on its auction turn → "Let a bot play" takes the seat via `actingSeat`; reconnecting mid-auction
  resyncs.
- ON3 Pass-and-play: an auction with 3 humans on one phone shows each seat's controls in turn.

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
- **BCB (Bridges, Castles & Bazaars, §H):** RB-DE3 *Brücken, Burgen und Basare*, HiG © 2010, 2017
  <https://cundco.de/media/2a/e7/7d/1715104329/cc-2-1-8-erw-de.pdf>; RB-EN3 *Bridges, Castles and Bazaars*, Z-Man/HiG
  © 2010, 2018 <https://www.hans-im-glueck.de/wp-content/uploads/2023/07/carcassonne_exp8_rules.pdf>; 1st edition
  (DE 2010, Z-Man EN 2013) for edition differences; WikiCarpedia
  [Bridges, Castles and Bazaars](https://wikicarpedia.com/car/Bridges,_Castles_and_Bazaars) (C2, fetched 2026-10-17);
  S-CAR v7.3 pp. 111–119, 204–208; BGG threads 538079, 542577, 569109, 498317, 570930 (C. Tisch, HiG); JCZ
  `BridgeCapability`, `PlacementsMixin`, `CastleCapability`, `CastlePhase`, `Castle`, `ScoringPhase`, `ScoreCastle`,
  `BazaarPhase`, `FinalScoring`; research files `bcb-rules.md`, `bcb-tiles.json`/`.md`, `bcb-interactions.md`.
- BCB verification scripts (throwaway, session scratchpad): `master/probe-bridges.mjs` (bridge facts over 60 random
  games), `master/time-ai.mjs` (AI timing), `master/build_final_json.py` (assembles the final JSON from the tile research).
