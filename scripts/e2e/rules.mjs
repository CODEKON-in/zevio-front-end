import { chromium } from 'playwright';
import { install, sessions, inRange } from './mock.mjs';
const B=process.env.BASE||'http://localhost:5199'; const b=await chromium.launch(); const res=[]; const errs=[];
const ok=(n,c,d='')=>res.push(`${c?'PASS':'FAIL'}  ${n}${c?'':'  — '+d}`);
const addr={id:'addr1',label:'Home',name:'Arun Kumar',phone:'9876500001',placeId:'pandaravadai',area:{id:'pandaravadai',name:'Pandaravadai',lat:10.9,lng:79.26},door:'12',streetName:'East Street',street:'12, East Street',detectionMethod:'gps'};
const outOfRange={status:'out_of_range',location:{area:null,lat:11.5,lng:79.9,accuracy:20,detectionMethod:'gps',inRange:false,nearestArea:'ayyampettai',distanceKm:40,place:null,source:'gps'},acknowledged:true};
async function ctx(loc=inRange){ const c=await b.newContext({viewport:{width:360,height:760},reducedMotion:'reduce'}); await install(c,{delay:30});
  await c.addInitScript(([s,l,a])=>{localStorage.setItem('zevio.api.session',s);localStorage.setItem('zevio.location',l);localStorage.setItem('zevio.addresses',JSON.stringify({c1:[a]}));},[JSON.stringify(sessions.customer),JSON.stringify(loc),addr]);
  const p=await c.newPage(); p.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
  p.on('console',m=>{if(m.type()==='error'&&!/TUNNEL/.test(m.text()))errs.push(m.text().slice(0,140));}); return {c,p}; }

// --- single-shop rule
{ const {c,p}=await ctx(); await p.goto(B+'/shop/s1'); await p.waitForTimeout(900);
  await p.getByRole('button',{name:/add idli/i}).click(); await p.waitForTimeout(400);
  await p.goto(B+'/shop/s2'); await p.waitForTimeout(900);
  const addBtn=p.getByRole('button',{name:/^add /i}).first(); await addBtn.click(); await p.waitForTimeout(600);
  const body=await p.locator('body').innerText();
  ok('Single-shop rule: adding from a second shop asks first', /start a new cart|another shop|replace/i.test(body), body.slice(0,120).replace(/\n/g,' | '));
  // decline keeps the first cart
  const keep=p.getByRole('button',{name:/^(No|Keep|Cancel)/i}).last(); if (await keep.count()) await keep.click();
  await p.waitForTimeout(400); await p.goto(B+'/cart'); await p.waitForTimeout(900);
  ok('Single-shop rule: declining keeps the original shop cart', (await p.locator('body').innerText()).includes('Sri Murugan Hotel'));
  await c.close(); }
// --- MOQ stepper
{ const {c,p}=await ctx(); await p.goto(B+'/shop/s1'); await p.waitForTimeout(900);
  await p.getByRole('button',{name:/add parotta/i}).click(); await p.waitForTimeout(400);
  const grp=p.getByRole('group',{name:/parotta/i});
  ok('MOQ: Parotta starts at its minimum of 4', (await grp.locator('span[aria-live]').innerText()).trim()==='4');
  ok('MOQ: minus is disabled at the floor', await grp.getByRole('button',{name:/one less|decrease|remove one/i}).isDisabled());
  await grp.getByRole('button',{name:/more|increase/i}).click(); await p.waitForTimeout(250);
  ok('MOQ: plus raises it to 5', (await grp.locator('span[aria-live]').innerText()).trim()==='5');
  await c.close(); }
// --- gift order (customer outside the area)
{ const {c,p}=await ctx(outOfRange); await p.goto(B+'/shop/s1'); await p.waitForTimeout(900);
  await p.getByRole('button',{name:/add idli/i}).click(); await p.waitForTimeout(400);
  await p.goto(B+'/cart'); await p.waitForTimeout(1000);
  await p.getByRole('button',{name:'Continue to payment'}).click(); await p.waitForURL(/checkout/,{timeout:8000}); await p.waitForTimeout(800);
  const t=await p.locator('body').innerText();
  ok('Gift order: checkout says cash on delivery is unavailable', /Cash on Delivery isn.t available/i.test(t), t.slice(0,200).replace(/\n/g,' | '));
  ok('Gift order: no Cash on Delivery option offered', (await p.getByRole('radio',{name:/cash/i}).count())===0 && !/Pay with cash/i.test(t));
  ok('Gift order: the order is flagged as not cancellable', /cannot be cancelled|not be cancelled|cannot cancel/i.test(t), t.slice(0,200).replace(/\n/g,' | '));
  await c.close(); }
// --- cancel allowed while pending, blocked after pickup
{ const {c,p}=await ctx(); await p.goto(B+'/orders/o1'); await p.waitForTimeout(1200); // o1 = out_for_delivery
  const t1=await p.locator('body').innerText();
  ok('Cancel blocked once out for delivery: no Cancel button', (await p.getByRole('button',{name:/cancel order/i}).count())===0);
  ok('Cancel blocked once out for delivery: tells the customer why', /too late|on its way|cannot be cancelled|out for delivery/i.test(t1));
  await p.goto(B+'/orders/o2'); await p.waitForTimeout(1000); // delivered
  ok('Delivered order offers no Cancel', (await p.getByRole('button',{name:/cancel order/i}).count())===0);
  await c.close(); }
console.log(res.join('\n')); console.log('console errors:', errs.length?[...new Set(errs)]:'none');
await b.close();
