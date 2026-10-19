// Bakes small miniature pictures of every tile type (rotation 0) into one WebP atlas, so the
// rules, the dock and the bazaar show miniatures at once instead of waiting for the live
// renderer to load its textures and sprites: public/assets/minis/thumbs/atlas.webp + .json.
// usage: node dev/minis-thumbs.mjs [baseUrl] [size]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const base = process.argv[2] || 'http://127.0.0.1:5174/';
const size = +(process.argv[3] || 160);
const outDir = new URL('../public/assets/minis/thumbs/', import.meta.url).pathname;
fs.mkdirSync(outDir, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage();
p.on('pageerror', (e) => console.log('pageerror:', e.message));
await p.goto(base + 'dev/gallery.html?mode=painted&f=__none__');
const res = await p.evaluate(async (size) => {
  const { TILE_TYPES } = await import('/public/js/tiles.js');
  const { getTileThumb } = await import('/public/js/art.js');
  const { standaloneThumbs, thumbReady } = await import('/public/js/minis/render.js');
  if (!(await standaloneThumbs())) return null;
  const ids = Object.keys(TILE_TYPES);
  const req = Math.round(size / 1.3); // (thumb() renders at bucket(size * 1.3))
  for (let k = 0; k < 400 && !ids.every((id) => (getTileThumb(id, req, 0), thumbReady(id, req, 0))); k++) await new Promise((r) => setTimeout(r, 250));
  const cols = Math.ceil(Math.sqrt(ids.length));
  const rows = Math.ceil(ids.length / cols);
  const c = document.createElement('canvas'); c.width = cols * size; c.height = rows * size;
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
  ids.forEach((id, i) => g.drawImage(getTileThumb(id, req, 0), (i % cols) * size, Math.floor(i / cols) * size, size, size));
  return { ids, cols, data: c.toDataURL('image/webp', 0.82), missing: ids.filter((id) => !thumbReady(id, req, 0)) };
}, size);
if (!res) { console.log('minis not available'); process.exit(1); }
fs.writeFileSync(outDir + 'atlas.webp', Buffer.from(res.data.split(',')[1], 'base64'));
fs.writeFileSync(outDir + 'atlas.json', JSON.stringify({ size, cols: res.cols, ids: res.ids }) + '\n');
console.log('atlas', res.ids.length, 'tiles, missing', res.missing, fs.statSync(outDir + 'atlas.webp').size, 'bytes');
await b.close();
