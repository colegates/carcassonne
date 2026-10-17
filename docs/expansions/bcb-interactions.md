# Bridges, Castles & Bazaars × base game and the six expansions — interaction rulings

*3rd edition: HiG "Brücken, Burgen und Basare" (DE, © 2010/2017) and the Z-Man English text (© 2010/2018, the copy
hosted by HiG). Researched 2026-10-17 for expansion #8. This file covers only how BCB interacts with the base game,
The River, The Abbot, Inns & Cathedrals, Traders & Builders, The Princess & the Dragon and The Tower, plus the FAQ
edge cases. BCB's own rules and its 12 tiles are specified separately; they appear here only where an interaction
depends on them.*

**Relation to MASTER.md.** Same precedence: (1) 3rd-edition rulebook text, (2) official publisher clarifications,
(3) community interpretations, (4) JCZ behaviour. Nothing here changes a MASTER ruling. §9 lists exactly where the
BCB steps go in MASTER §A. Rule IDs below (BB-, RV-, AB-, IC-, TB-, PD-, TW-, GN-) are local to this file.

**Labels**

| Label | Meaning |
|---|---|
| **Rulebook** | Text of a 3rd-edition rulebook: BCB DE 2017 / EN 2018, P&D EN 2016, Tower EN 2017, base supplement (River/Abbot). |
| **Official** | Hans im Glück clarification, as recorded by WikiCarpedia (book icon or FAQ box) or by S-CAR, with its date. |
| **Official\*** | Answer by Christof Tisch (Hans im Glück; credited with the BCB rules layout) on BoardGameGeek. WikiCarpedia cites such answers as confirmations, but they are not formal FAQ entries. |
| **Community** | WikiCarpedia (world icon), CAR/S-CAR editors, BGG players. |
| **JCZ** | JCloisterZone behaviour (`farin/JCloisterZone` @ `29a1561`, 2023-03-27; tile XML in `farin/JCloisterZone-Client`). |
| **Derived** | Follows from the cited rule text plus MASTER rulings. No source says it in so many words. |

---

## Rulings at a glance

| # | Ruling |
|---|---|
| 1 | The bridge is chosen **together with the tile** (step 2). It goes on the new tile or one orthogonal neighbour, at most one per tile and one per tile placement, with both ends on field edges. Afterwards every edge must match, so each end faces an empty space or a road. A tile that fits only with a bridge may be discarded instead. |
| 2 | Fields and cities are never split by a bridge. A bridge is one road tile when scored (once per tile). It joins an inn road only by connection. |
| 3 | **Small city** = exactly two **semicircular** one-edge caps. Not eligible: `IC/C!`, the princess city of `DG/CCc+.p` and BCB's witch-hat tile. Its follower's owner decides (needs a token), inside step 6, before anything scores. A converted city scores nothing (no fairy +3, no goods). |
| 4 | A castle scores from the first feature completed in its 6-space fief **by a later tile placement**. Part 2 of a double turn and bazaar-round turns count (recommended; the stricter reading is in BB-10). |
| 5 | Castle value = the feature's full value (inn ×2, cathedral ×3), never the fairy bonus. With several features at once the owner picks one (= the highest). Chained castles all get the same value. Garden completion (even with the garden empty) triggers; an abbot recall never does. |
| 6 | Castellans are never eaten, captured or removed by the princess. The fairy may stand by one: +1 per turn, +3 when the castle scores during play. All castellans leave before final scoring: no points, no fairy +3. |
| 7 | Meeples on bridges are eaten by the dragon (on entered tiles) and can be captured by towers. Bridges and castle tokens are never eaten or captured. The builder and the large meeple may stand on bridges; the abbot and the pig may not. |
| 8 | Fields: a castle is worth **4** (5 to a winning pig owner) whether or not it has scored. Castles separate fields. |
| 9 | A bridge that extends the builder's road triggers the double turn. With a bazaar tile in part 1: **whole bazaar round first, then part 2**. |
| 10 | **Bazaar-round placements are full normal turns**: fairy +1, ransom, princess, portal, tower, builder double turn, dragon flight. Only bazaars placed during the round are ignored. A dragon tile placed in the round flies at once. |
| 11 | Bazaar reveals follow the P&D set-aside rule. The auction is skipped if fewer drawable tiles remain than players. Scores may go negative; ransom still needs ≥ 3 points and is never paid during an auction. |
| 12 | River: bridge ends are never on river edges, but a bridge may span a river, spring or lake between two field edges. Bridges are allowed during the river phase. A bazaar can never occur in the river phase. |

---

## 1. Base game

| # | Question | Recommended ruling | Label | Sources |
|---|---|---|---|---|
| BB-1 | When is a bridge placed? | As part of the **placement action** (step 2): tile + optional bridge are one choice, made before the follower step, so a meeple can then go on it. A bridge built later in the turn could not do more. A voluntary bridge can never touch an existing road (BB-2), and nothing is revealed between placement and the follower step. | Rulebook; Community; JCZ | DE17/EN18 put the bridge under "1. Placing a tile" and the meeple on it under "2.". S-CAR fn 356, 360 ("the bridge is generally built before deploying a follower"). WiCa Order of Play allows "any time during the turn" (community). JCZ: mandatory bridge with the placement (`TilePhase`), voluntary bridge as an action before the meeple (`ActionPhase.handlePlaceBridge` re-enters the phase). |
| BB-2 | Where may a bridge go? | (a) On the new tile or a tile orthogonally adjacent to it. (b) That tile has no bridge yet (one per tile). (c) Axis N–S or W–E, and **both end edges are field edges** (that side is not city, road or river). (d) The player has a bridge left. (e) Both ends become road edges, and every edge must then match: each end faces an empty space or a road edge. That road edge can belong to an existing tile (only possible for a bridge on the new tile), to the new tile (bridge on a neighbour), or to an older bridge's end. At most **one bridge per tile placement**: up to two in a double turn, one per bazaar-round turn. A bridge may pass over cities, roads, monasteries, gardens and figures. A bridge whose two ends both face empty spaces is legal on the new tile **or on an adjacent tile** (it starts a new road). | Rulebook; Official; Official\* | DE17 p.1: "beiden Brückenpfeiler auf einer Wiese … (nicht auf Städten, Straßen, Flüssen etc.)", "Auf einem Plättchen darf nur 1 Brücke stehen", "auch über ein besetztes Plättchen". EN18 p.1. Official 12/2014: each end continues a road/bridge or is adjacent to an empty place (WiCa fn; S-CAR fn 358). Official\* BGG 542577 (2010): only two conditions, so a brand-new road on an adjacent tile is fine. Community BGG 775016. **JCZ offers voluntary bridges only on the new tile** (`BridgeCapability.onActionPhaseEntered`); that limitation is not adopted. |
| BB-3 | Placement legal only with a bridge | The player may place the tile with the bridge, **or discard it and draw again** (as for an unplaceable tile). A player with no bridge left cannot use such a placement. "Has a legal placement" (MASTER step 1) is therefore checked for the current player, bridge options included. | Official; JCZ | Official 10/2014: "may"; the player chooses between the bridge and discarding (WiCa fn; S-CAR fn 357). JCZ `TilePhase`: pass is allowed only when every placement needs a bridge. |
| BB-4 | Bridge end at the board edge / facing an empty space | Allowed. Carcassonne has no board edge. The empty neighbour then needs a road on that edge (or its own bridge continuing this one). | Official; JCZ | Official 12/2014. JCZ `PlacementsMixin.isBridgePlacementAllowed`. |
| BB-5 | Fields under bridges | **Not split.** A field running under the bridge stays one field, and the fields on both sides of a bridge end connect through it. A bridge never joins fields that the bridged-over city band, road or river separates. The engine already does this: the bridge is an extra road feature taking the two centre ports, and fields keep their outer ports. | Rulebook | DE17 p.2: "Wiesen oder Städte unter einer Brücke sind nicht getrennt". EN18 p.2: "Bridges do not separate cities or fields". Community BGG 3474601. |
| BB-6 | Scoring a road that uses a bridge | A bridge is a road segment of its tile: 1 point per tile (2 with an inn). Each tile counts once per road, even if its printed road and its bridge both belong to that road. An incomplete road at the end scores 1 per tile (0 with an inn). A road completed by the bridge scores in that part's step 6. | Rulebook; Community | DE17 p.2: "genauso gewertet wie eine Straße auf einem Landschaftsplättchen". Community 2/2014 (WiCa fn; S-CAR fn 359). WiCa Order of Play: "Roads … completed by placement of a bridge". |
| BB-7 | What is a small city (castle base)? | Exactly two tiles, each contributing **one semicircular city cap**, closed by the tile just placed. Not eligible: `IC/C!` (wedge wall reaching the corner), the princess city of `DG/CCc+.p` (a cap that runs on as a band) and BCB's witch-hat tile (see the BCB tile spec). Every other one-edge cap in our tile set qualifies: base game, River `CICI`/`CIRI`, I&C, T&B, P&D and Tower caps. Z-Man's looser "a city consisting of only 2 tiles" is not adopted. | Rulebook; Official\*; JCZ | DE17 p.3: "nur aus zwei halbrunden Stadtteilen". Official\* BGG 538079 (2010): "The upper city segment is not semi-circular, so it is not allowed." JCZ: `castle-base="false"` on `IC/C!`, `DG/CCc+.p` N, `BB/CFR!`, `BB/CFR!G`; `CastleCapability.initFeature`. EN18 p.3 differs ("only 2 tiles", WiCa arrow note). |
| BB-8 | Who decides, and when? | The **owner of the small city** decides: the player whose meeple or large meeple is in it, who may not be the active player. The decision comes in step 6, after the dragon flight and before any feature of this placement is scored. It needs a castle token in that player's supply. The follower becomes the castellan and stays on the board. If several decisions are due, they go in seat order starting with the active player. In our expansions a 2-tile city can only ever hold one follower. | Rulebook; JCZ | DE17 p.3: "darf der Besitzer der Kleinstadt sich entscheiden", "eines seiner Burgplättchen aus seinem Vorrat". EN18 p.3. JCZ `CastlePhase` (after `DragonPhase`, before `ScoringPhase`; turn player first). S-CAR / WiCa Order of Play step "Resolve completed features" (a). |
| BB-9 | What does conversion do to the city? | It is **not completed and not scored**: no 4 points, no fairy +3, no goods. It does not count as a completed feature for other castles. | Rulebook; Official; Community; JCZ | DE17 p.3: "Eine Burg mit Meeple ist noch nicht abgeschlossen". WiCa (book): "the castle is considered incomplete". S-CAR / WiCa Order of Play: "If converted, this feature's completion is considered to be resolved. Go to the next feature." (before goods). JCZ: the city becomes a `Castle` before `ScoringPhase`. |
| BB-10 | When can a new castle first score? | Never from features completed by the tile placement that created it. **Recommended:** it can score from the next tile placement on, **including part 2 of the same builder double turn** and the turns of a bazaar round. *Alternative (strict):* read "in einem späteren Zug" together with HiG's "the double turn is only a single turn". The castle is then ineligible for the rest of the creating player's turn, but eligible in other players' bazaar turns that fall inside it. The recommended reading avoids that oddity, matches MASTER §A.3 (scoring is per part) and matches JCZ. | Rulebook; Official\*; Community; JCZ | DE17 p.3: "in einem späteren Zug" (EN18 has no timing sentence). Official\* BGG 569109 (2010): "you can't build a castle and score for it in the same turn" (the case asked was the same tile). Community WiCa fn: "a later round of scoring … score it as soon as the second part of the same turn". JCZ `CastleCapability.getOccupiedCastles` (excludes castles that contain the last placed tile). |
| BB-11 | Fief and triggers | The fief is the castle's 2 positions plus the 2 positions on each long side: 6 spaces, counted whether or not they were filled when the castle was built. Triggers are features completed in later placements: a road or city (occupied or not) with at least one tile in the fief (bridge tiles count); a monastery or garden (AB-3) **whose own tile** is in the fief; and another castle that scores and lies in the fief (chain). Fields never trigger. The castle must take the **first** such completion. If several complete at once, the castle owner picks one; we auto-pick the highest, since the choice has no other effect. | Rulebook; Community; JCZ | DE17 pp.3–4. EN18 pp.3–4. Community BGG 2795427: a fief space filled later counts. JCZ `Castle.getVicinity`; `scoreCastles` sorts by points. |
| BB-12 | How much does a castle score? | The **full points of the triggering feature** as scored, including pennants, inn ×2 and cathedral ×3, **even if nobody scored that feature**. Never the fairy +3, never goods. The feature's owner and the castle owner both get it, so owning both pays twice. A large-meeple castellan collects it once. In a chain, every castle gets the same value. | Rulebook; Community; JCZ | DE17 p.4 and p.6 ("Zusatzpunkte für 1. Erw.: Straßen mit Wirtshaus und Stadt mit Kathedrale … auch für die Burgwertung"). EN18 p.6. Community 4/2014 ("after any bonuses … such as the Cathedral"). WiCa Order of Play note (tallied points, excluding bonus points). JCZ `ScoreCastle`. |
| BB-13 | Monastery completed in a castle's fief | Triggers if the **monastery's own tile** is one of the 6 spaces; a neighbour of the monastery lying in the fief is not enough. It is worth 9 to the castle owner even when the monastery is empty. Engine: `completedCloisters` currently reports only occupied monasteries and gardens. | Rulebook; JCZ | DE17 p.4 (bullet "Ein Kloster liegt nur dann in der Umgebung …"; "Du erhältst … auch Punkte für ein abgeschlossenes Bauwerk, für das niemand sonst Punkte bekommt"). JCZ `ScoringPhase` collects every completed `Monastic`. |
| BB-14 | Farmers and castles | At final field scoring a castle is worth **4** (a completed city: 3), whether or not it has already scored; castellans are gone by then anyway. Castles **separate fields** exactly as the small city did; the green printed on the token joins nothing. A castle is a feature type of its own, not a city. | Rulebook; Community; JCZ | DE17 p.4: "Eine Burg auf der Wiese zählt für die Bauernwertung 4 Punkte", "Eine Burg trennt die Wiesen genauso wie die überbaute Kleinstadt". EN18 p.4. S-CAR fn 94, 375. BGG 2458743. JCZ `Field.getCityPoints` (+1 per castle). |
| BB-15 | Game end | **Before final scoring** every castellan returns to its owner, unscored and without the fairy +3. Castle tokens stay and still count for fields. | Rulebook; Community; JCZ | DE17 p.4: "Entferne alle Meeple, die am Spielende noch auf einer Burg stehen, vor der Schlusswertung … Für sie bekommt niemand mehr Punkte." EN18 p.4: "an unscored castle is worth no points". WiCa (fairy). JCZ `FinalScoring`; `ScoreCastle` gives no bonuses when final. |
| BB-16 | A castle that loses its castellan without scoring | Cannot happen with our expansions: the dragon, towers and the princess cannot touch castellans. If it ever did, treat the castle as complete and inert. | Official\* | BGG 514053 (2010): "the castle becomes complete when the follower goes away". |

## 2. The River

| # | Question | Recommended ruling | Label | Sources |
|---|---|---|---|---|
| RV-1 | Can a bridge end on a river edge? | **Never.** | Rulebook; JCZ | DE17 p.1: "(nicht auf … Flüssen etc.)". S-CAR p.115. JCZ `EdgePattern.isBridgeAllowed` (both ends must be FIELD). |
| RV-2 | Can a bridge cross the river? | **Yes**, across the middle of a tile whose two end edges are fields. In River I that means only the spring `RI/s` (N–S, past the pool), the two straights `RI.1/IFI` (N–S across the river) and the lake `RI.1/I.e` (N–S over the lake). The bridge is a new road. It does not join the fields on the two banks; the river still splits them. | Rulebook; JCZ | The only test in the 3rd-edition rule is that both piers stand on fields. The 1st-edition English rules (Z-Man © 2010–2013, p.3 caption) say so explicitly: "Bridges may also be constructed one after the other over roads, monasteries, rivers, etc." JCZ allows it. No HiG clarification exists. The 2025 C3.1 redesign "Castles & Bridges" also builds bridges across rivers, but it is a different edition. |
| RV-3 | Bridges during the river phase | Allowed, including a mandatory bridge that lets a river tile's road meet a field edge. All river placement rules still apply. A bridge may make a later river tile unplaceable beside it; that tile is discarded as usual. | Derived; JCZ | The rules contain no river-phase exception. JCZ `RiverCapability.isTilePlacementAllowed` does not restrict bridge options. |
| RV-4 | Bazaar tiles in the river phase | **Impossible.** Bazaars are land tiles, and the land stack is drawn only after the river stack is empty, so an auction can never reveal a river tile. | Derived | MASTER §A.1–A.2 (river stack first, including builder part-2 draws). |
| RV-5 | River cities and castles | The caps of `RI.1/CICI` (both) and `RI.1/CIRI` are semicircular, so they can be halves of a small city. River tiles are ordinary fief spaces; a river is never a completed feature. | Derived; JCZ | Tile art (`river.json`). JCZ has no castle-base restriction on river tiles. |

## 3. The Abbot

| # | Question | Recommended ruling | Label | Sources |
|---|---|---|---|---|
| AB-1 | Abbot on a bridge or in a castle? | **No** to both. The abbot only goes on monasteries and gardens. | Rulebook | Base supplement: "the abbot must be placed either on a monastery or a garden". BCB's lists of figures allowed on bridges and in castles (DE17/EN18 p.6) do not include it. |
| AB-2 | Bridges over gardens and monasteries | Allowed when the tile has two opposite field edges, e.g. `BA/CG` (W–E), `BA/CFCG` (N–S), `BA/RFrG` (W–E). An abbot or monk underneath stays and scores normally. | Rulebook | DE17/EN18 p.2 example: a bridge over a monastery with a monk in it. |
| AB-3 | Does completing a garden trigger a castle? | **Yes.** If the garden tile is in the fief and the garden gets its 8th neighbour, the castle scores 9, **even if the garden is empty**. | Community; JCZ; Derived | WiCa BCB trigger list and table ("Garden … the garden tile overlaps the castle fief"). JCZ: `Garden` implements `Monastic`, so it is collected as a completed feature. Base supplement: "gardens are scored the same way as monasteries". The rulebook names only monastery, city and road; its text predates gardens. |
| AB-4 | Does an abbot recall trigger a castle? | **Never.** The monastery or garden is not completed; this is consistent with MASTER B1 (the recall scores the abbot, not the feature). The feature stays incomplete, and its later completion, even with nobody on it, does trigger. | Official (via B1); Community; JCZ | MASTER B1 (official 3/2015, 11/2020: "you always score the abbot … never the feature itself"). Community BGG 2400106. JCZ: `ActionPhase` ABBOT_RETURN never calls `scoreCastles`. |
| AB-5 | Abbot actions and bridges in one part | Independent. The bridge belongs to the tile placement, so a player may build a bridge and place or recall the abbot in the same part. | Derived | BB-1. |

## 4. Inns & Cathedrals

| # | Question | Recommended ruling | Label | Sources |
|---|---|---|---|---|
| IC-1 | Large meeple on a bridge | Allowed, on the bridge of the tile just placed, with strength 2 in that road. | Rulebook | DE17/EN18 p.6: "Exp. 1: large meeple". |
| IC-2 | Large meeple as castellan: one or two? | Allowed. It is one castellan: the castle pays its value **once** (no ×2), and the fairy pays a flat +1/+3 as for any follower (MASTER B16). Strength only matters for majorities, and a castle has none. | Rulebook; Official; Derived | DE17/EN18 p.6: "Exp. 1: big meeple". I&C official (ransom): "it may be big, but it's still only one person". |
| IC-3 | Inns on bridged roads | A bridge has no inn of its own. An inn on the bridge's tile affects only the printed road beside it. A road is an inn road if **any printed segment** of it has an inn, including roads that run over bridges. An incomplete inn road at the end scores 0, bridge tiles included. | Official; Community | Official FAQ 1/2021 (WiCa BCB): "The inn only counts for a road segment printed next to it. But a bridge could count as part of an 'inn road' if it is linked to it." Community BGG 993566. |
| IC-4 | Cathedral cities as castles? | Impossible: a small city is two caps, and cathedral tiles are full four-sided cities. | Derived | Tile data. |
| IC-5 | Castle triggered by an inn road or cathedral city | It scores the doubled or tripled value. Castles never score at game end, so the 0-point rule for incomplete inn roads and cathedral cities never applies to a castle. | Rulebook; Community | DE17/EN18 p.6 (bonus points also for the castle). Community 4/2014. |
| IC-6 | Bridge and castle counts with 6 players | **2 bridges + 2 castles each** with 5–6 players; 3 + 3 with 2–4. Six players still requires I&C. | Rulebook | DE17/EN18 setup. |
| IC-7 | BCB tiles with inns | Two BCB tiles show inns (see the tile spec); the inns count only when I&C is on. | Community | WiCa BCB / I&C. |

## 5. Traders & Builders

| # | Question | Recommended ruling | Label | Sources |
|---|---|---|---|---|
| TB-1 | Builder on a bridge | Allowed on the bridge of the tile just placed, if P has a meeple or large meeple in that road (the normal builder rule). | Rulebook | DE17/EN18 p.6: "Exp. 2: Builder". |
| TB-2 | Does a bridge trigger the double turn? | **Yes**, if after tile + bridge the placed tile belongs to P's builder's road. Example: a bridge on the new tile that continues the builder's road. So evaluate MASTER 2b **after** the bridge. A builder on a road containing bridges is extended by any tile that continues it. A bridge on a neighbour can only connect the new tile's road to empty space (BB-2), so "the new tile is in the builder's group" stays the right test. | Official; JCZ | WiCa T&B (book): "Placing a bridge on a tile to extend a road is sufficient to trigger the builder's double turn." S-CAR fn 57. JCZ applies the mandatory bridge before its builder check. |
| TB-3 | A bazaar tile that also extends the builder's road (part 1) | Order: part-1 scoring → auction → **whole bazaar round** → P's part 2. | Rulebook; Official | DE17 p.6: "ziehst du nach Ende der Basar-Runde dein zweites Plättchen für den Baumeister-Doppelzug und führst diesen aus". EN18 p.6: "complete the bazaar auction before beginning your double turn" ("completes" there translates "erweiterst", extends). WiCa FAQ (official order of events). *Alternative:* part 2 first, then the auction (S-CAR 2014 fn 347 "confirmed 5/2013"; JCZ runs `CleanUpTurnPartPhase` before `BazaarPhase`). WiCa reports HiG called that a valid alternative (08/2016), but the 3rd-edition text says bazaar first, so that is what we adopt. |
| TB-4 | Bazaar drawn for part 2 | The auction follows part 2's scoring (end of turn). If the part-2 tile is drawn **inside** a bazaar round (a player's double turn during their bazaar turn), the bazaar is **ignored**. P's own part 2 after the round is outside it, so a bazaar there is held. | Rulebook; Official; Official\* | EN18 p.5: the auction comes "after you have placed a bazaar and completed your turn". Official 2/2021 (WiCa): a bazaar placed in a builder turn during a bazaar round is ignored; WiCa FAQ "In other words" sequence. Official\* BGG 570930. |
| TB-5 | Double turn inside a bazaar round | The purchased tile can trigger the owner's builder. Part 2's tile is **drawn from the stack**, right away, before the next player's bazaar turn. | Official; Official\* | WiCa FAQ ("If you placed your auctioned tile and you can perform a builder-turn …"). Official\* BGG 498317 (2010). Community WiCa 2/2010. |
| TB-6 | Pig and castles | A castle is worth **5** instead of 4 to each winning farmer owner who has a pig in that field. | Rulebook; JCZ | DE17/EN18 p.6: "When scoring fields with a pig, the castle is worth 5 points." JCZ `Field.getCityPoints` (pig +1 per city or castle). |
| TB-7 | Goods in a 2-tile city converted to a castle | **Moot in our tile set:** no one-edge cap carries goods (and BCB tiles have none), so no small city can hold goods. If it ever arises: a converted city is not completed, so **no goods**. | Derived; Community; JCZ | Tile data. WiCa / S-CAR order of play (the conversion step skips "Collect any trade good tokens"). JCZ: the converted city is never scored. |
| TB-8 | Builders, pigs and castles | Never in a castle. A builder cannot even be in a small city: it needs an earlier meeple in an uncompleted feature on the new tile. Castles therefore never strand a builder. | Rulebook; Derived | DE17/EN18 p.6 list of castle figures. |
| TB-9 | Once per turn | Fairy +1 and ransom stay once per turn in a double turn. Bazaar-round turns are separate turns (GN-2). P's part 2 after a bazaar round belongs to P's original turn: no new step 0, and ransom only if P did not use it in part 1. | Derived | MASTER §A.3, B17; GN-2. |

## 6. The Princess & the Dragon

| # | Question | Recommended ruling | Label | Sources |
|---|---|---|---|---|
| PD-1 | Does the dragon eat a castellan? | **Never.** The dragon may still enter both castle tiles. | Rulebook; Official; JCZ | P&D EN16 p.3: "Meeples in castles (expansion 8) … are protected"; p.6: "Exp. 8 – The dragon may not eat a meeple in a castle." BCB DE17/EN18 p.6. WiCa P&D (book): "A castle is between two tiles … affecting the tiles themselves but not the spaces between tiles." JCZ `Follower.canBeEatenByDragon`. |
| PD-2 | Meeples on bridges; does the dragon fly over bridges normally? | Bridges and castle tokens are **never eaten**. A figure on a bridge stands on that tile and **is eaten** when the dragon enters it. Bridges never block or change the flight. | Rulebook; Community; JCZ | P&D EN16 p.3 diet plan ("Expansion 8 Bridge", "Expansion 8 Castle"). WiCa BCB: "Dragon eating figures … will also affect a bridge placed on that tile". |
| PD-3 | Can the princess remove a castellan? | **No.** A castle is not a city, and no tile can join it. When a princess tile itself completes a small city, the removal (step 4) comes before the castle decision (step 6). If the knight is removed, there is no castle and the city scores nothing. `DG/CRRR.p` can complete a small city this way; `DG/CCc+.p` cannot be a castle base (BB-7). | Community; Derived; JCZ | S-CAR fn 94 ("a castle is not a city, but … a new type of feature"). WiCa Mage & Witch note ("not a city anymore"). MASTER B24 (princess city only). |
| PD-4 | A dragon tile that completes a small city | The flight (step 5) comes before the castle decision. If the knight on the other cap's tile is eaten, there is no castle. | Derived; JCZ | MASTER step order. JCZ: `DragonPhase` runs before `CastlePhase`. |
| PD-5 | Magic portal onto a bridge road, or into a castle? | Never into a castle (it is not a placeable feature). The portal **may** put a meeple or large meeple on a **bridge on another tile** if that road is unoccupied and uncompleted, since a bridge is a road segment of its tile (MASTER B4). Never on the dragon's tile. | JCZ; Derived | JCZ `AbstractActionPhase.getAvailableStructures` (excludes `Castle`; bridges are `Road` features). No official text either way. |
| PD-6 | Fairy next to a castellan | Allowed: +1 at the start of each of the owner's turns, **+3 when the castle scores** during play, nothing at the end (castellans leave first). If the fairy is assigned to the knight that becomes the castellan, she **stays assigned**. Her tile is the tile the castellan stood on, and the dragon may not enter it. S-CAR fn 372 ("the fairy cannot be placed in a castle") is a 1st-edition clarification and is superseded. | Rulebook; Community; JCZ | DE17 p.6: "Die Fee kannst du in die Burg zu einem Meeple stellen und sie bringt dir die üblichen Feen-Punkte ein." EN18 p.6. WiCa BCB (no bonus at game end). JCZ `CastlePhase` carries her pointer over to the castle; `ScoreCastle` applies bonuses except at final scoring. BGG 2464296 (community, unresolved). |
| PD-7 | Bridges and castles on volcano / dragon tiles | A bridge may be built on a volcano tile or on the dragon's current tile; no figure may go on that bridge (MASTER B3, B15). A small city completed by a volcano tile (knight on the other cap) **may** be converted. The castellan is not on a tile and is not on the dragon's menu. | Community; Derived | WiCa P&D: "A bridge can be placed on a volcano tile." S-CAR fn 134. Official WiCa P&D (castle between tiles). |
| PD-8 | Bazaar reveal while the dragon is not in play | Revealed dragon tiles are **set aside** and replaced, exactly as for a normal draw. The pre-check (GN-5) counts only drawable tiles. | Derived; JCZ | P&D EN16 p.2; MASTER B22. JCZ: dragon tiles sit in an inactive group, are never drawn and are not counted by `TilePack.size()`. |
| PD-9 | Volcano bought at a bazaar | Placed in its owner's bazaar turn as usual: the dragon jumps to it. If it is the first volcano, the set-aside tiles are reinserted into the remaining stack (seeded RNG, MASTER B22). | Derived | MASTER §A.2 2d. |
| PD-10 | Dragon tile placed during the bazaar round — does the dragon fly? | **Yes, at once.** The movers start with the player who placed it; then the round continues. | Rulebook | DE17 p.6: "Legst du während der Basar-Runde ein Drachenplättchen an, zieht der Drache. Im Anschluss daran wird die Basar-Runde fortgesetzt." EN18 p.6. |
| PD-11 | Fairy +1, princess, portal and fairy move in bazaar turns | All apply (normal turn, GN-2). The fairy's +1 comes at the start of each bazaar-round turn, so the bazaar placer can collect it twice: in their own turn and in their bazaar turn. | Official\*; JCZ; Derived | Official\* BGG 570930 (2010): "a normal turn, with everything in it a normal turn allows, also when you play with expansions". JCZ `FairyPhase` runs at every turn start. |

## 7. The Tower

| # | Question | Recommended ruling | Label | Sources |
|---|---|---|---|---|
| TW-1 | Can a tower capture a castellan? | **Never.** | Rulebook; JCZ | Tower EN17 p.4, may NOT capture: "8. Meeple in a castle". BCB DE17/EN18 p.6: "A tower cannot capture any meeples in the castle." JCZ `TowerCapturePhase`. |
| TW-2 | A meeple on a bridge? | **Can** be captured; it stands on the bridge's tile. | Rulebook | Tower EN17 p.4, may capture: "8. Meeple on bridge". |
| TW-3 | Bridges and castle tokens | Never captured (neutral tokens). | Rulebook | Tower EN17 p.4: "8. Bridge, 8. Castle". |
| TW-4 | Bridges on tower tiles (foundation in the field) | Allowed whenever the tile has two opposite field edges (`TO/C`, `TO/FG`, `TO/L`, `TO/CFR`). The tower keeps working on that tile: floors, top and capture. | Rulebook; Community | Tower EN17 p.4: "A bridge and a tower may occupy the same tile (if necessary, move the tower slightly to make room)." BCB DE17/EN18 p.6. S-CAR fn 362 (11/2013): the bridge does not stop the tower growing. |
| TW-5 | Castle over a foundation | A small city whose cap carries or touches a foundation (e.g. `TO/CFR`, `TO/CRCr.2`) may become a castle, and the tower stays usable. | Official | WiCa BCB (book): "When placing a castle on these tiles from The Tower, you may need to move a tower on them a bit aside." |
| TW-6 | Ransom during an auction? | **No.** Ransom is paid only on one's own turn, before the follower step (MASTER B17). A player may pay it in their own bazaar-round turn. P's part 2 after a bazaar round shares the allowance of P's part 1. | Rulebook; Derived | Tower EN17 p.3. MASTER B17. GN-2. |
| TW-7 | Points spent in an auction — can a score go below 0? | **Yes**: bids may exceed a player's score. **Ransom still needs ≥ 3 points** when paid (a ransom never makes a score negative). | Rulebook | BCB DE17 p.5: "Du darfst auch mehr Punkte bieten, als du bisher gesammelt hast … dass Spieler weniger als 0 Punkte haben". EN18 p.5. Tower EN17 p.3: "If you do not have at least 3 points, you may not buy back a meeple". |
| TW-8 | Tower actions in bazaar turns | Allowed (normal turn). | Community; Official\* | BGG 601708 ("It is a normal turn in all respects"). Official\* BGG 570930. |

## 8. General: order of resolution and the bazaar

| # | Question | Recommended ruling | Label | Sources |
|---|---|---|---|---|
| GN-1 | Order within one tile placement when several things happen | **2** tile (+ bridge) → builder trigger → foundation → volcano jump → bazaar mark · **3** ransom · **4** one follower action (princess, figure, portal, recall, fairy, floor + capture, tower top) · **5** dragon flight · **6a** find completed features · **6b** castle decisions · **6c** score features (fairy +3, goods) · **6d** castle scoring and chains · **6e** return figures, lonely builder/pig · **6½** bazaar auction and round (if this placement marked one) · **7** builder part 2 · **8** next player. So a capture or princess removal in 4, or the flight in 5, can take the knight before the castle decision. The castle decision comes before any scoring. Older castles score from 6c's features, never from a city converted in 6b. | Rulebook; Official; JCZ | MASTER §A.2. P&D EN16 (flight before scoring). WiCa P&D official (capture before flight). JCZ chain: Dragon → Castle → Commit → Scoring → … → CleanUpTurnPart → Bazaar (bazaar and part 2 swapped, see TB-3). WiCa Order of Play C2 (Step 3B castle first; Step 4A bazaar; Step 4B builder). |
| GN-2 | Bazaar-round placements | **Each is a full normal turn** of that player: step 0 (fairy +1, ransom reset), ransom, the follower step with every expansion action, dragon flight, scoring and castle decisions, and a builder double turn. The differences: the tile is the purchased one, and a bazaar placed during the round does nothing. | Rulebook; Official; Official\*; JCZ | DE17 p.5: "Reihum führen alle Spieler mit ihrem ersteigerten Plättchen einen normalen Zug … aus". Official\* BGG 498317, 570930. WiCa FAQ. JCZ (every bazaar turn passes through `FairyPhase` and has its flags reset). |
| GN-3 | Seating order of the bazaar round | It starts with the player **left of the bazaar placer** and ends with the placer. Afterwards normal play resumes with the placer's left neighbour, so nobody gains or loses a normal turn. Z-Man's "starting with the first buyer" is not adopted. | Rulebook; JCZ | DE17 p.5: "Es beginnt der Spieler nach dem Spieler, der das Basarplättchen gelegt hat." EN18 p.5 ("play resumes normally starting with the player to your left"). WiCa arrow note. JCZ `BazaarPhase.nextSelectingPlayer`. BGG 1375790. |
| GN-4 | A purchased tile that cannot be placed | It is removed from the game, and its owner draws from the stack instead under the normal rules (set-aside, discard). If nothing can be drawn, that bazaar turn is skipped (no step 0) and the round continues. | JCZ; Derived | JCZ `TilePhase.enter` ("not legal placement … Draw random tile instead"; empty pack: "Skip player's turns"). Base rule for unplaceable tiles. |
| GN-5 | Game end: a bazaar that would need more tiles than remain | The auction is **skipped** if fewer drawable tiles remain than there are players (with P&D, dragon tiles do not count while the dragon is not in play); the bazaar tile is then just a tile. If exactly N remain, the auction runs, and the game ends at the next draw after the round. P's part 2, if any, happens only if a tile can still be drawn. | Rulebook; Community; JCZ | EN18 p.5: "Skip this step if there are fewer tiles remaining than there are players" (DE17 is silent). S-CAR "Too few tiles" (RGG Big Box 3). JCZ `BazaarPhase.enter`. BGG 554493. |
| GN-6 | Bazaar tile that is discarded, or placed in a bazaar round | A discarded bazaar tile holds no auction. A purchased bazaar tile, or any bazaar placed while a bazaar round is running (including part-2 tiles), triggers nothing; it is not delayed either. | Official | WiCa 10/2014 (discarded). DE17/EN18 "No chain reaction". Official 2/2021 (ignored). WiCa Order of Play C2 ("ignore the associated auction"). |
| GN-7 | Who acts when it is not P's turn | Castle decisions (the city's owner), bids, the buy-or-sell choice and dragon moves are all actions by possibly non-active players. Lockstep needs them as serialisable actions routed to the right seat, like `dragonMover`. | Derived | BB-8; DE17 p.5. |

---

## 9. Proposed unified turn sequence additions (MASTER §A)

Text in **[BCB]** is new; everything else is MASTER as it stands. Each BCB module (bridges, castles, bazaars) may be
switched off on its own (rulebook p.1, "or only parts of it"); a switched-off module's lines simply do not apply.

### A.1 Setup — additions
- **[BCB]** Land deck + the 12 BCB tiles (up to 173 land tiles with everything on).
- **[BCB]** Each player: **3 bridges and 3 castle tokens** with 2–4 players, **2 + 2** with 5–6.
- **[BCB]** Scores may become negative (bids).

### A.2 One turn of player P — additions

**Step 0 — Start of turn** *(once per turn; skipped for part 2; only if P actually gets a tile)*
- **[BCB]** Also at the start of **every bazaar-round turn** (GN-2): fairy +1, ransom flag reset. Skipped if that
  bazaar turn has no tile (GN-4).

**Step 1 — Draw**
- **[BCB] Bazaar-round turn:** P takes the tile they bought instead of drawing. If it has no legal placement, it is
  removed from the game and P draws normally (the bullets below apply). If nothing can be drawn, P's bazaar turn is
  skipped and the round goes on (GN-4).
- *(existing bullet)* "A tile with no legal placement is removed" — **[BCB]** legal placements include those that
  use one of P's bridges. **If every legal placement needs a bridge, P may decline:** the tile is removed and P draws
  again (BB-3).

**Step 2 — Place the tile** and resolve placement effects in this order
- 2a *Legality:* … **[BCB]** The placement may carry **one bridge** from P's supply: on the new tile or an
  orthogonally adjacent tile without a bridge, axis N–S or W–E, both end edges of that tile field edges (never
  river, BB-2/RV-1). The bridge's two edges become road edges, and every edge between neighbours must match
  afterwards. Tile and bridge form one action (BB-1). The bridge adds a road feature to its tile, and fields under
  it are not split (BB-5).
- 2b *T&B builder trigger (part 1 only):* … **[BCB]** evaluated **after** the bridge: a bridge that brings the new
  tile into P's builder road triggers (TB-2).
- 2c Tower foundation · 2d P&D volcano — unchanged (a bridge on a volcano tile is fine, PD-7).
- **2e [BCB] Bazaar mark:** if the tile shows a bazaar, was **drawn** (not bought) and no bazaar round is running, an
  auction is due at step 6½ of **this part** (GN-6).

**Step 3 — Ransom** — unchanged. **[BCB]** never during an auction (TW-6). A score below 3 (including a negative one)
cannot pay.

**Step 4 — Follower step**
- 4a Princess: **[BCB]** castellans are not knights in a city (PD-3).
- 4b Figure on the tile just placed: **[BCB]** a meeple, large meeple or builder may stand on **this tile's
  bridge** (it is a road segment of the tile; the builder needs P's meeple or large meeple in that road). Never the
  abbot or the pig. Never if the dragon stands on the tile.
- 4c Portal: **[BCB]** may target a bridge road on another tile (unoccupied, uncompleted); never a castle (PD-5).
- 4e Fairy: **[BCB]** may move next to one of P's castellans. Her tile is the castellan's tile (PD-6).
- 4f Tower capture: **[BCB]** never a castellan; a meeple on a bridge can be captured (TW-1, TW-2).

**Step 5 — Dragon flight** — **[BCB]** castellans, bridges and castle tokens are never eaten. Figures on a bridge of
an entered tile are eaten (PD-1, PD-2). The fairy by a castellan blocks her tile as usual.

**Step 6 — Scoring** *(now in five sub-steps)*
- **6a** Find the features completed by this placement: roads (a bridge counts as a segment of its tile; roads
  completed by the bridge included), cities, and monasteries/gardens with 8 neighbours, **occupied or not**.
  Unoccupied ones score nothing themselves; they matter only for castles (BB-13, AB-3).
- **6b [BCB] Castle decisions.** For each completed **small city** (BB-7) whose single follower's owner has a
  castle token: that owner chooses *castle* or *score*. Decisions go in seat order from P. If converted: castle
  token placed; the follower becomes the castellan (it stays on the board and keeps the fairy if she is assigned to
  it); no points, no fairy +3, no goods; the city leaves the completed list (BB-8, BB-9).
- **6c** Score the remaining completed features exactly as MASTER says (fairy +3, goods to P).
- **6d [BCB] Castle scoring.** Every castle that **already stood before this tile placement** and still has a
  castellan, whose fief (6 spaces) contains a tile of a road or city completed in 6a (and not converted in 6b), or
  the tile of a monastery or garden completed in 6a, scores the value of **one** such feature: the owner's choice,
  by default the highest (BB-11, BB-12). Then come the fairy +3 if she is assigned to that castellan, and the
  castellan's return home. Repeat for
  castles (same conditions) whose fief contains a tile of a castle that just scored: same value (chain). The
  breakdown bucket is `castle`.
- **6e** Return all figures of scored features; lonely builder/pig check.

**Step 6½ — [BCB] Bazaar** *(only if 2e marked one in this part)*
1. If fewer **drawable** tiles remain than there are players (with P&D, dragon tiles do not count while the dragon
   is not in play), skip (GN-5).
2. Reveal one tile per player from the stack. P&D: a dragon tile revealed while the dragon is not in play is set
   aside and replaced (PD-8). The river stack is always empty by now (RV-4).
3. Run the auction (BCB rules). Points move between players and may go negative. Nothing else happens during it:
   no ransom, no other actions (TW-6, TW-7). The breakdown bucket is `bazaar`.
4. **Bazaar round:** starting with P's left neighbour and ending with P, each player plays a **full turn, steps 0–8**,
   with their tile. That includes their own builder part 2 (drawn from the stack) and an immediate dragon flight for
   a dragon tile. Bazaars placed during the round are ignored (GN-2, GN-6, TB-5, PD-10).
5. Return to P's turn at step 7. P's original turn's step-0 and ransom state applies again: if the engine reset
   those flags for the bazaar turns, restore them (TB-9, TW-6).

**Step 7 — Builder double turn** — unchanged, plus: **[BCB]** if part 1 held a bazaar, part 2 comes **after** the
bazaar round (TB-3). A bazaar drawn in part 2 runs at part 2's step 6½, unless part 2 is itself inside a bazaar round,
in which case it is ignored (TB-4).

**Step 8 — End of turn** — next player = P's left neighbour, also after a bazaar round (GN-3).

### A.3 Once per turn vs. once per tile — additions

| Once per turn | For each tile / part |
|---|---|
| **[BCB]** Each bazaar-round turn is a turn of its own: its own fairy +1, ransom and builder trigger. P's part 2 after a bazaar round still belongs to P's original turn. | **[BCB]** At most one bridge; castle decisions; castle scoring and chains; the bazaar mark (a purchased tile, or one placed inside a bazaar round, never marks). A new castle cannot score in the placement that created it. |

### A.4 Game end — additions
0. **[BCB]** **First**, every castellan goes home: no points, no fairy +3 (BB-15). Castle tokens stay.
1. Incomplete roads: bridge tiles count as road tiles (1 each; 0 with an inn).
4. Fields: **castle 4** per field, whether or not it has scored; **5** for a winning farmer owner with a pig there
   (BB-14, TB-6).
- **[BCB]** Final scores may be negative. Results and tie handling must allow it.

---

## 10. Engine notes (for the developer)

- **Model already in place** (commit `816ab7b`): `tile.bridge` (0 = N–S, 1 = W–E, world axis); the bridge is the last
  road feature and fields keep their outer ports. Still needed: bridge supply per player; the bridge in the `turn`
  action (`bridge: { key, axis } | null`); `validPlacements`/`drawTile` placeability including P's bridge options
  (up to 1 + 2 + 8 variants per spot; prune for the AI); a "decline (bridge-only)" action; 2b after the bridge.
- **Castles:** store castellans **outside `tile.pieces`**, like tower tops. The dragon, tower capture, princess and
  portal then exclude them automatically. Suggested shape: `state.castles[] = { nodes: [[k1, f1], [k2, f2]], keys: [k1, k2], fief: [6 keys], p, k: 'meeple' | 'large' | null, key /* tile the follower stood on */, born /* placement serial */ }`.
  The fairy can then use `{ key, f: 'castle', k, p }`. `returnPieces` and `syncFairy` must handle `f === 'castle'`.
  Piece-conservation checks must count castellans.
- `completedCloisters` must also report **unoccupied** completed monasteries and gardens, for castle triggers only
  (BB-13, AB-3).
- **Field scoring:** a converted city still exists as two city features. `fieldCities` must recognise its group as a
  castle and score 4, plus 1 per castle for pig winners.
- **Castle decisions** and **bids** come from non-active seats (GN-7). They need serialisable actions, e.g.
  `{ t: 'castle', key, fi, build }`, plus the bazaar actions, routed like `dragonMover`.
- **Bazaar:** `endPart` must run a pending auction **before** the `state.bonus` part-2 check (TB-3). During the
  round `state.current` moves through the seats, and the original turn's `part`/`bonus`/`ransomPaid` are saved and
  restored afterwards. `endTurn` then advances from P.
- **Scores:** drop the "scores ≥ 0" invariant when bazaars are on; keep "a ransom never makes a score negative". Add
  breakdown buckets `castle` and `bazaar`.

## 11. Test checklist (interactions)

- X1 Bridge legality: field-edge ends only (not river); one per tile; an end may face empty space; a bridge-only
  placement can be declined; a voluntary bridge on an adjacent tile is legal; a field under the bridge stays one
  field, and fields at a bridge end join through it.
- X2 Road with a bridge: the tile counts once; an inn on the bridge's tile does not double a separate bridge road; a
  linked inn road does.
- X3 Castle: only two semicircular caps (`IC/C!`, `DG/CCc+.p` refused); the owner decides, possibly a non-active
  player; no token → must score; a converted city gives no points, fairy +3 or goods, and does not trigger older
  castles.
- X4 Castle timing: no score from the creating placement; scores from part 2 of the same double turn (BB-10
  recommended) and from bazaar-round turns.
- X5 Castle value includes inn ×2 and cathedral ×3 but not the fairy bonus; simultaneous features → highest; chain
  pays the same value; an empty monastery or garden in the fief triggers (9); an abbot recall does not.
- X6 Final: castellans removed before scoring, no fairy +3; fields give castle 4 (5 with pig winner); castles
  separate fields.
- X7 Dragon: castellan safe; meeple on a bridge eaten; bridge stays; a dragon tile completing a small city whose
  knight is eaten → no castle option.
- X8 Tower: castellan not in the capture targets; a bridge meeple is; a bridge on a foundation tile, and a castle over
  a foundation, leave the tower usable.
- X9 Princess removal before the castle decision; portal onto a bridge elsewhere allowed, into a castle never; the
  fairy stays with a converted knight and pays +3 when the castle scores.
- X10 Builder: a bridge-made extension triggers the double turn; bazaar in part 1 → round, then part 2; a bazaar in
  a part 2 inside a round is ignored; a bazaar-round tile can trigger a double turn.
- X11 Bazaar: dragon tiles set aside at reveal before the first volcano; a dragon tile in the round flies at once; a
  volcano in the round reinserts the set-aside tiles; skipped with too few drawable tiles; an unplaceable bought tile
  is replaced by a draw; turn order after the round.
- X12 Scores: negative after bids; ransom refused below 3; breakdown sums include `bazaar` and `castle`.
- X13 Lockstep replay with castle decisions, bids and bridges.

## 12. Open questions (for the product owner)

1. **BB-10** — Can a castle built in part 1 score in part 2 of the same double turn? Recommended: yes (community +
   JCZ, coherent with the bazaar round). Strict alternative: not until the creating player's turn is over.
2. **GN-2 / PD-11 / TW-6** — Fairy +1 and a ransom at the start of every bazaar-round turn, so the bazaar placer can
   collect twice. This follows from HiG's "a normal turn, with everything in it" and matches JCZ, but no source
   names the fairy or ransom explicitly.
3. **RV-2** — Bridges spanning a river, spring or lake: allowed by the 3rd-edition letter, said explicitly by the
   1st-edition English caption, allowed by JCZ; never clarified by HiG. Low risk.
4. **PD-5 / PD-6 / GN-4** — These follow JCZ, with no official text: the portal onto a bridge elsewhere, the fairy
   staying with a converted knight, and an unplaceable bought tile replaced by a draw.
5. **AB-3** — Gardens as castle triggers (community + JCZ). The rulebook lists only monastery, city and road.
6. **TB-3** — We follow the 3rd-edition text (bazaar round before part 2). JCZ does the opposite, so a JCZ
   cross-check will differ here.

---

## Sources

- **BCB DE17** — *Brücken, Burgen und Basare*, HiG © 2010, 2017 (6 pp., interactions on p.6):
  <https://www.hans-im-glueck.de/wp-content/uploads/2023/07/Carcassonne-Erweiterung-8-Bruecken-Burgen-und-Basare-Regel-deutsch.pdf>
  (identical: <https://cundco.de/media/2a/e7/7d/1715104329/cc-2-1-8-erw-de.pdf>)
- **BCB EN18** — *Bridges, Castles and Bazaars*, Z-Man © 2010, 2018 (6 pp., interactions on p.6):
  <https://www.hans-im-glueck.de/wp-content/uploads/2023/07/carcassonne_exp8_rules.pdf>
- **BCB DE10** (1st edition, for differences): <https://cundco.de/media/5f/a0/fe/1715104326/cc-1-0-8-erw-de.pdf>
- **BCB EN13** (Z-Man English © 2010–2013, 1st-edition text; p.3 caption "over roads, monasteries, rivers, etc."; pig,
  barn and pigsty add 1 to a castle as to a city): <http://upload.snakesandlattes.com/rules/c/CarcassonneExp8BridgesCastlesandBazaars.pdf>
- **P&D EN16**: <https://www.hans-im-glueck.de/wp-content/uploads/2023/08/carcassonne-expansion-3-the-princess-the-dragon-rulebook.pdf>
  (p.3 diet plan and protection; p.6 "Exp. 8").
- **Tower EN17**: <https://www.hans-im-glueck.de/wp-content/uploads/2023/07/carcassonne-ii-ext4-rules.pdf> (p.3 ransom;
  p.4 figure table and "Exp. 8").
- **Base supplement** (River, Abbot): <https://cdn.svc.asmodee.net/production-zman/uploads/2024/09/carcassonne_v3_supplement_en.pdf>
- **T&B EN** and **I&C EN** (3rd ed.; checked: no BCB text):
  <https://cdn.svc.asmodee.net/production-zman/uploads/2024/09/zm7812_carcassonne_exp2_rules.pdf>,
  <https://cdn.svc.asmodee.net/production-zman/uploads/2024/09/zm7811_carcassonne_exp1_rules.pdf>
- **WikiCarpedia** (raw wikitext fetched 2026-10-17; book = official, world = community, arrow = edition difference):
  [Bridges, Castles and Bazaars](https://wikicarpedia.com/car/Bridges,_Castles_and_Bazaars),
  [The Princess and the Dragon](https://wikicarpedia.com/car/The_Princess_and_The_Dragon),
  [The Tower](https://wikicarpedia.com/car/The_Tower),
  [Traders and Builders](https://wikicarpedia.com/car/Traders_and_Builders),
  [Inns and Cathedrals](https://wikicarpedia.com/car/Inns_and_Cathedrals),
  [The Abbot](https://wikicarpedia.com/car/The_Abbot), [River](https://wikicarpedia.com/car/River),
  [Order of Play (C2)](https://wikicarpedia.com/car/Order_of_Play), icon legend
  (`Template:IconBook`, `IconWorld`, `IconArrow`).
- **S-CAR v7.3** (Dec 2014), pp. 111–120 (BCB), 204–208 (order of play), fn 57, 92, 94, 134:
  <https://www.dover.nh.gov/Assets/government/city-operations/library/borrow/library-of-things/carcassonne-rules.pdf>
- **BoardGameGeek** (read through `api.geekdo.com/api/articles?threadid=…`), BCB = thing 66646:
  [538079](https://boardgamegeek.com/thread/538079) (semicircular; Christof Tisch),
  [569109](https://boardgamegeek.com/thread/569109) (no castle score in the same turn; C. Tisch),
  [542577](https://boardgamegeek.com/thread/542577) (bridge starting a new road; C. Tisch),
  [498317](https://boardgamegeek.com/thread/498317) and [570930](https://boardgamegeek.com/thread/570930) (bazaar turn = normal turn incl. builder; C. Tisch),
  [514053](https://boardgamegeek.com/thread/514053) (castle losing its follower; C. Tisch),
  [2400106](https://boardgamegeek.com/thread/2400106) (abbot recall),
  [2464296](https://boardgamegeek.com/thread/2464296) (fairy and conversion),
  [554493](https://boardgamegeek.com/thread/554493) (bazaar at game end),
  [775016](https://boardgamegeek.com/thread/775016) (bridge legality),
  [993566](https://boardgamegeek.com/thread/993566) (inn under a bridge),
  [2795427](https://boardgamegeek.com/thread/2795427) (fief space filled later),
  [601708](https://boardgamegeek.com/thread/601708) (tower in bazaar turn),
  [1375790](https://boardgamegeek.com/thread/1375790) (bazaar order),
  [2458743](https://boardgamegeek.com/thread/2458743) (castles separate fields),
  [3474601](https://boardgamegeek.com/thread/3474601) (fields under bridges).
- **JCloisterZone** <https://github.com/farin/JCloisterZone> @ `29a1561`: `GameStatePhaseReducer` (phase order),
  `BridgeCapability`, `PlacementsMixin` (`getTilePlacements`, `isBridgePlacementAllowed`), `EdgePattern`
  (`isBridgeAllowed`), `TilePhase`, `ActionPhase`, `PlaceBridge`, `CastleCapability`, `CastlePhase`, `Castle`,
  `ScoringPhase`, `ScoreCastle`, `FinalScoring`, `Field`, `Follower`, `TowerCapturePhase`, `AbstractActionPhase`,
  `FairyCapability`, `FairyPhase`, `BazaarCapability`, `BazaarPhase`, `CleanUpTurnPartPhase`, `CleanUpTurnPhase`,
  `RiverCapability`. Tile XML: <https://github.com/farin/JCloisterZone-Client> `src/extraResources/expansions/*.xml`
  (`castle-base="false"`).
