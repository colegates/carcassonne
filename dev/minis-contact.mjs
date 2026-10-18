// Contact sheet of every tile type as a miniature (dev/gallery.html), one image per rotation.
// usage: node dev/minis-contact.mjs <outDir> [baseUrl] [size] [rotations]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const out = process.argv[2] || '/tmp/claude-0/minis-shots2/contact';
const base = process.argv[3] || 'http://127.0.0.1:5174/';
const size = +(process.argv[4] || 220);
const rots = (process.argv[5] || '0,1,2,3').split(',').map(Number);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const r of rots) {
  const p = await (await b.newContext({ viewport: { width: 12 * (size + 6) + 6, height: 900 } })).newPage();
  p.on('pageerror', (e) => console.log('pageerror:', e.message));
  await p.goto(`${base}dev/gallery.html?mode=clean&s=${size}&r=${r}&f=`, { timeout: 300000 });
  await p.waitForFunction(() => document.title.startsWith('done'), null, { timeout: 300000 });
  await p.screenshot({ path: `${out}/contact-r${r}.png`, fullPage: true });
  console.log('r', r, 'done');
  await p.close();
}
await b.close();
