/**
 * Admin access — browser checks with the development stand-in for Firebase.
 * Run: VITE_ADMIN_AUTH_FAKE=true npm run dev -- --port 5199, then
 *      node scripts/e2e/admin-access.mjs
 */
import { chromium } from 'playwright';
import { install } from './mock.mjs';
const BASE = process.env.BASE || 'http://localhost:5199';
const b = await chromium.launch(); const res = []; const errors = [];
const ok = (n, c, d = '') => res.push(`${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  — ' + d}`);
const c = await b.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
await install(c, { delay: 20 });
const apiAuth = [];
c.on('request', (r) => { if (new URL(r.url()).pathname.startsWith('/api/')) apiAuth.push(r.headers().authorization || ''); });
const p = await c.newPage();
p.on('console', (m) => { if (m.type() === 'error' && !/TUNNEL/.test(m.text())) errors.push(m.text().slice(0, 200)); });
p.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
let nextEmail = '';
p.on('dialog', (d) => d.accept(nextEmail));
const signInAs = async (email) => { nextEmail = email; await p.getByRole('button', { name: 'Continue with Google' }).click(); };
const users = () => p.evaluate(() => JSON.parse(localStorage.getItem('mynt.fakeAdmin.users') || '{}'));
const navLinks = () => p.locator('aside nav a').allInnerTexts();

await p.goto(BASE + '/admin'); await p.waitForSelector('text=Continue with Google');
ok('Signed out → /admin/login', p.url().endsWith('/admin/login'));
ok('Login has only "Continue with Google" — no email/password, no sign-up', (await p.locator('input').count()) === 0 && (await p.getByText(/sign up|create account/i).count()) === 0);

// stranger
await signInAs('stranger@gmail.com');
await p.waitForSelector("text=You don't have access. Ask the Mynt admin to invite you.");
ok('Non-invited Gmail → "no access" and signed out', (await p.evaluate(() => localStorage.getItem('mynt.fakeAdmin.session'))) === null);

// superadmin
await signInAs('waheedx212@gmail.com');
await p.waitForURL(/\/admin$/); await p.waitForTimeout(800);
ok('waheedx212@gmail.com → superadmin home (/admin)', p.url().endsWith('/admin'));
ok('Superadmin sidebar: all sections incl. Access', JSON.stringify(await navLinks()) === JSON.stringify(['Dashboard', 'Orders', 'Shops', 'Delivery partners', 'Customers', 'Settings', 'Access']), JSON.stringify(await navLinks()));
ok('lastLoginAt stamped', Boolean((await users())['waheedx212@gmail.com'].lastLoginAt));
ok('Admin API calls carry the ID token', apiAuth.some((h) => h === 'Bearer fake:waheedx212@gmail.com'));
await p.reload(); await p.waitForTimeout(1200);
ok('Session survives a refresh', p.url().endsWith('/admin') && (await p.getByText('Dashboard').count()) > 0);

// access page
await p.getByRole('link', { name: 'Access' }).click(); await p.waitForSelector('text=Invited users sign in with Google using this exact Gmail.');
ok('Self row: cannot remove or deactivate yourself', (await p.getByText("You can't remove or deactivate yourself.").count()) === 1);
await p.getByLabel(/Gmail address/).fill('not-an-email'); await p.getByRole('button', { name: 'Send invite' }).click();
ok('Invalid email refused', (await p.getByText('Enter a valid email address').count()) === 1);
await p.getByLabel(/Gmail address/).fill('  Owner@Gmail.com '); await p.getByRole('button', { name: 'Send invite' }).click();
ok('Shop owner needs a shop', (await p.getByText('Choose the shop this owner manages').count()) === 1);
await p.getByLabel('Shop', { exact: false }).last().selectOption('s1');
await p.getByRole('button', { name: 'Send invite' }).click(); await p.waitForTimeout(500);
const u = (await users())['owner@gmail.com'];
ok('Invite saved lowercased {email, role, shopId, active, invitedBy, createdAt}', u && u.role === 'shop_owner' && u.shopId === 's1' && u.active === true && u.invitedBy === 'waheedx212@gmail.com' && u.createdAt, JSON.stringify(u));
ok('Table shows the new user', (await p.locator('tr', { hasText: 'owner@gmail.com' }).count()) === 1);
await p.getByLabel(/Gmail address/).fill('OWNER@gmail.com'); await p.getByRole('button', { name: 'Send invite' }).click();
ok('Duplicate email → error', (await p.getByText('That email already has access.').count()) === 1);
await p.getByRole('button', { name: 'Log out' }).click(); await p.getByRole('dialog').getByRole('button', { name: 'Log out' }).click();
await p.waitForSelector('text=Continue with Google');

// shop owner
await signInAs('owner@gmail.com');
await p.waitForURL(/\/admin\/my-shop$/); await p.waitForSelector('text=Open for orders');
ok('Invited owner → /admin/my-shop with their shop', (await p.getByRole('heading', { name: 'Sri Murugan Hotel' }).count()) === 1);
ok('Owner sidebar: only My shop + Orders', JSON.stringify(await navLinks()) === JSON.stringify(['My shop', 'Orders']), JSON.stringify(await navLinks()));
for (const path of ['', '/customers', '/settings', '/access', '/shops', '/partners', '/shops/s2/products']) {
  await p.goto(BASE + '/admin' + path); await p.waitForTimeout(700);
  if (!p.url().endsWith('/admin/my-shop')) ok(`Owner blocked from /admin${path}`, false, p.url());
}
ok('Owner is sent home from dashboard, customers, settings, access, shops, partners, another shop', !res.some((r) => r.includes('Owner blocked') && r.startsWith('FAIL')));
await p.goto(BASE + '/admin/shops/s1/products'); await p.waitForTimeout(900);
ok('Owner opens their own menu', p.url().endsWith('/admin/shops/s1/products') && (await p.getByText('Ghee Roast Dosa').count()) > 0);
apiAuth.length = 0;
await p.goto(BASE + '/admin/orders'); await p.waitForTimeout(1200);
const txt = await p.locator('main').innerText();
ok('Owner orders: only their shop, no shop filter', !/Royal Biryani|Anbu Bakery/.test(txt) && (await p.getByLabel('Shop').count()) === 0, txt.slice(0, 300));
await p.getByRole('button', { name: 'Log out' }).click(); await p.getByRole('dialog').getByRole('button', { name: 'Log out' }).click();
await p.waitForSelector('text=Continue with Google');

// deactivate → kicked out next load
await signInAs('waheedx212@gmail.com'); await p.waitForURL(/\/admin$/);
await p.goto(BASE + '/admin/access'); await p.waitForSelector('text=owner@gmail.com');
await p.locator('tr', { hasText: 'owner@gmail.com' }).getByRole('button', { name: 'Deactivate' }).click(); await p.waitForTimeout(500);
ok('Deactivate', (await users())['owner@gmail.com'].active === false);
await p.evaluate(() => localStorage.setItem('mynt.fakeAdmin.session', JSON.stringify('owner@gmail.com')));
await p.goto(BASE + '/admin/my-shop'); await p.waitForTimeout(1200);
ok('Deactivated user is kicked out on next load', p.url().endsWith('/admin/login') && (await p.getByText("You don't have access.", { exact: false }).count()) === 1);
await signInAs('waheedx212@gmail.com'); await p.waitForURL(/\/admin$/);
await p.goto(BASE + '/admin/access'); await p.waitForSelector('text=owner@gmail.com');
await p.locator('tr', { hasText: 'owner@gmail.com' }).getByRole('button', { name: 'Reactivate' }).click(); await p.waitForTimeout(400);
ok('Reactivate', (await users())['owner@gmail.com'].active === true);
await p.locator('tr', { hasText: 'owner@gmail.com' }).getByLabel('Change shop').selectOption('s2'); await p.waitForTimeout(400);
ok('Change shop', (await users())['owner@gmail.com'].shopId === 's2');
await p.locator('tr', { hasText: 'owner@gmail.com' }).getByRole('button', { name: 'Remove' }).click();
await p.getByRole('dialog').getByRole('button', { name: 'Remove' }).click(); await p.waitForTimeout(400);
ok('Remove (after a confirm dialog)', !(await users())['owner@gmail.com']);
console.log(res.join('\n')); console.log('console errors:', errors.length ? [...new Set(errors)] : 'none');
await b.close();
process.exit(res.some((r) => r.startsWith('FAIL')) || errors.length ? 1 : 0);
