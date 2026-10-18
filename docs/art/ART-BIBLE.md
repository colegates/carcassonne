# Carcassonne art bible: Languedoc, June 1220

**The look in one line.** Every tile is a macro photograph of a museum-grade 1:160 diorama of the Aude valley in June 1220. It is crowded with tiny people, animals and machines, all historically exact, and they move.

Who this is for: artists, prompt writers and the engineers working on `public/js/art.js` and `board.js`. Sections A–F say what may appear and how it looks. G covers the photography and the engine rules. H is the animated vignette catalogue. I is the image-generation pack, with the prompts ready to send in [`prompts.json`](prompts.json). If nobody can point to a 12th- or 13th-century source for something, leave it out.

## The ten rules

1. **One moment.** Languedoc, June 1220, with a tolerance of 1200–1250. If it was invented, built or fashionable only after 1250, it does not exist.
2. **Low terracotta canal-tile roofs everywhere.** Never slate. Never steep "witch-hat" cones.
3. **The walls are the late-Roman Cité.** Round-fronted towers of small stones banded with red brick, one circuit and wooden hoardings. No outer ring, no Narbonne Gate, no stone machicolations.
4. **Mail, padded gambesons, surcoats, kettle hats and flat-topped great helms.** Crossbows are everywhere. Not one piece of plate armour.
5. **Wool and linen clothes, pulled on over the head and closed with laces or pins.** No buttons, no stripes on ordinary people, no pointed shoes, no long-tailed hoods.
6. **No glass in houses, no chimney stacks on ordinary homes, no lettering anywhere.**
7. **Old World plants and animals only.** No maize, tomatoes, prickly pears, agaves, plane avenues, Lombardy poplars or turkeys. Pigs are dark and hairy, sheep are small and vines grow as free-standing bushes.
8. **The land is at peace.** Drills, patrols, markets and building sites. No blood, burning, captives, executions or heresy trials.
9. **A photograph, not a painting.** Matte painted miniatures, static grass, resin water and the same soft upper-left light on every sprite. Sprites carry no cast shadows. The engine adds depth of field and the colour grade.
10. **Reward zooming.** Every tile hides small looping stories that appear only up close. Somewhere on the board, a rare surprise happens every few minutes.

---

## A. Era decision

**Reference date: June 1220. Tolerance: 1200–1250.** Nothing may appear that was invented, built or fashionable only after 1250, or that had disappeared before 1200.

Why this moment:

- **It is the namesake's own moment.** In 1220 the Cité is still the town of the Trencavel viscounts and the Albigensian years. It has one wall circuit (late-Roman, c. 300, repaired since the 1130s), the Trencavel palace, a Romanesque cathedral, and suburbs below. The famous silhouette came later. The outer ring and the Narbonne Gate date from Louis IX and Philip III (after 1240, and c. 1280), and the slate cones from Viollet-le-Duc (1853–1911). Choosing 1220 removes both layers and gives a fresher Carcassonne.
- **It is well documented.** The Maciejowski (Crusader) Bible (Paris, c. 1244–54) shows dress, arms, tools, farming and siege engines in hundreds of scenes. Add Villard de Honnecourt's sketchbook (c. 1225–35); the *pierre du siège* in Saint-Nazaire, a siege carving with a traction trebuchet that probably shows Toulouse in 1218; seals; and the *Song of the Albigensian Crusade*.
- **It is visually at its richest.** Mail and bright surcoats with early heraldry, and flat-topped great helms. Crossbowmen. Traction trebuchets beside the brand-new counterweight trebuchet, which appears at Toulouse in 1217–18. The first treadwheel cranes appear in French records c. 1225. Woad blue, madder red, troubadours and jongleurs.
- **It suits children.** We show a land at peace during a lull in the war: drills, patrols, building sites, harvest and market. The Albigensian Crusade (1209–29) stays offstage.

**Carcassonne in 1220, as the board should evoke it.**

- **The Cité.** A walled hill town above the Aude, with one circuit of about 1,070 m and some 30 close-set towers. They are built of small squared stones laced with red brick, round outside and flat inside.
- **The Trencavel palace** (Château Comtal, begun c. 1130) has its tall square watchtower, but not yet the barbican and moat of 1228–39.
- **The town:** the Romanesque cathedral of Saint-Nazaire and suburbs at the foot of the hill.
- **The river:** a bridge across the Aude (a new one was authorised in 1184; today's Pont Vieux is 14th-century) and mills on weirs.
- **The country:** vineyards, wheat, a few olives and garrigue, with the Montagne Noire to the north and the Corbières to the south.
- **The wind:** the west-north-west *Cers* blows on most days, so every flag, plume of smoke and line of laundry leans east.

### Anachronism blacklist

| Never | Instead |
|---|---|
| Slate roofs, steep conical roofs (19th c.) | Canal tiles at about 17°, very shallow tile cones, flat crenellated tops |
| Double walls with lists, Narbonne Gate (c. 1280), château barbican and moat (1228–39), bossed stonework | One circuit: banded Roman masonry below, plainer sandstone above |
| Stone machicolations, swallowtail merlons, gun loops, drawbridges with counterweight arms | Timber hoardings, rectangular merlons, tall plain arrow slits, fixed bridges |
| Gothic choir, rose windows, flying buttresses, pinnacles, gargoyles (at Saint-Nazaire these date from 1269–1330 and the 19th c.) | Round arches, apses, small round-headed windows, bell-gables |
| Glass in houses; chimney stacks on houses, cottages or the inn | Plank shutters, oiled linen at most; smoke through the tiles or a gable vent. Coloured glass only in the cathedral; chimneys only on castle hall, abbey kitchen, bishop's palace |
| Génoise eaves (17th c.), window boxes, geraniums, lettered signs, clock faces (c. 1300), lamps, metal gutters | Projecting rafter ends, bare walls, a bush on a pole |
| Bastide grids, arcaded squares, market halls (bastides 1222–1372); covered wash-houses (late 18th c. on) | A market in a widened street or before the church; washing on river stones |
| Dense "Tudor" timber-framing, brick infill, open attic galleries, Lauragais pillar dovecotes | Wide-panelled timber frames with daub |
| Windmills on city towers, stone tower mills | Water mills (B8) |
| The 14th-century Pont Vieux or Pont Valentré as models | Narrow humped bridges like Saint-Bénézet at Avignon (1177–85) |
| Any plate armour, coats of plates, visors, bascinets, sugarloaf helms | Mail, gambeson, surcoat, kettle hat, nasal helm, flat-topped great helm |
| Gunpowder; springalds (first mentioned 1249); spoon-armed torsion catapults (a myth for this period); pavises (14th c.); halberds, pikes; crossbow windlasses and cranequins; massed longbows | Traction and counterweight trebuchets, stirrup crossbows spanned with a belt hook, self bows, spears, falchions |
| Heralds in tabards, tilt barriers, quartered arms (Castile, 1230s), crests, mottoes | Banners, pennons, shields with simple arms |
| Buttons, poulaines, long-tailed (liripipe) hoods, houppelandes, cotehardies, doublets, joined hose, codpieces, hennins, ruffs, plumed hats, buckles, knitwear, spectacles (c. 1286), sewn-in pockets | Garments pulled over the head and closed with laces, pins or a ring brooch; hose tied to the belt of the braies; purses and scrips |
| Stripes or two-colour clothes on ordinary people (in the 13th c. stripes marked jongleurs, fools and outcasts); neon colours | Solid woad, madder, weld, walnut and undyed wool; stripes only on jongleurs |
| New World species: maize, potato, tomato, peppers, beans of the *Phaseolus* kind, squash, sunflower, tobacco, prickly pear, agave, turkey, Muscovy duck | Old World crops (E) |
| Plane-tree avenues (19th c.), Lombardy poplars (late 17th c.), weeping willows (c. 1730), robinia, horse chestnut, eucalyptus, mimosa, palms, citrus groves, hydrangeas, pelargoniums, tulips, modern roses, orange carrots (17th c.), big strawberries (1750s), vines on wires, rows of lavender | Native and long-established species (E) |
| Smooth pink pigs, fluffy merino-type sheep, Holstein cows, heavy draught horses, modern dog breeds | Medieval livestock (E4) |
| Wheelbarrows (first record England 1222, rare for decades), iron-hooped casks, glass bottles, forks, playing cards, any written words | Two-man handbarrows, split-wood hoops, jugs and wineskins |

---

## B. Architecture and materials

### B1. Materials and palette

All surfaces are matte. Satin finish only on leather and iron; gloss only on water, puddles and wet stone.

| Material | Look | Hex |
|---|---|---|
| Sandstone (Cité, Saint-Nazaire) | warm grey-beige to honey, weathering grey | `#d2c3a2` `#b9ab8f` `#a3967c` |
| Limestone (bridges, farms) | pale cream-grey | `#ddd4bf` `#c8bea6` |
| Roman brick | dull red | `#9e5138` `#84432f` |
| Lime mortar and lime-wash | off-white, cream, pale ochre | `#e6dcc6` `#d9c49a` |
| Canal tiles / lichen | new orange, weathered rose, old brown / yellow-orange, grey-green | `#c0703f` `#b0735a` `#7f4f37` / `#c9a646` `#9aa385` |
| Oak and chestnut timber | weathered silver-brown | `#7d6a55` `#8f8676` |
| Iron | dark grey, rust at edges | `#4a4642` `#7a4a2e` |
| Earth | ochre road, red clay, dark loam | `#c9b48a` `#9a5b3e` `#6b5440` |

### B2. City walls and towers

- **Layout.** Walls follow the city outlines in `layout.js`. Put a tower at each bend and about every 0.25 tile, and a gate wherever a road crosses a wall (art.js already finds these points).
- **Masonry.** The lower two thirds is late-Roman: small squared blocks in regular courses, banded every metre or so with three thin courses of red brick. Above is 12th–13th-century heightening in larger sandstone blocks of a slightly different tone. Showing the seam is good storytelling.
- **Towers.** Horseshoe plan (round outside, flat inside), close-set and solid at the base. Two upper floors have round-arched windows edged with alternating brick and stone. In 1220 many have crenellated tops under very shallow tile cones or lean-tos. The Romans used tegula-and-imbrex tiles, the ancestor of the canal tile. Each large city gets one tall square watchtower like the Tour Pinte (12th c.).
- **Parapets.** Rectangular merlons about 1.5 times as tall as wide, some pierced by one tall slit. No cross-slits, no gun ports.
- **Wall-walk.** Sandstone flags 2–3 m wide, with stone or wooden stairs on the town side.
- **Hoardings.** Covered timber galleries on beams set into square holes in the wall. They went up when attack threatened; a 1298 inventory lists dismantled hoardings at Carcassonne. Show them on about one tower in three, with one being fitted somewhere. Fresh oak is honey-coloured, old oak grey.
- **Gatehouses.** A round arch of alternating brick and stone (like the Porte d'Aude's Visigothic arch) between two round towers, with iron-studded oak doors and the portcullis raised. No drawbridge machinery.
- **Château.** The Trencavel palace: two L-shaped ranges with low roofs against the inside of the wall, the watchtower and a chapel apse. It can serve as the keep of the largest city.

### B3. Languedoc town houses

- **Plots** are 4–7 m wide and deep. Houses rise 2–3 storeys and share walls in rows that bend with the lanes.
- **Ground floor:** rubble or coursed sandstone with one or two wide round-arched openings. The shop has two horizontal shutters: the lower folds down into a counter and the upper props up as an awning. Plank doors hang on iron strap hinges.
- **Upper floors** are stone for the rich. Otherwise they are timber frames with wide panels of wattle-and-daub, lime-washed cream or ochre, jettied 30–60 cm over the street. Windows are small and square with plank shutters; add wooden balconies.
- **The merchant's house** (*maison romane*) is ashlar, with a ground-floor arcade and rows of twin round-arched windows divided by colonnettes. References: Saint-Antonin (c. 1125–50) and Cordes (founded 1222).
- **Roofs:** canal tiles at 15–20° with projecting rafter ends, sometimes held down by stones, with lichen on the shady side. No dormers.
- **Village houses** are tall: a byre below, living rooms up an outside stair, and a grain loft on top. Walls are rubble in mud mortar, partly lime-washed.
- **Colours:** stone-beige to cream; bare-wood shutters with the odd faded ochre-red or woad blue.
- **Lanes** are 2–4 m of packed earth, cobbled near the gates and church, with a gutter down the middle. Small squares have a well.

### B4. Churches and the cathedral

- **Parish church.** Languedoc Romanesque: a single barrel-vaulted nave, thick walls, small round-headed windows, a semicircular apse and a round-arched door. The roof is low canal tile or stone slab. The regional signature is the **bell-gable** (*clocher-mur*): a flat wall above the west gable pierced with 2–3 arches for bells.
- **Saint-Nazaire in 1220** (our "cathedral").
  - A mid-12th-century nave of three aisles and six bays in sandstone, with a pointed barrel vault over the centre and round ones over the aisles.
  - At the east end, the older 11th-century choir, probably a shallow triple apse over a crypt, and a Lady chapel (1177).
  - The faithful entered by the **north portal**.
  - The canons (Rule of St Augustine since 1088) lived alongside in a cloister with chapter house, dormitory, refectory, cellars and stables.
  - Repairs after the 1209 siege ran from 1215 into the 1230s.
  - **Not:** the Gothic choir and transept (1269–1330), Viollet-le-Duc's invented crenellated west front, gargoyles, or the 16th-century bell tower.
  - How the bells hung in 1220 is unknown, so use a west bell-gable, the regional type. This is a deliberate, plausible composite.
- **Cistercian churches.** No stone towers (banned in 1157), only a small bell-gable. No sculpture, clear or grey glass, a flat east end.

### B5. Monastery layout

Models: the Cistercian abbeys of Fontfroide (Narbonne) and Villelongue (near Carcassonne), and the Benedictine abbey of Lagrasse. The sprite is about 0.4 tile:

- **Church** on the north side, running east–west.
- **Cloister** on its south side: grass, a well or small fountain house, and arcades of paired round arches under lean-to tile roofs.
- **East range:** chapter house below, dormitory above, with a night stair into the church.
- **South range:** refectory with a wash basin at its door, and the kitchen.
- **West range:** lay brothers' quarters and cellars.
- **Outside:** a gatehouse where bread is handed out, a guest house, infirmary, barns, a mill and a smithy. Add a herb garden, a kitchen garden (cabbages, leeks, onions, broad beans, peas), an orchard, fishponds with sluices, beehives and a cemetery of plain crosses, all within a walled precinct.

### B6. Inns and taverns

- **Inn.** A two-storey stone and timber house around a courtyard: kitchen and common room below, guest rooms off a wooden gallery above. Add a stable and hayloft, a well and trough, and a mounting block.
- **Sign:** a **bush**, a bunch of pine or ivy on a pole over the gate. The custom is Roman and survives as the English "ale-stake". No lettered board.
- Smoke leaves through a roof vent. Wine is poured from pottery jugs into wooden or earthenware cups; no bottles, no lidded tankards.
- **Tavern:** a street room selling wine from casks under the same bush.

### B7. Markets and fairs

- **Stalls:** trestles in widened streets, before the church or outside the gates, under plain undyed linen awnings, at most faded solid colours. **No candy stripes.**
- **Goods, as they read at 1:160:**
  - **Wine:** small casks with split-wood hoops, goatskin wineskins, pottery jugs.
  - **Grain:** sacks of wheat, barley, broad beans, chickpeas and lentils, with a wooden bushel measure.
  - **Woad:** fist-sized dark grey-green dye balls (*cocagnes*) and blue skeins. In 1220 woad is a modest trade; around Toulouse it first grew from the mid-13th century, and the Lauragais boom came in 1450–1560. Keep it to a corner of the market.
  - **Cloth:** wool bolts in woad blue, madder red, weld yellow, green and undyed cream, grey and brown, sold by the ell. Kermes scarlet is a luxury.
  - **Salt:** coarse grey sea salt from the salt pans near Narbonne.
  - **Pottery:** mostly unglazed grey jugs and pots, a few green-glazed jugs, big storage jars. No painted glossy wares.
  - **Spices** from Montpellier and Narbonne merchants (pepper, ginger, cinnamon, cumin, saffron), weighed on hand balances.
  - **Food:** round loaves, sheep's cheeses, eggs, poultry in wicker cages, garlic and onion braids, cabbages, leeks, cherries, figs, almonds, honey, olive oil, eels, kegs of salted sardines, sausages and hams. No carcasses.
  - **Money:** small silver deniers of Melgueil, Toulouse and Carcassonne. No gold coins (France's first was minted in 1266). Money changers sit at cloth-covered tables with balance, coin piles and a coffer.

### B8. Countryside buildings and features

- **Farmhouse (*mas*).** Long and low, rubble stone, with a canal-tile roof. Add a barn thatched with rye straw, a walled yard, a dung heap, a bread oven, and a **round stone threshing floor** with straw ricks, a Mediterranean signature where animals tread out the sheaves. Hamlets cluster tightly, sometimes in a ring around a church, as at Bram (12th c.).
- **Water mills** are the period's mill: a stone mill house over a race fed by a diagonal weir (*paissière*). The wheel is a vertical undershot wheel (animatable) or a horizontal wheel hidden under the house. There were mills on the Aude at Narbonne by 1198.
- **Windmills: not on tiles.** France had them from the 1170s–80s (an Arles charter of 1170 is often cited), but none is documented near Carcassonne until later. Never stone tower mills, never one on a city tower.
- **Bridges.** Narrow (3–4 m) and humped, with round arches of unequal span, cutwaters facing upstream and low parapets, sometimes a cross at the crown. Small streams get timber decks, plank footbridges, fords and ferries.
- **Wayside features.** Plain stone crosses on stepped bases at crossroads; disc-headed crosses of the Aude type are allowed. Roman milestones lean, worn blank, along the old Via Aquitania. No shrines with statues.
- **Wells.** A stone well-head with a timber pulley frame or windlass, beside a long stone trough. Counterpoise well sweeps are allowed in gardens; no noria wheels.

---

## C. People and attire

Knights, sergeants, crossbowmen and archers are dressed as in D2 and D4.

### C1. General rules

- **Fabric and cut.** Wool outside, linen next to the skin and on the head; silk and fur linings (vair, ermine) only for the rich. Everything goes on over the head. Bodies are wide, sleeves taper to the wrist, and the garment is belted so the cloth bags over the belt. The neck slit closes with a ring brooch or laces.
- **Lengths.** Working men wear knee length or shorter, hitched into the belt. Townsmen wear calf length; nobles and clergy, ankle length. Women always wear ankle length.
- **Colour by class.** Peasants wear undyed wool (cream, grey, fawn, brown, black), faded woad, madder rust or pink, weld yellow and walnut brown. Townsfolk wear stronger blues, reds and greens. Nobles wear kermes scarlet, deep blue, silk, fur and gold-embroidered bands. Everything is worn and patched.
- **Dye swatches:** woad `#3f5f86` (faded `#7d93ad`), madder `#9e3b2c` (rose `#c27c6e`), weld `#c9a43b`, kermes `#8e1b2c`, undyed `#d9cdb5` `#8c8475` `#5e4a3a`.
- **Hair.** Men wear it chin-length, curled under. The young and the noble are clean-shaven; older men and peasants are often bearded. Married women cover their hair. Girls wear it loose or braided, with flower chaplets in June.
- **Headwear.** Men: a linen coif tied under the chin, a straw hat in the fields, a hood with a short shoulder cape. Women: wimple and veil, or for nobles a chin band (*barbette*) with a pillbox headdress; a headcloth for peasants.
- **Feet.** Low leather turnshoes or ankle boots, slightly pointed. Riders wear boots; peasants and children go barefoot in summer.
- **Children** wear small adult clothes. Babies are swaddled.

### C2. Peasants

- **Men:** a short tunic hitched into the belt, linen braies, hose often rolled down, a coif or straw hat. Tools: a toothed sickle, wooden rake and fork, flail, ard and goad, iron-shod spade, billhook.
- **Women:** a russet, blue or brown gown hitched through the belt, a linen apron and a white headcloth, with a straw hat on top in the field. A distaff and spindle are always at hand.
- **Children:** they play with hoops, tops, hobby horses, knucklebones, balls and wooden swords; they herd geese and scare birds with slings.

### C3. Trades

- **Blacksmith:** long leather apron and coif; hammer, tongs, sparks.
- **Baker:** white apron and coif dusted with flour; a peel; round loaves, dark to pale.
- **Cooper:** adze, mallet and hoop driver. Hoops are split hazel, willow or chestnut, never iron.
- **Dyer:** arms blue to the elbow, with vats by the river and skeins on poles. Woad-dyed wool comes out of the vat yellow-green and turns blue in the air; animate it.
- **Potter:** kick wheel, grey jugs, domed kiln.
- **Mason:** coif and leather apron; mallet and chisel, square, plumb line and trowel. Scaffolding is lashed together, with poles set in holes left in the wall. Loads go on handbarrows or up the **treadwheel crane**, with a man walking inside: the newest machine in the land.
- **Carpenter:** axe, broad axe, adze, auger, frame saw; fits the hoardings.
- **Butcher:** hams and sausages only; no carcasses or blood.
- **Fishmonger:** eels, trout, barbel and pike, and kegs of salted sardines.
- **Miller:** flour-white tunic.

### C4. Merchants

A long tunic under a sleeveless surcoat, or a hooded overgown with cap sleeves. A belt with purse and knife, and wax tablets. Genoese and Pisan merchants come up from Montpellier and Narbonne.

### C5. Nobles and the princess

- **Men:** an ankle-length tunic, a sleeveless surcoat in a contrasting colour, a mantle pinned at the shoulder, a soft cap and gloves, often a falcon.
- **Women:** a long gown with tight sleeves, a sleeveless surcoat (just coming into fashion), and a vair-lined mantle on a cord across the chest. On the head, a chin band and pillbox, or a wimple and veil. A jewelled belt.
- **Princess:** unmarried, so her hair is loose under a gold circlet with small fleurons. She wears a rose gown (madder or brazilwood dye) and an ermine-lined azure mantle, which keeps the game's pink princess.

### C6. Heraldry and banners

- **Rules.** One metal and one colour, with a big, bold charge, on shields, pennons, horse trappers and banners. Surcoats are mostly plain; fully painted ones come later in the century. Banners are tall rectangles nailed to a lance; pennons are small triangles. No quartering, crests or mottoes.
- **Roster.** Real arms of 1200–1250. Different cities may fly different lords; one city never flies two.
  - **Royal France** (Carcassonne after 1226): blue scattered with gold fleurs-de-lis, on a seal of 1211.
  - **Counts of Toulouse:** red with the gold cross of Toulouse, hollow, each arm ending in three gold balls.
  - **Trencavel** (until 1209, and again 1224–26): red and white horizontal bars, the white ones sprinkled with small black motifs that were read as ermine by 1248. Never the invented gold-and-ermine version seen in modern fiction.
  - **Foix:** gold with three red vertical stripes. **Aragon** (overlord until 1213): gold with four.
  - **Lévis-Mirepoix:** gold with three black chevrons. **Montfort** (1209–24): red with a white forked-tailed lion. Use Montfort sparingly.
  - **Invented minor lords** follow the same rules.
- The game's pennant shield stays the readable scoring marker; matching banners on the towers are decoration.

### C7. Clergy

- **Bishop:** a white alb under an ample bell-shaped silk chasuble with gold bands, a low two-peaked mitre (peaks front and back) and a crozier with a simple spiral head.
- **Canons:** white surplice under a black hooded choir cloak; tonsure.
- **Parish priest:** a closed, sober gown, never red or green (Fourth Lateran Council, 1215).
- **Monks.** **Benedictines** (Lagrasse) wear black. **Cistercians**, the "white monks", wear undyed greyish-white with a scapular for work; **lay brothers** wear brown and are bearded.
- **Nuns:** black veil over a white wimple. Dominic founded a house of nuns at Prouille in the Lauragais in 1206–07.
- **Dominicans** (founded at Toulouse, 1216): white tunic and scapular under a black hooded cloak. They walk in pairs with staff and book. **Franciscans** are rare in 1220: a grey-brown habit and a knotted cord.
- **Templars**, sparingly: a white mantle with a red cross; they had a house at Douzens near Carcassonne. **Hospitallers:** black with a white cross.
- **Cathar "good men"** walked in pairs. If shown at all, they are two quiet, dark-robed travellers, with no hint of persecution.

### C8. Travellers, entertainers, robbers

- **Pilgrims** to Santiago; one route passed through Carcassonne. Broad-brimmed hat with a scallop shell, coarse cloak, tall hooked staff, scrip and gourd.
- **Muleteers** with belled mule trains are the lorries of the Midi. Add pedlars with back-baskets and messengers.
- **Troubadours** dress as nobles; the Trencavel court welcomed them. **Jongleurs** are the one group allowed stripes and two-colour clothes. Instruments: vielle (fiddle), citole, psaltery, harp, symphonia (small hurdy-gurdy), bagpipe, pipe and tabor, shawm.
- **Jugglers, tumblers, performing dogs, and bear-leaders** with muzzled Pyrenean brown bears. Dancing bears appear in 13th-century French pictures.
- **Robbers.** Routiers (mercenary bands condemned by the Third Lateran Council in 1179) and outlaws. Hoods up, ragged faded tunics (on the official tile, one red and one purple-blue), scraps of mail, a crossbow and cudgels. Play them as comedy: they hide, nap, bicker and lose their loot to a goose.

### C9. Child-friendly guardrails

- Weapons aim only at targets or the sky. No wounds, corpses, blood, burning, ruins, real sieges, gibbets, pillories, chained captives or heresy trials. No crusade atrocities (Béziers, Bram, Minerve, Montségur).
- The dragon eats no one: meeples flee home and sheep scatter and regroup. No kill is ever shown.
- No mockery of religion, no religious-minority badges, no caricatures, no drunks.
- Tower prisoners sit glumly at a window and wave when they are ransomed.

---

## D. Military and siege

### D1. Siege engines in 1220

- **Traction trebuchet** (*pierrière*; "mangonel" in sources of the time means this engine). A pivoting beam on a trestle, with a sling on the long end and ropes on the short end that a crew hauls together; show 4–8 haulers. It is fast and cheap and townsfolk crewed it: the *Song* says one at Toulouse in 1218 was hauled by "ladies, girls and women". The Saint-Nazaire carving shows one. **Default engine** for tower terraces and practice fields.
- **Counterweight trebuchet** (*trabuquet*). A long arm with a hinged box of stones, wound down by a winch with capstan bars and released by pulling a pin. It appears in this very war (Toulouse 1217–18) and was common by the 1230s. **One per board**, as the showpiece: about 10 s to wind, 1 s to release.
- **Not in 1220:** springalds, torsion catapults, pavises, gunpowder.
- **Props:** a "cat" (a gabled mobile shed covered in hides), stacked ladders, piles of round stones dressed by masons.

### D2. Crossbows and bows

- **Crossbows** are the southern weapon. The bow is wood or horn composite, with a stirrup at the front. To span it, the crossbowman puts a foot in the stirrup and pulls the string back with a claw hook on his belt. Bolts sit in a hip quiver. No windlass, no steel bow.
- **Bows:** plain self bows of yew or elm, about shoulder height. There are far fewer archers than crossbowmen.

### D3. Training

Straw targets on stands or earth banks, with a cloth mark. A quintain (a post with a crossbar and a shield) for lance practice. Two knights may joust in an open field, with no barrier between them. Spear drill, watch rounds, horn signals, banners raised, hoardings fitted, walls repaired.

### D4. Kit around 1220

- **Knight:** a gambeson under a knee-length mail hauberk with built-in mittens and hood, and mail leggings. Over it, a sleeveless knee-to-calf surcoat slit front and back. On the head, a flat-topped cylindrical great helm with eye slits, or a conical nasal helm over the mail hood. A large flat-topped heater shield bearing his arms, a lance with a pennon, and a horse with a high saddle, perhaps in a cloth trapper.
- **Sergeant:** a quilted gambeson (off-white to ochre, stained) or a short mail coat. A kettle hat, nasal helm or skull cap. A spear, falchion or axe, and a small shield.
- **Crossbowman:** gambeson, kettle hat, crossbow, quiver and a long knife.
- **Metal** is dark oiled iron, never bright, with rust at the edges.

---

## E. Landscape, plants, animals and ground textures

### E1. Season and light

**Season lock: mid-June.** Hay is being cut and wheat is turning gold, with harvest starting on a few plots. Poppies and cornflowers line the field edges, broom is in yellow flower, vines are in full leaf, cherries are ripe, sheep are freshly shorn and storks have chicks. The light is a soft mid-morning sun, and the Cers blows from the west-north-west.

### E2. Ground textures, as miniature work seen from above

- **Meadow.** Static grass 2–4 mm long, about 60% summer green, 25% straw and 15% dark olive, with taller 6–10 mm tufts, flock for clover and specks of soil. Never as even as a lawn.
- **Verges and flowering meadow.** Orange-red poppies and blue cornflowers as single-pixel dots at 1–3% density, densest at field edges.
- **Dirt roads.** Pale ochre limestone dust, two darker ruts a cart-width apart, and a hoof-trodden middle; minor roads keep a strip of grass. Add pebbles, glossy resin puddles in the ruts and frayed weedy edges. Near cities, patches of Roman paving and the odd milestone.
- **Town lanes.** Packed brown earth with patches of river cobbles near gates and church, a dark damp gutter down the middle, straw and dung. No kerbs.
- **Wall-walk.** Sandstone flags with mossy joints and lichen dots.
- **Roofs.** Rows of canal tiles (convex covers over concave channels) in mixed oranges, roses and browns. Lichen is yellow-orange in sun and grey-green in shade. Add the odd bright replacement tile.
- **River water.** Resin over a painted depth gradient: cream and green-grey at the edges, olive-teal in the channel, never pool blue. The surface is glossy, with white ripples around stones and below weirs. Banks are pebbles of cream limestone and grey schist, with reeds, cattails and willow roots.
- **Lake and spring.** Still, darker water with lily pads; the spring wells from a mossy rock.
- **Fields.**
  - Smallish, irregular, often squarish plots, because the ard is pulled across the field both ways. They are bounded by dry-stone walls, ditches or hawthorn hedges.
  - **Wheat** is tall, bearded, uneven and weedy with poppies; it is cut high with sickles and stood in stooks.
  - **Rye** is taller and blue-green. **Flax** has sky-blue flowers in June. **Woad** grows as blue-green rosettes with late yellow flowers.
- **Vineyards.** Free-standing goblet vines, each a gnarled stump with a fan of shoots, in loose rows on stony ochre soil, often mixed with olive, almond or fig trees. No wires, no posts.
- **Orchards.** Mixed fruit trees spaced irregularly in grass, with ladders and baskets.

### E3. Trees and shrubs

- **Oaks:** holm oak (dense, dark, rounded) on the slopes; downy oak (lighter, deciduous).
- **By rivers:** native black poplar (broad, never columnar), white poplar (silver leaf undersides flash in the wind), pollarded willows, alder, ash, reeds and cattails.
- **Near farms:** olive (silver-grey; few, on south slopes, since this is the inland edge of olive country), almond, fig, walnut, black mulberry, cherry, apple, pear, quince, medlar.
- **Cypress:** a single dark flame by a church or abbey, never an avenue.
- **Garrigue:** kermes oak, whose scale insects give kermes scarlet (peasants pick the "grains"), with thyme, rosemary, Spanish broom, juniper, box, cistus and wild lavender on white limestone.

### E4. Livestock and wildlife

- **Sheep** are small, lean and long-tailed, with coarse wool in cream, brown, black or patched; rams are horned. **Goats** are shaggy and horned.
- **Oxen** are small and tawny with lyre horns, worked in pairs under a yoke lashed to the horns.
- **Mules** (dark bay, belled, very common) and **donkeys** (grey, with a dark cross on the shoulders).
- **Horses** stand 13–15 hands, in bay, chestnut, grey, black or dun, with loose manes.
- **Pigs** are dark, bristly, long-legged and boar-like.
- **Geese** are grey and white; **chickens** small and mixed in colour; **ducks** mallard-type.
- **Dogs:** sighthounds, mastiffs, big white flock guardians in spiked collars and mongrels. **Cats** are tabby.
- **Wild:** white storks nesting on towers, heron, egret, kingfisher, swallows and swifts, jackdaws, red kites, hares, red deer, wild boar, red squirrels, ocellated lizards, frogs, dragonflies, swallowtails and bees.

---

## F. Fantasy pieces made believable

Fantasy enters as if the same museum diorama-makers had built it, its look taken from medieval sources, and the tiny people treat it as a natural wonder.

- **Dragon** (the game piece is red). The great red dragon of the Apocalypse manuscripts and bestiaries, such as the Saint-Sever Beatus (Gascony, 11th c.). A serpentine body with a knotted tail, two clawed legs, a crested horned head and ribbed bat wings. Deep red scales over an ochre belly, with real reptile skin texture, dust and glass-bead eyes. Wingspan about 0.5 tile. It flies with a two-pose wingbeat and glides, and its broad soft shadow sweeps across the tiles below. Grumpy, not cruel.
- **Fairy** (the game piece is pale blue). A *fée* of 12th–13th-century romance: human-shaped and slender, with **no insect wings** (those are an 18th–19th-century invention). She wears a pale-blue silk gown, a gold fillet in her loose hair, and carries a sprig of hawthorn, floating a hand's breadth up in a pearly glow.
- **Volcano.** Languedoc has no live volcanoes, but the extinct cone of Mont Saint-Loup at Agde gave the black basalt of Agde's fortified cathedral (finished c. 1200). So: a small cone of black basalt and rusty scoria. The crater and lava cracks are emissive resin under a black crust. Smoke and sparks are procedural. A hermit lives nearby.
- **Magic portal.** A dolmen. The Aude has the largest in southern France, the Dolmen des Fades ("of the fairies" in Occitan) at Pépieux, from about 3500 BC. Rough slabs, ivy and offerings of flowers, with the passage glowing pale blue (animated noise).
- **Princess** (C5). She walks in a garden or along the wall-walk with a lady-in-waiting. When she sends a knight away (the game rule), he bows and leaves.
- **Tower floors.** A round tower of the same banded masonry, built in drums: a base with a stepped plinth, a repeatable middle floor with a flat top and bottom, and a top with merlons, hoarding and a banner. A crane and masons work on it while it grows.
- **Castles.** A compact *castrum*: square keep, curtain wall, gate between two small round towers, hall and chapel apse. Models: the Trencavel palace and the early castles of Cabaret (Lastours). When it is completed, the lord's banner rises.
- **Bridges** (game pieces). Narrow humped stone bridges of one or three arches (B8).

---

## G. Miniature realism guide

### G1. What sells a diorama photograph

- **Scale cues.** Believable thickness everywhere: walls 2–3 m, individual tile rows, doors 1.2 times a person's height. Fine repeated detail such as straw and cobbles, and a few handmade imperfections.
- **Materials.** Static grass in mixed lengths and colours; clump foliage on wire trunks; real sand and pebbles; resin water with a depth gradient and a meniscus at the banks.
- **Weathering.** Grime at the foot of walls, rain streaks below windows and merlons, soot by ovens, moss on north faces, lichen on roofs. Nothing pristine.
- **Light.** One soft key from the upper left at low contrast, about 1.5:1, with no hard shadows in sprites.
- **Lens.** The engine applies tilt-shift depth of field: a sharp band across the middle of the screen, blur growing towards top and bottom, stronger when zoomed in. Add a slight vignette and faint grain. Never bake blur into assets.
- **Grade.** Slightly warm, gently saturated, lifted blacks. Grade the whole board after compositing.
- **Motion.** Tilt-shift films look miniature partly because motion runs a little fast. People walk briskly and pose changes step at 12 fps, like stop-motion. Water, smoke, flags and the camera stay smooth.

### G2. Engine compositing rules

1. **Two layers.** Everything flat (textures, roads, rivers, fields, wall footprints, gardens) is the ground layer. It is top-down and can still be rendered per tile type and rotated with the tile. Everything upright is a sprite drawn **after** the rotation, in screen space and always upright. Rotate each anchor with `rotUnit`, never the sprite. Flip sprites horizontally for variety; never rotate them.
2. **Projection.** At the 60° camera, heights show at ×0.5 and ground depths at ×0.87. Spinning parts (mill wheel, trebuchet arms, bell, crane wheel) are generated flat and face-on: rotate them, then scale Y by 0.5 if they turn in a plane facing the camera. Banners and laundry are flat cloths, waved with a sine-wave mesh.
3. **Order and shadows.** Sort sprites by the y of their foot point, and split tall sprites into a foot part and a top part where figures pass behind them. Sprites have no shadows of their own. The engine draws a soft ellipse offset down and right at 25–40% opacity, and a skewed footprint shadow for buildings.
4. **Mirroring.** Keep sprites low in contrast so that a flipped sprite, now lit from the upper right, does not jar.
5. **Scale,** as a fraction of the tile edge:

   | Sprite | Size |
   |---|---|
   | person (height) | 0.025–0.03 |
   | sheep (length) | 0.018 |
   | ox (length) | 0.03 |
   | cart | 0.05 |
   | house (width) | 0.06–0.12 |
   | church | 0.22 |
   | cathedral | 0.48 |
   | monastery | 0.4 |
   | round tower (diameter) | 0.1 |
   | gatehouse | 0.14 |
   | tree crown | 0.05–0.12 |
   | dragon (wingspan) | 0.5 |

   Background figures are at most a fifth of a meeple's height, never in solid player colours, and never on a meeple spot.
6. **Detail by zoom.** Zoomed out: mill wheels, flags, smoke, carts. Mid zoom: walkers and animals. Close up: fish, frogs, mice, faces at windows. Cap moving sprites at about 150 on screen.
7. **Gameplay first.** Keep vignettes off meeple spots, feature symbols and tile edges. Freeze or dim them while a tile is being placed or a feature claimed. Honour "reduce motion".
8. **Wind.** One wind from the west (screen left) for all flags, smoke and laundry.
9. **Chroma fallback.** If the model cannot return transparency, ask for a flat `#FF00FF` background and key it out. Never green or white.

### G3. What makes children zoom in

- **A story every few centimetres.** One to three looping micro-stories per tile, with a beginning, middle and end.
- **Zoom rewards.** The closer you get, the more appears; some details exist only at maximum zoom.
- **Recurring characters.** The escaped pig, the baker's boy, the juggler, the storks and the two hapless robbers wander from tile to tile along the roads.
- **Rare events,** every 2–5 minutes somewhere on the board: the big trebuchet's stone splashing into a pond on another tile, the dragon flying past, a cart losing a wheel, a wedding, bells pealing as pigeons burst from every roof.
- **Cause and effect across tiles.** Carts travel between connected tiles and ducks swim downstream.
- **Taps** (optional): tapping a figure makes it wave or jump; tapping a bell rings it.
- **Seek-and-find:** a short list in the rules screen, such as the stork's nest, the fairy ring and the sleeping guard.

---

## H. Animated vignette catalogue

Key: **2p** = swaps between two poses; **path** = moves along a route; **rot** = rotates; **fx** = procedural particles.

**City walls**
- **Pierrière drill:** six sergeants haul together (2p) and the arm whips over (rot). A stone arcs into a straw target outside the wall, which bursts (fx). Then reload; 14 s.
- **The big trabuquet:** two men walk the capstan (2p) as the arm winds down (rot, 8 s). The pin is knocked out and the stone flies off the tile. Rare: it splashes down on another tile.
- **Crossbow targets:** foot in the stirrup, string on the belt hook, stand (2p); load, shoot (bolt fx), thunk.
- **Patrol:** two spearmen walk between towers (path); one points at the horizon.
- **Horn:** the watchman blows (2p) and jackdaws lift off the tower (fx).
- **Hoarding carpenters:** a beam rises on a pulley (path) and a carpenter hammers (2p); a plank appears each minute.
- **Stork:** glides in (2p), lands on its tower nest, clatters its bill, and chicks pop up.
- **Banner:** streams east (mesh) and wraps around its pole now and then.
- **Sleeping sentry:** a cat steals his bread; he wakes and shakes his fist (2p).
- **Masons' cradle:** a mason on a hanging plank repairs the mortar (2p) while his bucket goes up and down (path).

**Town interior**
- **The great pig escape:** a pig bolts through the lanes (path, may cross tiles) with a boy running after it; they come back with the pig on a rope. 40 s.
- **Shutters:** open into counter and awning; a woman shakes a cloth from a window (2p, dust fx).
- **Laundry:** linen on window poles flaps in the wind (mesh).
- **Bread oven:** loaves go in on a peel (2p) and smoke curls out (fx); the baker's boy trots off with loaves on his head (path).
- **Smithy:** hammer up and down (2p, 0.5 s), sparks (fx), steam when the iron is quenched.
- **Runaway cask:** rolls down the lane (rot, path) with the cooper chasing it.
- **Stubborn mule:** it plants its feet until a child offers a cabbage (2p).
- **Roof cat:** stalks along a ridge (path) and pounces; the pigeons scatter (fx).
- **Games:** a hoop rolls (rot, path), a top spins (rot), a hobby horse gallops round the well.
- **Roof smoke:** thin wisps rise through gaps in the tiles (fx).

**Cathedral**
- **Bells:** swing in the bell-gable (rot ±70°) while pigeons burst from the roofs (fx).
- **Procession:** canons and the bishop circle the church behind a cross (path).
- **Blessing:** the bishop raises his hand at the north portal (2p) and people kneel (2p).
- **Transept works:** the treadwheel crane turns (rot) with a man walking inside (2p), and a stone rises.
- **Wedding** (rare): a couple in flower chaplets at the door while guests toss petals (fx).
- **Pilgrims:** they doff their hats (2p) and go in.
- **Alms:** a canon hands out bread (2p).
- **Knucklebones:** children on the steps (2p) jump up when the bells ring.

**Road**
- **Hay cart:** the mule plods (2p), the wheels turn (rot), hay wisps fall (fx); it travels across tiles.
- **Mule train:** 3–4 belled mules with wineskins (path).
- **Flock:** a shepherd and dog move fifteen sheep, which spill onto the verges and funnel back (flocking).
- **Pilgrims:** stop at a milestone to drink from a gourd (2p).
- **Knight and squire:** ride by with the pennon fluttering (path).
- **Messenger:** gallops past in a trail of dust (fx) while walkers step aside.
- **Pig to market:** stops to eat an apple fallen from a cart.
- **Minstrel:** stops to play to the cows (2p).
- **Lizard:** basks on a milestone and darts off (close zoom only).

**Crossroads and village**
- **Wayside cross:** a traveller kneels and crosses himself (2p).
- **Well:** the pulley turns (rot), the bucket rises (path) and the women nod as they chat.
- **Tag:** children chase round the cross (path).
- **Farrier:** taps a mule's hoof (2p).
- **Chickens:** peck (2p) and scatter from a cart.
- **Goat:** eats a vine leaf on a wall; its owner scolds (2p).
- **Old man:** dozes on a bench and wakes when the rooster crows.
- **Runaway sheet:** a gust lifts it off a hedge (mesh) and a girl chases it.

**Monastery**
- **Bell call:** the bell swings (rot) and monks file into the church (path).
- **Cloister well:** windlass (rot), rising bucket (path).
- **Sweeping:** a lay brother sweeps the walk (2p, dust fx).
- **Reader:** turns a page (2p) and nods off.
- **Gate dole:** the porter hands bread to a pilgrim (2p).
- **Grain cart:** rolls to the barn (path) and sacks are unloaded.
- **Fishpond:** a monk nets fish (2p) as they leap (fx).
- **Goat in the cabbages:** a monk chases it with a hoe (path).

**Abbot's garden**
- **Hoeing:** a monk works the beds (2p, soil fx).
- **Watering:** water poured from a jug (fx).
- **Bees:** swirl over the hives (fx) while the beekeeper waves a smoking pot.
- **Butterflies:** flit about (path, 2p wings).
- **Herbs:** a novice fills a basket (2p).
- **Robin:** hops behind the hoe (path).
- **Snail:** crosses a path (close zoom only).
- **Abbot:** strolls the paths, reading (path).

**Field and farm**
- **Ploughing:** the oxen plod (2p) and the furrow grows behind them (texture reveal).
- **Sower and crows:** seed flies (2p, fx), crows peck behind him, and a boy with a sling shoos them off.
- **Reapers:** the sickle swings (2p), sheaves are tied, and stooks appear over time.
- **Gleaners:** pick up the loose ears (2p).
- **Haymaking:** a scythe on the hay meadow only (2p), with rakers turning the hay.
- **Threshing floor:** mules tread in circles (path); a winnowing basket tosses chaff east (2p, fx).
- **Sheep:** graze (2p) while the dog circles the stragglers (path).
- **Goose girl:** geese waddle in a line behind her (path).
- **Hare** (rare): sprints across, chased by a dog that loses it (path).
- **Kite:** circles high overhead (path).

**River**
- **Water:** scrolling ripples, white eddies around rocks and below the weir (fx), sparkles.
- **Mill wheel:** turns (rot) with spray (fx); the miller carries sacks in.
- **Punt:** one fisherman poles (2p, path) while the other hauls a net of flashing fish (fx).
- **Angler:** his rod bends (2p) and a fish arcs into his creel (path).
- **Washerwomen:** paddles beat the linen (2p) and ash-soap foam drifts away (fx).
- **Dyer's magic:** a skein comes out of the woad vat yellow-green and turns blue in 2 s. Children's favourite.
- **Ducks:** a mother and her ducklings swim in a line (path) and dabble bottoms-up (2p).
- **Heron:** freezes, strikes (2p), and swallows.
- **Ferry:** poled across with a mule aboard (path).
- **Children:** splash and skim stones (path, ripple fx).

**Lake and spring**
- **Spring:** bubbles and rings at the rock (fx).
- **Shepherd boy:** drinks from his cupped hands (2p).
- **Jug:** a girl fills a jug (2p).
- **Frog:** hops from lily pad to lily pad (path).
- **Ducks:** tails up (2p).
- **Deer** (rare): drinks, lifts its head and bounds off.
- **Dragonflies:** dart about (close zoom only).
- **Reeds:** sway in the wind.

**Inn**
- **Arrival:** a groom takes a traveller's mule (path).
- **Sweeping:** a boy sweeps the yard (2p).
- **Toast:** two travellers raise their cups on the bench (2p).
- **Kitchen:** the cook plucks a chicken (2p, feather fx) while smoke leaves the roof vent.
- **Casks:** rolled down planks from a cart (rot, path).
- **Bush sign:** sways in the wind.
- **Minstrel:** plays at the door and a coin is tossed to him (path arc).
- **Donkey:** brays (2p) and a dog barks back.

**Bazaar and market**
- **Haggling:** buyer and seller gesture (2p) and shake hands.
- **Money changer:** the balance pans tip (rot).
- **Juggler:** balls loop through the air (fx) while children bounce (2p).
- **Dancing bear:** rises and turns (2p, rot) as its leader taps a tabor.
- **Tumbler:** walks on his hands (2p) and cartwheels (rot).
- **Minstrel:** bows his vielle (2p).
- **Hen escape:** a hen flaps out of its cage (path) with the poultry wife chasing.
- **Apple thief:** a boy runs off with an apple (path) while the merchant shakes his fist (2p).
- **Crier:** blows a horn (2p) and heads turn.

**Tower**
- **Crane:** the wheel turns (rot) with a man walking inside (2p); a stone rises (path) and the mason sets it.
- **Stone carts:** deliver blocks (path).
- **Mortar:** mixed in a tub (2p).
- **Lookout:** turns beside a banner (2p, mesh).
- **Arrow slit:** a crossbow pokes out and withdraws (close zoom only).
- **Prisoner:** sighs at a window (2p); once ransomed, he waves and walks out.
- **Swifts:** scream round the top (path).
- **Growth:** each new floor appears in a puff of dust (fx).

**Bridge**
- **Traffic:** carts, mules and pilgrims cross (path).
- **Gazer:** a pilgrim leans on the parapet (2p).
- **Fishing:** a boy dangles a line from the parapet (2p).
- **Stick race:** two children drop sticks and run to the other side (path).
- **Stubborn donkey:** refuses, then trots across (2p, path).
- **Under the arch:** a punt passes beneath (path, hidden by the bridge).
- **Swallows:** dart in and out of the arches (path).
- **Toll:** where the bridge enters a town, a keeper takes a penny (2p).

**Castle**
- **Banner raising:** when the castle is completed the banner runs up the keep (path) and a horn sounds.
- **Herald:** rides out in his lord's colours (no tabard; that comes later) with a banner-bearer, blows a horn (2p), and villagers gather (path).
- **Sentries:** walk the curtain wall (path).
- **Riding out:** a knight and squire leave by the gate (path).
- **Falconry:** a hawk circles (path) and returns to the fist.
- **Lady on the wall:** walks with a companion (path).
- **Quintain:** a page on a pony hits the shield (path, 2p).
- **Wooden swords:** two pages play at fighting (2p).

**Volcano and dragon**
- **Smoke:** a column leans east (fx) and embers wink out.
- **Crater:** the glow pulses and the lava cracks shimmer.
- **Onlookers:** two peasants point from a safe distance; one hides behind the other (2p).
- **Dragon flight:** wingbeats (2p) and glides; the sheep below scatter and regroup (flocking).
- **Dragon at rest:** curled on the cone, puffing smoke rings (fx).
- **Hermit:** sweeps his step, unbothered (2p).
- **Brave knight:** peeks from behind a rock and ducks whenever the dragon turns (2p).
- **Meeple flees:** runs home down the road when the dragon arrives (path). It is never eaten.

**Fairy**
- **Hover:** bobs gently (sine) and her glow breathes.
- **Trail:** specks of light follow her when she moves (fx).
- **Butterflies:** circle her (path).
- **Blooming:** flowers open at her feet (scale) and close when she leaves.
- **Fairy ring:** the mushrooms glow faintly now and then.
- **Rabbits:** peek out of the grass (2p).
- **Child:** a girl stops, stares and waves (2p).
- **Blessing:** a ring of light spreads out when her meeple scores (fx).

**Portal**
- **Shimmer:** light moves inside the passage (noise).
- **Offerings:** a villager lays flowers at the entrance (2p).
- **Dog:** barks at the light and backs away (2p).
- **Moths:** circle the glow (path).
- **Teleport:** a meeple steps in (fade), a flash goes off at the matching portal, and it steps out there.
- **Goat:** pokes its head in and jerks it back (2p).
- **Dust:** specks float in the light (fx).
- **Ivy:** rustles in the wind.

**Highwaymen camp**
- **Peekaboo:** both robbers pop up behind the bush as a traveller passes, then duck (2p).
- **Campfire:** flames flicker (fx) and the pot steams.
- **Nap:** one dozes with his hat over his eyes (breathing).
- **Goose:** escapes from the sack (path) with a robber chasing it.
- **Hat:** one tries on a stolen hat while the other laughs (2p).
- **Lookout:** climbs a tree, slips, and climbs again (path).
- **Loot:** coins glint (fx); they always come up one short.
- **Bickering:** the two argue, waving their arms (2p).

**Farmhouse**
- **Hens:** the farm wife scatters grain (2p, fx) and the hens rush in.
- **Rooster:** crows from the wall (2p).
- **Woodsplitting:** the axe rises and falls (2p) and chips fly (fx).
- **Piglet:** squeezes through the fence (path) and starts the great pig escape.
- **Laundry line:** linen flaps on a cord between poles (mesh).
- **Quern:** a woman turns the hand mill (rot).
- **Geese:** chase the children across the yard (path).
- **Grain drying:** a boy waves sparrows off the grain spread out on cloths (2p).

---

## I. Sprite-sheet prompt pack

The prompts ready to send are in [`prompts.json`](prompts.json): an array of `{ id, kind, grid, items, prompt }` in priority order. `items` lists the cells row by row as `name: description`; use the names as file names. P01–P12 are the core run; P13–P14 are optional if credits remain.

### I1. Workflow

1. **Size.** Generate square images at 4096 px if possible, 2048 px at minimum. If the model tops out at 1024–1536 px, split each 4x4 sheet into two 3x3 runs. The most important items come first in each sheet.
2. **Length.** Prompts run 2,000–4,700 characters. If a model truncates, drop the `Avoid:` line first, then the notes; never shorten the item list.
3. **Style chaining.** Once P02 is accepted, attach it as a style reference to every later sprite prompt: "match the painting, lighting and camera of the reference". Use P01 the same way for P13.
4. **QA before accepting a sheet.** Count and grid are right, and the camera angle matches. No cast shadows and no painted fake checkerboard (if one appears, rerun with the magenta fallback). No text. Nothing cut off. No anachronism from section A: look for slate, chimneys, glass, buttons, plate armour, stripes and columnar poplars. Allow one re-roll at most and fix small defects by inpainting.
5. **Slicing.** Cut equal cells, trim the empty margins and save as `{id}/{name}.webp`. Record each sprite's foot point (the bottom centre of its opaque pixels) as its anchor.
6. **Textures.** Discard the grey gutters. Make each swatch seamless by offsetting it by half and healing the seam, or tile it stochastically in the engine.

### I2. Shared preambles

Each prompt is the preamble (with item count and grid filled in), then the sheet's notes, then "Items, left to right and top to bottom: 1) …", then the `Avoid:` line. Sprite sheets:

```text
Photorealistic macro photograph of museum-quality hand-painted 1:160 scale tabletop miniatures for a historical diorama of Carcassonne and the Languedoc, southern France, in the year 1220. Sprite sheet: {n} separate items arranged in an even {r} by {c} grid, one item centred in each cell, evenly spaced and non-overlapping, with clear empty space around every item and nothing touching the cell edges; each item fills about 75% of its cell, so the items are not to scale with one another. Every item is seen from the same high camera angle, about 60 degrees down from the horizon, facing north, through a long lens so verticals stay parallel and there is no perspective distortion. Soft diffuse daylight from the upper left, gentle and low in contrast, with no cast shadows and no shadow on the ground. No ground, no base, no plinth, no scenery: each item is cleanly cut out on a transparent background. Matte acrylic paint with fine dry-brushed highlights and subtle weathering; realistic materials (sandstone, red brick, lime-wash, terracotta, weathered oak, dark iron, wool, linen); natural muted earth colours; every item in crisp focus with no depth-of-field blur. Strictly accurate to 13th-century Languedoc. No text, letters, numbers, labels, logos, grid lines, frames or watermark.

Avoid: slate roofs, steep conical witch-hat roofs, glass windows, chimney stacks on ordinary houses, plate armour, buttons, striped clothes on ordinary people, long pointed shoes, gunpowder weapons, New World plants and animals, modern objects, cartoon proportions, painted checkerboard backgrounds.
```

Texture sheets use the same frame but are shot "perfectly straight down (90 degrees, orthographic top-down view) under flat, even, soft overcast light", as "a grid of square swatches separated by thin straight neutral-grey gutters". Each swatch is "a different seamless, tileable material that fills its square completely and evenly", fully opaque, made of real modelling materials (static grass, flock, sand, pebbles, plaster, resin only where wet). The full text is in `prompts.json`. Extra notes per sheet: buildings get "no people or animals"; figure sheets get realistic proportions and walkers facing left; spinning parts and cloths are drawn "flat, face-on"; fantasy subjects take their look from 12th–13th-century manuscripts.

### I3. The prompts, in priority order

The ground comes first because it covers most of every tile; a photographic sprite on a painted ground looks like a sticker.

| # | id | kind | grid | for | items (row by row) |
|---|---|---|---|---|---|
| 1 | `P01-ground-core` | texture | 3x3 | The ground of every tile. | `meadow`, `meadow_flowers`, `dirt_road`, `town_lane`, `wall_walk`, `roof_tiles`, `ploughed`, `wheat_ripe`, `riverbed` |
| 2 | `P02-town-houses` | sprites | 3x3 | City houses and hamlet cottages. | `house_shop_gable`, `house_shop_eaves`, `house_merchant_stone`, `row_houses`, `house_courtyard`, `cottage_small`, `village_house_tall`, `bakehouse`, `smithy` |
| 3 | `P03-walls-gates` | sprites | 4x4 | The Cité wall kit and its builders. | `tower_roman_round`, `tower_round_hoarding`, `tower_square_watch`, `gatehouse_outer`, `gatehouse_inner`, `gatehouse_side`, `wall_outer`, `wall_inner`, `hoarding_segment`, `wall_stair_postern`, `merlon_set`, `turret_small`, `treadwheel_crane`, `mason`, `carpenter`, `handbarrow_labourers` |
| 4 | `P04-townsfolk-clergy` | sprites | 4x4 | Walkers, the princess, cathedral and monastery people. | `townsman`, `townswoman`, `boy_running`, `girl_hoop`, `pilgrim`, `princess`, `merchant`, `noble_lady`, `benedictine_monk`, `water_carrier`, `old_woman_spinning`, `nobleman_falcon`, `dominican_friar`, `nun`, `bishop`, `canon` |
| 5 | `P05-field-folk-animals` | sprites | 4x4 | Farm work, herds, carts, riders. | `ploughman_oxen_ard`, `sheep_group`, `shepherd`, `hay_cart`, `mule_packed`, `reaper`, `pig_running`, `chickens`, `palfrey_rider`, `sower`, `sheaf_binder`, `guard_dog`, `goose_girl`, `goats`, `sow_piglets`, `donkey_rider` |
| 6 | `P06-soldiers-siege` | sprites | 4x4 | Garrisons, drills, both trebuchets (arms separate). | `sergeant_spear`, `crossbowman_shooting`, `crossbowman_spanning`, `rope_haulers`, `pierriere_frame`, `pierriere_arm`, `straw_target`, `knight_mounted`, `banner_bearer`, `horn_watchman`, `archer`, `engineer`, `trabuquet_frame`, `trabuquet_arm`, `knight_foot`, `quintain` |
| 7 | `P07-trees-plants` | sprites | 4x4 | Field, river and garrigue vegetation. | `holm_oak`, `downy_oak`, `black_poplar`, `pollard_willow`, `goblet_vine`, `olive`, `apple_tree`, `hedge_segment`, `reed_clump`, `white_poplar`, `cypress`, `almond`, `fig`, `walnut`, `broom`, `garrigue_clump` |
| 8 | `P08-landmarks` | sprites | 3x3 | Church, cathedral, inn, farmhouse, castle, set pieces. | `parish_church`, `cathedral`, `inn`, `farmhouse`, `castle`, `village_well`, `wayside_cross`, `threshing_floor`, `highwaymen` |
| 9 | `P09-monastery-garden` | sprites | 3x3 | Monasteries and the Abbot's gardens. | `monastery_complex`, `priory_small`, `herb_garden`, `bee_bench`, `fishpond`, `monk_hoeing`, `lay_brother_beekeeper`, `bell`, `orchard_cluster` |
| 10 | `P10-market-trades` | sprites | 4x4 | Bazaar stalls, trades, entertainers. | `wine_stall`, `cloth_stall`, `grain_stall`, `juggler`, `bear_leader`, `minstrel`, `money_changer`, `blacksmith_up`, `blacksmith_down`, `pottery_stall`, `woad_stall`, `spice_salt_stall`, `poultry_produce`, `cooper`, `fishwife`, `tumbler` |
| 11 | `P11-river-mill-bridges` | sprites | 4x4 | River tiles and bridge pieces. | `mill_house`, `mill_wheel`, `bridge_lr`, `bridge_front`, `angler`, `washerwomen`, `ducks`, `punt_fishermen`, `dyer`, `footbridge`, `ferry`, `fish_traps`, `heron`, `children_wading`, `laundry_drying`, `water_life` |
| 12 | `P12-fantasy-tower` | sprites | 3x3 | Princess & Dragon and Tower pieces. | `dragon_wings_up`, `dragon_wings_down`, `fairy`, `volcano`, `dolmen_portal`, `fairy_ring`, `tower_base`, `tower_floor`, `tower_top` |
| 13 | `P13-ground-extra` | texture | 3x3 | Optional second ground set. | `vineyard`, `garrigue`, `farmyard`, `market_ground`, `roman_paving`, `garden_path`, `stubble`, `flax`, `woad` |
| 14 | `P14-life-details` | sprites | 4x4 | Optional animation helpers. | `stork_wings_up`, `stork_wings_down`, `stork_nest`, `doves`, `cat_sitting`, `cat_stalking`, `hound_running`, `sparrows_mouse`, `banner_france`, `banner_toulouse`, `banner_trencavel`, `banner_foix`, `pennons`, `laundry_pieces`, `butterflies_bee`, `props` |

If credits run short, P14's banners can be drawn procedurally (period arms are simple geometry), and P13 can be approximated by tinting P01 swatches.

---

## Sources

**Carcassonne and Saint-Nazaire**
- Centre des monuments nationaux, *Cité de Carcassonne: introduction à la visite* (Roman towers with brick bands, hoardings fitted under threat, second wall after 1240): [PDF](https://www.monuments-nationaux.fr/var/cmn_inter/storage/original/application/04c4ac49032d69b1d28487e75f935011.pdf)
- Wikipédia, [Cité de Carcassonne](https://fr.wikipedia.org/wiki/Cit%C3%A9_de_Carcassonne) (Roman wall, Château Comtal 1130 and 1228–39, Narbonne Gate c. 1280, 1298 hoardings, slate debate); [English article](https://en.wikipedia.org/wiki/Cit%C3%A9_de_Carcassonne)
- DRAC Occitanie, *Saint-Nazaire-et-Saint-Celse, ancienne cathédrale de Carcassonne* (Romanesque chronology, north portal, *pierre du siège*, invented defensive west front): [PDF](https://www.culture.gouv.fr/content/download/194656/file/DUO%20%20St%20Nazaire%20Carcacassonne-WEB.pdf)
- Wikipédia, [Basilique Saint-Nazaire-et-Saint-Celse](https://fr.wikipedia.org/wiki/Basilique_Saint-Nazaire-et-Saint-Celse_de_Carcassonne)
- Pont Vieux (1184 authorisation, 14th-century fabric): [ryo.co](https://ryo.co/fr/destinations/france/lieux/pont-vieux-carcassonne/), [World City Trail](https://worldcitytrail.com/2024/11/14/pont-vieux-in-carcassonne/)

**Military**
- Wikipedia: [Trebuchet](https://en.wikipedia.org/wiki/Trebuchet), [Mangonel](https://en.wikipedia.org/wiki/Mangonel), [Springald](https://en.wikipedia.org/wiki/Springald), [Siege of Toulouse 1217–18](https://en.wikipedia.org/wiki/Siege_of_Toulouse_(1217%E2%80%931218)), [Great helm](https://en.wikipedia.org/wiki/Great_helm), [Surcoat](https://en.wikipedia.org/wiki/Surcoat), [Pavise](https://en.wikipedia.org/wiki/Pavise), [Kettle hat](https://en.wikipedia.org/wiki/Kettle_hat)
- Tod's Workshop, [A very short history of the crossbow](https://todsworkshop.com/a-very-short-history-of-the-crossbow/)
- Morgan Library, [Crusader (Maciejowski) Bible, MS M.638](https://www.themorgan.org/collection/Crusader-Bible?page=6); [Morgan Bible](https://en.wikipedia.org/wiki/Morgan_Bible)

**Heraldry**
- Staroskolskaya, ["The enigmatic arms of Trencavel"](https://www.theheraldrysociety.com/wp-content/uploads/2023/10/Staroskolskaya-paper.pdf), The Heraldry Society
- [The Fleur-de-lis](https://heraldica.org/topics/fdl.htm), heraldica.org; [Occitan cross](https://en.wikipedia.org/wiki/Occitan_cross); review of Macé, *La majesté et la croix* ([TMR](https://scholarworks.iu.edu/journals/index.php/tmr/article/view/31624))

**Costume, clergy, travellers**
- [1200–1300 in European fashion](https://en.wikipedia.org/wiki/1200%E2%80%931300_in_European_fashion); Rosalie Gilbert, [Cotes and tunics](https://rosaliegilbert.com/cotesandtunics.html); [Buttonhole](https://en.wikipedia.org/wiki/Buttonhole); [Liripipe](https://en.wikipedia.org/wiki/Liripipe); Pastoureau, *The Devil's Cloth* ([summary](https://cs.brown.edu/people/sk/Personal/Books/Pastoureau-Devils-Cloth/))
- Cistercian dress ([DHI Sheffield](https://www.dhi.ac.uk/cistercians/cistercian_life/monastic_life/clothing/index.php)) and the tower ban ([Fountains](https://cistercians.shef.ac.uk/fountains/buildings/church/church11.php)); early Dominican habit ([Summit Dominicans](https://www.summitdominicans.org/blog/2010/03/sisters-why-dont-you-wear-the-traditional-habit)); [Cathar Perfect](https://en.wikipedia.org/wiki/Cathar_Perfect); Barber, [Templar preceptory of Douzens](https://centaur.reading.ac.uk/7857/)
- [Camino de Santiago](https://en.wikipedia.org/wiki/Camino_de_Santiago); [Chemin du piémont pyrénéen](https://franco.wiki/fr/Chemin_du_pi%C3%A9mont_pyr%C3%A9n%C3%A9en.html); [dancing bears in medieval images](https://pipeandtaborcompendium.co.uk/street_entertainers/dancing_bear/dancing_bear.html)

**Trade, dyes, objects**
- Woad chronology (Petrowiste 2020; Caster): [bibliography](https://bibliographienumeriquedhistoiredudroit-ifg.univ-lorraine.fr/s/bibliography-of-legal-history/item-set/5151); kermes in the garrigue ([*AHRF* 2020](https://www.revues.armand-colin.com/histoire/annales-historiques-revolution-francaise/annales-historiques-revolution-francaise-no399-12020/insects-dyeing-and-industry-from-the-ancien))
- Grey ware in mid-13th-century Languedoc ([Beaucaire](https://www.etudesheraultaises.fr/wp-content/uploads/ael-art-2001-25-09-depotoir-romain-beaucaire.pdf)); Melgueil coinage ([Mauguio](https://www.mauguio-carnon.com/images/PARCOURS-HISTORIQUE/HOTEL-MONNAIES/EN_SAVOIR_PLUS_PANNEAU_HOTEL_DES_MONNAIES.pdf)); cask hoops ([Material Culture Review](https://journals.lib.unb.ca/index.php/MCR/article/download/17536/22466?inline=1)); [the wine bush](https://wordhistories.net/2017/12/02/good-wine-needs-no-bush/); [Wheelbarrow](https://en.wikipedia.org/wiki/Wheelbarrow); [Treadwheel crane](https://en.wikipedia.org/wiki/Treadwheel_crane)

**Architecture and countryside**
- Génoise ([DRAC PACA](https://www.culture.gouv.fr/Media/Regions/Drac-Paca/Files/Aides-demarches/Demarches-et-conseils-architecture-patrimoine/Fiches-conseil/Stap-du-Var/06-Les-debords-de-toiture)); bell-gables ([list](https://www.techno-science.net/fr/definitions/liste-d-eglises-francaises-a-clocher-mur), [Lauragais](https://www.lauragais-tourisme.fr/wp-content/uploads/2020/11/Itineraire-4-Paysages-du-Lauragais.pdf)); [Maison Romane, Saint-Antonin](https://www.routard.com/fr/guide/france/midi-toulousain-occitanie/tarn-et-garonne/saint-antonin-noble-val)
- [Bastide](https://en.wikipedia.org/wiki/Bastide), [the first bastides](https://books.openedition.org/pumi/43013); [Bram](https://en.wikipedia.org/wiki/Bram,_Aude); wash-houses ([PNR Chevreuse](https://www.parc-naturel-chevreuse.fr/sites/default/files/2023-08/Livret_Patrimoine_Lavoirs.pdf)); chimneys ([Bristol Museums](https://museums.bristol.gov.uk/narratives.php?irn=3651)); unglazed windows ([V&A](https://collections.vam.ac.uk/item/O84682/window-framework-window-frame-unknown/))
- [Windmill](https://en.wikipedia.org/wiki/Windmill); [Moulin à vent](https://www.techno-science.net/fr/definitions/moulin-a-vent) (Arles 1170); mills on the Hérault ([DRAC Occitanie](https://www.culture.gouv.fr/Media/Regions/Drac-Occitanie/Files/Doc-Pat/MH/Protections-2018/34-Herault-Saint-Orens-de-Gameville-Moulin-de-Roquemengarde)) and at Narbonne in 1198 ([Archives de l'Aude](https://archivesdepartementales.aude.fr/sites/default/files/media/files/Sous_serie_63J_Moulins_Narbonne.pdf)); [Lagrasse](https://www.beyond.fr/villages/lagrasse.html); [Via Aquitania](https://en.wikipedia.org/wiki/Via_Aquitania); [disc crosses](https://museedupatrimoine.fr/croix-discoidale-aude/37083.html?lang=en)

**Plants and animals**
- Canal du Midi planes ([Connexion](https://www.connexionfrance.com/magazine/shade-and-chic-frances-history-of-planting-trees-in-a-row/155060), [Botany One](https://www.botany.one/plane-tree-genetics/)); prickly pear ([Bauhinia](https://eterna.unibas.ch/bauhinia/article/view/1620)); [Lombardy poplar](https://trees.stanford.edu/ENCYC/POPnigra.htm); [weeping willow](https://treesandshrubsonline.org/articles/salix/salix-babylonica/); [orange carrots](https://theconversation.com/explainer-why-are-carrots-orange-20646); [strawberry](https://en.wikipedia.org/wiki/Strawberry); [vine training](https://en.wikipedia.org/wiki/Vine_training); [sickle and scythe](https://www.farmcollector.com/equipment/implements/mowing-hay-cradle-scythe/); boar-like medieval pigs ([Anthropozoologica](https://sciencepress.mnhn.fr/en/periodiques/anthropozoologica/10/premiere-approche-du-profil-cephalique-des-suides-sur-le-site-d-andone-saint-amant-de-boixe-charente-950-1028-ap-j-c)); log hives ([Revue d'ethnoécologie](https://journals.openedition.org/ethnoecologie/2531))

**Fantasy anchors**
- Dolmen des Fades ([Aude Tourisme](https://www.audetourisme.com/en/fiche/pepieux/le-dolmen-des-fades_TFOPCULAR011FS0002V/), [Guilaine](https://mail.laviedesidees.fr/IMG/pdf/20211122_guilaine-2.pdf)); Agde's basalt cathedral ([Hérault Tourisme](https://www.herault-tourisme.com/fr/fichepatrimoine-culturel/cathedrale-saint-etienne-agde_TFOPCULAR034V50WAAO)); [Saint-Sever Beatus](https://en.wikipedia.org/wiki/Saint-Sever_Beatus)
