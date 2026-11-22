const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const dir = __dirname;
  const out = path.join(dir, '..');
  const jobs = [
    ['icon.svg', 'icon.png', 1024, false],
    ['foreground.svg', 'android-icon-foreground.png', 1024, true],
    ['mono.svg', 'android-icon-monochrome.png', 1024, true],
    ['foreground.svg', 'splash-icon.png', 512, true],
    ['icon.svg', 'favicon.png', 64, false],
  ];
  const browser = await chromium.launch();
  for (const [src, dest, size, transparent] of jobs) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    const svg = fs.readFileSync(path.join(dir, src), 'utf8');
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace(/width="1024" height="1024"/, `width="${size}" height="${size}"`)}</body></html>`);
    await page.screenshot({ path: path.join(out, dest), omitBackground: transparent });
    await page.close();
  }
  // solid background layer for adaptive icons
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
  await page.setContent('<html><body style="margin:0;background:#0B0E1A"></body></html>');
  await page.screenshot({ path: path.join(out, 'android-icon-background.png') });
  await browser.close();
})();
