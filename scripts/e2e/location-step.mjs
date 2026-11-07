/**
 * Location step — browser test suite (states A–H, bypass, gifting link).
 *
 * Run:  npm i -D playwright && npx playwright install chromium
 *       npm run dev -- --port 5199        (in one terminal)
 *       node scripts/e2e/location-step.mjs  (in another)
 * The API is faked by ./mock.mjs, so no backend is needed.
 */
import { chromium } from 'playwright';
import { install, sessions } from './mock.mjs';
const BASE = process.env.BASE || 'http://localhost:5199';
const b = await chromium.launch(); const errors = []; const res = [];
const ok = (n, c, d = '') => res.push(`${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  — ' + d}`);
const address = { id: 'addr1', label: 'Home', name: 'Meena', phone: '9876500002', placeId: 'pandaravadai', door: '12', streetName: 'East Street', street: '12, East Street', landmark: '', detectionMethod: 'gps' };
async function open({ geo, perm = true, init = '', saved = null, shots } = {}) {
  const c = await b.newContext({ viewport: { width: 360, height: 760 }, deviceScaleFactor: 2, reducedMotion: 'reduce', permissions: perm ? ['geolocation'] : [], geolocation: geo });
  await install(c, { delay: 30 });
  await c.addInitScript(([s, a, saved]) => {
    if (sessionStorage.getItem('init')) return; sessionStorage.setItem('init', 1);
    localStorage.setItem('zevio.api.session', s); localStorage.setItem('zevio.addresses', JSON.stringify({ c1: [a] }));
    if (saved) localStorage.setItem('zevio.location', saved); else localStorage.removeItem('zevio.location');
  }, [JSON.stringify(sessions.customer), address, saved]);
  await c.addInitScript(`window.__watch = 0; if (navigator.geolocation) { const w = navigator.geolocation.watchPosition.bind(navigator.geolocation); navigator.geolocation.watchPosition = (...a) => { window.__watch++; return w(...a); }; } ${init}`);
  const p = await c.newPage();
  p.on('console', (m) => { if (m.type() === 'error' && !/TUNNEL/.test(m.text())) errors.push(m.text().slice(0, 160)); });
  p.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  await p.goto(BASE + '/'); await p.waitForSelector('text=Where are you?');
  return { c, p };
}
const useBtn = (p) => p.getByRole('button', { name: /use my location|try again/i }).first();
const stored = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('zevio.location') || 'null'));
const shot = async () => {};

// 5 + A: first load
{
  const { c, p } = await open({ geo: { latitude: 10.91333, longitude: 79.24194, accuracy: 15 } });
  await shot(p, 'A-idle');
  const buttons = await p.$$eval('main button, main a, main input, main select', (els) => els.map((e) => e.textContent.trim()));
  ok('A. First load: the only control is "Use my location"', buttons.length === 1 && /use my location/i.test(buttons[0]), JSON.stringify(buttons));
  ok('5. Manual list is not in the DOM on first load', (await p.$$('[role=radiogroup], select')).length === 0 && (await p.getByText(/choose your area/i).count()) === 0);
  // 6. bypass attempts
  for (const path of ['/cart', '/checkout', '/profile', '/orders', '/shop/s1']) {
    await p.goto(BASE + path);
    const seen = await p.waitForSelector('text=Where are you?', { timeout: 5000 }).then(() => true).catch(() => false);
    const leaked = await p.locator('nav[aria-label], [data-cart-target]').count();
    if (!seen || leaked) ok(`6. Cannot reach ${path} before the step`, false, `seen=${seen} leaked=${leaked}`);
  }
  ok('6. Every route (Home, cart, checkout, profile, orders, shop) shows the step first', !res.some((r) => r.startsWith('FAIL  6')));
  // 9. double tap
  await p.goto(BASE + '/'); await p.waitForSelector('text=Where are you?');
  await useBtn(p).evaluate((el) => { el.click(); el.click(); el.click(); });
  // 1. in range
  await p.waitForSelector('text=Pandaravadai detected');
  ok('9. Triple tap → one GPS request', (await p.evaluate(() => window.__watch)) === 1);
  await shot(p, 'C-in-range');
  ok('C. Shows "Great, we deliver to Pandaravadai!"', (await p.getByText('Great, we deliver to Pandaravadai!').count()) === 1);
  ok('C. Nothing saved until Continue', (await stored(p)) === null);
  await p.getByRole('button', { name: 'Continue' }).click();
  await p.waitForSelector('text=Hungry, Arun?');
  const s1 = await stored(p);
  ok('1. Continue → Home, saved {area, lat, lng, accuracy, gps, inRange:true}', s1.status === 'in_range' && s1.location.area === 'pandaravadai' && s1.location.detectionMethod === 'gps' && s1.location.inRange === true && s1.location.accuracy === 15, JSON.stringify(s1));
  await p.reload(); await p.waitForSelector('text=Hungry, Arun?');
  ok('1. Reload keeps them in — the step is not asked again', true);
  // Profile update + cancel
  await p.goto(BASE + '/profile'); await p.waitForSelector('text=Your area');
  ok('Profile shows "Pandaravadai · we deliver here"', (await p.getByText('Pandaravadai · we deliver here').count()) === 1);
  await p.getByRole('link', { name: 'Update' }).click(); await p.waitForSelector('text=Update your area');
  ok('Profile → Update opens the same GPS-first step', (await p.$$('[role=radiogroup]')).length === 0);
  await p.getByRole('button', { name: 'Cancel' }).click(); await p.waitForSelector('text=Your area');
  ok('Update can be cancelled back to Profile, nothing changed', (await stored(p)).location.area === 'pandaravadai');
  // checkout: normal mode (COD offered)
  await p.goto(BASE + '/shop/s1'); await p.waitForTimeout(700);
  await p.getByRole('button', { name: /^add/i }).first().click(); await p.goto(BASE + '/checkout'); await p.waitForTimeout(800);
  ok('In range: checkout offers Cash on Delivery', (await p.getByText('Cash on Delivery').count()) > 0 && (await p.getByText(/gift|someone else/i).count()) === 0);
  await c.close();
}
// 2. out of range
{
  const { c, p } = await open({ geo: { latitude: 13.0827, longitude: 80.2707, accuracy: 15 } });
  await useBtn(p).click(); await p.waitForSelector('text=Your current location');
  await shot(p, 'D-out-of-range');
  const txt = await p.locator('main').innerText();
  ok('D. Nearest area + distance shown', /Nearest area we serve: Papanasam \(\d+\.\d km away\)/.test(txt), txt.slice(0, 200));
  ok('D. Explains ordering for someone inside the area', /send it to a friend or family member/.test(txt));
  ok('D. Has Continue and Try again', (await p.getByRole('button', { name: 'Continue' }).count()) === 1 && (await p.getByRole('button', { name: 'Try again' }).count()) === 1);
  ok('D. Icon is informational, not an error', (await p.$$('[class*=infoIcon]')).length === 1);
  await p.getByRole('button', { name: 'Continue' }).click(); await p.waitForSelector('text=Hungry, Arun?');
  const s2 = await stored(p);
  ok('2. Continue → Home, saved {inRange:false, nearestArea, distanceKm, gps}', s2.status === 'out_of_range' && s2.location.inRange === false && s2.location.nearestArea === 'papanasam' && s2.location.distanceKm > 200, JSON.stringify(s2));
  await p.goto(BASE + '/shop/s1'); await p.waitForTimeout(700);
  await p.getByRole('button', { name: /^add/i }).first().click(); await p.goto(BASE + '/checkout'); await p.waitForTimeout(900);
  const ck = await p.locator('body').innerText();
  ok('2. Gifting mode at checkout: "sending to someone else", no Cash on Delivery, UPI only', /Sending this to someone else/.test(ck) && !/Cash on Delivery\n/.test(ck) && /cannot be cancelled, returned or refunded/.test(ck), ck.slice(0, 300));
  await shot(p, 'D-checkout-gift');
  await c.close();
}
// 3. denied → manual
{
  const { c, p } = await open({ perm: false });
  await useBtn(p).click(); await p.waitForSelector('text=Location permission is blocked.');
  ok('G. Explains how to allow it', (await p.getByText(/allow location access in your browser settings/).count()) === 1);
  ok('G. List still not rendered until asked', (await p.$$('[role=radiogroup]')).length === 0);
  await shot(p, 'G-denied');
  await p.getByRole('button', { name: /or choose your area manually/i }).click();
  ok('F. Manual list appears after the failure (5 areas, A–Z)', (await p.$$eval('[role=radio]', (r) => r.map((x) => x.textContent.trim()).join(','))) === 'Ayyampettai,Pandaravadai,Papanasam,Pasupathikoil,Rajagiri');
  ok('F. Continue disabled until an area is picked', await p.getByRole('button', { name: 'Continue' }).isDisabled());
  await p.getByRole('radio', { name: 'Ayyampettai' }).click();
  await shot(p, 'F-manual');
  await p.getByRole('button', { name: 'Continue' }).click(); await p.waitForSelector('text=Hungry, Arun?');
  const s3 = await stored(p);
  ok('3. Manual → Home normal mode, saved {area, lat, lng, manual, inRange:true}', s3.status === 'in_range' && s3.location.area === 'ayyampettai' && s3.location.detectionMethod === 'manual' && s3.location.lat === 10.8962, JSON.stringify(s3));
  await c.close();
}
// elsewhere link
{
  const { c, p } = await open({ perm: false });
  await useBtn(p).click(); await p.waitForSelector('text=Location permission is blocked.');
  await p.getByRole('button', { name: /or choose your area manually/i }).click();
  await p.getByRole('button', { name: /order for someone else instead/i }).click();
  await p.waitForSelector('text=Your current location');
  ok('"Not in our area?" → the out-of-range screen (no nearest area claimed)', !(await p.locator('main').innerText()).includes('Nearest area'));
  await p.getByRole('button', { name: 'Continue' }).click(); await p.waitForSelector('text=Hungry, Arun?');
  const s = await stored(p);
  ok('…and Continue enters gifting mode', s.status === 'out_of_range' && s.location.detectionMethod === 'manual');
  await c.close();
}
// 4. timeout / unavailable simulated by replacing watchPosition
for (const [code, msg] of [[3, 'That took too long. Try again?'], [2, "Couldn't get a location fix. Try again?"]]) {
  const { c, p } = await open({ init: `navigator.geolocation.watchPosition = (ok, err) => { window.__watch++; setTimeout(() => err({ code: ${code}, message: 'sim' }), 50); return 1; }; navigator.geolocation.clearWatch = () => {};` });
  await useBtn(p).click(); await p.waitForSelector(`text=${msg}`, { timeout: 20000 });
  ok(`4. ${code === 3 ? 'TIMEOUT' : 'POSITION_UNAVAILABLE'} → message + Try again + manual link`, (await p.getByRole('button', { name: 'Try again' }).count()) === 1 && (await p.getByRole('button', { name: /choose your area manually/i }).count()) === 1);
  if (code === 3) await shot(p, 'H-timeout');
  await c.close();
}
// E. rough fix
{
  const { c, p } = await open({ geo: { latitude: 10.91333, longitude: 79.24194, accuracy: 5000 } });
  await useBtn(p).click(); await p.waitForSelector("text=We couldn't pinpoint your location accurately.", { timeout: 20000 });
  ok('E. Accuracy 5 km → "couldn\'t pinpoint" + Try again + "Or choose your area manually"', (await p.getByRole('button', { name: 'Try again' }).count()) === 1 && (await p.getByRole('button', { name: /or choose your area manually/i }).count()) === 1);
  await c.close();
}
// H. unsupported
{
  const { c, p } = await open({ init: `Object.defineProperty(Navigator.prototype, 'geolocation', { get: () => undefined, configurable: true });` });
  ok('H. Unsupported: still only "Use my location" before trying', (await p.$$('[role=radiogroup]')).length === 0);
  await useBtn(p).click(); await p.waitForSelector("text=Your browser doesn't support location. Please choose manually.");
  ok('H. Unsupported → list opens straight away, no Try again', (await p.$$('[role=radiogroup]')).length === 1 && (await p.getByRole('button', { name: /try again|use my location/i }).count()) === 0);
  await c.close();
}
// old 'unavailable' value from the removed skip button
{
  const { c, p } = await open({ saved: JSON.stringify({ status: 'unavailable', location: null, acknowledged: true }) });
  ok('An old "continue without it" value no longer skips the step', (await p.getByText('Where are you?').count()) === 1);
  await c.close();
}
// old in-range value: straight in
{
  const c = await b.newContext({ viewport: { width: 360, height: 760 }, reducedMotion: 'reduce' }); await install(c);
  await c.addInitScript(([s]) => { localStorage.setItem('zevio.api.session', s); localStorage.setItem('zevio.location', JSON.stringify({ status: 'in_range', location: { place: 'papanasam', source: 'gps' }, acknowledged: false })); }, [JSON.stringify(sessions.customer)]);
  const p = await c.newPage(); await p.goto(BASE + '/'); await p.waitForTimeout(1200);
  ok('Existing in-range customers are not asked again', (await p.getByText('Hungry, Arun?').count()) === 1);
  await c.close();
}
console.log(res.join('\n')); console.log('console errors:', errors.length ? [...new Set(errors)] : 'none');
await b.close();
process.exit(res.some((r) => r.startsWith('FAIL')) || errors.length ? 1 : 0);
