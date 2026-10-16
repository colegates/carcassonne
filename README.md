# Carcassonne — pocket edition

A phone-first web version of the classic tile-laying board game, built for
playing on an iPhone: pass-and-play for the family or against computer
knights (Easy / Medium / Hard).

* Full base game: all 72 tiles (24 types), roads, cities with shields,
  monasteries and farmers, with 3rd-edition scoring.
* Painted tile artwork generated procedurally on a canvas (no image assets).
* Touch controls: drag to pan, pinch to zoom, tap a glowing spot to place,
  tap again to rotate, tap a ghost meeple to claim a feature (the whole
  feature lights up so you can see what you're claiming).
* Helper mode: points preview, 💡 hints, undo before you finish your turn.
* Animated scoring, end-game tally, illustrated "How to Play" guide.
* Works offline and installs to the home screen (Share → Add to Home Screen).
* Saves automatically — close the app and continue later.

No build step: the game is plain HTML/CSS/ES modules in `public/`.

## Run locally

```sh
npx serve public      # then open the printed URL
npm test              # rules engine + AI tests
```

## Deploy to Cloudflare

The repo is configured for **Cloudflare Workers static assets** (`wrangler.toml`).

```sh
npx wrangler login
npx wrangler deploy        # prints https://carcassonne.<you>.workers.dev
```

Or with **Cloudflare Pages**: create a Pages project connected to this repo,
leave the build command empty and set the output directory to `public`.

Automatic deploys: `.github/workflows/deploy.yml` runs the tests and deploys on
every push to `main` once you add the repository secrets
`CLOUDFLARE_API_TOKEN` (token with *Workers Scripts: Edit*) and
`CLOUDFLARE_ACCOUNT_ID`.

On the iPhone open the URL in Safari, tap **Share → Add to Home Screen** for a
full-screen app that also works without signal.

## Layout

| File | What |
| --- | --- |
| `public/js/tiles.js` | Tile set: edges split into 12 ports, features, counts |
| `public/js/game.js` | Pure rules engine (placement, followers, scoring) |
| `public/js/ai.js` | Computer players (simulate every move + heuristic) |
| `public/js/art.js` | Procedural painted tile art, meeples, table |
| `public/js/board.js` | Canvas board: camera, pinch/pan, effects |
| `public/js/main.js` | Screens, turn flow, animations, saving |
| `public/js/rules.js` | Illustrated rules guide |
