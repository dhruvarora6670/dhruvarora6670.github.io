/* Layout check for the portfolio, run in a real browser (Chromium via Playwright).

   Fails if, at any common screen width, in either theme:
   - anything sticks out past the right edge of the screen (the "sideways scroll" bug),
   - the first screen doesn't fill the window,
   - the phone menu or the theme toggle stops working,
   - the page throws a JavaScript error.

   Usage (from this folder):
     npm install
     npx playwright install chromium
     npm run check                  # or: SHOTS=shots npm run check   (also saves screenshots)
*/
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const SITE = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS ? path.resolve(process.env.SHOTS) : null;
const FONTS_DIR = process.env.FONTS_DIR ? path.resolve(process.env.FONTS_DIR) : null; // offline runs only
const PAGES = ['index.html', 'blog/post-template.html', '404.html'];
const WIDTHS = [320, 360, 375, 390, 412, 430, 600, 768, 820, 900, 901, 1024, 1280, 1440, 1920];
const MENU_MAX = 900; // must match the max-width breakpoint in assets/css/site.css
const heightFor = (w) => (w <= 430 ? 844 : w <= 1024 ? 1024 : 900);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.pdf': 'application/pdf', '.xml': 'application/xml',
  '.txt': 'text/plain', '.woff2': 'font/woff2',
};

function startServer() {
  const server = http.createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://local').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const root = p.startsWith('/__fonts/') && FONTS_DIR ? FONTS_DIR : SITE;
    const file = path.join(root, p.replace(/^\/__fonts\//, '/'));
    try {
      if (!file.startsWith(root)) throw new Error('outside root');
      const body = await fs.readFile(file);
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      // Same as GitHub Pages: unknown paths get 404.html with a 404 status.
      res.writeHead(404, { 'content-type': TYPES['.html'] });
      res.end(await fs.readFile(path.join(SITE, '404.html')).catch(() => 'not found'));
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function localFontsCss(base) {
  const faces = [];
  for (const [family, folder, weights] of [['IBM Plex Sans', 'ibm-plex-sans', [400, 500, 600, 700]],
                                           ['IBM Plex Mono', 'ibm-plex-mono', [400, 500, 600]]]) {
    for (const w of weights) {
      faces.push(`@font-face{font-family:'${family}';font-weight:${w};font-display:swap;` +
        `src:url('${base}__fonts/${folder}/files/${folder}-latin-${w}-normal.woff2') format('woff2');}`);
    }
  }
  return faces.join('\n');
}

// Everything that ends up wider than the screen. Elements inside a box that scrolls on its own
// (code blocks, wide tables) are fine; that box is checked instead.
function findOverflow() {
  const vw = document.documentElement.clientWidth;
  const bad = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    let scroller = el.parentElement;
    let insideScroller = false;
    while (scroller && scroller !== document.body) {
      const ox = getComputedStyle(scroller).overflowX;
      if (ox === 'auto' || ox === 'scroll') { insideScroller = true; break; }
      scroller = scroller.parentElement;
    }
    if (insideScroller) continue;
    // The box itself sticks out, or its content (e.g. unbreakable text) spills past the screen edge.
    const spills = getComputedStyle(el).overflowX === 'visible' && el.scrollWidth > 0 && r.left + el.scrollWidth > vw + 0.5;
    if (r.right > vw + 0.5 || r.left < -0.5 || spills) {
      let depth = 0;
      for (let p = el; p; p = p.parentElement) depth++;
      const name = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
        (el.className && typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : '');
      const right = Math.round(Math.max(r.right, r.left + el.scrollWidth));
      bad.push({ depth, text: `${name} [${Math.round(r.left)}..${right}] "${(el.textContent || '').trim().slice(0, 40)}"` });
    }
  }
  bad.sort((a, b) => b.depth - a.depth); // innermost (most likely culprit) first
  // Also measure with the safety net off: real overflow should not depend on clipping.
  const html = document.documentElement;
  const before = [html.style.overflowX, document.body.style.overflowX];
  html.style.overflowX = 'visible';
  document.body.style.overflowX = 'visible';
  const scrollWidth = html.scrollWidth;
  [html.style.overflowX, document.body.style.overflowX] = before;
  return { vw, scrollWidth, bad: bad.slice(0, 4).map((b) => b.text), count: bad.length };
}

(async () => {
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const fontsCss = FONTS_DIR ? await localFontsCss(base) : null;
  const browser = await chromium.launch();
  const failures = [];
  let checks = 0;
  if (SHOTS) await fs.mkdir(SHOTS, { recursive: true });

  for (const pageName of PAGES) {
    for (const scheme of ['light', 'dark']) {
      for (const width of WIDTHS) {
        const height = heightFor(width);
        const context = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, deviceScaleFactor: 1 });
        if (fontsCss) {
          await context.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: fontsCss }));
          await context.route('https://fonts.gstatic.com/**', (r) => r.abort());
        }
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        const fail = (what) => failures.push(`${pageName} ${scheme} ${width}px: ${what}`);
        const url = pageName === '404.html' ? base + 'no-such-page/' : base + pageName;

        await page.goto(url, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);

        // 1. Nothing wider than the screen.
        const o = await page.evaluate(findOverflow);
        checks++;
        if (o.scrollWidth > o.vw || o.count) {
          fail(`sideways overflow (page ${o.scrollWidth}px wide on a ${o.vw}px screen): ${o.bad.join(' | ')}`);
        }

        if (SHOTS && [320, 390, 768, 1024, 1280, 1440].includes(width)) {
          const stem = `${pageName.replace(/[/.]/g, '_')}-${scheme}-${width}`;
          await page.screenshot({ path: path.join(SHOTS, `${stem}-fold.png`) });
          await page.screenshot({ path: path.join(SHOTS, `${stem}-full.png`), fullPage: true });
        }

        if (pageName === 'index.html') {
          // 2. First screen fills the window (clamped between 560px and 1000px tall).
          const hero = await page.evaluate(() => document.getElementById('top').getBoundingClientRect().height);
          const expected = Math.min(Math.max(560, height), 1000);
          checks++;
          if (Math.abs(hero - expected) > 1) fail(`first screen is ${hero}px tall, expected ${expected}px`);

          // 3. Header is see-through over the hero and solid after scrolling.
          checks++;
          const atTop = await page.evaluate(() => document.getElementById('site-header').classList.contains('at-top'));
          await page.evaluate(() => window.scrollTo(0, 600));
          await page.waitForTimeout(120);
          const afterScroll = await page.evaluate(() => document.getElementById('site-header').classList.contains('at-top'));
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(120);
          if (!atTop || afterScroll) fail(`header state wrong (at top: ${atTop}, after scroll: ${afterScroll})`);

          // 4. Navigation: desktop links on wide screens, the menu button on narrow ones.
          const navShown = await page.isVisible('.nav-desktop');
          const menuShown = await page.isVisible('.menu-toggle');
          checks++;
          if (width <= MENU_MAX ? navShown || !menuShown : !navShown || menuShown) {
            fail(`wrong navigation shown (desktop nav: ${navShown}, menu button: ${menuShown})`);
          }
          if (width > MENU_MAX) {
            const bar = await page.evaluate(() => {
              const b = document.querySelector('.header-bar');
              return { sw: b.scrollWidth, cw: b.clientWidth };
            });
            checks++;
            if (bar.sw > bar.cw) fail(`header links don't fit (${bar.sw}px in ${bar.cw}px)`);
          } else {
            await page.click('.menu-toggle');
            const open = await page.evaluate(() => ({
              visible: !document.getElementById('mobile-menu').hidden,
              expanded: document.querySelector('.menu-toggle').getAttribute('aria-expanded'),
            }));
            const om = await page.evaluate(findOverflow);
            if (SHOTS && [320, 390].includes(width)) {
              await page.waitForTimeout(300); // let the header finish fading to solid
              await page.screenshot({ path: path.join(SHOTS, `menu-${scheme}-${width}.png`) });
            }
            await page.keyboard.press('Escape');
            const closed = await page.evaluate(() => document.getElementById('mobile-menu').hidden);
            checks++;
            if (!open.visible || open.expanded !== 'true' || !closed) {
              fail(`menu broken (opened: ${open.visible}, aria-expanded: ${open.expanded}, closed with Esc: ${closed})`);
            }
            if (om.scrollWidth > om.vw || om.count) fail(`sideways overflow with the menu open: ${om.bad.join(' | ')}`);
          }

          // 5. Theme toggle flips the theme.
          const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
          await page.click('.theme-toggle');
          const after = await page.evaluate(() => ({
            bg: getComputedStyle(document.body).backgroundColor,
            theme: document.documentElement.getAttribute('data-theme'),
            label: document.querySelector('.theme-toggle').getAttribute('aria-label'),
          }));
          checks++;
          const want = scheme === 'light' ? 'dark' : 'light';
          if (after.theme !== want || after.bg === before || !after.label.includes(scheme)) {
            fail(`theme toggle broken (now ${after.theme}, label "${after.label}")`);
          }
          await page.click('.theme-toggle');
        }

        checks++;
        if (errors.length) fail(`JavaScript error: ${errors[0]}`);
        await context.close();
      }
    }
  }

  await browser.close();
  server.close();
  if (failures.length) {
    console.log(`FAIL: ${failures.length} problem(s) in ${checks} checks`);
    for (const f of failures) console.log('  - ' + f);
    process.exit(1);
  }
  console.log(`PASS: ${checks} checks, ${PAGES.length} pages, ${WIDTHS.length} widths, light and dark`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
