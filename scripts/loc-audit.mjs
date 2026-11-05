/**
 * Location regression suite — drives the real app with emulated GPS.
 *
 * Every case here failed or was unreachable before the fix, except the two
 * happy paths, which must keep working.
 */
import pw from '/opt/npm-tools/node_modules/playwright/index.js';
const { chromium } = pw;
import { readFileSync } from 'node:fs';

const ids = JSON.parse(readFileSync('/root/preview/ids.json'));
const BASE = 'http://127.0.0.1:8080';
const customer = { id: ids.customer, customerId: ids.customer, role: 'customer', name: 'Ravi Kumar', phone: '9876500001', email: 'ravi@example.com', picture: null };
const inRange = JSON.stringify({ status: 'in_range', location: { lat: 10.9333, lng: 79.2833, place: 'papanasam', inServiceArea: true, source: 'gps' }, acknowledged: true });

const NOISE = /ERR_TUNNEL_CONNECTION_FAILED|fonts\.googleapis\.com|fonts\.gstatic\.com/;
const P = {
  papanasam:    { latitude: 10.9333, longitude: 79.2833 },  // in area, in the admin's list
  pandaravadai: { latitude: 10.9120, longitude: 79.2180 },  // in area, NOT in the admin's list
  chennai:      { latitude: 13.0827, longitude: 80.2707 },  // far outside
};

let fails = 0;
const check = (label, ok, detail = '') => {
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${ok ? '' : `  — ${detail}`}`);
};

const browser = await chromium.launch();
const open = async ({ geo, grant, loc = null, path = '/' }) => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 900 },
    permissions: grant ? ['geolocation'] : [],
    ...(geo ? { geolocation: geo } : {}),
  });
  await ctx.addInitScript(([s, l]) => {
    try {
      localStorage.setItem('zevio.api.session', s);
      if (l) localStorage.setItem('zevio.location', l); else localStorage.removeItem('zevio.location');
    } catch {}
  }, [JSON.stringify(customer), loc]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' && !NOISE.test(m.text())) errs.push(m.text().slice(0, 140)); });
  page.on('pageerror', (e) => { if (!NOISE.test(e.message)) errs.push('PAGEERROR ' + e.message.slice(0, 140)); });
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  return { ctx, page, errs };
};

console.log('\n--- A. permission refused: the reason must be shown, not swallowed ---');
{
  const { ctx, page, errs } = await open({ geo: P.papanasam, grant: false });
  await page.getByRole('button', { name: 'Allow location' }).click();
  await page.waitForTimeout(2000);
  const body = await page.textContent('body');
  const stored = await page.evaluate(() => localStorage.getItem('zevio.location'));
  check('stays on the gate instead of dropping onto Home', /Where are you/i.test(body), 'gate gone');
  check('says why it failed', /switched off|Couldn.t get|too long|cannot share/i.test(body), 'no reason shown');
  check('offers no way to type a village by hand', !/village or town/i.test(body), 'manual entry still offered');
  check('offers a retry', /try again/i.test(body), 'no retry');
  check('says where a phone finds itself best', /outdoors|near a window|Computers have no GPS/i.test(body), 'no guidance');
  check('a refusal is not recorded as an answer', !/"acknowledged":true/.test(stored || ''), `stored=${stored}`);
  check('no console errors', errs.length === 0, errs.join(' | '));
  await page.screenshot({ path: '/root/preview/shots/fix-a-denied.png' });

  // not a dead end: they can still get into the app
  await page.getByRole('button', { name: /continue without it/i }).click();
  await page.waitForTimeout(1500);
  const after = await page.textContent('body');
  check('continuing without it gets into the app', /Shops near you|Selvi|Delivering to/i.test(after), 'still stuck');
  await ctx.close();
}

console.log('\n--- B. the gate never offers to set a location by hand ---');
{
  const { ctx, page, errs } = await open({ geo: P.papanasam, grant: false });
  const body = await page.textContent('body');
  check('no village dropdown on first view', !/village or town/i.test(body), 'manual entry offered');
  check('no "enter my area" button', !/enter my area/i.test(body), 'manual entry offered');
  check('no console errors', errs.length === 0, errs.join(' | '));
  await page.screenshot({ path: '/root/preview/shots/fix-b-no-manual.png' });
  await ctx.close();
}

console.log('\n--- C. allowed, inside the area (must still work) ---');
{
  const { ctx, page, errs } = await open({ geo: P.papanasam, grant: true });
  await page.getByRole('button', { name: 'Allow location' }).click();
  await page.waitForTimeout(1800);
  const body = await page.textContent('body');
  check('reaches the shop list', /Shops near you|Selvi/i.test(body), 'did not reach Home');
  check('not wrongly blocked', !/outside our delivery/i.test(body), 'wrongly blocked');
  check('no console errors', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

console.log('\n--- D. allowed, far outside (must still warn) ---');
{
  const { ctx, page, errs } = await open({ geo: P.chennai, grant: true });
  await page.getByRole('button', { name: 'Allow location' }).click();
  await page.waitForTimeout(1800);
  const body = await page.textContent('body');
  check('out-of-range notice renders', /outside our delivery area/i.test(body), 'continued silently');
  check('offers a way on', /browse|order for/i.test(body), 'dead end');
  check('offers to re-check rather than override', /check my location again/i.test(body), 'no recheck');
  check('no hand-picked village override', !/village or town/i.test(body), 'override still offered');
  check('shows the reading it acted on', /Your phone reported/i.test(body), 'reading hidden');
  check('no console errors', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

console.log('\n--- E. address form, village IS in the admin list ---');
{
  const { ctx, page, errs } = await open({ geo: P.papanasam, grant: true, loc: inRange, path: '/profile' });
  await page.getByRole('button', { name: 'Add', exact: true }).first().click();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /use my location/i }).click();
  await page.waitForTimeout(2200);
  const value = await page.evaluate(() => document.querySelector('select')?.value);
  const body = await page.textContent('body');
  check('Place field is filled', value === 'papanasam', `value=${JSON.stringify(value)}`);
  check('says it detected Papanasam', /Detected: Papanasam/.test(body), 'no confirmation');
  check('no console errors', errs.length === 0, errs.join(' | '));
  await page.screenshot({ path: '/root/preview/shots/fix-e-addr-known.png' });
  await ctx.close();
}

console.log('\n--- F. address form, village NOT in the admin list ---');
{
  const { ctx, page, errs } = await open({ geo: P.pandaravadai, grant: true, loc: inRange, path: '/profile' });
  await page.getByRole('button', { name: 'Add', exact: true }).first().click();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /use my location/i }).click();
  await page.waitForTimeout(2200);
  const value = await page.evaluate(() => document.querySelector('select')?.value);
  const body = await page.textContent('body');
  check('does NOT claim success', !/Detected: /.test(body), 'still claims it detected something usable');
  check('explains the village is not served', /isn.t in our delivery list/i.test(body), 'no explanation');
  check('shows a readable name, not the slug', /Pandaravadai/.test(body) && !/pandaravadai/.test(body.replace(/Pandaravadai/g, '')), 'raw slug shown');
  check('Place field left empty rather than wrong', value === '', `value=${JSON.stringify(value)}`);
  check('no console errors', errs.length === 0, errs.join(' | '));
  await page.screenshot({ path: '/root/preview/shots/fix-f-addr-unknown.png' });
  await ctx.close();
}

console.log('\n--- G. standing in Pandaravadai with a weak fix (the reported bug) ---');
{
  // A real phone indoors in the village: the position is right, but the phone
  // only knows it to within several kilometres.
  const { ctx, page, errs } = await open({ geo: { ...P.pandaravadai, accuracy: 6000 }, grant: true });
  await page.getByRole('button', { name: 'Allow location' }).click();
  await page.waitForTimeout(1800);
  const body = await page.textContent('body');
  check('is NOT told they are outside the area', !/outside our delivery area/i.test(body), 'still turned away');
  check('gets into the app', /Shops near you|Selvi|Delivering to/i.test(body), 'blocked');
  check('no console errors', errs.length === 0, errs.join(' | '));
  await page.screenshot({ path: '/root/preview/shots/fix-g-village-weak-fix.png' });
  await ctx.close();
}

console.log('\n--- H. weak fix that lands on a nearby town: ask, do not assert ---');
{
  const { ctx, page, errs } = await open({ geo: { latitude: 10.7870, longitude: 79.1378, accuracy: 6000 }, grant: true });
  await page.getByRole('button', { name: 'Allow location' }).click();
  // An ambiguous reading is meant to keep refining until the deadline.
  await page.waitForTimeout(28000);
  const body = await page.textContent('body');
  check('does not assert "outside our delivery area"', !/outside our delivery area/i.test(body), 'asserted from a vague reading');
  check('says the reading was not precise enough', /precisely enough|could only place/i.test(body), 'no explanation');
  check('offers a retry rather than a village list', /try again/i.test(body) && !/village or town/i.test(body), 'manual entry offered');
  check('no console errors', errs.length === 0, errs.join(' | '));
  await page.screenshot({ path: '/root/preview/shots/fix-h-town-weak-fix.png' });
  await ctx.close();
}

await browser.close();
console.log(`\n${fails === 0 ? 'All location checks passed.' : `${fails} check(s) failed.`}`);
process.exit(fails === 0 ? 0 : 1);
