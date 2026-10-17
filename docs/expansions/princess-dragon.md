# The Princess & the Dragon (Expansion 3): 3rd-edition rules spec

Slug `princess-dragon`. We implement the **3rd edition**: Hans im Glück 2014/2016 art by Anne Pätzke, English
text Z-Man/F2Z 2016, with gardens on two tiles. The machine-readable tile list and rules are in
`princess-dragon.json`. This file explains the rules, the edge cases and the sources.

**Contents:** 30 land tiles, 1 dragon and 1 fairy. The dragon and the fairy are neutral wooden figures. Every new
tile shows exactly **one** symbol:

| Symbol | Tiles | Effect (one line) |
|---|---|---|
| Volcano | 6 | The dragon jumps onto the new tile. No figure may be placed on that tile this turn. |
| Dragon | 12 | After the follower step, the dragon flies 6 steps and eats every figure on the tiles it enters. |
| Magic portal | 6 | Your follower may go onto an empty, unfinished feature of **any** tile. |
| Princess | 6 | You may send one knight home from the city the princess joins. |

The fairy does not appear on any tile. You move it instead of placing a figure. It protects its whole tile from the
dragon and scores bonus points (+1 at the start of your turn, +3 when the feature is scored).

---

## 1. Sources

| Key | Source | Used for |
|---|---|---|
| **EN** | English 3rd-ed rulebook, [HiG-hosted PDF](https://www.hans-im-glueck.de/wp-content/uploads/2023/08/carcassonne-expansion-3-the-princess-the-dragon-rulebook.pdf) (© HiG 2005/2016, English © F2Z 2016). The text is identical to [Z-Man's zm7813 PDF](https://cdn.svc.asmodee.net/production-zman/uploads/2024/09/zm7813_carcassonne_exp3_rules.pdf) (checked with a diff). | Primary rules, the "dragon's menu", the page of interactions with other expansions |
| **DE16** | German 3rd-ed rulebook [Carc_II_D_Erw3_Regel_low.pdf](https://www.hans-im-glueck.de/_Resources/Persistent/80fc117f79052213dfca1bebf62ce03a60767512/Carc_II_D_Erw3_Regel_low.pdf) (HiG 2016) | Original wording: "darfst einen Meeple darauf setzen. Dann wird das Spiel kurz unterbrochen: Der Drache zieht!"; "muss reihum jeder Mitspieler … ziehen"; the tunnel fields are not split |
| **DE07** | German rulebook [Spielanleitung_…Burgfraeulein_und_Drache.pdf](https://www.hans-im-glueck.de/wp-content/uploads/2023/08/Spielanleitung_Carcassonne_Burgfraeulein_und_Drache.pdf) (HiG 2007) | Old rules: the princess *must* remove a knight; the fairy goes *on a tile* |
| **ZM12** | Z-Man English rulebook 2012 (1st-ed art), [cundco.de PDF](https://cundco.de/media/bd/dd/b8/1715104317/cc-1-0-3-exp-en.pdf) | Says explicitly: "Then, **before scoring**, the game is interrupted"; "6 different tiles" |
| **CAR** | Complete Annotated Rules v7.3 (Dec 2014), [PDF](https://www.dover.nh.gov/Assets/government/city-operations/library/borrow/library-of-things/carcassonne-rules.pdf), pp. 52–62, 68–71, 203–215 | Official FAQ rulings, edition history, River II, Tower, comparison tables of figures |
| **JCZ-T** | JCloisterZone `princess_and_dragon.xml`, tile-set `princess-and-dragon:2` | Tile ids, counts, geometry |
| **JCZ** | JCloisterZone engine: `DragonCapability`, `DragonPhase`, `DragonMovePhase`, `FairyCapability`, `FairyPhase`, `PortalCapability`, `PrincessCapability`, `AbstractActionPhase`, `ActionPhase`, `GameStatePhaseReducer`, `Rule`; client `models/rules.js` | Reference interpretation and rule variants |
| **ART** | JCZ classic artwork `classic-6-5.9.0.jca` (1st-ed art, 29 images examined); 3rd-ed photos: [BGG 3233867](https://boardgamegeek.com/image/3233867) (2016 English punchboard), [BGG 2969451](https://boardgamegeek.com/image/2969451); Z-Man product photos; tiles shown in the EN rulebook | Art layout and positions of the symbols |
| BGA | [BGA game help](https://en.doc.boardgamearena.com/Gamehelpcarcassonne) | Secondary check only (BGA simplifies some rules) |

I could not use Wikicarpedia because it blocks automated access, and web.archive.org returned 429/connection resets.
For the FAQ material I used the CAR instead, which is the Wikicarpedia community's own compilation.

---

## 2. Tiles (30)

Geometry follows **JCZ-T** set `:2`. Half-edge notation follows FORMAT.md. "Edges" lists the N, E, S, W edge types
(C = city, R = road, F = field).

| id | n | symbol | edges NESW | features (cities first; field → bordering city) | notes |
|---|---|---|---|---|---|
| DG/F.v | 1 | volcano | FFFF | field all 8 halves | volcano centre-left; 3rd-ed: hut near NE |
| DG/R.v | 1 | volcano | FFRF | road S (ends at the volcano); field all 8 halves | the field wraps round the road end |
| DG/C.v | 1 | volcano | CFFF | city N; field EL ER SL SR WL WR →N | volcano in the south half |
| DG/Rr.v | 1 | volcano | FFRR | road W–S; field WR NL NR EL ER SL; field SR WL | volcano upper middle (NE) |
| DG/RFr.v | 1 | volcano | FRFR | road W–E; field WR NL NR EL; field WL SL SR ER | road a bit below centre, volcano north of it |
| DG/CC.v | 1 | volcano | CCFF | city N; city E (separate); field WL WR SL SR →N,E | volcano SW |
| DG/C.dG | 1 | dragon | CFFF | city N; field EL ER SL SR WL WR →N; **garden** | garden W/SW, dragon SE (3rd-ed version of C1 `C.d`) |
| DG/LRRR.d | 1 | dragon | FRRR | roads E, S, W (three separate roads, each ending at the monastery); fields WR NL NR EL / ER SL / WL SR; **monastery** | dragon NE |
| DG/RRR.d | 1 | dragon | FRRR | roads E, S, W (junction); fields WR NL NR EL / ER SL / SR WL | farmstead in the centre, dragon NW |
| DG/LCcc.d | 1 | dragon | CCFC | city N E W; field SL SR →city; **monastery inside the city** | church W/NW inside the city, dragon SE |
| DG/Rr.d | **2** | dragon | FFRR | road W–S; field WR NL NR EL ER SL; field SR WL | dragon NE |
| DG/RFr.d | 1 | dragon | FRFR | road W–E; field WR NL NR EL; field WL SL SR ER | dragon NW |
| DG/Cc.d | 1 | dragon | CFFC | city N W (diagonal); field SL SR EL ER →city | dragon SE |
| DG/CFc+.d | 1 | dragon | FCFC | city W E band, **1 pennant**; field NL NR →city; field SL SR →city | pennant E, dragon NW |
| DG/CRcr.d | 1 | dragon | RCRC | city W E band; **road N–S through a tunnel (one road)**; field NL NR →city; field SL SR →city | the road does **not** split either field |
| DG/RrC.d | 1 | dragon | CFRR | city N; road S–W; field WR EL ER SL →N; field WL SR | dragon E |
| DG/CRr.d | 1 | dragon | CRRF | city N; road E–S; field EL WL WR SR →N; field ER SL | dragon W; 3rd-ed: trees at the bend |
| DG/RrRr.g | 1 | portal | RRRR | road N–W; road S–E; field NL WR; field SL ER; field NR EL SR WL | portal in the NE part of the middle field |
| DG/RRR.g | 1 | portal | FRRR | roads E, S, W (junction); fields WR NL NR EL / ER SL / SR WL | 3rd-ed: trees at the junction, farmhouse NW, portal NE |
| DG/Ccc+.g | 1 | portal | CCFC | city N E W, **0 pennants (3rd ed)**; field SL SR →city | portal centred in the S field. **See §10.1**: 1st ed / JCZ have 1 pennant |
| DG/CcRr.g | 1 | portal | CRRC | city N W; road E–S; field EL SR →city; field ER SL | portal in the SE corner field inside the curve |
| DG/RrC.g | 1 | portal | CFRR | city N; road S–W; field WR EL ER SL →N; field WL SR | portal E |
| DG/CRr.g | 1 | portal | CRRF | city N; road E–S; field EL WL WR SR →N; field ER SL | portal W, slightly below centre |
| DG/CRRR.p | 1 | princess | CRRR | city N **princess**; roads E, S, W (junction); field WR EL →N; field WL SR; field ER SL | princess NW of the city |
| DG/CCc+.p | 1 | princess | CCCF | city N **princess** (a cap that narrows into a band down to the SW corner); city E S **1 pennant**; field WL WR →N; **inner field** (no halves) →N, E-S | see the art note below |
| DG/Ccc.p | 1 | princess | CCFC | city N E W **princess**; field SL SR →city | 3rd-ed: round blue-spired tower NE; no pennant |
| DG/Cc!.p | 1 | princess | CFFC | city N W **princess** (fills most of the tile); field EL ER →city; field SL SR →city (**two separate fields**) | the E and S walls meet at the SE corner |
| DG/Cc.pG | 1 | princess | CFFC | city N W **princess**; field SL SR EL ER →city; **garden** | garden SE (3rd-ed version of C1 `Cc.p`) |
| DG/CcRr.p | 1 | princess | CRRC | city N W **princess**; road E–S; field EL SR →city; field ER SL | princess NW |

Totals: 30 tiles (29 types), 6 volcanoes, 12 dragon tiles, 6 portals, 6 princess cities, 2 gardens, 2 monasteries.
There are 2 pennants (3rd ed) and 3 in JCZ / the 1st edition.

**How the tiles were checked:** a script checked every tile. For each side that is not a city, both half-edges belong
to exactly one field. The centre port of every field side resolves to the field holding both halves. No port is
claimed twice. Every `cities` index points to a city. A second script compared all 29 types with JCZ-T: the only
difference is the deliberate pennant change on `Ccc+.g`.

**Art notes (paint in canonical orientation, north up).** All 1st-ed images in the JCZ package are already in
canonical orientation. The 3rd-ed tiles I could see (F.v, RRR.g, CRr.d, CRr.g, CcRr.g, CcRr.p, CFc+.d, CCc+.p, Ccc.p,
Ccc+.g, LCcc.d, C.v, CC.v, CRRR.p, Cc.pG, C.dG, RrC.d) have the same layout as the 1st edition. Only the decoration
differs (blue roofs, trees, farmhouses).

* What the symbols look like: the **volcano** is a small erupting cone with a glowing crater. The **dragon** is a red
  dragon (head and wings) in a white oval. The **portal** is a dark cave mouth in a grassy mound, with three arrows
  pointing outwards. The **princess** is a crowned blonde lady inside a white frame shaped like tower battlements.
  The **garden** is a rectangular flower bed.
* `CCc+.p`: the princess city covers the whole N edge. Its wall then narrows into a city band that runs diagonally down
  to the **SW corner point**. It touches the W side only at that corner, so the W edge stays field. The corner city
  fills the SE (both the E and S edges) and has a pennant near the SE corner. A diagonal field band from the NE corner
  to the SW corner touches no edge: it is the enclosed field (`inner: true`) and borders both cities. A narrow field
  strip runs along the W edge.
* `Cc!.p`: the city covers N and W and most of the tile. Its east wall runs just inside the E edge and its south wall
  just inside the S edge. The two walls meet at the SE corner, so the E strip and the S strip are separate fields.
* `CRcr.d` (tunnel): a short road from the N edge enters a gate in the city's north wall and comes out of a gate in
  the south wall to the S edge. It is **one road**. The field strips above and below the city are each one undivided
  field (DE16: "Die untere Wiese ist nicht unterbrochen, die obere Wiese ebenfalls nicht"; ZM12: "each field (top and
  bottom) is not divided"). The EN sentence "The fields, however, are separate" means the upper field is separate
  from the lower field.
* `LCcc.d`: the monastery church stands inside the three-sided city, in the W/NW part, in a small green yard. It is a
  separate monastery feature. A monk may join even if the city has knights, and vice versa. It scores 9 when it is
  surrounded by 8 tiles, even if the city is unfinished (EN p.1).

---

## 3. Exact turn sequence

1. **Start of turn: fairy point.** If the fairy stands next to one of *your* followers, score 1 point. This happens
   only once per turn, so not again for the builder's second tile (EN p.5; EN interactions page; CAR fn 126).
2. **Draw.** Suppose the tile shows the **dragon** symbol and the dragon is not on the board yet (no volcano has been
   placed so far). Set the tile aside face up and draw a replacement; repeat if needed (EN p.3 "Important"). A tile
   that cannot be placed is discarded as in the base game.
3. **Place the tile** (normal rules), then resolve its symbol:
   * **Volcano:** move the dragon from wherever it is onto this tile, or from beside the board the first time. It
     eats nothing, because the tile is new. If this is the **first** volcano, shuffle all set-aside dragon tiles back
     into the face-down supply now, "before continuing" (EN p.3).
   * **Princess:** suppose the princess's city segment joins a city that already holds one or more knights. You
     **may** return one of those knights to its owner (EN p.4). If you do, **skip step 4 completely**.
4. **Follower step.** Do **at most one** of the following:
   * place one figure on the new tile by the normal rules. Not allowed if the tile is a volcano, and never on the
     tile where the dragon stands;
   * on a **magic portal** tile: place one follower on an unoccupied, unfinished feature of any tile in play;
   * move the **fairy** next to one of your followers;
   * use another expansion's alternative: return your abbot and score it, or place a tower piece or a follower on a
     tower.
5. **Dragon flight.** This happens only if the new tile shows the dragon symbol. It always does when such a tile is
   placed, because dragon tiles cannot be placed before the dragon is in play. Starting with **you** and going
   **clockwise**, each player **must** move the dragon one tile up, down, left or right onto a placed tile. This goes
   on until it has moved **6** times or cannot move. It may not enter a tile already visited during this flight,
   including its start tile, nor the fairy's tile. On every tile it enters, it eats every figure, which goes back to
   its owner.
6. **Scoring** of features completed this turn. The fairy gives +3 to the owner of the follower it is assigned to,
   if that follower's feature scores.
7. *(Traders & Builders)* For the builder's second tile, repeat steps 2–6. Step 1 is not repeated.

**Why the dragon flies after the follower step and before scoring.** The EN/DE16 rulebooks put "1b. The dragon moves"
between "1. Placing a tile" and "2. Placing a meeple". However, the text of both says the meeple is placed first:
"you are allowed to place a meeple on a Dragon tile. Then… the dragon moves!" / "darfst einen Meeple darauf setzen.
Dann wird das Spiel kurz unterbrochen: Der Drache zieht!". ZM12 says "Then, before scoring, the game is interrupted".
The CAR (fn 137, 139, 152) records the HiG FAQ: you may place a follower or move the fairy first, and the dragon flies
before scoring. JCZ's default `dragon-move = before-scoring` is flagged HiG/ZMG. Only the old RGG Big Box scored
first.

---

## 4. The rules in detail

### 4.1 Volcano (6)
* Place it normally. The dragon is then moved straight onto it, from its current tile or, for the first volcano, from
  beside the board (EN p.2).
* **No figure may be placed on the volcano tile** that turn: no meeple, large meeple, abbot, builder or pig (EN p.2;
  CAR fn 133–134). You **may move the fairy** instead (EN p.2). You may also use other expansions' actions that do
  not put a figure on the volcano tile, such as a tower piece or a follower on a tower elsewhere (CAR fn 134).
* Features completed by the volcano tile, for example `C.v` closing a city, are **scored normally** that turn. "Then it
  is the next player's turn" only means that the dragon does not fly.
* Later turns: once the dragon has left, a follower may be put on an older volcano tile through a magic portal.
  This is our interpretation; nothing forbids it, and JCZ allows it.
* The first volcano activates the dragon tiles: any set-aside dragon tiles are shuffled back in immediately.
  *(JCZ instead keeps the dragon tiles out of the draw until a volcano is placed, which is statistically the same.)*

### 4.2 Dragon tiles (12) and the dragon's flight
* A dragon tile can only be played once the dragon is on the board (see step 2). You may place a meeple on it as
  usual (EN p.2), but it is at risk.
* **Order of moves:** the active player moves first, then players go clockwise. With 2 players: A B A B A B. With 3:
  A B C A B C. With 4: A B C D A B (the EN example). With 5: A B C D E A. With 6: one step each.
* Each step moves **one tile orthogonally onto an adjacent placed tile**, never across an empty space.
* The dragon may **not** enter a tile it has already visited *during this flight*, and the start tile counts (CAR
  fn 140). It may **not** enter the fairy's tile, even when the fairy is assigned to no follower.
* **Nobody may pass.** If a legal move exists, the player must take it (DE16 "muss … ziehen"; "zieht immer 6 Plättchen
  weit"). Players choose among the legal moves freely.
* **Dead end:** the flight ends early when every neighbouring position is empty, already visited or the fairy's tile
  (EN p.2).
* **Eating:** on every tile it *enters*, including the last one, it eats **all** figures of **every** player. Nothing
  is eaten on the tile where the flight starts. Eaten figures return to their owners' supplies and score nothing.
* **The dragon blocks placement:** no follower may ever be placed on the tile where the dragon stands (CAR p.55: "At
  no point may followers occupy the same tile as the dragon"; JCZ `DragonCapability.isMeepleDeploymentAllowed`; BGA).

### 4.3 What the dragon eats (EN p.3)
* **Eats:** meeples in every role (knight, thief, monk, farmer), the **abbot**, the **large meeple**, the **builder**,
  the **pig**, and a **meeple on a tower**. The rulebook also lists figures that are out of scope here: mayor, wagon
  and shepherd.
* **Does not eat:** land tiles, the **fairy** (it may not even enter her tile), **tower pieces**, and out-of-scope items
  (barn, bridges, castles, meeples in a castle or in the Count's city).
* A side effect: when the dragon eats a player's **last** knight or thief in a city or road where that player has a
  **builder**, the builder returns too. A **pig** returns when its owner's last farmer in that field is eaten. This
  applies even if the builder or pig stands on a tile the dragon never entered (EN p.6).

### 4.4 Magic portal (6)
* Instead of placing on the portal tile, you may place **one** follower on **any tile already in play** (EN p.4).
* Normal rules still apply. The feature must be **unoccupied** and **not completed**. That includes features which the
  portal tile itself has just completed (CAR fn 158, 160). However, you may still place on the portal tile's *own*
  features as usual, including a feature it has just completed.
* Usable by "all figures that are used like meeples": the normal meeple, the **large meeple** and the **abbot**, which
  goes only onto a monastery or garden (EN p.4). Fields elsewhere are allowed if farmers are in use.
* **Not** usable for the **builder or pig** (EN p.6). They may still be placed normally on the portal tile.
* Never onto a river, and never onto the **dragon's current tile**.
* Towers are reached by the Tower rules, not by the portal. JCZ excludes towers from portal targets.

### 4.5 Princess (6)
* Suppose the city segment **with the princess** continues a city occupied by one or more knights. You **may** remove
  **one** knight of your choice from that whole connected city and return it to its owner. It can be any player's
  knight, even your own (EN p.4, "may"). A large meeple is removed like any other knight (CAR fn 162).
* Only the princess's city counts. On `CCc+.p` the separate pennant city is not affected. A princess city that starts a
  new city, or joins an empty one, does nothing.
* If you remove a knight, **you may not place any figure this turn**, not even on a road or field of the princess
  tile (EN p.4). That also rules out the abbot, builder, pig and **fairy** (EN p.6), and in our reading also an abbot
  recall or a tower action (CAR p.205, which skips the whole step).
* The removal happens before scoring, so a princess tile that completes a city can kick a rival out before that city
  is scored.
* If the removed knight was its owner's last knight in that city, the owner's **builder** returns too (EN p.6).
* Cannot be removed by the princess: a monk on `LCcc.d`'s monastery, a follower on a tower (CAR fn 165), and prisoners.
  None of them is in the city.

### 4.6 Fairy
* It starts beside the board. **On any turn in which you do not place (or move) a figure**, you may move the fairy,
  from wherever it is, and **assign it to one of your followers** by standing it directly next to that follower (EN
  p.5). It is attached to a follower, not to a tile.
* Any of your followers anywhere qualifies: knight, thief, monk, farmer, large meeple, abbot, or a follower on a tower
  (CAR fn 124). A builder or pig does not qualify (CAR fn 122). You need at least one follower on the board (CAR
  fn 123). You may move it after a volcano, and when your supply is empty.
* Moving the fairy is your whole step 4: no meeple, abbot, builder, pig, portal or tower action that turn (EN p.6).
  It is not possible after a princess removal.
* The fairy has three effects (EN p.5):
  1. **+1 point** at the start of your turn if it is still assigned to your follower.
  2. **Protection:** the dragon may not enter the fairy's tile, so *all* figures on that tile are safe, whoever owns
     them.
  3. **+3 points** when the feature containing its follower is scored, "regardless of whether or not you score points
     for the scored feature". A minority or a 0-point farm still gets +3. A large meeple still gets only 3. The
     follower goes home and **the fairy stays on its tile**.
* When its follower leaves the board, the fairy stays on that tile, assigned to nobody. This happens when the follower
  is scored, removed by a princess, captured by a tower or recalled as an abbot. The fairy still blocks the dragon but
  scores nothing until someone moves it (EN p.5; JCZ `UndeployMeeple` keeps the fairy's position).
* Moving the fairy next to a follower whose feature you complete this turn earns +3 at once, because the fairy moves
  before scoring (CAR fn 130).
* **The tower does not stop for the fairy:** the fairy does not protect against tower capture (EN p.6).

### 4.7 Scoring summary
| When | What |
|---|---|
| Start of your turn | +1 if the fairy is next to one of your followers (once per turn) |
| Feature scored, during play or in final scoring | +3 to the owner of the follower the fairy is assigned to, whatever the majority |
| Dragon flight | eaten followers score nothing; a feature emptied before scoring scores nobody |
| Princess | the removed knight does not take part in the scoring |

End game: no new rules. The fairy's +3 also applies in final scoring, to incomplete roads, cities, monasteries and
gardens and to farms. The rule text names farms, which only ever score at the end, and JCZ applies it in final
scoring.

---

## 5. Edge cases and clarifications

* The dragon may not return to its start tile within one flight (CAR fn 140). Earlier flights do not matter.
* Eaten figures include the active player's own meeple placed this turn on the dragon tile.
* A volcano placed while the dragon is already in play only moves the dragon. Set-aside tiles exist only before the
  first volcano.
* An unplaceable dragon tile or volcano is discarded under the base rule: no flight and no jump.
* If no volcano is ever placed (in practice only if every volcano was unplaceable), the set-aside dragon tiles are
  never played.
* The fairy and the dragon can never share a tile. The dragon never enters the fairy's tile, and the dragon's tile
  holds no followers for the fairy to stand next to.
* The fairy's +1 goes to the follower's owner at the start of **that player's** turn. The +3 goes to the owner even when
  someone else completes the feature. In the EN p.5 example, Blue completes the city and Red scores 8+3.
* A player with no follower on the board cannot move the fairy (CAR fn 123).
* The princess is optional, and you may remove your own knight (EN p.4).
* A portal cannot reach a feature that was completed but not yet scored (old wording, corrected by FAQ: CAR fn 158).
* Placing a tower piece on a dragon-tile turn: the capture resolves before the dragon flies (CAR fn 138).
* A follower on a tower is eaten if the dragon enters that tile (EN p.3; CAR fn 147). The tower may then grow again
  (CAR fn 200).
* Builder double turn: the fairy point is scored once (EN p.6). Each half of the turn has its own step 4, so the fairy
  may be moved in either half.
* The no-revisit rule applies to one flight ("during one movement phase", ZM12). If both tiles of a double turn are
  dragon tiles, the dragon flies twice, and the second flight may cross tiles visited in the first. JCZ also resets
  the visited list after each flight.
* A princess removal cancels only the follower step of the half of a double turn in which it happened (CAR p.205,
  where step 9a repeats steps 2–8).
* The second tile of a double turn is still drawn if the dragon eats your builder, or its last knight or thief, in
  the first half. The double turn is triggered when the tile is placed (JCZ `TilePhase`), just as completing the
  builder's road still grants the second tile.

---

## 6. Interactions with the other expansions in scope

**Base game.** Farmers are eaten like any meeple. A fairy next to a farmer is a classic long-term play: +1 every turn,
safe from the dragon, and +3 at final farm scoring. The princess portrait is not a pennant.

**River.** River tiles are ordinary tiles for the dragon. It may fly over them, though not over gaps, and it eats
followers on their roads, cities and fields. No follower may ever stand on the river, portal included. The P&D tiles go
into the main stack, so no dragon tile can appear while the river is being laid.
*River II (only if that set is used):* its lake tile carries a volcano. When it is placed, always as the last river
tile, the dragon goes onto it and dragon tiles become playable. The player may not place a follower there. River II's
own rule then lets that player immediately draw and place another tile (CAR River II, fn 179–180). That is a River II
exception to the normal volcano turn. Without P&D, the volcano is decoration.

**Abbot.** The abbot is on the dragon's menu: it is eaten and returns without scoring. It may use the portal to reach
any unoccupied, unfinished monastery or garden (EN p.4). The fairy may be assigned to it. Recalling the abbot is your
step-4 action. It excludes moving the fairy, and it happens before the dragon flies, so it can save the abbot.
No abbot may be placed after a princess removal (EN p.6). By the same logic, the abbot cannot be recalled that turn
either. The gardens on `C.dG` and `Cc.pG` and the
monasteries on `LRRR.d` and `LCcc.d` are normal.
*Our interpretation:* a recall scores the monastery or garden, so a fairy assigned to that abbot gives +3. JCZ does not
award this.

**Inns & Cathedrals.** The large meeple is eaten. A princess removes it as one knight. It may use the portal and may
have the fairy. The fairy's bonuses stay +1 and +3, not doubled. Inns and cathedrals do not change the fairy bonus.

**Traders & Builders.**
* The builder and the pig are eaten on the tiles the dragon enters.
* When a player's last supporting follower is eaten or removed by the princess, their builder or pig returns too.
* The portal may not place a builder or pig.
* The fairy cannot stand next to a builder or pig.
* Moving the fairy, or a princess removal, means no builder or pig placement that turn.
* In a double turn the fairy point counts once. A dragon tile in either half of a double turn makes the dragon fly in
  that half, before that half's scoring.
* No builder or pig may go on a volcano tile. A volcano that extends a road or city with your builder still triggers
  the double turn.
* Goods tokens are unaffected.

**Tower.**
* The dragon eats a follower standing on a tower. Tower pieces are not eaten and do not block the dragon.
* The fairy does not protect against capture (EN p.6). If its follower is captured, the fairy stays on the tile
  unassigned.
* The fairy may be assigned to a follower on a tower: +1 per turn and protection, but no +3, because tower followers
  never score.
* A tower piece or a tower follower is the step-4 action. It excludes the fairy and the portal, is not allowed after a
  princess removal, and its capture resolves before the flight.
* The princess cannot remove a follower on a tower. Prisoners are off the board and safe from both the dragon and the
  princess.
* *Our interpretation:* no follower may be placed on top of a tower that stands on the dragon's current tile, because
  followers may never occupy the dragon's tile. JCZ allows it.
* After a volcano you may still place a tower piece (CAR fn 134) or, by the same reasoning, put a follower on a tower
  elsewhere. The volcano rule only forbids figures *on the volcano tile*. JCZ allows both.

---

## 7. Edition differences

* **Tiles:** the 3rd edition replaces `C.d` and `Cc.p` with the garden versions `C.dG` and `Cc.pG`. The geometry is
  otherwise unchanged (JCZ sets `:1` and `:2` differ only by gardens). The 3rd-ed photo shows the three-sided portal
  city without its pennant (§10.1).
* **Princess:** the old rule was that you *must* remove a knight (HiG 2005/2007, RGG, Z-Man 2012). It is now *may*
  (HiG since Big Box 2; EN 2016).
* **Fairy:** it used to go *on a tile* with one of your followers (RGG/ZMG 2012), so several followers on that tile could
  profit. It now goes *next to one follower* (HiG; EN 2016).
* **Fairy after a volcano:** an old FAQ said no. The 3rd ed says yes.
* **Dragon timing:** before scoring (HiG, ZMG). The RGG Big Box scored first.
* **Builder and pig** used to count as followers. They no longer do, but they are still on the dragon's menu, and they
  return when their last supporting follower is removed.
* **Portal:** the original wording allowed completed but unscored features. This was corrected by FAQ.
* **Volcano:** older rules allowed a builder or pig on the volcano tile. Now no figure may go there.
* The **2025 "Dragon & Fairy" (C3.1)** redesign has 24 tiles and no princess. It is a different product and is not
  covered here.

## 8. JCloisterZone notes
* Rule variants: set `princess-action = may` (flagged HiG), `fairy-placement = next-follower` (HiG) and
  `dragon-move = before-scoring` (HiG/ZMG). That matches the 3rd edition. The alternatives `must`, `on-tile` and
  `after-scoring` are the old RGG/ZMG readings.
* Phase order in `GameStatePhaseReducer`: FairyPhase (+1), then Tile, then Action (meeple, portal, fairy, princess and
  tower are all alternatives in one action phase), then Tower capture, then **DragonPhase**, then Commit, then
  Scoring.
* `DragonMovePhase`: the mover index is `(turnPlayer + visited.length) % players`. The visited list includes the start
  tile. Excluded targets are empty spaces, visited tiles and the fairy's tile. Up to 6 moves. Everything on an entered
  tile is eaten, except figures in a castle and barns.
* Places where JCZ differs from our choices: it gives the `Ccc+.g` city 1 pennant; it allows a follower on a tower top
  on the dragon's tile; it gives no fairy +3 on an abbot recall; it deactivates the dragon tiles instead of setting
  them aside.

---

## 9. AI hints
* **Steering the dragon:** pick the step that maximises the value of opponents' figures eaten minus your own over the
  rest of the flight. The tree is tiny: at most 3 branches over 6 steps. Model the other movers as greedy for
  themselves (max-n), or as "paranoid" against you.
* **Value of a figure:** roughly the expected points of its feature for its owner, plus about 2 for the meeple tempo.
  Late-game farmers and knights in big, nearly finished cities are prime targets.
* The dragon flies **before** scoring. Completing a feature with a dragon tile is risky if the dragon can reach it.
* **Volcanoes:** place them next to opponents and far from you. You can't place a meeple that turn, so consider moving
  the fairy.
* **Threat map:** a tile within a path distance of 6 through placed tiles, avoiding the fairy, is at risk; the risk is
  highest within 3–4 tiles. Scale it by the share of dragon tiles still in the stack (12 in total).
* **Fairy priorities:** (1) save a valuable follower within the dragon's reach; (2) a farmer or other long-lived
  follower for +1 every turn; (3) a follower in a feature you complete this turn, for +3 now.
* Moving the fairy costs your placement. Prefer it when your best placement is weak or your supply is low.
* **Princess:** use it when it wins or keeps the majority in a valuable city, or when the princess tile completes the
  city and you can score it alone. Skip it when your placement is worth more.
* **Portal:** rank every open feature on the board (unclaimed big cities near completion, monasteries with 6–7
  neighbours, big late fields, sharing a rival's feature) and discount by dragon risk.
* When you place a dragon tile, you take the first step (steps 1, 3 and 5 with 2 players). Plan the path before
  choosing where the tile and meeple go.
* An abbot recall is an emergency escape from an approaching dragon.

## 10. Decisions and uncertainties
1. **Pennant on `DG/Ccc+.g` (three-sided portal city): we use 0.** The 3rd-ed tile in [BGG image
   2969451](https://boardgamegeek.com/image/2969451) clearly shows no pennant. It is a blue-roofed post-2014 tile with
   the portal and the expansion mark in its field. The 3rd-ed `Ccc.p` in the EN rulebook example has no pennant
   either. The 1st-ed art and JCZ (both sets) have 1 pennant. JCZ's `:2` sets only ever add gardens, which suggests
   nobody checked other 3rd-ed changes. I found no second 3rd-ed image of this tile. Flip `pennants` to 1 if better
   evidence turns up.
2. **The fairy +3 on an abbot recall:** the rule text ("when scoring a feature") suggests yes. JCZ says no. We chose
   yes.
3. **The fairy +3 in final scoring:** yes (the rule names farms; JCZ agrees).
4. **A follower on a tower on the dragon's tile:** we forbid it (CAR principle). JCZ allows it.
5. **A follower on an older volcano tile via the portal:** allowed once the dragon has left (no rule against it; JCZ
   agrees).
6. **The "1b" heading against the text:** we follow the text and the FAQ. The order is meeple or fairy, then the
   dragon, then scoring.
7. The symbol positions in the 3rd-ed art are approximate where no 3rd-ed picture was available. They come from the
   1st-ed art and match every 3rd-ed tile I could see.

## 11. Rules text for kids (in-app)
See `rules.kid_rules_text` in the JSON. In short: volcano = the dragon arrives and no meeple goes there; dragon = after
you place, everyone takes turns flying it 6 tiles and it eats every meeple it lands on; princess = you may send one
knight home but then you can't place; portal = put your meeple anywhere empty and unfinished; fairy = move her instead
of placing, for protection, +1 each turn and +3 at scoring.

## 12. Figure ideas
1. The dragon flight example: a 3×3 grid with numbered arrows 1–6 for 4 players, a crossed-out arrow back onto a
   visited tile, and meeples flying home.
2. The dragon's path bending around the fairy's tile.
3. A volcano with the dragon jumping in from far away, a "no meeple" badge and "move the fairy instead".
4. The dragon's menu: eats meeple, large meeple, abbot, builder, pig and tower meeple; doesn't eat fairy, tower pieces
   and tiles.
5. A princess sending a blue knight home, with a crossed-out meeple and fairy for "no placement".
6. A portal arrow to an empty unfinished city, plus crossed-out arrows to a finished city and to the dragon's tile.
7. Fairy points: +1 at the start of your turn and +3 at scoring. The example: both players score 8 and the fairy's
   owner gets 11.
8. A turn strip: draw → place (volcano/princess) → meeple OR portal OR fairy → dragon flies → score.
9. A close-up of the tunnel tile: one road under the city, with whole fields above and below.
