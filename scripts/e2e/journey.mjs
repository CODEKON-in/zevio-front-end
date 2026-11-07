/**
 * One customer's whole journey, end to end: signup → location → address →
 * browse → cart → checkout → track → cancel. Run it against `npm run preview`
 * (BASE defaults to http://localhost:5199).
 */
import { chromium } from 'playwright';
import { install, sessions } from './mock.mjs';
const B=process.env.BASE||'http://localhost:5199'; const b=await chromium.launch(); const res=[]; const errs=[];
const ok=(n,c,d='')=>res.push(`${c?'PASS':'FAIL'}  ${n}${c?'':'  — '+d}`);
// Fresh profile: just signed up (session only, no saved location/address)
const c=await b.newContext({viewport:{width:360,height:760},permissions:['geolocation'],geolocation:{latitude:10.91333,longitude:79.24194},reducedMotion:'reduce'});
await install(c,{delay:30});
await c.addInitScript(([s])=>localStorage.setItem('zevio.api.session',s),[JSON.stringify(sessions.customer)]);
const p=await c.newPage();
p.on('console',m=>{if(m.type()==='error'&&!/TUNNEL/.test(m.text()))errs.push(m.text().slice(0,140));});
p.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
await p.goto(B+'/'); 
// 1. location step (post-signup, no skip)
await p.waitForSelector('text=Where are you?');
ok('1 signup → location step appears', true);
await p.getByRole('button',{name:/Use my location/i}).click();
await p.waitForSelector('text=/We deliver to/i',{timeout:15000});
await p.getByRole('button',{name:'Continue'}).click();
// 2. address page
await p.waitForSelector('text=Add your delivery address',{timeout:10000});
ok('2 address page opens with the detected area locked', (await p.locator('[aria-labelledby="address-area-label"]').innerText()).includes('Pandaravadai'));
await p.getByLabel(/Door \/ House number/).fill('12');
await p.getByLabel(/Street name/).fill('East Street');
await p.getByRole('button',{name:/^Save/}).click();
// 3. browse
await p.waitForSelector('text=/Hungry/i',{timeout:10000});
await p.getByRole('link',{name:/Sri Murugan Hotel/}).waitFor({timeout:10000});
ok('3 home lists shops after saving the address', (await p.getByRole('link',{name:/Sri Murugan Hotel/}).count())>=1);
await p.getByRole('link',{name:/Sri Murugan Hotel/}).click(); await p.waitForTimeout(1000);
// 4. cart
await p.getByRole('button',{name:/add idli/i}).click(); await p.waitForTimeout(400);
await p.getByRole('link',{name:/view cart/i}).click();
await p.waitForURL(/\/cart/,{timeout:8000});
await p.waitForTimeout(800);
const cartTxt=await p.locator('body').innerText(); 
ok('4 cart shows the item and a bill total', /To pay/i.test(cartTxt)&&/₹/.test(cartTxt), cartTxt.slice(0,80));
// 5. checkout
await p.getByRole('button',{name:'Continue to payment'}).click();
await p.waitForURL(/checkout/,{timeout:8000});
await p.waitForTimeout(600);
const coTxt=await p.locator('body').innerText();
ok('5 checkout offers COD and UPI', /Cash on Delivery/i.test(coTxt)&&/UPI/i.test(coTxt));
await p.getByRole('button',{name:/Place order/i}).click();
// 6. placed → tracking
await p.waitForURL(/placed/,{timeout:12000});
ok('6 order placed', true);
await p.waitForURL(/orders\/o\d+$/,{timeout:12000});
await p.waitForTimeout(800);
ok('7 tracking shows the timeline', /Order status|Pending/i.test(await p.locator('body').innerText()));
// 7. cancel
await p.getByRole('button',{name:/Cancel order/i}).click();
await p.getByRole('button',{name:'Yes, cancel'}).click();
await p.waitForTimeout(1200);
ok('8 cancel works and the order reads Cancelled', /Cancelled/i.test(await p.locator('body').innerText()));
console.log(res.join('\n')); console.log('console errors:', errs.length?[...new Set(errs)]:'none');
await b.close();
