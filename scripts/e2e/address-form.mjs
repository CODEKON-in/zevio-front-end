/**
 * Address form — browser test suite (locked area, Skip, checkout path,
 * re-detect round trip, out-of-range note). Run like location-step.mjs.
 */
import { chromium } from 'playwright';
import { install, sessions } from './mock.mjs';
const BASE = process.env.BASE || 'http://localhost:5199';
const b = await chromium.launch(); const errors = []; const res = [];
const ok = (n, c, d = '') => res.push(`${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  — ' + d}`);
const PAN = { latitude: 10.91333, longitude: 79.24194, accuracy: 15 };
const AYY = { latitude: 10.8962, longitude: 79.1943, accuracy: 15 };
const CHN = { latitude: 13.0827, longitude: 80.2707, accuracy: 15 };

async function fresh(geo, { saved = null, addresses = null } = {}) {
  const c = await b.newContext({ viewport: { width: 360, height: 760 }, deviceScaleFactor: 2, reducedMotion: 'reduce', permissions: ['geolocation'], geolocation: geo });
  await install(c, { delay: 30 });
  await c.addInitScript(([s, saved, addrs]) => {
    if (sessionStorage.getItem('init')) return; sessionStorage.setItem('init', 1);
    localStorage.clear(); localStorage.setItem('zevio.api.session', s);
    if (saved) localStorage.setItem('zevio.location', saved);
    if (addrs) localStorage.setItem('zevio.addresses', addrs);
  }, [JSON.stringify(sessions.customer), saved, addresses]);
  const p = await c.newPage();
  p.on('console', (m) => { if (m.type() === 'error' && !/TUNNEL/.test(m.text())) errors.push(m.text().slice(0, 160)); });
  p.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  await p.goto(BASE + '/');
  return { c, p };
}
const passStep = async (p) => { await p.waitForSelector('text=Where are you?'); await p.getByRole('button', { name: /use my location/i }).click(); await p.getByRole('button', { name: 'Continue' }).click(); };
const book = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('zevio.addresses') || '{}').c1 || []);
const loc = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('zevio.location') || 'null'));

// 1 + 2
{
  const { c, p } = await fresh(PAN);
  await passStep(p);
  await p.waitForSelector('text=Add your delivery address');
  ok('1. After the location step (in range) → "Add your delivery address"', p.url().endsWith('/welcome/address'));
  const chip = p.locator('[aria-labelledby="address-area-label"]');
  ok('1. Area shows "Pandaravadai", locked', (await chip.innerText()).includes('Pandaravadai'));
  const tag = await chip.evaluate((el) => el.tagName + '|' + (el.querySelector('input,select,button') ? 'has-control' : 'no-control'));
  ok('1. The area is not an input, dropdown or button', tag === 'DIV|no-control', tag);
  ok('1. No area dropdown or area text box anywhere on the form', (await p.$$('form select')).length === 0 && (await p.locator('form input, form select, form textarea').evaluateAll((els) => els.filter((e) => /area/i.test(e.labels?.[0]?.textContent || '')).length)) === 0);
  ok('1. Landmark placeholder', (await p.getByPlaceholder('e.g. Near bus stop, opposite temple').count()) === 1);
  ok('1. Label chips Home / Work / Other, Home chosen', (await p.getByRole('button', { name: 'Home', pressed: true }).count()) === 1 && (await p.getByRole('button', { name: 'Work' }).count()) === 1);
  ok('1. "Skip for now" is offered here', (await p.getByRole('button', { name: 'Skip for now' }).count()) === 1);
  await p.getByRole('button', { name: 'Save address' }).click();
  ok('2. Door number and street are required', (await p.getByText('This field is required').count()) === 2);
  await p.getByLabel(/Door \/ House number/).fill('12'); await p.getByLabel(/Street name/).fill('East Street');
  await p.getByLabel(/Landmark/).fill('Near Pillaiyar temple'); await p.getByRole('button', { name: 'Work' }).click();
  await p.getByRole('button', { name: 'Save address' }).click();
  await p.waitForSelector('text=Hungry, Arun?');
  const a = (await book(p))[0];
  ok('2. Saved → Home, with {label, area{id,name,lat,lng}, doorNumber, streetName, landmark, isDefault}', a && a.label === 'Work' && a.area?.id === 'pandaravadai' && a.area?.name === 'Pandaravadai' && a.area?.lat === 10.91333 && a.doorNumber === '12' && a.streetName === 'East Street' && a.landmark === 'Near Pillaiyar temple' && a.isDefault === true && a.street === '12, East Street' && a.placeId === 'pandaravadai', JSON.stringify(a));
  ok('2. Home shows the new address, no nudge', (await p.getByText('12, East Street, Pandaravadai').count()) === 1 && (await p.getByText('Add your delivery address to order faster').count()) === 0);
  await p.goto(BASE + '/profile'); await p.waitForTimeout(600);
  ok('2. Profile lists it with its area and label', (await p.getByText('12, East Street, Pandaravadai').count()) === 1 && (await p.locator('main').innerText()).includes('Work'));
  // edit keeps its own area, no re-detect link
  await p.getByRole('button', { name: 'Edit' }).first().click(); await p.waitForTimeout(400);
  ok('Edit: area stays locked to the address\'s own area, no re-detect', (await p.locator('[aria-labelledby="address-area-label"]').innerText()).includes('Pandaravadai') && (await p.getByText(/Re-detect location/).count()) === 0 && (await p.getByRole('button', { name: 'Skip for now' }).count()) === 0);
  await c.close();
}
// 3. skip
{
  const { c, p } = await fresh(PAN);
  await passStep(p); await p.waitForSelector('text=Add your delivery address');
  await p.getByRole('button', { name: 'Skip for now' }).click();
  await p.waitForSelector('text=Hungry, Arun?');
  const l = await loc(p);
  ok('3. Skip → Home, no address saved, home area still known', (await book(p)).length === 0 && l.status === 'in_range' && l.location.area === 'pandaravadai');
  ok('3. Home shows the nudge "Add your delivery address to order faster"', (await p.getByText('Add your delivery address to order faster').count()) === 1);
  await p.getByRole('button', { name: 'Add address' }).click(); await p.waitForTimeout(500);
  ok('Home nudge opens the same form, with Skip (allowSkip=true)', (await p.getByRole('button', { name: 'Skip for now' }).count()) === 1);
  await p.getByRole('button', { name: 'Skip for now' }).click(); await p.waitForTimeout(400);
  ok('…Skip there just closes it, nothing saved', (await book(p)).length === 0);
  // 4. checkout path
  await p.goto(BASE + '/shop/s1'); await p.waitForTimeout(800);
  await p.getByRole('button', { name: /^add/i }).first().click();
  await p.goto(BASE + '/checkout'); await p.waitForTimeout(600);
  ok('4. Checkout with no address sends them back to the cart', p.url().endsWith('/cart'));
  ok('4. Cannot continue to payment without an address', await p.getByRole('button', { name: /continue to payment/i }).isDisabled());
  await p.getByRole('button', { name: /add new address/i }).click(); await p.waitForTimeout(500);
  ok('4. Cart → address form has NO "Skip for now" (allowSkip=false)', (await p.getByRole('button', { name: 'Save address' }).count()) === 1 && (await p.getByRole('button', { name: 'Skip for now' }).count()) === 0);
  await p.getByLabel(/Door \/ House number/).fill('4'); await p.getByLabel(/Street name/).fill('Main Road');
  await p.getByRole('button', { name: 'Save address' }).click(); await p.waitForTimeout(500);
  ok('4. After saving, payment is open', !(await p.getByRole('button', { name: /continue to payment/i }).isDisabled()));
  await c.close();
}
// 5. re-detect round trip
{
  const { c, p } = await fresh(PAN);
  await passStep(p); await p.waitForSelector('text=Add your delivery address');
  await p.getByLabel(/Door \/ House number/).fill('7B');
  await c.setGeolocation(AYY);
  await p.getByRole('button', { name: /Re-detect location/ }).click();
  await p.waitForSelector('text=Update your area');
  ok('5. Re-detect opens the full location step (GPS first, no list)', (await p.$$('[role=radiogroup]')).length === 0);
  await p.getByRole('button', { name: /use my location/i }).click();
  await p.waitForSelector('text=Ayyampettai detected');
  await p.getByRole('button', { name: 'Continue' }).click();
  await p.waitForSelector('text=Add your delivery address');
  ok('5. Comes back to the address form', p.url().endsWith('/welcome/address'));
  ok('5. …with the new area, Ayyampettai, locked in', (await p.locator('[aria-labelledby="address-area-label"]').innerText()).includes('Ayyampettai'));
  ok('5. …and what they had typed is kept', (await p.getByLabel(/Door \/ House number/).inputValue()) === '7B');
  // re-detect from Profile's sheet also returns and reopens
  await p.getByRole('button', { name: 'Skip for now' }).click(); await p.waitForSelector('text=Hungry, Arun?');
  await p.goto(BASE + '/profile'); await p.waitForTimeout(500);
  await p.getByRole('button', { name: 'Add' }).click(); await p.waitForTimeout(400);
  await c.setGeolocation(PAN);
  await p.getByRole('button', { name: /Re-detect location/ }).click(); await p.waitForSelector('text=Update your area');
  await p.getByRole('button', { name: /use my location/i }).click(); await p.getByRole('button', { name: 'Continue' }).click();
  await p.waitForSelector('text=Add new address');
  ok('5. From Profile: returns to Profile with the form open on the new area', p.url().endsWith('/profile') && (await p.locator('[aria-labelledby="address-area-label"]').innerText()).includes('Pandaravadai'));
  await c.close();
}
// 6. out of range
{
  const { c, p } = await fresh(CHN);
  await passStep(p); await p.waitForSelector('text=Hungry, Arun?');
  ok('6. Out of range: no address page after the step, straight Home', !p.url().includes('welcome'));
  ok('6. No "add your address" nudge for them', (await p.getByText('Add your delivery address to order faster').count()) === 0);
  await p.goto(BASE + '/profile'); await p.waitForTimeout(500);
  await p.getByRole('button', { name: 'Add' }).click(); await p.waitForTimeout(400);
  ok('6. The form says the address is only usable for someone else', (await p.getByText("You're outside our delivery area, so this saved address will only be usable as a delivery address for someone else.").count()) === 1);
  ok("6. …and asks for the receiver's area (gift flow kept)", (await p.getByLabel(/Receiver's area/).count()) === 1);
  await c.close();
}
// no home area edge
{
  const { c, p } = await fresh(PAN, { saved: JSON.stringify({ status: 'in_range', location: { source: 'gps' }, acknowledged: true }) });
  await p.waitForSelector('text=Hungry, Arun?');
  await p.getByRole('button', { name: 'Add address' }).click(); await p.waitForTimeout(400);
  ok('No home area → "We need your location first" + a button to the step, no area box', (await p.getByText('We need your location first').count()) === 1 && (await p.getByRole('button', { name: 'Find my location' }).count()) === 1 && (await p.$$('form')).length === 0);
  await c.close();
}
console.log(res.join('\n')); console.log('console errors:', errors.length ? [...new Set(errors)] : 'none');
await b.close();
process.exit(res.some((r) => r.startsWith('FAIL')) || errors.length ? 1 : 0);
