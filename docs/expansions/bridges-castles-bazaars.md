# Bridges, Castles & Bazaars (Expansion 8) – final spec, 3rd edition

Machine-readable twin: `bridges-castles-bazaars.json` (same slug; tiles, components, structured rules).
**Arbitrated 2026-10-17.** The authoritative rulings are `MASTER.md` §H (rulings BC1–BC50, engine spec H.2,
AI H.3, UI H.4, tests H.5). This file explains them for humans: rules, edge cases, interactions, the decisions
taken on the researchers' open questions, kid rules text and figures. The research it is built on:
`bcb-rules.md` (rules and sources), `bcb-tiles.json` / `bcb-tiles.md` (the 12 tiles), `bcb-interactions.md`
(interactions with the base game and the six other expansions).

**Edition.** *Brücken, Burgen und Basare* (Hans im Glück © 2010, 2017) and its English translation *Bridges,
Castles and Bazaars* (Z-Man/HiG © 2010, 2018): new artwork, one tile with an abbot garden (`BB/CFR!G`).
WikiCarpedia calls it C2. The 2025 redesign *Castles & Bridges* is a different expansion and is not implemented.

**Precedence** (as in MASTER): (1) 3rd-edition rulebook text – the German original (RB-DE3) wins where the
English (RB-EN3) mistranslates; (2) official clarifications (OC, with date; OC\* = HiG staff answer on BGG);
(3) WikiCarpedia / S-CAR community notes (COM); (4) JCloisterZone (JCZ). Where all are silent: the reading that
fits the existing MASTER rulings and is simplest to explain to a 12-year-old (DER = derived).

---

## 1. Rulings at a glance

| Topic | Ruling | Basis |
|---|---|---|
| Supply | 3 bridges + 3 castles each (2–4 players), 2 + 2 (5–6 players). Personal; none left → can't build. | RB p.1 |
| Parts | Bridges, castles and bazaars can each be switched off; bazaars can use the official no-bidding variant. | RB p.1, p.6 |
| Bridge timing | Chosen **with the tile** (one action), before the follower step. One bridge per **tile placement**. | RB-DE3 p.1 structure; JCZ |
| Bridge position | New tile or a tile sharing a side with it; one bridge per tile; straight N–S or E–W; both ends on printed **field** edges; it may cross anything. | RB-DE3 p.1–2 |
| Matching | Afterwards every edge matches: each end continues a road or faces an empty square. | OC 12/2014 |
| Making a tile fit | A road may run into a field edge if the bridge carries it on (bridge on the new tile, or on the neighbour). There is never more than **one** such bridge for a spot and rotation. | RB-DE3 p.1–2; DER (proved) |
| Optional bridge | Allowed even when not needed, also on a neighbour; it always starts a **new** road (both ends on empty squares). | RB-DE3 p.1; OC\* BGG 542577 |
| Bridge-only tile | Placeable; the player may instead **throw it away and draw again**. A tile with any bridge-free spot must be placed. | OC 10/2014 |
| Under a bridge | Fields and cities are not split; fields on both sides of a road ending at a bridged edge join. | RB-DE3 p.2 |
| Figures on bridges | Only on a bridge on the tile just placed (normal follower step, road rules). Portal may target bridges elsewhere. | RB-DE3 p.2, p.6; MASTER B4 |
| Rivers | Ends never on river edges; crossing the river is fine; bridges allowed in the river phase. | RB-DE3 p.1; RB-EN1 p.3 |
| Small city | Exactly two tiles, each a **semicircular** one-edge cap. Not `BB/CFR!G`, `IC/C!`, `DG/CCc+.p`. | RB-DE3 p.3; OC 7/2010 |
| Castle decision | By the owner of the city's single knight (maybe not the active player), after the follower step and the dragon flight, before scoring. No castle left → it scores 4. | RB-DE3 p.3; JCZ |
| Castle trigger | From the **next tile placement** on (builder part 2 and bazaar turns count): the first road/city with a tile in the 6-square area, monastery/garden whose own tile is there, or scoring castle (chain). Empty features count. Fields, abbot recall, final scoring never. | RB-DE3 p.3–4; COM; JCZ |
| Castle value | Full value of the feature (inn, cathedral, pennants); best one if several; chains pass the value on. | RB-DE3 p.3–4, p.6 |
| Castellan | Lives off the tiles: never eaten, captured, removed by the princess or targeted by the portal. The fairy may stand by it (+1/turn, +3 when the castle scores). | RB-DE3 p.6; P&D; Tower |
| End | Castellans go home first (0, no fairy +3). Every castle = 4 per field (5 with a pig). | RB-DE3 p.4, p.6 |
| Bazaar | After the whole part with a drawn bazaar tile; skipped if fewer drawable tiles than players. | RB-DE3 p.4–5; RB-EN3 p.5 |
| Auction | Chooser = next clockwise after the previous chooser who has no tile; one bidding lap; buy or sell; last tile free; bids may exceed your score (scores may go negative). | RB-DE3 p.5; WiCa fn 26 |
| Bazaar round | Full normal turns from the host's left to the host (fairy +1, ransom, builder part 2 at once, dragon flies at once); bazaars placed during it are ignored; then play resumes left of the host. | RB-DE3 p.5–6; OC 2/2021 |
| Host's builder | Part 2 comes **after** the bazaar round. | RB-DE3 p.6 |
| Bought tile unplaceable | Removed; draw from the stack; empty stack → that bazaar turn is skipped; no refund. | JCZ; DER |
| Game end | Never inside a bazaar round. | DER |

---

## 2. Components and setup

* **12 land tiles** (11 layouts; `BB/Cccc.b` twice), **8 with a bazaar**, 2 inns, 2 monasteries, 1 garden, no
  pennants. Full list and verification: `bcb-tiles.md`; tile data: the JSON twin.
* **12 castle tokens** (a patch of meadow with a castle, laid over a two-tile city) and **12 wooden bridges**.
* **Per player:** 3 bridges + 3 castles with 2–4 players, 2 + 2 with 5–6 (6 players need Inns & Cathedrals).
  Spares go back in the box. The supply is personal: when yours are gone you cannot build any more.
* Shuffle the 12 tiles into the land tiles (never into the River's stack). With all seven expansions the land deck
  has 71 + 18 + 24 + 30 + 18 + 12 = **173** tiles.
* **Options:** the rulebook lets you use "all or part" of the expansion. App options `bcb.bridges`,
  `bcb.castles`, `bcb.bazaars` (default on) and `bcb.auction` (default on; off = the official variant without
  bidding, §6.6).
* **Inns:** the inns on `BB/R.bi` and `BB/RFR.bi` (south road only) only count with Inns & Cathedrals; without it
  they are pictures.
* **Negative scores** are possible (bazaar bids).

---

## 3. Where the expansion hooks into a turn

Step names as in MASTER §A.2. "Part" = one tile placement (a builder double turn has two parts).

| Step | What BCB adds |
|---|---|
| 0 Start of turn | Also at the start of **every bazaar-round turn**: fairy +1 for that player, fresh ransom allowance. |
| 1 Draw | A bazaar-round turn takes its bought tile. Placeable = fits as printed or with one of your bridges. A tile that fits **only** with a bridge may be thrown away (draw again). |
| 2 Place | Tile + at most one bridge (one choice). Then the builder trigger (after the bridge), tower, volcano, and the **bazaar mark** (drawn bazaar tile, no bazaar running). |
| 3 Ransom | Never during an auction; needs ≥ 3 points. |
| 4 Follower | Figure on this tile's bridge; portal onto bridges elsewhere; fairy next to a castellan. |
| 5 Dragon | Eats figures on bridges, never castellans, bridges or castles. |
| 6 Scoring | **6a** castle decisions → **6b** score completed features (unoccupied ones recorded at full value) → **6c** waiting castles score (chains) → **6d** figures home, lonely builder/pig. |
| 6½ Bazaar | If marked in this part: reveal, auction, bazaar round. |
| 7 Builder | The host's part 2 after the bazaar round. |
| 8 End | After a bazaar round the host's left neighbour plays next. |
| Game end | Castellans home first (0 points). |

---

## 4. Bridges

### 4.1 When, where, how many

* **When.** "Nachdem du ein Plättchen angelegt hast, darfst du zusätzlich 1 Brücke bauen" (RB-DE3 p.1, under
  "1. Landschaftsplättchen legen"; the meeple is step 2). The bridge is part of placing the tile: one action,
  decided before the follower step. It cannot be built after the follower (the 1st-edition "any time in the
  turn" reading of S-CAR is not adopted).
* **How many.** One per tile placement. A builder double turn may therefore use two (one per part), a bazaar-round
  turn one. You need a bridge left.
* **Where.** On the tile just placed or on a tile sharing a side with it, never diagonal. A tile can hold one bridge
  (so bridges never cross). Bridges may follow each other along a road.

### 4.2 Geometry and matching

* Straight from the middle of one edge to the middle of the opposite edge: north–south or east–west.
* **Both ends on printed field edges** of that tile ("beide Brückenpfeiler auf einer Wiese … nicht auf Städten,
  Straßen, Flüssen"). In between it may cross a city, a road, a river, a monastery or garden, and figures.
* After the bridge is in, **every edge must match**. Each bridge end continues a road (or another bridge) or faces
  an empty square (OC 12/2014). Consequences:
  * a bridge on the **new** tile may end against an existing road (it continues it) or an empty square, never an
    existing field or city edge;
  * a bridge on an **existing** neighbour can only end against the new tile's road or an empty square (any tile
    already there shows field against it).
* Tiles that can take a bridge are those with two opposite field edges: 10 of the 32 base layouts (A, B, E, F, G,
  H, U and the garden versions of E, H, U), 3 River tiles (`RI/s`, `RI.1/IFI`, `RI.1/I.e`), 4 I&C, 1 T&B, 7 P&D,
  4 Tower and 9 BCB layouts.

### 4.3 Bridges that make a placement legal; bridge-only tiles

"Du darfst das Plättchen auch so legen, dass eine Straße an einer Wiese endet, wenn du diese Straße im gleichen
Zug mit einer Brücke weiterführst" (RB-DE3 p.1). Two cases, both shown in the rulebook figures:

1. **Bridge on the new tile:** the new tile shows field where a neighbour's road arrives. A bridge on the new tile
   along that axis carries the road on; it can fix both of its ends at once (a tile dropped between two road ends).
2. **Bridge on the neighbour:** the new tile's road runs into a neighbour's field edge. A bridge on that neighbour,
   pointing at the new tile, carries it on; its far end must face an empty square.

Everything else must match normally; city and river mismatches can never be fixed, and only one bridge per
placement is allowed.

**At most one bridge can make a given spot and rotation legal.** The first case needs every mismatch to be
"new field / neighbour road" on one axis, the second needs exactly one "new road / neighbour field" mismatch, so
the two never apply together and each fixes the position completely. (Checked on the engine: 100,054 bridge-only
placements in 60 random games, never more than one spot.) The UI therefore shows the needed bridge automatically.

**Optional bridges.** A bridge that is not needed is still allowed (RB-DE3 p.1 makes no condition; C. Tisch on BGG
542577: a brand-new road on the neighbouring tile is fine). Such a bridge always has **both ends facing empty
squares**: it starts a new road and never touches an existing one. On the new tile it may carry your meeple; on a
neighbour it runs parallel to the shared side and is mostly a blocking move (a future tile there must bring a road).
JCZ only offers optional bridges on the new tile; we follow the rulebook.

**Refusing a bridge.** "A player is not required to use a bridge to place a tile, even if that tile would otherwise
have to be discarded" (OC 10/2014). Our handling:

* A drawn tile is **placeable** if it fits as printed or with one of the current player's bridges; such a tile is
  drawn normally (no automatic discard).
* If **every** legal placement needs a bridge, the player may instead **throw the tile away** and draw again (it is
  removed from the game, like an unplaceable tile). With a bridge-free spot available, the tile must be placed.
* A player with no bridge left sees no bridge placements; a tile that only fits with a bridge is then unplaceable
  for them and removed automatically.

### 4.4 Fields, cities, rivers

* "Wiesen oder Städte unter einer Brücke sind nicht getrennt" (RB-DE3 p.2). The bridge is an extra road feature of
  its tile; the field under it keeps both halves of each bridged edge.
* So when a road ends at a bridged edge (the neighbour's road meets the bridge), the two fields beside that road
  both touch the field under the bridge and **join into one field**. This can merge two big farms.
* A printed road crossed by a bridge still separates its fields as printed; a river still splits its fields.
* **Rivers:** ends never on river edges, but crossing the river is fine (the 1st-edition English caption says so;
  the 3rd-edition test is only "both ends on field"). Bridges are allowed during the river phase, including a
  needed bridge that lets a river tile's road meet a field edge; all river placement rules still apply.

### 4.5 Followers on bridges

* "Hast du die Brücke also auf das gerade gelegte Plättchen gebaut, darfst du deinen Meeple … auch auf die Brücke
  einsetzen" (RB-DE3 p.2). Only a bridge on the new tile, as the normal single figure of the turn, under road rules
  (the whole road must be unoccupied).
* Allowed: meeple, large meeple (I&C), builder (T&B; your meeple must be in that road). Never the abbot or the pig.
* Because the bridge comes first, a bridge that joins your new road to an occupied road stops you claiming it.
* The magic portal (P&D) may put a meeple on an unoccupied, unfinished bridge road on another tile (a bridge is a
  road segment of its tile; MASTER B4). The dragon eats, and a tower captures, figures on bridges.

### 4.6 Scoring

* "Die Brücke wird bei einer Wertung genauso gewertet wie eine Straße auf einem Landschaftsplättchen": 1 point per
  tile, 2 on an inn road. A tile counts once even if the road crosses it twice (printed road and bridge).
* Inns: an inn affects the printed road beside it; a bridge road is an inn road only if it is connected to a printed
  inn segment (OC 1/2021). Incomplete at the end: 1 per tile, 0 on an inn road.
* A bridge built on a **neighbour** never finishes a road (its far end is always open); only roads through the new
  tile can be finished by a placement.
* Bridges stay for the whole game and belong to nobody.

---

## 5. Castles

### 5.1 Small cities

* "Eine Kleinstadt (das ist eine Stadt, die nur aus zwei halbrunden Stadtteilen besteht)" (RB-DE3 p.3): a completed
  city of exactly two tiles, each contributing **one semicircular one-edge cap**. The castle token must cover it
  completely (OC 7/2010, C. Tisch).
* **Not eligible** (`castle_base: false` in the JSON → engine `noCastle`):
  * `BB/CFR!G` feature 0 – the pointed "witch-hat" city;
  * `IC/C!` feature 0 – the wedge city whose walls meet in a corner;
  * `DG/CCc+.p` feature 0 – the princess cap that runs on as a band to the corner.
* Everything else that is a one-edge cap qualifies, including the large 3rd-edition caps reaching the tile centre,
  `BB/CCCR`'s three caps, `TO/RCr`, `DG/CRRR.p` and the River caps. No one-edge cap in our tile sets carries a
  pennant or goods, so a small city is always worth 4.
* The English "a city consisting of only 2 tiles" is a translation slip and is not adopted.

### 5.2 The decision

* The **owner of the small city** decides: the player whose knight (meeple or large meeple) is in it – it does not
  matter who completed it, or whether the knight was placed on the second cap this very turn.
* The owner either **scores 4** or **builds a castle** from their supply. Building: the token covers the city and
  the knight moves onto it, becoming the **castellan**. The city is then *not completed*: no 4 points, no fairy +3,
  no goods, and it is not a completed city for other castles.
* **No castle left:** no choice, it scores 4. **No knight:** no castle; it is simply completed (and can trigger
  older castles, §5.4).
* In our expansions a small city holds at most one follower (the second cap can only be claimed if the first is
  empty; portals and towers need unoccupied features; a builder needs an unfinished feature). The engine offers a
  castle only when exactly one follower is present, so ties never arise.
* **When:** in step 6, after the follower step and the dragon flight, before anything of that placement is scored.
  A princess removal, a tower capture or the dragon can therefore take the knight first – then there is no castle.
* One tile may complete two small cities; each owner decides, in seat order from the active player (same owner:
  feature order). A player with one castle left who owns both may build on either.

### 5.3 The castle's area

* "Die Umgebung besteht aus den 2 Plättchen, auf denen die Burg liegt, sowie den 2 Plättchen rechts und den 2
  Plättchen links davon – insgesamt also 6 Plättchen." Left and right = across the castle's long sides.

  ```
  castle on A above B          castle on A left of B
     W(A)  A  E(A)              N(A)  N(B)
     W(B)  B  E(B)               A     B
                                S(A)  S(B)
  ```
* Empty squares belong to the area; a tile placed there later counts.

### 5.4 Triggers and value

* A waiting castle scores at the **first placement after the one that built it** that completes, with at least
  part of it in the area:
  * a **road** or **city** – any of its tiles in the area (bridge tiles included); a small city that was scored
    (owner took 4, or nobody was in it) counts, a converted one does not;
  * a **monastery** – only if the monastery's own tile is in the area (not merely one of its neighbours);
  * a **garden** (The Abbot) – like a monastery;
  * **another castle** that scores (§5.5).
* **Fields never** trigger. An **abbot recall** never triggers (the feature is not completed; MASTER B1); its later
  completion does. **Final scoring** never triggers.
* It does not matter who completed the feature or whether anybody scores it: **unoccupied** features count at full
  value ("auch Punkte für ein abgeschlossenes Bauwerk, für das niemand sonst Punkte bekommt").
* **Value:** the feature's full points as scored – road 1/tile (inn 2), city 2/(tile + pennant) (cathedral 3),
  monastery or garden 9, scored small city 4. Never the fairy's +3, never goods. The feature's owner and the castle
  owner both score; owning both pays twice. A large-meeple castellan scores once.
* **Mandatory:** the castle takes the first completion; it cannot wait for a better one.
* **Several at once:** the castle owner picks one; the engine takes the highest (there is nothing else to gain).
  One completion can trigger several castles; each scores the full value.
* **Timing:** "in einem späteren Zug" is read, like WikiCarpedia ("a later round of scoring") and JCZ, as *a later
  tile placement*: a castle built in part 1 of a builder double turn can score in part 2, and a castle built in a
  bazaar-round turn can score in the next one. The strict alternative ("not until the builder's turn is over")
  would switch a castle off and on again around a bazaar round and is not adopted.
* After scoring, the castellan goes home (breakdown "castle"); the castle stays, complete, and never scores again.

### 5.5 Chains

* "Bekommt eine Burg Punkte, zählt sie für die Burg daneben als abgeschlossenes Bauwerk. Alle Burgbesitzer
  bekommen gleich viele Punkte." A castle that scores counts as a completed feature for every other waiting castle
  whose area contains **one of its two tiles** (so the direction matters: castle X sets off castle Y when X lies in
  Y's area). Those score the same value, and so on.
* A castle that could take values from several sources (two features, or several scoring castles) takes the
  highest. Each castle scores at most once. Castles built in this placement never take part.

### 5.6 The castellan and the other expansions

* The castellan stands on the castle, not on a tile: the **dragon** never eats it (it may enter the castle's
  tiles), a **tower** never captures it, the **princess** never removes it, the **portal** never targets a castle.
* **Fairy:** "Die Fee kannst du in die Burg zu einem Meeple stellen und sie bringt dir die üblichen Feen-Punkte
  ein" (RB-DE3 p.6). You may move her next to your castellan; if she was by the knight that became the castellan,
  she stays with it. +1 at the start of each of your turns, +3 when the castle scores during play, nothing at the
  end. Her tile (which the dragon may not enter) is the tile the knight stood on.
* **Builder / pig:** never in a castle; a builder cannot even be in a small city.
* **Tower:** a castle may cover a cap with a foundation; the tower keeps working.
* **Farmers:** a castle separates fields exactly like the small city did.

### 5.7 End of game

* "Entferne alle Meeple, die am Spielende noch auf einer Burg stehen, vor der Schlusswertung": castellans go home
  first – 0 points, no fairy +3.
* "Eine Burg auf der Wiese zählt für die Bauernwertung 4 Punkte": every castle bordering a field, scored or not, is
  worth **4** to that field's winner (3 for a normal completed city), **5** to a winning farmer owner with a pig.

---

## 6. Bazaars

### 6.1 When

* After the **complete** part in which a drawn bazaar tile was placed: placement, follower, dragon, castles,
  scoring (RB-DE3 p.4–5).
* A bazaar tile that is discarded (unplaceable, or thrown away because it only fitted with a bridge) holds no
  bazaar (OC 10/2014).
* **No chain reaction:** a bought bazaar tile, and any bazaar placed while a bazaar round is running (a replacement
  draw, a builder part 2 inside the round), does nothing and is not delayed (RB-DE3 p.5; OC 2/2021).
* A bazaar tile drawn as a builder part 2 outside a bazaar round: the auction follows that part.
* **Too few tiles:** "Skip this step if there are fewer tiles remaining than there are players" (RB-EN3 p.5; the
  German is silent; RGG and JCZ agree). We count **drawable** tiles: with The Princess & the Dragon, dragon tiles in
  the stack do not count while the dragon is not yet in play (they would be set aside). With exactly as many tiles
  as players, all are auctioned and the game ends after the bazaar round.

### 6.2 Reveal

* Turn up one tile per player (the host gets one too), taken from the top of the stack in order.
* A dragon tile revealed while the dragon is not in play is set aside (P&D rule) and the next tile is revealed.
* Nobody checks placeability at the reveal; a tile that fits nowhere is handled when it is played (§6.5). The app
  marks such tiles "fits nowhere right now" so nobody pays for them by accident.

### 6.3 The auction

1. The player **left of the host** chooses one of the revealed tiles and opens with a bid of 0 or more.
2. One bidding lap: each **other** player who has no tile yet, clockwise from the chooser, raises (strictly higher)
   or passes, once.
3. The chooser then **buys** (pays the high bid to the high bidder and takes the tile) or **sells** (the high bidder
   pays the chooser and takes the tile). If nobody raised, the chooser pays his own bid to the bank and takes it.
4. Whoever has a tile is out of this bazaar. The **next chooser** is the next player clockwise after the previous
   chooser who has no tile yet ("Nun ist im Uhrzeigersinn der Nächste an der Reihe, der noch kein Plättchen bekommen
   hat"; WikiCarpedia "next player clockwise from the previous auctioneer"; JCZ). After a sale the chooser still has
   no tile but the turn to choose moves on; RB-EN3's "from the previous buyer" is a translation slip.
5. The **last** player without a tile takes the last tile **free**.

Bids are whole points and may be **higher than your score**; scores may go below zero ("Du darfst auch mehr Punkte
bieten, als du bisher gesammelt hast"). There is no upper limit in the rules; the app caps a bid at 99. Nothing else
happens during an auction (no ransom). Points paid and received go to the score breakdown "bazaar".

**Rulebook example (3 players: you, Blue on your left, Black).** Blue picks a tile and bids 2; Black passes; you bid
3; Blue buys and pays you 3. Black picks the next tile and bids 2; you bid 3; Black sells: you pay Black 3 and take
it. Black gets the last tile free. Blue plays first, then Black, then you.

### 6.4 The bazaar round

* Everyone now has one tile. Starting with the **host's left neighbour** and ending with the **host**, each player
  takes a **full normal turn** with their tile, drawing nothing ("Es beginnt der Spieler nach dem Spieler, der das
  Basarplättchen gelegt hat"). The English "starting with the first buyer" is a slip.
* "A normal turn, with everything in it a normal turn allows" (C. Tisch): the fairy's +1 at its start, a ransom,
  a bridge, the follower step with every expansion action, a dragon flight at once when a dragon tile is placed
  (movers start with that player, then the round goes on), castle decisions, scoring, and a **builder double turn**
  – its part 2 is drawn from the stack at once, before the next player's bazaar turn. The host can thus collect the
  fairy's +1 twice in a row (own turn, then bazaar turn).
* Afterwards normal play resumes with the **host's left neighbour**: the bazaar round replaces nobody's turn.

### 6.5 Builder part 2, unplaceable tiles, game end

* **Host's builder.** "Wenn du das Basar-Plättchen legst und damit deine Straße oder Stadt mit deinem Baumeister
  erweiterst, ziehst du nach Ende der Basar-Runde dein zweites Plättchen" (RB-DE3 p.6): auction → bazaar round → the
  host's part 2. That part 2 belongs to the host's original turn (no new fairy +1; a ransom only if the host did
  not pay one in part 1). A bazaar drawn in it is held after it. JCZ and the 2013 CAR text play part 2 first (HiG
  accepted that as an alternative in 2016); we follow the 3rd-edition rulebook.
* **Unplaceable bought tile** (no official rule): removed from the game; the player draws from the stack under the
  normal rules (set-aside, discard); if nothing can be drawn that bazaar turn is skipped (no fairy +1). Points paid
  are not refunded. A bought tile that fits only with a bridge may be thrown away the same way.
* **Game end:** the game never ends inside a bazaar round – a draw that fails there only skips a part 2 or a
  replacement. It ends when, after the round, the host's part 2 or the next normal turn finds no tile.

### 6.6 Variant without bidding (official, optional)

"Basarvariante ohne Bieten": reveal the same number of tiles; starting with the host's left neighbour each player in
turn **takes one and plays it at once** as a normal turn; the host takes the last one. Then play resumes normally.
App option `bcb.auction = false`.

---

## 7. Interactions with the base game and the other expansions

| Expansion | Rulings |
|---|---|
| **Base** | Bridges cross printed roads without meeting them; all one-edge caps form small cities; 3rd-edition garden tiles may be bridged. |
| **River** | Bridge ends never on river edges; bridges may cross the river (`RI/s`, `RI.1/IFI`, `RI.1/I.e`) and are allowed in the river phase; the river still splits fields. River caps form small cities. No bazaar can occur in the river phase. |
| **Abbot** | Abbot never on a bridge or castle. Gardens trigger castles like monasteries (own tile in the area; empty gardens count 9). A recall never triggers. Bridges over gardens/monasteries keep the abbot or monk there. |
| **Inns & Cathedrals** | Large meeple on bridges and as castellan (scores once). Inn/cathedral bonuses count for castle values. Inns reach bridges only by connection; BCB's inns count only with I&C. 6 players: 2 + 2 pieces, 6 tiles at a bazaar. |
| **Traders & Builders** | Builder on this tile's bridge (with your meeple in the road), never in a castle or small city. A bridge that brings the tile into your builder's road triggers the double turn. Castle = 5 to a winning pig owner. Host's part 2 after the bazaar round; bought tiles may trigger part 2 at once; bazaars drawn in the round ignored. Goods moot. |
| **Princess & Dragon** | Dragon eats figures on bridges, never castellans/bridges/castles; flies at once in the bazaar round. Princess can't touch castellans; removal and flight come before the castle decision. Portal onto bridges elsewhere, never a castle. Fairy by a castellan: +1/turn, +3 on castle scoring, stays with a converted knight. Reveal sets dragon tiles aside before the dragon arrives; a volcano in the round reinserts them. Bridges allowed on volcano/dragon tiles (no figure on them). |
| **Tower** | Figures on bridges can be captured; castellans, bridges and castles never. Bridge and tower may share a tile; a castle may cover a foundation. Ransom never during an auction, allowed in your bazaar turn, needs ≥ 3 points. Tower actions in bazaar turns. |

Triple combinations worth testing: **T&B × P&D × BCB** (bazaar tile extends the builder → auction → round with a
dragon tile → host's part 2 with a second bazaar); **Abbot × P&D × BCB** (fairy by a castellan, then an empty garden
completes in the area: castle 9 + fairy 3); **I&C × T&B × BCB** (large castellan; pig and castle 5).

---

## 8. Edge cases

| # | Case | Ruling |
|---|---|---|
| E1 | Tile fits only with a bridge; player doesn't want one | Throw it away, draw again |
| E2 | Bridge end facing an existing tile | Only against a road, only possible for a bridge on the new tile |
| E3 | A second mismatch (other side, city, river) | Never fixable |
| E4 | Road over the bridge and along the printed road of one tile | Tile counts once |
| E5 | Second, crossing bridge | Not allowed |
| E6 | Figure on a bridge built next door | Not allowed (portal later: yes) |
| E7 | Bridge joins your new road to an occupied road | No figure on that road this turn |
| E8 | Inn on a bridged tile | Only via connection to the printed inn road |
| E9 | Bridge on a neighbour finishing a road | Impossible (far end open) |
| E10 | Bridge on a volcano tile or the dragon's tile | Allowed; no figure on it |
| E11 | Pointed/wedge/band cap in a 2-tile city | No castle; scores 4 |
| E12 | Small city completed by an opponent | Knight's owner decides |
| E13 | Owner has no castle | Scores 4 |
| E14 | Knight removed (princess, capture, dragon) before step 6 | No castle |
| E15 | Unoccupied small city completed in a castle's area | Completed city worth 4: triggers |
| E16 | Small city converted in a castle's area | Not completed: no trigger |
| E17 | Feature completed by the tile that built the castle | No trigger |
| E18 | Castle from part 1, completion in part 2 / a bazaar turn | Triggers |
| E19 | Empty monastery/garden completed in the area | Triggers at 9 |
| E20 | Monastery outside the area with neighbours inside | No trigger |
| E21 | Abbot recalled from a monastery in the area | No trigger |
| E22 | Inn road / cathedral city triggers | Castle gets the bonus value |
| E23 | Two features finish at once in an area | Castle takes the higher |
| E24 | Waiting castle at game end | Castellan home, 0; still 4 for farmers |
| E25 | Bazaar tile discarded | No bazaar |
| E26 | Fewer drawable tiles than players | No bazaar |
| E27 | Dragon tile revealed before the first volcano | Set aside, replaced |
| E28 | Bazaar placed in a bazaar round (bought, replacement, builder part 2) | Ignored |
| E29 | Host's bazaar tile triggered the builder | Round first, then part 2 |
| E30 | Bought tile triggers its owner's builder | Part 2 drawn at once; empty stack → none |
| E31 | Dragon tile in the bazaar round | Flies at once, then the round continues |
| E32 | Bought tile unplaceable | Removed; draw; empty → turn skipped; no refund |
| E33 | Bid above your score | Allowed; scores go negative |
| E34 | Only the chooser bid | He pays the bank |
| E35 | Ransom with < 3 points (or negative) | Not allowed; never during an auction |
| E36 | Stack runs out during a bazaar round | The round finishes; then the game ends |

---

## 9. The researchers' open questions, settled

| Question | Ruling | Why |
|---|---|---|
| Castle built in builder part 1 scoring in part 2 | **Yes** (from the next tile placement on). | WikiCarpedia "later round of scoring", JCZ; per-part scoring as in MASTER §A.3; avoids the on/off oddity around a bazaar round; simplest: "not from the tile that built it". |
| Fairy +1 / ransom in each bazaar-round turn | **Yes**, each bazaar turn is a full turn (host may get +1 twice). Host's part 2 after the round: no +1; ransom only if unused in part 1. | RB "normal turn"; C. Tisch "everything a normal turn allows"; JCZ. |
| Next chooser after a sale | Next clockwise after the **previous chooser** who has no tile. | RB-DE3 literal reading; WikiCarpedia fn 26; JCZ; EN3 "previous buyer" is one of several slips in that paragraph. |
| Bazaar round vs builder part 2 | **Bazaar round first.** | RB-DE3 p.6 (3rd-edition text beats the 2016 "valid alternative"); WikiCarpedia FAQ. |
| Gardens trigger castles | **Yes**, like monasteries. | WikiCarpedia table, JCZ; gardens score like monasteries everywhere in MASTER. |
| Empty monasteries trigger | **Yes**, at 9 (also empty gardens). | RB-DE3 p.4 "für das niemand sonst Punkte bekommt". |
| Bridges over rivers / in the river phase | **Both allowed.** | RB-DE3 only requires field ends; RB-EN1 caption; JCZ; no exception in any rule. |
| Optional bridge on a neighbour starting a new road | **Allowed.** | RB-DE3 p.1; OC\* BGG 542577; S-CAR fn 356. |
| "Fits only with a bridge" | **Placeable**; the player may throw it away and draw again; without bridges it is unplaceable. | OC 10/2014; JCZ. |
| Unplaceable bought tile | Removed; draw from the stack; skip if empty; no refund. | JCZ; the base rule for unplaceable tiles. |
| Tie for a 2-cap city / owner without castles | Ties cannot occur (≤ 1 follower); the engine offers a castle only with exactly one follower. No castle → scores 4. | RB-DE3 p.3; JCZ. |
| What the castellan is | A figure on the castle, outside `tile.pieces`; safe from dragon, tower, princess, portal; fairy may join it. | RB-DE3 p.6; P&D; Tower. |
| Castle for farmers | 4 per field, 5 for a winning pig owner, scored or not. | RB-DE3 p.4, p.6. |
| Castle chains | Scored castle with a tile in another castle's area triggers it; same value; best value if several. | RB-DE3 p.4; WikiCarpedia fn 20; JCZ. |
| "In the area" | Road/city: any tile; monastery/garden: own tile; castle: one of its 2 tiles. | RB-DE3 p.3–4. |
| Bidding limits | Above your score allowed, negative scores allowed; app cap 99. Ransom still needs ≥ 3. | RB-DE3 p.5; Tower p.3. |
| Fewer tiles than players | No auction (drawable tiles). | RB-EN3 p.5; RGG; JCZ. |
| Dragon tiles at a bazaar before the dragon | Set aside, replaced. | P&D p.2; MASTER B22. |
| Volcano / dragon tile in the bazaar round | Dragon jumps / flies at once; then the round continues. | RB-DE3 p.6; MASTER §A.2. |
| Bazaar tile in part 2 / in the round | Part 2 outside a round: auction after it. Inside a round: ignored. | RB-DE3 p.5; OC 2/2021; WikiCarpedia FAQ. |
| Game end during / after a bazaar round | Never during; after the round when no tile can be drawn. | Derived (every player holds a tile during the round). |
| Builder in a small city that becomes a castle | Cannot happen. | Builder needs an unfinished feature on the new tile. |
| Bridge after the follower | Not allowed. | RB-DE3 step order; JCZ. |
| Bridges in a double turn | One per tile placement. | RB-DE3 wording; JCZ. |

---

## 10. Edition differences

* **1st edition** (HiG 2010, *Burgen, Brücken und Basare*): same pieces and rules; the 3rd edition orders them by
  turn step, says "only 1 bridge per tile", removes castle meeples before final scoring explicitly, allows bids
  above your score, adds the page on other expansions, and gives `BB/CFR!` a garden (`BB/CFR!G`).
* **Z-Man English 2013** (1st-edition text) errors: "Bazaar (12 tiles)", "may not bid more points than he has",
  "two city end segments".
* **Z-Man/HiG English 2018** slips (not adopted): small city "only 2 tiles", no "later turn", no knight on the
  castle, "you decide what order they are scored", "previous buyer", "first buyer", builder "completes". It adds the
  too-few-tiles rule (adopted).
* **Fairy in a castle:** allowed (Big Box 3), forbidden (late 1st-edition clarification), allowed again (3rd ed.).
* **Builder and bazaar:** CAR 5/2013 and JCZ play part 2 first; the 3rd-edition rulebook plays the bazaar round
  first (adopted).
* ***Castles & Bridges*** (HiG 2025) is a different expansion and is not implemented.

---

## 11. Tiles and data flags

* The 12 tiles are listed and verified in `bcb-tiles.md` and carried unchanged into the JSON twin (with
  `layout_hint` and `refs`). `node dev/build-expansions.mjs bridges-castles-bazaars` converts them without errors
  into `public/js/data/bridges.js` (11 types, 12 tiles).
* `castle_base: false` (→ `noCastle: true`) must be set on three city features in our data:
  * `BB/CFR!G` feature 0 (done in the JSON twin);
  * `IC/C!` feature 0 (`inns-cathedrals.json` / `public/js/data/inns.js`);
  * `DG/CCc+.p` feature 0 (`princess-dragon.json` / `public/js/data/dragon.js`).
* Inn flags on `BB/R.bi` (road 0) and `BB/RFR.bi` (road 1, south) apply only with Inns & Cathedrals (MASTER H.2:
  `tile.noInn`).

---

## 12. Kid rules text

> **Bridges, Castles & Bazaars**
>
> **Bridges.** You have 3 bridges (2 with 5 or 6 players). When you place a tile you may build ONE bridge, on your
> new tile or on a tile right next to it. It goes straight across, side to opposite side, and both ends must stand
> on grass – never on a city, road or river. In between it can cross anything. A bridge is a road worth 1 point per
> tile, and it never cuts a field or a city in two. A bridge can rescue a tile: your tile's road may run into grass
> if your bridge carries it on. A tile that only fits with a bridge may also be thrown away. Your meeple may stand on
> a bridge on your new tile.
>
> **Castles.** When a tile finishes a tiny city of two half-round pieces, the player whose knight is in it chooses:
> 4 points, or build a castle there. The knight climbs onto the castle, which watches 6 squares: its two tiles and
> the two beside each. On a LATER tile, the first road, city, monastery or garden finished there (a monastery or
> garden must sit on one of the squares) gives the castle's owner the same points – even if nobody owned it! Then
> the knight comes home. If several finish at once, the castle takes the best, and a scoring castle can set off its
> neighbour. Castles still waiting at the end score nothing, but every castle is worth 4 to farmers.
>
> **Bazaars.** After a turn with a bazaar, turn over one tile per player. Starting on the left, a player picks a
> tile and bids (0 is fine). Everyone else without a tile may raise once. Then the picker buys it (paying the top
> bidder) or sells it (the top bidder pays the picker). Scores can even drop below zero! The last tile is free.
> Then everyone plays their tile as a normal turn, starting on the bazaar player's left.

---

## 13. Figures for the in-app rules page

`renderMini` needs two extras for these (MASTER H.4): tiles may carry a `bridge` axis, and `extras` gain
`{ kind: 'bridge', x, y, axis }` (or the tile field) and `{ kind: 'castle', a: [x, y], b: [x, y], top: colour }`.

1. **Bridge on the new tile:** `[-1,0,'U',1,['blue',0]]`, `[0,0,'F',1]` with bridge axis 1, `[1,0,'U',1]` – "Blue's
   road meets a meadow: the new tile carries it over the city with a bridge."
2. **Bridge next door:** `[0,0,'F',1]` with bridge axis 1, new `[-1,0,'U',1,['red',0]]`, nothing at `[1,0]` – "The
   bridge goes on the tile next to yours; its far end must face an empty square."
3. **Not allowed:** `U` with a north–south bridge (ends on the road) ✗; a bridge end against an existing meadow ✗.
4. **Bridges in a row** over a monastery with a monk and over a garden (RB-DE3 p.2 figure 4).
5. **Road scoring:** a 6-tile road with 2 bridges between two crossroads = 6 points.
6. **Fields join under a bridge:** the meadows north and south of the road that ends at the bridge, one highlight.
7. **Building a castle:** `[0,0,'E',2,['red',0]]`, `[0,1,'E',0]`, castle between them with the red meeple on top;
   inset: `BB/CFR!G` crossed out ("pointed cities can't become castles").
8. **Castle area:** 2×3 grid numbered 1–6, castle across 2/5, square 4 empty; ticks on the monastery and road on 1,
   the city at the top of 3, the city on the right of 6; cross on a monastery just outside the area.
9. **Castle scoring:** Blue closes a 16-point city touching square 6 → castle owner +16, castellan home.
10. **Chain:** two waiting castles side by side, one completion scores both.
11. **Bazaar:** the revealed tiles in a row; chooser, bids, buy/sell, last tile free; arrows for the playing order
    starting left of the host (3-player example).
12. **End of game:** a castellan lifted off ("0"); a farm next to a castle and a city: 4 + 3.

---

## 14. Sources

* **RB-DE3** *Brücken, Burgen und Basare*, HiG © 2010, 2017 (6 pp.): <https://cundco.de/media/2a/e7/7d/1715104329/cc-2-1-8-erw-de.pdf>
* **RB-EN3** *Bridges, Castles and Bazaars*, Z-Man/HiG © 2010, 2018: <https://www.hans-im-glueck.de/wp-content/uploads/2023/07/carcassonne_exp8_rules.pdf>
* **RB-DE1 / RB-EN1** 1st edition (2010 / Z-Man 2013): <https://cundco.de/media/5f/a0/fe/1715104326/cc-1-0-8-erw-de.pdf>,
  <http://upload.snakesandlattes.com/rules/c/CarcassonneExp8BridgesCastlesandBazaars.pdf>
* **P&D EN 2016** (p.3 diet plan, p.6 Exp. 8) and **Tower EN 2017** (p.3 ransom, p.4 figure table, Exp. 8) – as in MASTER.
* **WikiCarpedia** *Bridges, Castles and Bazaars* (C2), fetched 2026-10-17: <https://wikicarpedia.com/car/Bridges,_Castles_and_Bazaars>
  (official 10/2014, 12/2014, 7/2010, 1/2021, 2/2021, builder/bazaar FAQ; community fn 13, 18, 20, 21, 26 and the trigger table).
* **S-CAR v7.3** (Dec 2014), BCB pp. 111–119, order of play pp. 204–208: <https://www.dover.nh.gov/Assets/government/city-operations/library/borrow/library-of-things/carcassonne-rules.pdf>
* **BoardGameGeek** threads 538079, 542577, 569109, 498317, 570930 (Christof Tisch, HiG) and the community threads listed in `bcb-interactions.md`.
* **JCloisterZone** @ `29a1561` (`BridgeCapability`, `PlacementsMixin`, `CastleCapability`, `CastlePhase`, `Castle`,
  `ScoringPhase`, `ScoreCastle`, `BazaarPhase`, `FinalScoring`) and JCloisterZone-Client tile XML (`castle-base="false"`).
* Verification (throwaway, session scratchpad): `master/probe-bridges.mjs` (bridge claims over 60 random games),
  `master/time-ai.mjs` (AI timing).
