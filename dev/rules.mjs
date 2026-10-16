import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
p.on('console', m => console.log(m.type(), m.text()));
p.on('pageerror', e => console.log('pageerror:', e.message));
await p.goto('http://localhost:5173/'); await p.waitForTimeout(800);
await p.tap('#btn-rules'); await p.waitForTimeout(800);
const out = process.argv[2];
if (out) { const el = await p.$('#rules-body'); await p.evaluate(() => { document.querySelector('#rules').style.position='static'; document.querySelector('#rules .panel-scroll').style.position='static'; document.body.style.overflow='visible'; document.documentElement.style.overflow='visible'; }); await el.screenshot({ path: out }); }
await b.close();
