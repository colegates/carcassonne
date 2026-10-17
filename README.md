# Carcassonne — pocket edition

A phone-first web version of the classic tile-laying board game, built for
playing on an iPhone: pass-and-play on one phone, everyone on their own phone
over the internet, or against computer knights (Easy / Medium / Hard).

* Full base game: all 72 tiles, roads, cities with shields, monasteries and
  farmers, with 3rd-edition scoring.
* Six expansions that can be mixed freely (3rd-edition rules, see
  `docs/expansions/MASTER.md`):
  * **The River** — start the map with a river from spring to lake.
  * **The Abbot** — gardens and an abbot who can come home early with points.
  * **Inns & Cathedrals** — inns, cathedrals, the big meeple and a 6th player.
  * **Traders & Builders** — trade goods, the builder's double turn, the pig.
  * **The Princess & the Dragon** — volcanoes, the dragon's flight, the fairy,
    magic portals and princesses.
  * **The Tower** — tower floors, capturing figures, prisoners and ransom.
* **Online play**: create a room, share the 4-letter code (or the invite link /
  QR), and each player uses their own phone. Computer players can join too.
* Painted tile artwork generated procedurally on a canvas (no image assets).
* Touch controls: drag to pan, pinch to zoom, tap a glowing spot to place,
  tap again to rotate, tap a ghost figure to claim a feature (the whole
  feature lights up so you can see what you're claiming).
* Helper mode: points preview, 💡 hints, undo before you finish your turn.
* Animated scoring, end-game tally, illustrated "How to Play" guide for the
  base game and every expansion.
* Works offline (pass-and-play) and installs to the home screen.
* Saves automatically — close the app and continue later (online games can be
  rejoined from the home screen).

No build step: the game is plain HTML/CSS/ES modules in `public/`, plus a small
Cloudflare Worker (`worker/`) that hosts the online rooms.

## Run locally

```sh
npx wrangler dev        # game + online rooms on http://localhost:8787
npm test                # rules engine, expansions and AI tests
```

(`npx serve public` also works for single-phone play, without online rooms.)

## Deploy to Cloudflare

The repo is a **Cloudflare Worker with static assets and a Durable Object**
(`wrangler.toml`): the Worker serves the game files and runs one Durable Object
per online room.

Either connect the repository in the Cloudflare dashboard —
**Workers & Pages → Create → Import a repository**, pick this repo, leave the
build command empty and the deploy command as `npx wrangler deploy` — or deploy
from a computer:

```sh
npx wrangler login
npx wrangler deploy        # prints https://carcassonne.<you>.workers.dev
```

Automatic deploys from GitHub Actions: `.github/workflows/deploy.yml` runs the
tests and deploys on every push to `main` once you add the repository secrets
`CLOUDFLARE_API_TOKEN` (token with *Workers Scripts: Edit*) and
`CLOUDFLARE_ACCOUNT_ID`.

On the iPhone open the URL in Safari, tap **Share → Add to Home Screen** for a
full-screen app.

## How online play works

The phone that creates the room builds the starting position (including the
shuffled tiles); after that every move is a small action (`{t:'turn', …}`,
`{t:'dragon', key}`, `{t:'ransom', …}`) that the room relays to every phone.
Each phone replays the actions with the same deterministic rules engine, so all
phones show exactly the same game. A phone that reconnects gets the starting
position plus the action list and catches up. Computer players run on one phone
(handed over automatically if that phone leaves).

## Layout

| File | What |
| --- | --- |
| `public/js/tiles.js` | Tile set: edges split into 12 ports, features, counts; deck building |
| `public/js/data/*.js` | Expansion tiles, generated from `docs/expansions/*.json` by `dev/build-expansions.mjs` |
| `public/js/game.js` | Pure, deterministic rules engine (all expansions) |
| `public/js/ai.js` | Computer players (simulate moves + heuristics, dragon steering) |
| `public/js/layout.js` | Where cities, roads, buildings and symbols sit on each tile |
| `public/js/art.js` | Procedural painted tile art, wooden figures, table |
| `public/js/board.js` | Canvas board: camera, pinch/pan, figures, effects |
| `public/js/controller.js` | Turn flow, choices, animations, online sync |
| `public/js/lobby.js`, `net.js` | Game setup, online rooms |
| `public/js/rules.js` | Illustrated rules guide |
| `worker/` | Cloudflare Worker + `GameRoom` Durable Object |
| `docs/expansions/` | Rules research per expansion and the master rulings |
| `dev/` | Test and debugging scripts (tile gallery, UI and online play-throughs) |
