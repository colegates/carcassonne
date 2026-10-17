# The River (3rd edition)

*The 12 dark-backed River tiles that ship in the 3rd-edition base-game box (Hans im Glück / Z-Man, 2014+), including the river bend with a garden. JCloisterZone calls this set `river/1:2`. Machine-readable data: [`river.json`](river.json).*

## TL;DR: decisions for the implementation

| Topic | Decision | Source |
|---|---|---|
| Start tile | The **spring** is the start tile. The normal start tile goes **back in the box**, so the land deck stays at 71 base tiles. | Z-Man 2014 sheet, HiG 2014, Z-Man Big Box 2017 |
| River stack | Shuffle the other 10 river tiles face down and put the **lake underneath**. Draw only from this stack until it is empty, then switch to land tiles. | Same |
| Placement | (1) The river must join the river's single open end. (2) All edges must match. (3) **No immediate U-turn**: two river bends *in a row* may not turn the same way. A wide U (bend, straight(s), bend the same way) is legal. | Z-Man, HiG wording; HiG FAQ; official example |
| Unplaceable tile | Back in the box, draw the next tile (river stack first). The river may stay unfinished. | HiG base rule; River II rules |
| Followers | Normal placement on roads, cities, the monastery and fields of the river tile. **Never on the river** (not a feature, never scored). | Z-Man Big Box 2017 |
| Fields | The river divides fields. On the **spring and lake** tiles the single field **wraps around** the river end. | HiG FAQ via S-CAR |
| Garden | Only for the Abbot (only an abbot may stand on it). Otherwise decoration. It does not divide its field. | Z-Man / HiG Abbot rules |

## Sources

1. **Z-Man Games, Carcassonne 3rd ed. Supplementary Rules** (Farmers / The River / The Abbot): <https://lot.ahml.info/Carcassone%20Supplementary%20Rules.pdf>. Primary English rules. The tile images used for the art descriptions were extracted from its "completed river example".
2. **Hans im Glück, Carcassonne Spielregel, new edition (Oct 2014)**, sections *Der Fluss* and *Der Abt*: <https://www.spielezar.ch/modules/genzo_zar/views/pdf/spielregeln-carcassonne.pdf>. Primary German rules, plus the base rule for unplaceable tiles.
3. **Z-Man Carcassonne Big Box rulebook (2017)**, p. 9: <https://world-of-board-games.com.sg/docs/Carcassonne-Big-Box6.pdf>. The clearest wording, and the "Watch out!" picture of an illegal U-turn.
4. **S-CAR v7.3** (Complete Annotated Rules, Dec 2014): <https://www.dover.nh.gov/Assets/government/city-operations/library/borrow/library-of-things/carcassonne-rules.pdf>. Official HiG FAQ answers and edition history.
5. **The River (2001) rules, translation and FAQ by Matthew Harper**: <https://upsilon.cc/~zack/teaching/1011/gla/carcassonne/river.pdf>. 1st-edition differences.
6. **JCloisterZone**: [`river.xml`](https://github.com/farin/JCloisterZone-Client/blob/master/src/extraResources/expansions/river.xml) (tile-set `river/1:2`), [`RiverCapability.java`](https://github.com/farin/JCloisterZone/blob/master/src/main/java/com/jcloisterzone/game/capability/RiverCapability.java), `TilePhase.java`, client `gameSetupUtils.js`. Geometry, ids and counts, and how a mature engine does it.
7. **BGA forum thread** on lake placement: <https://forum.boardgamearena.com/viewtopic.php?p=68185>. Quotes the 2017 Big Box text and the 1st-edition off-turn lake.
8. **modernjive.com River page**: <https://modernjive.com/carcassonne/carcassonnetheriver.htm>. Reported official replies on U-turns and on an unfinishable river (secondary).
9. **Carcassonne Central forum, topic 2961**: <https://www.carcassonnecentral.com/community/index.php?topic=2961.0>. Quotes from several rulebooks (secondary).

Wikicarpedia was not reachable (Anubis; the Wayback Machine is blocked from this sandbox).

## Official wording (3rd edition)

**Z-Man supplementary sheet (2014):**
> *The River* is comprised of 12 River tiles with a dark back that replace the start tile. When playing with *The River*, return the start tile to the box.
> Set aside the "source" and "lake" tiles. The remaining River tiles are shuffled and stacked facedown. Finally, slide the lake tile under that stack and set the source tile as the starting point.
> Starting with the first player and continuing clockwise one after the other, players place tiles as usual (including the possibility of placing a meeple), with the exception that they must draw tiles from the River tile stack. You must continue drawing from the River stack until it runs out of tiles.
> As usual, you must continue the illustration. Furthermore, you must continue the river illustration, and the river **cannot** turn twice in the same direction because this would create a u-turn.
> You may place meeples along the river following the normal rules.

**Z-Man Big Box (2017):**
> […] players must draw and place all river tiles before they can draw normal tiles. The river is not a feature; meeples cannot be placed on it, and it cannot be scored.
> You draw a river tile and place it in a way that its edges match the edges of tiles already in play. However, the river cannot turn in the same direction twice in a row, as this risks forcing the river to loop onto itself.
> Like any other tile, you may place a meeple on other features of a river tile you just placed. Meeples cannot be placed on the river itself.

**HiG (2014):**
> Der Fluss besteht aus 12 Teilen mit dunkler Rückseite und ersetzt das normale Startplättchen. Letzteres braucht Ihr für ein Spiel mit dem Fluss also nicht – legt es daher in die Schachtel zurück. […] Dann schiebt Ihr den See unter den Stapel und legt die Quelle als Startplättchen aus. […] Natürlich müssen auch hier die Plättchen aneinander passen. Außerdem dürfen keine 2 Flussplättchen **nacheinander** in die gleiche Richtung abbiegen, damit der Fluss nicht in sich selber fließt.

In English: the start tile is not needed, so put it back in the box. The lake goes under the stack and the spring is the start tile. Tiles must fit, and no two river tiles in a row may bend the same way, so the river does not flow into itself.

HiG base rule for any tile: *"Sollte der sehr seltene Fall eintreten, dass Du nicht anlegen kannst, lege das Plättchen in die Spielschachtel zurück und ziehe ein neues."* (If you cannot place a tile, put it back in the box and draw a new one.)

## Setup

1. Return the normal start tile to the box. The land deck is the other 71 base tiles plus other expansions' land tiles.
2. Take out the spring and the lake. Shuffle the other 10 river tiles face down and put the lake **at the bottom**.
3. Place the spring face up as the starting tile. Orientation is free; JCloisterZone uses rotation 0, with the river flowing east.
4. Land tiles go into the normal face-down stacks. They are drawn only once the river stack is empty.

**Engine tip:** `drawTile` pops from the end of `state.deck`, so build `deck = [...shuffledLand, lake, ...shuffled10River]`. The 10 river tiles come first, then the lake, then land tiles. There are always 11 river turns, unless a river tile is unplaceable and discarded.

## Turn sequence hooks

* **Draw:** while river tiles remain, draw from the river stack. The first player starts and play goes clockwise.
* **Place:** river placement rules (below). If there is no legal placement, discard the tile from the game and draw again; this is the existing `drawTile` behaviour once `validPlacements` knows the river rules.
* **Follower:** normal. Never on the water. The Abbot and other figures work as usual.
* **Score:** normal.
* After the river stack is empty, the game is the plain base game. **Builder** (Traders & Builders): an extra turn taken in the river phase also draws a river tile while any are left.

## Placement rules

1. **Continue the river.** River I always has exactly **one open river end**, because the spring is a dead end. A new river tile must be placed on the empty square that end points at, with a river edge facing it. Placing a river tile anywhere else is illegal, even where its edges would fit (e.g. only touching a field).
2. **All edges match**, as always: river to river, field to field, road to road, city to city, against every neighbour of the target square.
3. **No immediate U-turn.** A bend may not turn the same way as an immediately preceding bend. It does not matter whether you look downstream or upstream: two adjacent same-way bends reverse the flow. HiG FAQ (via S-CAR): *"Only immediate U-turns are explicitly forbidden. (Naturally there can also be problems if a straight river tile lies between.)"*
   * The official completed-river example itself contains **right, straight, right**, a legal wide U (see the layout below).
   * The spring and the lake are neither straight nor bend. The first tile after the spring may bend either way.
4. Tiles rotate but never flip. At the open end, a straight tile has 2 rotations (which bank gets the city or monastery) and a bend has 1 rotation per direction. At most one of a bend's two rotations is forbidden by the U-turn rule.

### Algorithm (engine-ready)

State to keep: `river = { open: {x, y, side} | null, lastIn: side | null }`.
- `open` is the last river tile and the world side its river leaves through.
- `lastIn` is the flow direction that *entered* that tile, equal to the previous tile's exit side. It is `null` while only the spring is down.

```js
function riverOK(state, x, y, t, r) {
  const rs = riverSidesOf(t).map((s) => (s + r) % 4);           // world sides carrying river
  const end = state.river.open;
  if (!end) return false;                                        // river finished/closed
  const [dx, dy] = SIDE_DELTA[end.side];
  if (x !== end.x + dx || y !== end.y + dy) return false;        // 1. at the open end
  const entry = (end.side + 2) % 4;
  if (!rs.includes(entry)) return false;                         //    river must connect
  if (!canPlace(state, x, y, t, r)) return false;                // 2. every edge matches
  const exit = rs.find((s) => s !== entry);                      //    undefined for the lake
  if (exit !== undefined && state.river.lastIn !== null &&
      exit === (state.river.lastIn + 2) % 4) return false;       // 3. no immediate U-turn
  return true;
}
// after placing: river.lastIn = end.side; river.open = exit === undefined ? null : { x, y, side: exit };
```

Rule 3 is equivalent to: *the new tile's exit direction must not be the reverse of the flow that entered the previous tile.* That only happens when two adjacent bends turn the same way.

**Tests** (both verified with a script against `river.json`):
* Every placement in `rules.example_layout` is legal. The bends are L, R, R, L, with a straight between the two R's.
* The official "Watch out!" picture: `RIrI(1,0) r0` → `II(1,1) r1` (a right bend) → `RrII(0,1) r2` (a second right bend) must be **rejected**. `RrII(0,1) r3` (a left bend) is legal.

### Unplaceable river tiles

The River rules do not cover this, so the base rule applies: the tile goes back in the box and the player draws the next tile. The River II rules confirm it for river tiles: *"River tiles which cannot be placed should be removed from the game, in accordance with the basic rules. Even if the river cannot be placed in its entirety, the game should proceed in the usual way."* S-CAR adds: *"the river does not have to be finished … you do not have to place the final lake tile, and a permanent gap in the playing field might arise."*

If the lake is discarded, the open river end is never closed. No land tile has a river edge, so the square in front of it stays empty for the whole game.

With only the immediate-U-turn rule, a dead end needs a deliberately winding river, using wide U's and spirals. It is rare, but the engine must handle it. JCloisterZone avoids it with a stricter look-ahead: the 5 squares ahead of the open end must be empty. That is **not** the printed rule. Use it only as an AI heuristic.

## Followers on river tiles

* Normal rules on the tile just placed: a **highwayman** on its road, a **knight** in its city, a **monk** on its monastery, a **farmer** in any one of its field pieces, provided the feature is unoccupied.
* **Never on the river.** "The river is not a feature; meeples cannot be placed on it, and it cannot be scored." The current `followerOptions` already skips `river` and `garden`.
* The lake is drawn and placed in a normal turn in the 3rd edition, so its player may put a farmer in the lake's field. In the 1st edition it was placed "when the river is finished", often off-turn and without a follower.
* **Abbot:** may go on the river monastery (RI.1/LIRI) or the river garden (RI.1/IIG). Only the abbot can occupy a garden.

## Fields and the river

* The river separates fields (HiG FAQ, 08/2014). For field connectivity it behaves like a road that never ends. Each bank's field pieces connect only to the same bank on the next tile, because the river occupies the centre port and the fields the outer ports.
* **Spring and lake:** one field covering all 8 half-edges, which wraps around the end of the river. *"Officially, the field goes around the spring, creating a connected farm."* RGG Big Box: *"The field space on the lake and spring tiles wraps around those features."* So the two banks **are** joined at the spring and at the lake, unless a road or city on the next tiles cuts them.
* Roads crossing the river (RIrI, CIRI, LIRI) cut each bank further, giving 4 field pieces on RIrI and CIRI. On LIRI the path ends at the monastery, so the north field wraps around it.
* The garden does not divide its field. The cottages, farmhouse and farmstead are decoration and divide nothing.

## Scoring

Nothing new. The river is never scored. Features on river tiles score normally:
- The RIrI road continues over its bridge.
- The CIRI road is closed at the city gate; the LIRI road is closed at the monastery.
- The two CICI caps are separate cities.
- No River I city has a pennant or trade good.
- River tiles count towards the 8 neighbours of a monastery or garden.

## Tiles (canonical orientation, north up)

Half-edges: `NL/NR` = west/east half of N; `EL/ER` = north/south half of E; `SL/SR` = east/west half of S; `WL/WR` = south/north half of W. Feature indexes are those in `river.json`.

| # | JCZ id | n | Name | Features (index: type) | Fields: halves → bordering cities |
|---|---|---|---|---|---|
| 1 | `RI/s` | 1 | Spring | 0 river E (dead end) | 1: all 8 halves (wraps around) |
| 2 | `RI.1/I.e` | 1 | Lake | 0 river W (dead end) | 1: all 8 halves (wraps around) |
| 3 | `RI.1/CICI` | 1 | River between two city caps | 0 city N, 1 city S, 2 river W–E | 3: EL WR → [0]; 4: ER WL → [1] |
| 4 | `RI.1/CIRI` | 1 | City gate, road and river bridge | 0 city N, 1 road S (ends at gate), 2 river W–E | 3: EL → [0]; 4: ER SL; 5: SR WL; 6: WR → [0] |
| 5 | `RI.1/LIRI` | 1 | Monastery with footbridge | 0 road S (ends at monastery), 1 river W–E, 2 monastery | 3: NL NR EL WR; 4: ER SL; 5: SR WL |
| 6 | `RI.1/RIrI` | 1 | Road bridge over the river | 0 road W–E, 1 river N–S | 2: NL WR; 3: NR EL; 4: ER SL; 5: SR WL |
| 7 | `RI.1/IFI` | 2 | Straight river | 0 river W–E | 1: NL NR EL WR; 2: ER SL SR WL |
| 8 | `RI.1/CcII` | 1 | City corner with river bend | 0 city N+W, 1 river S–E | 2: EL SR → [0]; 3: ER SL |
| 9 | `RI.1/RrII` | 1 | River bend and road bend | 0 road N–E, 1 river W–S | 2: NL ER SL WR (diagonal band); 3: NR EL (NE corner); 4: SR WL (SW corner) |
| 10 | `RI.1/II` | 1 | River bend | 0 river W–S | 1: NL NR EL ER SL WR; 2: SR WL |
| 11 | `RI.1/IIG` | 1 | River bend with garden | 0 river W–S, 1 garden | 2: NL NR EL ER SL WR; 3: SR WL |

Total: 12. Ten tiles have a river through two sides: 6 straight (CICI, CIRI, LIRI, RIrI, 2× IFI) and 4 bends (CcII, RrII, II, IIG). The spring and lake are the two dead ends.

**Consistency check** (script-verified):
- Every one of the 12 ports is claimed exactly once on every tile. Half → port: `NL 0, NR 2, EL 3, ER 5, SL 6, SR 8, WL 9, WR 11`; centre ports go to the river/road, or to the field when both halves of a side share it.
- On every side with a through river or road, the two halves are in different fields.
- Only the dead-end spring and lake have both halves of their river side in one field. The base game's monastery-with-road tile works the same way.
- A field lists a city exactly when it touches a corner of that city's side.

### Art (from the 3rd-edition tiles, rotated to canonical orientation)

Full text is in `river.json`. Short version:
- **Spring:** grey bushy rock outcrop just west of centre. A deep-blue oval pool on its east side feeds a zig-zag stream that widens to the E edge.
- **Lake:** the river enters mid-west into a big irregular deep-blue lake (centre and east). Wooded island in the SE part; red rowing boat on the north shore; tiny trickle off the NE shore that does not reach the edge.
- **CICI:** walled caps along N (NW→NE corner) and S (SW→SE corner), with blue cone towers and red roofs. Straight river between them with two islets.
- **CIRI:** N city cap with a gatehouse east of centre. The road runs from the gate over a stone arch bridge (two red turrets at its NE end) and winds to mid-S.
- **LIRI:** church (red-roofed bell tower and nave) on the north bank, centre-left. The river sags south. A path from the door crosses a wooden footbridge to mid-S; small jetty.
- **RIrI:** river N→S with three islets. The road W→E crosses on a long stone arch bridge just north of centre. Red-roofed hamlets in the NE (north of the road) and SE (south of the road).
- **IFI ×2:** copy A has a gentle wave, islands, and a farmstead with paddock in the NW. Copy B is a strong meander: dip near the S edge, then a hairpin loop almost touching N.
- **CcII:** NW-half city behind a diagonal wall (NE corner → SW corner) with a big white round keep with a blue roof. River S→E cuts off the SE corner.
- **RrII:** road N→E cuts the NE corner, where two travellers (red hood; blue with a staff) rest by a tree. River W→S cuts the SW corner; islet in the bend; small red figure on the bank.
- **II:** river W→S with a rounded bend; farmhouse with a smoking chimney and fenced yard in the NE.
- **IIG:** river W→S with a wooded island; fenced flower garden (a perspective rhombus) in the NE, right of centre.

Bridges: roads crossing water get a **bridge**: stone arch on RIrI and CIRI, wooden footbridge on LIRI. Draw water under roads. Later printings (e.g. the 2017 Big Box) add a small three-wave river symbol in a free corner of each tile; it is optional.

## Official completed river (figure and test fixture)

`x` grows east and `y` south. `r` = clockwise quarter turns from the canonical orientation.

```
        x=0            x=1            x=2
y=0   Spring r1
        |
y=1   IFI-A  r1
        |
y=2   IIG    r2  ->  LIRI   r0  ->  CcII  r1
                                     |
y=3     (gap)          (gap)        RIrI  r0
                                     |
y=4   RrII   r3  <-  CICI   r0  <-  II    r1
        |
y=5   IFI-B  r1
        |
y=6   CIRI   r1
        |
y=7   Lake   r1
```

Flow bends: IIG **L**, CcII **R**, II **R** (after a straight, so legal), RrII **L**. The two-square gap at (0,3)–(1,3) is a hole that land tiles can fill later. (1,3) needs N = road, E = road, S = city, which a city + road-bend tile can supply.

## Interactions

**Base game.** Edge type `river` is added; river edges only match river edges. River tiles count for monastery neighbours. Bridged roads are continuous. Fields work as described above. Game length: 71 land tiles + 11 drawn river tiles; the game ends with the last land tile.

**Abbot.** The River contributes one monastery (LIRI) and the 3rd edition's river garden (IIG). When either is placed, the player may put the abbot there instead of a meeple. Scoring: 9 points when surrounded, otherwise 1 per tile (the feature tile plus its neighbours) on recall or at game end. The abbot may be recalled during river-phase turns when no meeple is placed. Holes left by river bends can stop a river monastery or garden from ever completing; recall gives partial points. Without the Abbot the garden does nothing.

**Inns & Cathedrals.** The big meeple can be placed on river-tile features (not the water). River I has no inns or cathedrals. The small lake beside I&C inns is decoration, not a river edge. River II's bridge-road tile has an inn (out of scope).

**Traders & Builders.**
- The builder can be placed on a river tile's road or city where you already have a follower.
- A builder extra turn during the river phase draws a **river** tile while the stack lasts.
- The pig works in river-tile fields, but only on its own bank (or in the wrapped spring/lake field).
- No river city has goods.

**Princess & Dragon.**
- No River I tile has a volcano, dragon, portal or princess. Only river tiles are drawn in the river phase, so the dragon arrives later via a land volcano.
- The dragon moves over river tiles normally (water is no obstacle) and eats followers on them.
- The fairy may be moved to a follower on a river tile, even during the river phase.
- A magic portal may send a follower to an unoccupied, incomplete feature on a river tile, never onto the water.
- River II's lake is a volcano with its own special rule (out of scope).

**Tower.** River tiles have no tower foundations, so no towers can be built during the river phase. Tower capture lines run across river tiles, and followers on river tiles can be captured.

**River II (reference only).** It has a fork placed first next to the spring, two branches that may never connect, a volcano lake, a river ending in a city, a city bridge over the river (the city does not divide the fields), an inn, a pig-herd field and a pennant. If combined with River I, use only one spring and one lake (HiG FAQ); JCZ drops the River I lake. The same no-immediate-U-turn rule applies on each branch.

## Edition differences

* **1st/2nd edition (2001):**
  * The same 12 layouts, but **two plain bends, no garden**.
  * The start tile could be *"mixed into the stack of river tiles, or placed as soon as the river has been completed"*.
  * The lake was set aside and placed *"when the river is finished"*, often played off-turn and with no follower. 3rd edition: drawn normally, follower allowed.
  * The rule read *"A U-turn with the river tiles is not possible … a 180° turn is not allowed."*
* **Big Box 5 (HiG 2014):** sheep and vineyards for Hills & Sheep, light-grey backs. Not ours.
* **3rd edition:** dark backs like the start tile, which is returned to the box. The lake goes under the stack. One bend has a garden. New art.
* **JCloisterZone deviations:** it keeps the start tile in the land pack (72 land tiles). It also uses a look-ahead placement check instead of the printed rule.

## FAQ and edge cases

* **Do straights "reset" the U-turn rule?** Yes. Only bends that are directly adjacent along the river matter (HiG FAQ; Big Box "twice in a row"; the official example). Some groups play "never two same-way bends at all" as a house rule (S-CAR: "Ban all river U-turns").
* **Can the river get stuck?** Yes, if players wind it back into itself. The tile is discarded, and the river may remain unfinished. A reported official reply: "Players may have an unfinished River … but it's their own fault."
* **Can two river tiles touch other than along the river?** Only if the river loops around a single hole, which needs all 4 bends. The touching edges must still match. A river road or city could then even complete during the river phase. No special case is needed.
* **Is the lake turn a normal turn?** Yes in the 3rd edition: follower allowed, scoring as normal.
* **Spring orientation?** Free. Use r = 0 (river east) or randomise.
* **Can a land tile be placed next to river tiles during the river phase?** No. Only river tiles are drawn until the river stack is empty.

## AI hints

See `rules.ai_hints` in the JSON. Key points:
- River-phase decisions are bank choice, bend direction and follower use (at most about 2 followers).
- Prefer knights in the CICI or CIRI caps, a monk or the abbot on LIRI, and the abbot on the IIG garden.
- Avoid wide U-turns that create holes next to your own monastery or garden.
- Keep a JCZ-style look-ahead as a heuristic so the river cannot be blocked.
- Legal-move generation must use the river rules.

## Kid rules text

See `rules.kid_rules_text`: friendly, accurate, about 280 words, covering setup, the river stack with the lake last, the matching rule, no two same-way bends, followers but never in the water, the river splitting fields except around the Spring and Lake, the garden for the abbot, and the rare unplaceable tile.

## Figures

1. Setup: spring in the middle, river pile with the lake underneath, start tile back to the box.
2. Bends: L-R ✓, L-straight-L ✓, L-L ✗ (based on the official "Watch out!").
3. Edges must match: a river that connects but whose city meets grass ✗.
4. Meeple spots on CIRI: knight, highwayman on the bridge road, farmers in the 4 meadow pieces, a red X on the water.
5. The river splits fields; the meadow wraps round the spring and lake.
6. Abbot on the garden (IIG) and on the river monastery (LIRI).
7. The official completed river (layout above).

## Open questions and uncertainties

* **Unplaceable river tile:** the 3rd-edition River text is silent. We apply the base "back in the box, draw again" rule, which the River II rules explicitly extend to river tiles.
* **"Turn twice in the same direction"** on its own is ambiguous. The Big Box ("twice in a row"), HiG ("nacheinander"), the HiG FAQ and the official example all settle it as *immediate* bends only.
* **Art details** were read from small (~190 px) rulebook images. Minor items, like the lake's NE trickle, the identity of the paddock animals and the RrII travellers, are best-effort.
* **Art orientation:** the art of the two straight tiles and the spring is given in our chosen canonical orientation. This matches JCZ's geometry, but a straight tile's art could equally be described rotated 180°.
