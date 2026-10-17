# Traders & Builders (Carcassonne expansion 2) – rules spec, 3rd edition

Slug `traders-builders` · machine-readable data: [`traders-builders.json`](traders-builders.json).

This spec follows the **3rd-edition rulebook** (Hans im Glück / Z-Man Games, © 2003/2015, the edition whose tiles
carry gardens), clarified by the Hans im Glück "Big Box" rules as annotated in the S-CAR v7.3, and by the official
"rules for combining expansions" pages of the 3rd-edition *Princess & the Dragon* and *Tower* rulebooks.
JCloisterZone (JCZ) provides the exact tile geometry and served as a reference implementation. Sources are listed at the end;
page numbers refer to those PDFs.

## 1. What the expansion adds

| Component | Amount | Notes |
|---|---|---|
| Land tiles | 24 | 9 with **wine**, 6 with **grain**, 5 with **cloth**, 4 without goods. 2 tiles show a **garden** (3rd edition). No tile has a pennant. Expansion mark: small pig silhouette. |
| Builder | 1 per player (6 colours) | Special figure, **not a meeple**. Gives double turns. |
| Pig | 1 per player (6 colours) | Special figure, **not a meeple**. +1 point per completed city in its field at the end. |
| Goods tokens | 20: 9 wine, 6 grain, 5 cloth | General supply, one token per printed symbol. Kept face up. |
| Cloth bag | 1 | Optional tile bag, no rules effect. |

## 2. Setup

- Shuffle the 24 Traders & Builders tiles into the land tiles (start tile and river setup unchanged).
- Each player takes the builder and the pig of their colour into their personal supply (in addition to their 7 meeples and any other expansion figures). Builders/pigs exist in 6 colours, but a 6th player still needs Inns & Cathedrals for meeples.
- Put the 20 goods tokens (9 wine, 6 grain, 5 cloth) in a general supply. Collected tokens are kept face up (public information).
- If the game is played WITHOUT farmers (app option), the pig has no use: leave the pigs out.

## 3. Turn sequence (where the expansion hooks in)

1. Start of turn: other expansions' start-of-turn effects (P&D fairy point) happen once per turn - never again before the builder's second tile.
2. STEP 1 - Draw and place a tile (normal rules). Double-turn check, right after placement: if this is the FIRST tile of your turn and it continues (extends, joins or completes) a road or city that already contains YOUR builder, you have earned one extra tile this turn. The check uses the board at the moment of placement, so the bonus stands even if your builder later leaves during this tile's steps. Resolve the tile's own symbols as usual (volcano, dragon, princess, portal...).
3. STEP 2 - Figure action: exactly ONE of: place a meeple (normal, large, abbot where allowed) on the tile; OR place your BUILDER on a road or city segment of this tile whose road/city already contains at least one of your meeples; OR place your PIG on a field segment of this tile whose field already contains at least one of your farmers; OR another expansion's alternative (recall abbot, move fairy, place tower floor / meeple on tower). Princess knight removal or a volcano tile forbid builder and pig like any other figure.
4. (P&D) Dragon tile: the dragon moves now, after step 2 and before scoring; it also eats builders and pigs.
5. STEP 3 - Score all features completed by this tile. For each completed city: score it for the knights as usual, THEN the active player (who placed the completing tile) takes 1 goods token per goods symbol in the whole city. Meeples in scored features return, and every builder standing in a scored road/city returns with them.
6. Continuous check (after scoring, dragon, princess, tower capture...): any builder or pig whose owner has no meeple left in that same road/city/field goes back to its owner's supply immediately.
7. SECOND TILE: if a double turn was earned in step 1 (optional - the player may decline) and tiles remain, draw another tile and play steps 1-3 again for it (place it anywhere legal, one figure action, scoring). The second tile can never earn a further tile, even if it extends the builder's road/city again. Then the turn ends.

Implementation sketch: keep `turnPart` (1 or 2) and a flag `builderBonus` per turn. Set the flag in part 1 directly after
the tile is placed if the placed tile now belongs to a road or city that contains the active player's builder (look the
builder up *before* the figure action of this tile, so a builder placed on this very tile does not count). After part 1's
scoring, if the flag is set and the deck is not empty, start part 2 for the same player without the start-of-turn effects;
part 2 never sets the flag.

## 4. The builder

**Placement (step 2, instead of a meeple).** Put the builder on the tile you have just placed, on a **road or city**
segment, and only if that road/city already contains **at least one of your meeples** (Z-Man T&B p.3). Other players'
meeples and builders may be there as well; any number of tiles may separate builder and meeple; never on fields,
monasteries or gardens (p.5).

**Double turn (step 1 of a later turn).** Whenever **you** place a tile that continues (extends, joins or completes) the
road or city occupied by your builder, you may draw and place another tile (p.4). Both tiles get the full sequence
"place tile – place a figure – score" (p.5). Only one extra tile per turn: "No chain reactions are possible. If you place
the second tile on the road with your builder, you do not get to draw a third tile" (p.4). The extra tile may go anywhere.

**Leaving the board.** "Your builder is always returned to your supply if you no longer have meeples on that feature.
This usually occurs after scoring, but some expansions introduce other ways in which this can happen" (p.3). So it
returns (a) together with the meeples when its road/city is scored, or (b) immediately when your last meeple there is
eaten by the dragon, removed by the princess or captured by a tower. Until then it stays and keeps giving double turns
"the first time you add a tile to that road each turn" (p.5).

**Scoring.** "Builders are never taken into consideration when determining who has the most meeples in a feature" (p.5).

Rulebook example (p.4): turn 1 place a highwayman; turn 2 extend the road and place the builder; turn 3a complete the road
with a tile on which you also place a knight – the road is scored, highwayman and builder come back; turn 3b draw the
second tile, continue the knight's city and place the builder there.

## 5. The pig

**Placement (step 2, instead of a meeple).** On the tile you have just placed, in a **field that already contains one of
your farmers** (Z-Man T&B p.5; "just-placed tile": S-CAR p.38, RGG 2003). Other farmers and pigs may be there. It stays until the end of the game (p.6); it only
returns early if you lose your last farmer in that field (dragon, tower – P&D p.6, S-CAR p.38/p.70).

**Final scoring.** "For your pig to be worth any points, you must have the most meeples in that field. Unfortunately, the
pig itself is not counted for majority. If you have majority in the field with your pig, you score 4 points (instead of 3)
for each completed city that borders that field. Pigs belonging to other players have no impact on your scoring" (p.6).
A shared majority counts as majority (p.6).

## 6. Trade goods

**When a city is completed** (Z-Man T&B p.2): "1.) You score the city as usual. 2.) Then, you give the player who
completed the city by placing the last tile the depicted Goods … This player receives one Goods token from the supply
for each corresponding symbol in the city. Important: It does not matter if the player who placed the last tile had any
knights in the city, or if any knights were present in the city."

**Final scoring** (p.3): for each type (wine, grain, cloth) the player with the most tokens scores 10 points; tied players
each score 10. Nobody scores a type that nobody collected (a player needs at least one token; JCZ behaviour).

## 7. Builder and pig are not followers

Since the Hans im Glück Big Box rules and the 3rd edition, builder and pig are *special figures*:

| | Builder | Pig |
|---|---|---|
| Placed on | road or city of the tile just placed, where you already have a meeple | field of the tile just placed, where you already have a farmer |
| Counts for majority | no | no |
| Returns | when its feature is scored, or when you have no meeple left in it | end of game; earlier only if you have no farmer left in its field |
| Eaten by the dragon | yes | yes |
| Captured by a tower / placed on a tower | no / no | no / no |
| Removed by the princess | not directly (returns if your last knight there is removed) | – |
| Via magic portal | no | no |
| Fairy can be assigned to it | no | no |
| Placed on a volcano tile | no | no |

- Builder and pig are "special figures", NOT meeples/followers (3rd edition and Hans im Glueck Big Box rules).
- They never count when determining who has the most meeples in a road, city or field.
- They never stand alone: a builder always shares its road/city with a meeple of the same player, a pig shares its field with a farmer of the same player. So occupation (who may place a meeple where) is decided by meeples only.
- Large meeple (Inns & Cathedrals) is a meeple: it can be the supporting knight/highwayman for a builder or the supporting farmer for a pig, and counts 2 for majorities (including the pig's field majority).
- Abbot is a meeple but can only stand on a monastery or garden, so it can never support a builder or pig.
- Builders/pigs cannot be captured by towers, removed by the princess, placed through the magic portal, placed on a tower, or have the fairy assigned to them. The dragon does eat them.

## 8. Scoring summary

**During the game**

- Completed city with goods symbols: score the city normally (2 points per tile and per pennant; T&B tiles have no pennants). Then the player who placed the tile that completed the city receives one goods token of the matching type for EACH goods symbol in the whole city. That player does not need a knight in the city and the city may even be empty.
- If one tile completes several cities, the active player receives the goods of each. Cities completed by the second tile of a double turn award goods to the same active player.
- Goods symbols: every goods tile has exactly one symbol, printed on one city segment (see tiles[].features goods). The token supply (9/6/5) equals the symbols, so it can never run out.
- Builders score nothing. When a road/city containing a builder is scored, the builder returns to its owner together with the meeples.
- In a double turn, features are scored after each tile (two separate scoring steps).

**End of the game**

- Incomplete roads, cities, monasteries and gardens score as in the base game; builders in them add nothing and simply leave the board.
- Fields: the player(s) with the most farmers in a field (large meeple = 2, pigs ignored, ties all win) score 3 points per completed city bordering the field. A winning player who also has their pig in that field scores 4 points per completed city instead (+1 per city). Other players' pigs never change your score; a pig in a field its owner does not win scores nothing.
- Goods: for each type (wine, grain, cloth) separately, the player with the most tokens scores 10 points; if several players tie for the most, each of them scores 10. A player with 0 tokens of a type cannot win it (if nobody collected that type, nobody scores it - JCZ implementation). One player may win all three types (30 points).
- Order of final scoring has no effect on the result; suggested display order: roads, cities, monasteries/gardens, fields (with pig bonus), then the three goods majorities.

## 9. Edge cases and clarifications

1. Only your own tile triggers your builder: an opponent extending the road/city with your builder gives you nothing (Z-Man T&B p.4: "If you place a Land tile that continues the road or city your builder occupies").
2. At most one extra tile per turn and only the first tile can trigger it; "no chain reactions" - if the second tile extends the builder's road/city again there is no third tile (Z-Man T&B p.4).
3. If the first tile COMPLETES the builder's road/city you still get the second tile; the feature is scored, meeple and builder return, and you may place the builder again on the second tile, e.g. into the city where you placed a knight on the first tile (Z-Man T&B p.4, example 3a/3b).
4. The second tile is drawn only after the first tile's figure action and scoring are complete; it may be placed anywhere, it does not have to touch the first tile (Z-Man T&B p.4-5; RGG 2003 "The 2nd tile need not be placed adjacent to the first tile"; S-CAR p.36 fn.59).
5. You may place a figure (meeple, builder or pig) on both tiles of a double turn (Z-Man T&B p.4).
6. A meeple placed on the first tile of a double turn may already support a builder placed on the second tile (Z-Man T&B example 3b).
7. Joining roads/cities counts as extending: if your tile connects the builder's road with another road, the new tile is part of the builder's road, so the double turn triggers (rule text "continues the road your builder occupies"; JCZ checks the merged feature).
8. Several builders of different players may stand in the same road/city; there may be any number of tiles between your builder and your meeple (Z-Man T&B p.5).
9. The builder may go on a road, later on a city, and so on, but never on a monastery or field (Z-Man T&B p.5).
10. The double turn is optional ("you may") (Z-Man T&B p.4; S-CAR p.36 fn.58). The AI should always take it.
11. Happens only ONCE per turn even with a double turn: fairy start-of-turn point (P&D), prisoner buy-back (Tower). Happens for EACH tile: tile placement, resolving the tile's symbols (dragon movement, volcano, princess, portal), figure action, scoring, automatic prisoner exchange (S-CAR p.39 double-turn table; Z-Man P&D p.6).
12. A builder or pig returns as soon as its owner has no meeple left in its road/city/field, for any reason: scoring, dragon, princess, tower capture (Z-Man T&B p.3 and p.5; Z-Man P&D p.6; S-CAR pp.37, 38, 57, 60, 70).
13. If your builder leaves the board during the same tile's steps (e.g. the princess on that tile removes your only knight in the builder's city, or the dragon eats your only highwayman), the double turn earned by placing that tile still stands: the trigger is the tile placement (interpretation; JCZ awards it at placement).
14. Goods go to the completing player even without knights, or when no knight at all is in the city; the city points go to the knight majority as usual (Z-Man T&B p.2).
15. Goods ties: every tied player scores the full 10 points (Z-Man T&B p.3).
16. Pig: a tie for most farmers counts as having the majority (Z-Man T&B p.6). If its owner later loses the majority the pig stays but scores nothing; if its owner loses the last farmer there, the pig returns to supply.
17. You cannot place a builder/pig where you have no meeple/farmer, even if another player's builder or pig is there.
18. Volcano tile (P&D): no builder or pig may be placed on it. Current HiG rules: no figure except the dragon; current RGG/Z-Man rules: no follower, builder or pig (S-CAR p.55 fn.133-134 and p.212 table; Z-Man P&D p.2 "you may not place a meeple on a Volcano tile").
19. If the tile supply is empty when the second tile would be drawn, there is no second tile and the game ends normally. An unplaceable second tile is discarded and replaced as in the base game.
20. Tiles with several city segments carry the goods symbol only on the segment listed with "goods" (the corner/band city), never on the small extra caps.
21. Special tiles (Z-Man T&B p.1-2): the bridge TB/RRrr is not a junction (2 roads, 4 fields); on TB/RRC one road ends at the city, the other at a small cottage (not an inn) - 3 fields; the monastery TB/LRRR splits roads and fields into 3 each; TB/CcCC.c has 3 city segments and a real field in the middle that can take a farmer.
22. "Pointed" cities (JCZ ids with "!": TB/CcRR!.c, TB/CcR!.w, TB/RCc!.g): the city wall reaches the SE corner, so the fields on the E side and on the S side are separate fields (they are not connected around the corner).

## 10. Interactions with the other expansions in scope

**Base game**

- Builder and pig follow the normal "only on the tile just placed" rule and replace the meeple placement for that tile.
- Majorities for roads, cities and fields ignore builders and pigs.
- Fields score 3 per completed city; the pig makes it 4 for its owner when that owner wins the field.
- Playing without farmers (app option): pigs are unusable; goods and builder work normally.
- Player count stays 2-5 unless Inns & Cathedrals adds the 6th colour (T&B includes builders and pigs for 6 colours).

**River**

- No special rules. Roads, cities and fields on river tiles take builders and pigs normally (never on the river itself); the river separates fields, so a pig only works in its own field.
- A double turn earned while river tiles are still being drawn takes the next tile from the river stack, because river tiles are drawn until the river is finished (logical consequence of both rules; no explicit official ruling found).
- T&B tiles are only drawn after the river is complete, so goods/pointed cities do not affect river placement.

**Abbot**

- The abbot (monastery/garden only) can never support a builder or pig; builders and pigs can never be placed on a monastery or garden.
- Recalling the abbot is a step-2 action (only when no meeple/figure is placed): you cannot also place your builder or pig with the same tile. In a double turn each tile has its own step 2 (e.g. builder on tile 1, recall the abbot after tile 2).
- Two 3rd-edition T&B tiles have gardens (TB/CcR.cG, TB/CcRR.wG): the abbot may be placed there; the garden is its own feature inside a field and does not split that field (the field keeps the same halves).

**Inns & Cathedrals**

- The large meeple is a meeple: it can support a builder (as knight or highwayman) or a pig (as farmer) and counts 2 for majority, including the pig's field majority.
- Inns and cathedrals do not change builder, pig or goods rules. A completed cathedral city with goods awards goods normally; an incomplete cathedral city scores 0 at the end and never awards goods (goods only on completion).
- With 6 players the 6th colour (from Inns & Cathedrals) also gets a builder and a pig from T&B.

**Traders & Builders internal**

- Builder and pig are independent: a player may have both on the board at once; each needs its own supporting meeple.
- Goods and builder combine: completing a goods city with your own tile in the second part of a double turn still gives you the goods.

**Princess & Dragon**

- Dragon: eats builders and pigs on every tile it enters (P&D "dragon's menu"). If it eats a player's last knight/highwayman in the road/city holding that player's builder, the builder returns too; if it eats the last farmer in the pig's field, the pig returns (Z-Man P&D p.3, p.6).
- Fairy: protects every figure on its tile, including builders and pigs, from the dragon. It can only be assigned next to a meeple, never to a builder or pig (S-CAR p.53 fn.122).
- Moving the fairy is the step-2 action: no builder or pig with that tile (Z-Man P&D p.6).
- Fairy start-of-turn point is scored once; not again at the start of the builder's second tile (Z-Man P&D p.6).
- Princess: removes knights only, never a builder directly. If she removes a player's last knight in a city where that player has a builder, the builder also returns. If you use the princess to remove a knight, you may not place a builder or pig (or any figure) with that tile (Z-Man P&D p.6).
- Magic portal: may NOT be used to place a builder or pig (Z-Man P&D p.6). They may still go onto the portal tile itself if it has a legal segment.
- Volcano tile: no builder or pig on it (see edge cases). Dragon tile: builder/pig may be placed on it, then the dragon moves and may eat them.
- Each tile of a double turn resolves its own symbols: a dragon tile as the second tile makes the dragon move again; a volcano as either tile moves the dragon there.

**Tower**

- Builders and pigs cannot be captured and cannot be placed on top of a tower (Z-Man Tower p.4).
- If a tower captures a player's last meeple in the road/city with that player's builder (or the last farmer in the pig's field), the builder/pig returns to its owner's supply (S-CAR p.70; Z-Man T&B p.3 "Your builder is always returned to your supply if you no longer have meeples on that feature").
- Placing a tower floor or a meeple on a tower is the step-2 action: no builder or pig with that tile.
- In a double turn you may use step 2 of each tile for tower actions (e.g. a floor with tile 1, close the tower with a meeple with tile 2). Buying back a prisoner is allowed only once per turn; the automatic prisoner exchange happens whenever it applies (S-CAR p.39 double-turn table; Sweeney FAQ).

## 11. Edition differences

- Tiles: the same 24 layouts and goods in every edition (9 wine, 6 grain, 5 cloth, 4 without). The 3rd edition (2014+, art by Anne Paetzke) adds a garden to two tiles: TB/CcR.c becomes TB/CcR.cG and TB/CcRR.w becomes TB/CcRR.wG (JCZ tile-sets traders-and-builders:1 vs :2). No T&B tile has a pennant in any edition.
- Builder and pig were "followers" in the 2003 rules ("12 new followers"): they could be captured by towers, removed by the princess (who then had to remove a knight or builder), used to lock towers, and they stayed on the board (builder still giving double turns) when their supporting meeple was removed. Since the HiG Big Box rules and the 3rd edition they are special figures with all the consequences above (S-CAR p.35 fn.52, p.38 fn.65, p.212 rule-change table; RGG 2003 rules; Sweeney FAQ).
- Pig value: the RGG 2003 English rules used 1st-edition farm scoring (4 per city, 5 with pig); Hans im Glueck and the 3rd edition use 3 per city, 4 with pig.
- Double-turn timing: the original German rule drew the second tile "immediately"; current rules finish the first tile's figure placement and scoring first (S-CAR p.36 fn.59; Z-Man: "During a double turn, you may do the following on each turn: 1. Place a tile, 2. Place a meeple, and 3. Score a feature").
- Trigger wording changed from "completes or extends" to "extends" (only relevant for the Abbey tile from Abbey & Mayor, out of scope; a normal tile that completes the feature also extends it).
- Volcano: all current rule sets forbid builder and pig on a volcano tile (HiG: any figure; RGG/Z-Man: follower, builder or pig - S-CAR p.212 table). S-CAR fn.133 claims builders/pigs could once be placed when a volcano was placed, which its own table contradicts; irrelevant for the 3rd edition.
- Magic portal: current rules explicitly forbid placing a builder or pig through the portal (Z-Man P&D p.6; S-CAR p.59 fn.153 "as they are not followers").
- The cloth bag is in the 2003 and 3rd-edition boxes (not in the Big Box). 3rd-edition tiles carry a small pig silhouette as expansion mark.
- A 2025 redesign ("revised third edition", new art) exists; it is not covered here.

## 12. Tiles

All 24 tiles are 1 copy each (JCZ tile-set `traders-and-builders:2`). Features are generated from the JCZ XML; index numbers
in the table are positions in each tile's `features` array, fields list the half-edges they touch (`NL NR EL ER SL SR WL WR`
as defined in FORMAT.md) and the indexes of the cities they border. Every half-edge of every non-city side belongs to
exactly one field, every port is assigned exactly once, and goods totals are 9 wine / 6 grain / 5 cloth (checked by script).

| # | JCZ id | Name | Cnt | Cities (goods) | Roads | Fields: halves → bordering city idx | Other |
|---|---|---|---|---|---|---|---|
| 1 | `TB/Cc.g` | City corner with grain | 1 | [0] N+W **grain** | - | [1] EL ER SL SR → 0 | - |
| 2 | `TB/Cc.w` | City corner with wine | 1 | [0] N+W **wine** | - | [1] EL ER SL SR → 0 | - |
| 3 | `TB/CCc.c` | City band with cloth and separate south cap | 1 | [0] E+W **cloth**; [1] S | - | [2] NL NR → 0; [3] inner → 0,1 | - |
| 4 | `TB/CCc.w` | City band with wine and separate south cap | 1 | [0] E+W **wine**; [1] S | - | [2] NL NR → 0; [3] inner → 0,1 | - |
| 5 | `TB/Ccc.g` | Three-sided city with grain | 1 | [0] N+E+W **grain** | - | [1] SL SR → 0 | - |
| 6 | `TB/CcCC.c` | Three city segments around an inner field | 1 | [0] N+W **cloth**; [1] S; [2] E | - | [3] inner → 0,1,2 | - |
| 7 | `TB/CcRR!.c` | Pointed city with cloth and two gate roads | 1 | [0] N+W **cloth** | [1] E (ends on tile); [2] S (ends on tile) | [3] EL → 0; [4] ER → 0; [5] SL → 0; [6] SR → 0 | - |
| 8 | `TB/CcRR.wG` | City corner with wine, two roads and garden | 1 | [0] N+W **wine** | [1] E (ends on tile); [2] S (ends on tile) | [4] EL → 0; [5] ER SL → 0; [6] SR → 0 | [3] garden |
| 9 | `TB/CcRC.c` | City corner with cloth, road and separate south cap | 1 | [0] N+W **cloth**; [1] S | [2] E (ends on tile) | [3] EL → 0; [4] ER → 0,1 | - |
| 10 | `TB/CcRC.g` | City corner with grain, road and separate south cap | 1 | [0] N+W **grain**; [1] S | [2] E (ends on tile) | [3] EL → 0; [4] ER → 0,1 | - |
| 11 | `TB/CcR.cG` | City corner with cloth, road and garden | 1 | [0] N+W **cloth** | [1] E (ends on tile) | [3] EL → 0; [4] ER SL SR → 0 | [2] garden |
| 12 | `TB/CcR!.w` | Pointed city with wine and east gate road | 1 | [0] N+W **wine** | [1] E (ends on tile) | [2] EL → 0; [3] ER → 0; [4] SL SR → 0 | - |
| 13 | `TB/CccR.w` | Three-sided city with wine and gate road | 1 | [0] N+E+W **wine** | [1] S (ends on tile) | [2] SL → 0; [3] SR → 0 | - |
| 14 | `TB/CcCc.w` | Two opposite city corners with wine | 1 | [0] N+W **wine**; [1] E+S | - | [2] inner → 0,1 | - |
| 15 | `TB/CFc.w` | City band with wine | 1 | [0] E+W **wine** | - | [1] NL NR → 0; [2] SL SR → 0 | - |
| 16 | `TB/CR` | City cap with road and farmhouse | 1 | [0] N | [1] E (ends on tile) | [2] EL → 0; [3] ER SL SR WL WR → 0 | - |
| 17 | `TB/CRc.g` | City band with grain and gate road | 1 | [0] E+W **grain** | [1] S (ends on tile) | [2] NL NR → 0; [3] SL → 0; [4] SR → 0 | - |
| 18 | `TB/CRc.w` | City band with wine and gate road | 1 | [0] E+W **wine** | [1] S (ends on tile) | [2] NL NR → 0; [3] SL → 0; [4] SR → 0 | - |
| 19 | `TB/CRcR.w` | City band with wine and two gate roads | 1 | [0] E+W **wine** | [1] N (ends on tile); [2] S (ends on tile) | [3] NL → 0; [4] NR → 0; [5] SL → 0; [6] SR → 0 | - |
| 20 | `TB/LRRR` | Monastery with three roads | 1 | - | [0] E (ends on tile); [1] S (ends on tile); [2] W (ends on tile) | [4] NL NR EL WR → -; [5] ER SL → -; [6] SR WL → - | [3] monastery |
| 21 | `TB/RCc.g` | City corner with grain and road to the south | 1 | [0] N+W **grain** | [1] S (ends on tile) | [2] EL ER SL → 0; [3] SR → 0 | - |
| 22 | `TB/RCc!.g` | Pointed city with grain and south gate road | 1 | [0] N+W **grain** | [1] S (ends on tile) | [2] EL ER → 0; [3] SL → 0; [4] SR → 0 | - |
| 23 | `TB/RRC` | City cap, bridge and cottage | 1 | [0] N | [1] S (ends on tile); [2] W (ends on tile) | [3] EL ER SL → 0; [4] SR WL → -; [5] WR → 0 | - |
| 24 | `TB/RRrr` | Road bridge (over- and underpass) | 1 | - | [0] N-S; [1] E-W | [2] NL WR → -; [3] NR EL → -; [4] ER SL → -; [5] SR WL → - | - |

### Unusual shapes to get right

- **Pointed cities** (`!` in the JCZ id: `TB/CcRR!.c`, `TB/CcR!.w`, `TB/RCc!.g`). The city covers the N and W edges and its
  east and south walls both run down to the **SE corner**, so the city touches all four corners and the green on the E side
  is a different field from the green on the S side. Ordinary corner cities (`TB/Cc.*`, `TB/CcR.cG`, `TB/RCc.g`, `TB/CcRR.wG`)
  have one diagonal wall from the NE corner to the SW corner instead.
- **Several city segments on one tile:** `TB/CCc.*` (W–E band + small S cap), `TB/CcRC.*` (NW corner + S cap),
  `TB/CcCC.c` (NW corner + E cap + S cap), `TB/CcCc.w` (NW corner + SE corner). The segments are separate features; the goods
  symbol belongs only to the big segment.
- **Inner fields** that touch no edge (only corner points): `TB/CCc.*` (lens between band and cap), `TB/CcCC.c` (triangle
  between three cities, can hold a farmer), `TB/CcCc.w` (diagonal lens). In the port model they own no ports; adjacency to
  cities still matters for farmers (a farmer there can only ever score these cities).
- **Roads ending at a city gate:** every road on a goods tile, and the road of `TB/CR`, ends at a gate of the city on that
  tile, so it is a road end (1 side). `TB/CRcR.w` has two separate gate roads (north and south) that do not connect through
  the city; `TB/CcRR.wG` and `TB/CcRR!.c` have two separate gate roads (east and south).
- **Monastery with three roads** `TB/LRRR`: the roads end at the monastery – three separate roads, three fields; not a junction.
- **Bridges:** `TB/RRrr` is an over-/underpass (2 roads, 4 fields, no junction). `TB/RRC`: the S road passes under a bridge
  and ends at the city gate, the W road crosses the bridge and ends at a cottage (3 fields).
- **Gardens** (3rd edition): `TB/CcRR.wG` between the two roads, `TB/CcR.cG` in the big south field. The garden sits inside
  the field without splitting it.

### Art notes per tile (north up)

General 3rd-edition look: brown cobbled city ground with orange-roofed houses, beige stone walls with blue conical tower
roofs, green fields, pale grey roads. Goods symbols are white house-shaped plaques with a brown rim, placed inside the city
near the top-left corner (on W–E bands: at the left end of the band). Every tile carries the expansion mark – a small dark
green pig silhouette – somewhere in a field.

- **`TB/Cc.g` – City corner with grain.** Corner city covering the whole N and W edges: its wall is one gently S-curved diagonal from the NE corner to the SW corner, so the city fills the north-west half of the tile (houses, blue-roofed wall towers in the 3rd-edition art). Grain goods symbol (white house-shaped plaque with a golden sheaf of wheat) in the top-left of the city. The south-east half is one plain field touching the whole E and S edges. No road, no gate, no pennant. Same layout as base tile N (city corner) plus the goods symbol.
- **`TB/Cc.w` – City corner with wine.** Identical layout to TB/Cc.g: corner city over the N and W edges with a diagonal wall from the NE corner to the SW corner, wine goods symbol (white house-shaped plaque with a wooden wine barrel) top-left inside the city, one field over the E and S edges. No road, no pennant.
- **`TB/CCc.c` – City band with cloth and separate south cap.** Two separate cities. (1) A city band crossing the tile from the W edge to the E edge (covers both full sides); its north wall runs from the NW corner to the NE corner sagging down into the tile, leaving a lens-shaped field cap along the N edge; its south wall runs from the SW corner to the SE corner arching up through the lower middle of the tile. Cloth goods symbol (white house-shaped plaque with a red bolt of cloth) at the left end of the band. (2) A shallow, separate city cap along the S edge (wall from the SW to the SE corner bulging only slightly north, small gatehouse, no road). Between the band's south wall and the cap's wall lies a thin lens-shaped field that touches no tile edge (its points only reach the SW and SE corners): an inner field bordering both cities. The band and the cap are NOT connected. No roads, no pennants.
- **`TB/CCc.w` – City band with wine and separate south cap.** Identical layout to TB/CCc.c with the wine goods symbol (white house-shaped plaque with a wooden wine barrel) at the left of the W-E city band: north field cap, band W-E, thin inner lens-shaped field, separate shallow city cap on the S edge (no goods).
- **`TB/Ccc.g` – Three-sided city with grain.** Large city covering the N, E and W edges; its south wall runs from the SW corner to the SE corner arching up into the lower half of the tile, with a closed gatehouse in the middle of the wall (no road leaves it). Grain goods symbol (white house-shaped plaque with a golden sheaf of wheat) top-left. A single field cap along the S edge. Same layout as base tile R plus the goods symbol.
- **`TB/CcCC.c` – Three city segments around an inner field.** Three separate city segments around a central field. (1) Corner city covering the N and W edges, wall diagonal from the NE corner to the SW corner, cloth goods symbol (white house-shaped plaque with a red bolt of cloth) top-left. (2) A narrow city cap along the E edge (wall from the NE corner to the SE corner bowing slightly west, with a tower). (3) A narrow city cap along the S edge (wall from the SW corner to the SE corner bowing slightly north, with a gatehouse). The green field in the middle is a triangle that touches no edge (its tips only reach the NE, SE and SW corners) and borders all three cities; a farmer may stand there. The three cities are not connected to each other (3 features). No roads, no pennants.
- **`TB/CcRR!.c` – Pointed city with cloth and two gate roads.** "Pointed" city (the "!" in the JCZ id): a big city that covers the full N and W edges and whose walls also run down to the SE corner, so the city fills most of the tile and touches all four corners. East wall: from the NE corner down to the SE corner, bowing in toward the centre, with a gatehouse at the middle of the E side. South wall: from just above the SW corner to the SE corner, bowing in, with a gate in the middle of the S side. A short road comes in from the middle of the E edge and ends at the east gate; another short road comes in from the middle of the S edge and ends at the south gate. Because both walls meet in the SE corner, the green is split into FOUR small separate fields: north and south of the east road (EL, ER) and east and west of the south road (SL, SR), each bordering the city. Cloth goods symbol (white house-shaped plaque with a red bolt of cloth) top-left. (JCZ's simplified artwork mislabels this tile as wine; the XML and the printed tile are cloth.)
- **`TB/CcRR.wG` – City corner with wine, two roads and garden.** Corner city covering the N and W edges (wall diagonal from the NE corner to the SW corner) with the wine goods symbol (white house-shaped plaque with a wooden wine barrel) top-left. Two roads leave two different gates in the city wall: one from a gate in the north-east part of the wall curving down-right to the middle of the E edge, the other from a gate in the south-west part of the wall curving down to the middle of the S edge; the roads never meet. Three fields, all bordering the city: a small one between the wall and the east road (upper half of the E edge, EL); the south-east field between the two roads (lower E edge and east half of the S edge) which holds a GARDEN (fenced rectangular bed of colourful plants, 3rd edition only) in its lower-right part near the SE corner; and a small one west of the south road (SR). 1st/2nd-edition version TB/CcRR.w is identical without the garden.
- **`TB/CcRC.c` – City corner with cloth, road and separate south cap.** Corner city covering the N and W edges (wall diagonal NE corner to SW corner, cloth goods symbol (white house-shaped plaque with a red bolt of cloth) top-left) plus a separate shallow city cap along the S edge (wall from the SW to the SE corner, gatehouse, no road). A road leaves a gate near the middle of the corner city's wall and curves east to the middle of the E edge. Fields: north of the road a small field between the wall and the road (upper half of the E edge) bordering the corner city; south of the road a field squeezed between the corner city, the road and the south cap (lower half of the E edge) bordering BOTH cities. The two cities are separate features.
- **`TB/CcRC.g` – City corner with grain, road and separate south cap.** Identical layout to TB/CcRC.c with the grain goods symbol (white house-shaped plaque with a golden sheaf of wheat) in the corner city: road from the corner city's gate to the E edge, separate shallow city cap on the S edge, field north of the road (corner city) and field south of the road (both cities).
- **`TB/CcR.cG` – City corner with cloth, road and garden.** Corner city covering the N and W edges (wall from the NE corner to the SW corner, cloth goods symbol (white house-shaped plaque with a red bolt of cloth) top-left). A road leaves a gate in the left-middle part of the wall and runs east (slightly wavy) to the middle of the E edge. Fields: a small wedge north of the road between road and wall (upper half of the E edge) and a large field south of the road (lower E edge and the whole S edge) holding a GARDEN in its lower-right part (3rd edition only). Both fields border the city. 1st/2nd-edition version TB/CcR.c is identical without the garden.
- **`TB/CcR!.w` – Pointed city with wine and east gate road.** Pointed city like TB/CcRR!.c (covers the N and W edges, walls run down to the SE corner, city touches all four corners) but with only one road: from the middle of the E edge to a gate in the east wall. The south wall has towers but no gate. Fields: a small field north of the east road (EL), a small field south of it (ER) cut off from the south field by the wall reaching the SE corner, and one field along the whole S edge (SL+SR). All three border the city. Wine goods symbol (white house-shaped plaque with a wooden wine barrel) top-left.
- **`TB/CccR.w` – Three-sided city with wine and gate road.** City covering the N, E and W edges; its south wall runs from the SW to the SE corner arching up, with a gate in the middle; a short road runs from the middle of the S edge north and ends at that gate. Fields: west and east of the road along the S edge (SR, SL), both bordering the city. Wine goods symbol (white house-shaped plaque with a wooden wine barrel) top-left. Same layout as base tile T plus the goods symbol.
- **`TB/CcCc.w` – Two opposite city corners with wine.** Two separate corner cities facing each other across the NE-SW diagonal: the north-west city (N and W edges, wine goods symbol (white house-shaped plaque with a wooden wine barrel) top-left) and the south-east city (E and S edges, no goods). Both walls run from the NE corner to the SW corner, bowing away from each other, leaving a long narrow lens-shaped field along the diagonal that touches no edge (points only at the NE and SW corners): an inner field bordering both cities. No roads.
- **`TB/CFc.w` – City band with wine.** City band from the W edge to the E edge with the wine goods symbol (white house-shaped plaque with a wooden wine barrel) at its left; north wall from the NW to the NE corner sagging into the tile, south wall from the SW to the SE corner arching up; a field cap along the N edge and one along the S edge, each bordering the city. Same layout as base tile G (city bridge) plus goods, no pennant.
- **`TB/CR` – City cap with road and farmhouse.** City cap along the N edge (wall from the NW to the NE corner bulging down to about a third of the tile) with a gate in the middle. A road leaves the gate going south, then bends east and runs to the middle of the E edge. Fields: a small field enclosed by the cap, the road and the upper half of the E edge (borders the city); and the large field covering the W edge, the S edge and the lower half of the E edge (also borders the city along the west part of the cap) with a farmhouse and a fenced paddock in its south-west part (decoration only). No goods.
- **`TB/CRc.g` – City band with grain and gate road.** City band from the W edge to the E edge (grain goods symbol (white house-shaped plaque with a golden sheaf of wheat) at its left); the north wall sags into the tile leaving a field cap along the N edge; a short road runs from the middle of the S edge north to a gate in the band's south wall. Fields: the north cap and the two fields west and east of the road along the S edge; all three border the city.
- **`TB/CRc.w` – City band with wine and gate road.** Identical layout to TB/CRc.g with the wine goods symbol (white house-shaped plaque with a wooden wine barrel): W-E city band, north field cap, short road from the S edge to the south gate, fields either side of it.
- **`TB/CRcR.w` – City band with wine and two gate roads.** City band from the W edge to the E edge (wine goods symbol (white house-shaped plaque with a wooden wine barrel) at its left) with a gate in both its north and its south wall: one short road runs from the middle of the N edge to the north gate, another from the middle of the S edge to the south gate. They are two separate roads, both ending at the city (nothing passes through it). Four small fields, one on each side of each road (NL, NR, SL, SR), each bordering the city.
- **`TB/LRRR` – Monastery with three roads.** A large monastery (church with a tall tower and red roofs) in the centre of an otherwise green tile. Three roads run from the middle of the W, E and S edges and each ends at the monastery building: it is NOT a crossroads, the monastery splits them into 3 separate roads. Fields: the big north field (whole N edge plus the upper halves of the W and E edges, wrapping around the monastery), the south-west field (between the W and S roads) and the south-east field (between the S and E roads). No city.
- **`TB/RCc.g` – City corner with grain and road to the south.** Corner city covering the N and W edges (wall from the NE corner to the SW corner, grain goods symbol (white house-shaped plaque with a golden sheaf of wheat) top-left). A road leaves a gate in the lower-left part of the wall and runs down to the middle of the S edge. Fields: a small wedge west of the road (between wall and road, west half of the S edge) and the large field east of the road (east half of the S edge and the whole E edge); both border the city. Mirror image of TB/CcR.c.
- **`TB/RCc!.g` – Pointed city with grain and south gate road.** Pointed city like TB/CcRR!.c (covers the N and W edges, walls run down to the SE corner) with a single road from the middle of the S edge to the south gate; the east wall has a gatehouse but no road. Fields: one field along the whole E edge (EL+ER), and the fields east (SL) and west (SR) of the south road, separated from each other by the road and from the east field by the wall meeting the SE corner. All three border the city. Grain goods symbol (white house-shaped plaque with a golden sheaf of wheat) top-left.
- **`TB/RRC` – City cap, bridge and cottage.** City cap along the N edge with a gate in the middle. Road 1 runs from the middle of the S edge straight north, passes UNDER a small arched stone bridge in the centre of the tile and ends at the city gate. Road 2 comes from the middle of the W edge, crosses OVER that bridge and ends at a small cottage just east of the centre (a house, not an inn; it does not reach the E edge). The roads split the green into 3 fields: north-west (between the cap, road 2 and road 1; borders the city), south-west (between road 2 and road 1; no city) and the whole east side around the cottage (both halves of the E edge and the east half of the S edge; borders the city). No goods.
- **`TB/RRrr` – Road bridge (over- and underpass).** Two roads that cross WITHOUT joining: one runs from the middle of the W edge to the middle of the E edge over a stone bridge (small towers at its corners) in the centre; the other runs from the middle of the N edge to the middle of the S edge and passes under the bridge. Not a junction: 2 separate roads and 4 separate quarter fields (NW, NE, SE, SW), none touching a city. A bush and a small house decorate two of the fields.

## 13. AI hints

- Builder = tempo: each trigger is a whole extra random tile (roughly the value of an average turn, ~6-10 points early, less near the end, zero when the stack is almost empty). Place it early in a big, open city (or long road) with many open edges that you expect to keep extending with your own tiles.
- Prefer cities over roads for the builder: more valuable, longer-lived, more edges to extend. A road you will close next turn is a poor builder spot (one trigger at most).
- Tile evaluation: add a bonus to placements of the FIRST tile that extend your builder's road/city (expected value of an extra turn). The second tile gets no such bonus.
- Sequencing trick: complete the builder's feature with tile 1 (score it, builder returns) and immediately re-deploy the builder on tile 2 into another big feature where you have a meeple.
- Do not rush to complete the builder's city unless the points are big or the game is ending; but avoid leaving a big city unfinished at game end (1 point per tile only).
- An opponent's builder only pays off when the opponent extends it; completing an opponent's builder city/road cheaply removes their double-turn engine (and returns the builder).
- The builder depends on its supporting meeple: with the dragon or towers around, prefer features where you have two meeples or the fairy protects the meeple.
- Pig: worth +1 per completed city bordering a field you will win. Place it mid/late game in your strongest farm (clear farmer majority, several completed or nearly-complete cities). It costs no meeple, only the turn's figure action, so it is a good play when no meeple placement is worth much. Never place it where an opponent has more farmers unless you can overtake.
- Goods: when a tile would complete a city, add the value of the goods tokens to the move (they go to the completer, not the city owner). Completing an opponent's goods-rich city can be worth it; conversely do not leave your own goods-rich city one easy tile from completion for others.
- Goods majority math: totals are wine 9, grain 6, cloth 5, so 5 wine / 4 grain / 3 cloth clinch a type outright; a tie still pays 10. Value a token by how much it changes your chance of winning that type (high when it breaks/creates a tie or clinches, ~0 once the type is clinched or hopeless). Goods are public: track all players' counts.
- In 2-player games each type is a 10-point swing; goods often decide the game.
- Late game: placing the builder rarely pays (few tiles left to trigger); the pig keeps its value until the last turn.

## 14. In-app rules text (for a 12-year-old)

Traders & Builders adds goods, a builder and a pig.

GOODS: Some city tiles show a goods symbol - a wine barrel, a sheaf of grain or a roll of red cloth. When a city is finished, the knights in it score points as usual. Then the player who placed the tile that finished the city takes one goods token for every symbol in that city - even if they have no knight there! At the end of the game, whoever has the most wine scores 10 points, the most grain 10 points and the most cloth 10 points. If players tie, they all get the 10 points.

THE BUILDER: You have one builder. Instead of placing a meeple, you may put your builder on the tile you just placed - but only on a road or city where one of your meeples already stands. From then on, every time YOU place a tile that adds to that road or city (even the tile that finishes it), you get a bonus: after that tile is placed and scored, draw one more tile and play it - you may place a meeple (or your builder or pig) on it too. You never get more than one extra tile per turn. The builder does not count as a meeple when deciding who wins a road or city. It comes back to you when the road or city is finished - or as soon as you have no meeple left there.

THE PIG: You have one pig. Instead of placing a meeple, you may put your pig on the tile you just placed, in a field where you already have a farmer. The pig stays until the end of the game. If you win that field at the end (most farmers - a tie counts too!), every finished city next to the field gives you 4 points instead of 3. The pig itself is not a farmer.

Remember: for each tile you place, you may place only ONE figure - a meeple OR your builder OR your pig.

## 15. Figures worth drawing

- Builder placement: your highwayman stands on a road two tiles away; you place a tile that continues the road and stand your builder on the new tile's road segment.
- Double turn: tile A extends the builder's road (green tick), then tile B is drawn and placed somewhere else on the map (arrow "extra tile").
- Rulebook example 3a/3b: tile 1 completes the builder's road (highwayman and builder jump back, a knight is placed in the city part of that tile); tile 2 continues that city and the builder goes on it.
- No chain: the second tile also extends the builder's city - a third tile is shown crossed out.
- Builder goes home: the dragon eats your only knight in a city, the builder pops back to your supply as well (same with princess / tower).
- Pig scoring: a field with your 2 farmers and your pig, Blue's 1 farmer, two finished cities next to it: you 2 x 4 = 8 points, Blue 0.
- Goods: a finished city containing 1 wine and 2 grain symbols; Blue's knight scores 10 points, you placed the last tile (no knight) and take 1 wine + 2 grain tokens.
- End-of-game goods table for 2 players: wine 3 vs 2 (10/0), grain tie 2 vs 2 (10/10), cloth 1 vs 3 (0/10) - totals 20 and 30.
- Tile explainers: bridge (not a crossing, 4 fields); city cap + bridge + cottage (3 fields); monastery with 3 roads (3 roads, 3 fields); three city segments with a farmer in the middle field; pointed city reaching the corner (4 separate fields).
- Component gallery: builder (tall meeple), pig, the three house-shaped goods tokens.

## 16. Interpretations and open points

- **Double turn when the builder disappears during the same tile:** the bonus is earned at tile placement (JCZ does the
  same); the rules do not address a builder that leaves later in that tile's steps (princess on the trigger tile, dragon).
- **Goods with zero tokens:** the rules only say "the player who has the most tokens"; we follow JCZ – at least one token
  is needed, so an uncollected type pays nobody.
- **Builder on a feature completed by the same tile:** not forbidden on paper, but it has no effect; JCZ forbids it. We
  recommend not offering it.
- **Volcano tile:** the 3rd-edition Z-Man P&D text only says "you may not place a meeple on a Volcano tile"; the HiG Big Box
  rules forbid every figure and the S-CAR rule table lists "follower, builder or pig" for the RGG/Z-Man rules. We forbid
  builder and pig there.
- **Abbot recall vs. builder/pig:** the base rules allow the recall when "you did not place a meeple"; we treat recall, meeple,
  builder, pig, fairy move and tower actions as mutually exclusive step-2 actions, as the P&D interaction page and JCZ do.
- **Optional double turn:** the rule says "may"; an app can auto-take it (it is practically never worse) but a "skip" choice
  is more faithful.
- **3rd-edition art details:** geometry was verified on the classic scans and on three 3rd-edition tile pictures; the exact
  position of the garden on `TB/CcR.cG` comes from JCZ data only.

## 17. Sources

1. [Traders & Builders rulebook, Z-Man Games / Hans im Glück, 3rd edition (c) 2003, 2015 (ZM7812, 2017 print)](https://cdn.svc.asmodee.net/production-zman/uploads/2024/09/zm7812_carcassonne_exp2_rules.pdf) – Primary source: components, builder placement/double turn/return, pig placement and scoring, goods awarding and final scoring, explanations of the special tiles (bridge, cottage, monastery, 3 city segments).
2. [Traders & Builders rulebook, Z-Man / F2Z 2015 two-page print](https://world-of-board-games.com.sg/docs/Carcassonne-T-B-2ed.pdf) – Cross-check: identical wording to the 2017 print.
3. [The Princess & the Dragon rulebook, Z-Man Games, 3rd edition (c) 2016](https://cdn.svc.asmodee.net/production-zman/uploads/2024/09/zm7813_carcassonne_exp3_rules.pdf) – Official interaction rules with Expansion 2: dragon eats builder/pig and returns lonely builder/pig, princess, magic portal (no builder/pig), fairy (bonus once per double turn, no builder/pig after moving fairy).
4. [The Tower rulebook, Z-Man Games, 3rd edition (c) 2017](https://cdn.svc.asmodee.net/production-zman/uploads/2024/09/carcassonne-ii-ext4-rules.pdf) – Builder and pig cannot be captured and cannot be placed on a tower; tower actions replace the meeple placement.
5. [Inns & Cathedrals rulebook, Z-Man Games, 3rd edition (c) 2015](https://cdn.svc.asmodee.net/production-zman/uploads/2024/09/zm7811_carcassonne_exp1_rules.pdf) – Large meeple is placed instead of a normal meeple and counts as 2 meeples (also as farmer).
6. [Carcassonne 3rd edition supplemental rulesheet (Farmers, River, Abbot), Z-Man Games](https://cdn.svc.asmodee.net/production-zman/uploads/2024/09/carcassonne_v3_supplement_en.pdf) – Field scoring (3 points per completed city, ties share), river draw rules, abbot (monastery/garden only, recall instead of placing a meeple).
7. [Carcassonne Standard Complete Annotated Rules (S-CAR) v7.3, Chris Ober, Dec 2014](https://www.dover.nh.gov/Assets/government/city-operations/library/borrow/library-of-things/carcassonne-rules.pdf) – Hans im Glück Big Box rule text with footnotes/FAQ: builder & pig are not followers, return when last follower removed, no portal/tower/princess on them, dragon eats them, double-turn once-only table, edition-change summary table.
8. [Traders & Builders rules, Rio Grande Games 2003 (sample pages hosted by Exodus Books)](https://www.exodusbooks.com/Samples/Games/22856sample.pdf) – 1st-edition wording for edition differences (builder/pig called followers, pig 5 instead of 4 per city, second tile need not be adjacent).
9. [JCloisterZone tile data traders_and_builders.xml (JCloisterZone-Client, commit 0f66860, 2023)](https://github.com/farin/JCloisterZone-Client/blob/master/src/extraResources/expansions/traders_and_builders.xml) – Exact tile geometry, counts, goods per city segment, gardens; tile-set traders-and-builders:2 = 3rd edition. Features in this file are generated from it.
10. [JCloisterZone simplified artwork (TB.json, features/*.json, paths.json, resources.svg)](https://github.com/farin/JCloisterZone-Client/tree/master/src/extraResources/addons/jcz/simplified) – Shapes for the art descriptions (pointed city clip, garden positions, goods badge positions).
11. [JCloisterZone classic artwork pack (scans of the Doris Matthaeus tiles)](https://jcloisterzone.com/packages/classic/classic-6-5.9.0.jca) – Visual check of all 24 tile layouts (all fields, gates, walls reaching corners, goods positions).
12. [JCloisterZone rules engine (Java): BuilderCapability, TilePhase, CleanUpTurnPartPhase, Builder, Pig, AbstractUndeploy, TradeGoodsCapability, Field](https://github.com/farin/JCloisterZone/tree/master/src/main/java/com/jcloisterzone) – Reference interpretation of the double-turn trigger, special figures only on the placed tile (even with a portal), lonely builder/pig removal, goods tie/zero handling, pig bonus.
13. [Z-Man product page images (Exp-2-Contents-1.webp etc.)](https://www.zmangames.com/game/carcassonne-traders-builders/) – 3rd-edition artwork of three tiles (grain corner, wine corner with garden between the roads, pointed cloth city) and the component shapes.
14. [Carcassonne FAQ by John Sweeney (2006-2007, pre-Big-Box rules)](https://modernjive.com/carcassonne/carcassonnefaq.htm) – Old rulings (builder/pig treated as followers) for the edition-differences list; double turn lets you use two tower actions.
