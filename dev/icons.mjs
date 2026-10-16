import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch();
for (const [size, name] of [[512, 'icon-512'], [192, 'icon-192'], [180, 'apple-touch-icon']]) {
  const p = await b.newPage({ viewport: { width: size, height: size } });
  await p.goto(`http://localhost:5174/dev/icon.html#${size}`); await p.waitForFunction(() => document.title === 'ready');
  await p.locator('#c').screenshot({ path: `public/icons/${name}.png` });
}
await b.close();
