/**
 * Firestore security rules tests (firestore.rules) on the local emulator.
 *
 * Run (needs Java 11+; downloads the emulator the first time):
 *   npm i -D firebase-tools @firebase/rules-unit-testing
 *   npx firebase emulators:exec --only firestore --project demo-mynt "node tests/firestore-rules.test.mjs"
 */
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, getDocs, collection, setDoc, updateDoc } from 'firebase/firestore';

const SHOP_A = 'shop-a';
const SHOP_B = 'shop-b';
const env = await initializeTestEnvironment({ projectId: 'demo-mynt', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'adminUsers/waheedx212@gmail.com'), { email: 'waheedx212@gmail.com', role: 'superadmin', active: true, invitedBy: 'seed' });
  await setDoc(doc(db, 'adminUsers/owner@gmail.com'), { email: 'owner@gmail.com', role: 'shop_owner', shopId: SHOP_A, active: true, invitedBy: 'waheedx212@gmail.com' });
  await setDoc(doc(db, 'adminUsers/gone@gmail.com'), { email: 'gone@gmail.com', role: 'shop_owner', shopId: SHOP_A, active: false, invitedBy: 'waheedx212@gmail.com' });
  await setDoc(doc(db, `shops/${SHOP_A}`), { name: 'A' });
  await setDoc(doc(db, `shops/${SHOP_B}`), { name: 'B' });
  await setDoc(doc(db, 'products/pa'), { shopId: SHOP_A, name: 'x' });
  await setDoc(doc(db, 'products/pb'), { shopId: SHOP_B, name: 'y' });
  await setDoc(doc(db, 'orders/ob'), { shopId: SHOP_B, status: 'pending' });
});

const as = (email, verified = true) => env.authenticatedContext(email.replace(/\W/g, ''), { email, email_verified: verified }).firestore();
const superDb = as('waheedx212@gmail.com');
const ownerDb = as('owner@gmail.com');
const goneDb = as('gone@gmail.com');
const strangerDb = as('stranger@gmail.com');
const unverifiedDb = as('owner@gmail.com', false);
const anonDb = env.unauthenticatedContext().firestore();

const results = [];
async function t(name, p) {
  try {
    await p;
    results.push(`PASS  ${name}`);
  } catch (e) {
    results.push(`FAIL  ${name} — ${e.message}`);
  }
}

// adminUsers
await t('Signed-out: cannot read the allowlist', assertFails(getDoc(doc(anonDb, 'adminUsers/owner@gmail.com'))));
await t('Anyone signed in may read their own (missing) entry', assertSucceeds(getDoc(doc(strangerDb, 'adminUsers/stranger@gmail.com'))));
await t("Stranger cannot read someone else's entry", assertFails(getDoc(doc(strangerDb, 'adminUsers/owner@gmail.com'))));
await t('Stranger cannot invite themself', assertFails(setDoc(doc(strangerDb, 'adminUsers/stranger@gmail.com'), { email: 'stranger@gmail.com', role: 'superadmin', active: true })));
await t('Unverified email cannot read even its own entry', assertFails(getDoc(doc(unverifiedDb, 'adminUsers/owner@gmail.com'))));
await t('Owner reads own entry', assertSucceeds(getDoc(doc(ownerDb, 'adminUsers/owner@gmail.com'))));
await t('Owner cannot list the allowlist', assertFails(getDocs(collection(ownerDb, 'adminUsers'))));
await t('Owner cannot promote themself', assertFails(updateDoc(doc(ownerDb, 'adminUsers/owner@gmail.com'), { role: 'superadmin' })));
await t('Owner cannot move themself to another shop', assertFails(updateDoc(doc(ownerDb, 'adminUsers/owner@gmail.com'), { shopId: SHOP_B })));
await t('Owner may stamp own lastLoginAt', assertSucceeds(updateDoc(doc(ownerDb, 'adminUsers/owner@gmail.com'), { lastLoginAt: new Date() })));
await t('Deactivated user cannot stamp lastLoginAt', assertFails(updateDoc(doc(goneDb, 'adminUsers/gone@gmail.com'), { lastLoginAt: new Date() })));
await t('Superadmin lists the allowlist', assertSucceeds(getDocs(collection(superDb, 'adminUsers'))));
await t('Superadmin invites a shop owner', assertSucceeds(setDoc(doc(superDb, 'adminUsers/new@gmail.com'), { email: 'new@gmail.com', role: 'shop_owner', shopId: SHOP_B, active: true, invitedBy: 'waheedx212@gmail.com' })));
await t('Invite without a shop for a shop owner is refused', assertFails(setDoc(doc(superDb, 'adminUsers/x@gmail.com'), { email: 'x@gmail.com', role: 'shop_owner', active: true })));
await t('Invite whose id is not the lowercased email is refused', assertFails(setDoc(doc(superDb, 'adminUsers/Y@gmail.com'), { email: 'Y@gmail.com', role: 'superadmin', active: true })));
await t('Superadmin deactivates a user', assertSucceeds(updateDoc(doc(superDb, 'adminUsers/new@gmail.com'), { active: false })));
await t('Superadmin removes a user', assertSucceeds(deleteDoc(doc(superDb, 'adminUsers/new@gmail.com'))));
await t('Superadmin cannot deactivate themself', assertFails(updateDoc(doc(superDb, 'adminUsers/waheedx212@gmail.com'), { active: false })));
await t('Superadmin cannot demote themself', assertFails(updateDoc(doc(superDb, 'adminUsers/waheedx212@gmail.com'), { role: 'shop_owner', shopId: SHOP_A })));
await t('Superadmin cannot remove themself', assertFails(deleteDoc(doc(superDb, 'adminUsers/waheedx212@gmail.com'))));

// shops / products / orders
await t('Owner reads own shop', assertSucceeds(getDoc(doc(ownerDb, `shops/${SHOP_A}`))));
await t('Owner cannot read another shop', assertFails(getDoc(doc(ownerDb, `shops/${SHOP_B}`))));
await t('Owner updates own product', assertSucceeds(updateDoc(doc(ownerDb, 'products/pa'), { name: 'z' })));
await t("Owner cannot read another shop's product", assertFails(getDoc(doc(ownerDb, 'products/pb'))));
await t('Owner cannot move own product to another shop', assertFails(updateDoc(doc(ownerDb, 'products/pa'), { shopId: SHOP_B })));
await t("Owner cannot create a product for another shop", assertFails(setDoc(doc(ownerDb, 'products/new'), { shopId: SHOP_B, name: 'n' })));
await t("Owner cannot read another shop's order", assertFails(getDoc(doc(ownerDb, 'orders/ob'))));
await t('Deactivated owner cannot read own shop', assertFails(getDoc(doc(goneDb, `shops/${SHOP_A}`))));
await t('Superadmin reads any order', assertSucceeds(getDoc(doc(superDb, 'orders/ob'))));
await t('Stranger reads nothing', assertFails(getDoc(doc(strangerDb, `shops/${SHOP_A}`))));

await env.cleanup();
console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(failed ? `\n${failed} FAILED` : `\nAll ${results.length} rules checks passed.`);
process.exit(failed ? 1 : 0);
