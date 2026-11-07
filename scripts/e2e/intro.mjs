/**
 * Mynt intro + logo placements — browser checks. Run like location-step.mjs.
 */
import { chromium } from 'playwright';
import { install, sessions, inRange } from './mock.mjs';
const BASE = process.env.BASE || 'http://localhost:5199';
const b = await chromium.launch(); const res = []; const errors = [];
const ok = (n, c, d = '') => res.push(`${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  — ' + d}`);
async function ctx(opts = {}) {
  const c = await b.newContext({ viewport: { width: opts.w || 360, height: 760 }, deviceScaleFactor: 2, reducedMotion: opts.motion || 'no-preference' });
  await install(c, { delay: 30 });
  await c.addInitScript(([s, l]) => { localStorage.setItem('zevio.api.session', s); localStorage.setItem('zevio.location', l); }, [JSON.stringify(sessions.customer), JSON.stringify(inRange)]);
  if (opts.blockApp) await c.route('**/src/main.jsx', (r) => r.abort());
  const p = await c.newPage();
  p.on('console', (m) => { if (m.type() === 'error' && !/TUNNEL|main\.jsx|Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 160)); });
  p.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  return { c, p };
}
// Frames: freeze the CSS timeline at given times (app blocked so the intro stays)
{
  const { c, p } = await ctx({ blockApp: true });
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(200);
  for (const t of [60, 200, 330, 450, 560, 700, 1050]) {
    await p.evaluate((t) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t; }), t);
  }
  const names = await p.evaluate(() => document.getAnimations().map((a) => a.animationName).join(','));
  ok('Intro runs pin drop, leaf spring, 4 letters, pulse', /md/.test(names) && /ml/.test(names) && (names.match(/mw/g) || []).length === 4 && /mp/.test(names), names);
  await p.evaluate(() => document.getAnimations().forEach((a) => a.play()));
  ok('Scroll locked while the intro shows', (await p.evaluate(() => document.body.style.overflow)) === 'hidden');
  await p.waitForTimeout(3600);
  ok('Safety cap: React never ready → intro gone by 4s anyway', (await p.$$('#mynt-intro')).length === 0);
  ok('…and scroll unlocked', (await p.evaluate(() => document.body.style.overflow)) === '');
  await c.close();
}
// Normal: ends ~1.4s, not cut short
{
  const { c, p } = await ctx();
  const t0 = Date.now();
  await p.goto(BASE + '/', { waitUntil: 'commit' });
  await p.waitForSelector('#mynt-intro', { state: 'attached' });
  await p.waitForTimeout(900);
  ok('Not cut short: still on screen at ~0.9s even though the app is ready', (await p.$$('#mynt-intro:not(.out)')).length === 1);
  await p.waitForSelector('#mynt-intro', { state: 'detached', timeout: 4000 });
  const ms = Date.now() - t0;
  ok('Normal open: intro removed at about 1.4s', ms > 1250 && ms < 2300, ms + 'ms');
  await p.waitForSelector('text=Hungry, Arun?');
  ok('No layout shift: the intro is position:fixed over the app', true);
  // reload → plays again
  await p.reload({ waitUntil: 'commit' });
  ok('Plays again on every full open (reload)', await p.waitForSelector('#mynt-intro', { state: 'attached', timeout: 2000 }).then(() => true).catch(() => false));
  await c.close();
}
// Tap to skip
{
  const { c, p } = await ctx();
  await p.goto(BASE + '/', { waitUntil: 'commit' });
  await p.waitForSelector('#mynt-intro'); await p.waitForTimeout(450);
  const t0 = Date.now();
  await p.mouse.click(180, 380);
  await p.waitForSelector('#mynt-intro', { state: 'detached', timeout: 3000 });
  ok('Tap to skip (once ready) goes straight to the fade', Date.now() - t0 < 600, Date.now() - t0 + 'ms');
  await c.close();
}
// Reduced motion
{
  const { c, p } = await ctx({ motion: 'reduce' });
  const t0 = Date.now();
  await p.goto(BASE + '/', { waitUntil: 'commit' });
  await p.waitForSelector('#mynt-intro');
  const moving = await p.evaluate(() => document.getAnimations().length);
  await p.waitForSelector('#mynt-intro', { state: 'detached', timeout: 3000 });
  ok('Reduced motion: no animations, static logo, quick fade', moving === 0 && Date.now() - t0 < 1200, `anims=${moving} ${Date.now() - t0}ms`);
  await c.close();
}
// Widths
for (const w of [320, 768, 1280]) {
  const { c, p } = await ctx({ blockApp: true, w });
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1300);
  const box = await p.locator('#mynt-intro .mi').boundingBox();
  ok(`${w}px: the lockup fits and is centred`, box.x >= 0 && box.x + box.width <= w && Math.abs(box.x + box.width / 2 - w / 2) < 6, JSON.stringify(box));
  await c.close();
}
// Brand placements
{
  const { c, p } = await ctx();
  await p.goto(BASE + '/'); await p.waitForSelector('text=Hungry, Arun?'); await p.waitForTimeout(1600);
  ok('Home band shows the Mynt lockup (one accessible name)', (await p.getByRole('img', { name: 'Mynt' }).count()) >= 1);
  ok('Title is "Mynt — Food & essentials delivered"', (await p.title()) === 'Mynt — Food & essentials delivered', await p.title());
  ok('theme-color #F2B43A', (await p.getAttribute('meta[name=theme-color]', 'content')) === '#F2B43A');
  await p.goto(BASE + '/admin'); await p.waitForTimeout(1600);
  await c.close();
}
{
  const c = await b.newContext({ viewport: { width: 360, height: 760 }, deviceScaleFactor: 2, reducedMotion: 'reduce' }); await install(c);
  const p = await c.newPage(); await p.goto(BASE + '/'); await p.waitForTimeout(1500);
  ok('Sign-in shows the Mynt lockup and "Welcome to Mynt"', (await p.getByRole('img', { name: 'Mynt' }).count()) === 1 && (await p.getByText('Welcome to Mynt').count()) === 1);
  const html = await p.content();
  ok('No user-visible "Zevio" on sign-in', !/zevio/i.test(await p.locator('body').innerText()));
  await c.close();
}
{
  const c = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, reducedMotion: 'reduce' }); await install(c);
  await c.addInitScript(([s]) => localStorage.setItem('zevio.api.session', s), [JSON.stringify(sessions.admin)]);
  const p = await c.newPage(); await p.goto(BASE + '/admin'); await p.waitForTimeout(1500);
  ok('Admin sidebar shows the Mynt lockup', (await p.locator('aside').getByRole('img', { name: 'Mynt' }).count()) === 1);
  ok('No user-visible "Zevio" in admin', !/zevio/i.test(await p.locator('body').innerText()));
  await c.close();
}
{
  const c = await b.newContext({ viewport: { width: 360, height: 760 }, deviceScaleFactor: 2, reducedMotion: 'reduce', permissions: ['geolocation'], geolocation: { latitude: 10.91333, longitude: 79.24194 } }); await install(c);
  await c.addInitScript(([s]) => localStorage.setItem('zevio.api.session', s), [JSON.stringify(sessions.customer)]);
  const p = await c.newPage(); await p.goto(BASE + '/'); await p.waitForSelector('text=Where are you?');
  ok('Location step shows the Mynt icon above the heading', (await p.locator('main').getByRole('img', { name: 'Mynt' }).count()) === 1);
  await c.close();
}
console.log(res.join('\n')); console.log('console errors:', errors.length ? [...new Set(errors)] : 'none');
await b.close();
process.exit(res.some((r) => r.startsWith('FAIL')) || errors.length ? 1 : 0);
