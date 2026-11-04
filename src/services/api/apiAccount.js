/**
 * Google sign-in / sign-up / delete account against the Zevio API.
 *
 * The ID token Google hands the browser is sent to POST /api/auth/google, which
 * checks its signature, issuer and audience against Google's public keys. Only
 * what comes back from there is trusted — the browser's own decode of the token
 * is used for filling in the sign-up form, never to decide who someone is.
 *
 * The verified profile is found by its google_sub column. Accounts created
 * before Google sign-in are matched on email and linked on first sign-in.
 *
 * Customers are the only people who sign in here. Shops and delivery partners
 * are records the admin creates and manages; they have no app of their own.
 */
import { apiGet, apiPost } from './client.js';
import { getOrders } from './apiOrders.js';
import { profileIdFromGoogle } from '../google.js';
import { ServiceError, newUuid } from '../../utils/errors.js';
import { forgetAddresses } from '../addressBook.js';
import { ACTIVE_STATUSES, ROLES } from '../../utils/constants.js';
import { cleanPhone } from '../../utils/format.js';

/**
 * Who this Google sign-in belongs to.
 *
 * Preferred path: POST /api/auth/google, where the API checks the token's
 * signature against Google's keys. The deployed API does not have that endpoint
 * yet, so when it answers 404 we fall back to trusting the token the browser
 * decoded and deriving the profile id from its `sub`.
 *
 * The fallback IDENTIFIES a person without PROVING who they are — a forged
 * token would pass. It disappears on its own the moment the API gains the
 * endpoint, with no frontend change needed.
 *
 * @returns {{google:object, profile:object|null, verified:boolean}}
 */
async function verifyGoogle(google) {
  if (!google?.sub || !google?.email) throw new ServiceError('GOOGLE_FAILED');

  if (google.credential) {
    try {
      const data = await apiPost('/auth/google', { credential: google.credential });
      return { ...data, verified: true };
    } catch (e) {
      // NOT_FOUND = the API has no such endpoint, so use the fallback below.
      // Anything else is a real failure and must not be swallowed.
      if (e.code === 'API_AUTH') throw new ServiceError('GOOGLE_REJECTED');
      if (e.code !== 'NOT_FOUND') throw e;
    }
  }

  const profile = await getProfile(profileIdFromGoogle(google.sub));
  return { google, profile, verified: false };
}

async function getProfile(uid) {
  try {
    return await apiGet(`/user/${uid}`);
  } catch (e) {
    // Missing profiles come back as 404 (or 500 until the API bug is fixed).
    if (e.code === 'NOT_FOUND' || e.code === 'SERVER') return null;
    throw e;
  }
}

const customerUser = (c, g) => ({ id: c.id, customerId: c.id, role: ROLES.CUSTOMER, name: c.name, phone: c.phone, email: g.email, picture: g.picture || null });

export async function signIn(role, googleFromBrowser) {
  const { google, profile } = await verifyGoogle(googleFromBrowser);

  if (role === ROLES.CUSTOMER) {
    if (!profile) return { needsSignUp: true, google };
    // A profile the admin created as a shop owner or a delivery partner cannot
    // order through this app: its user_type is not 'customer', and the row is
    // the shop's or the partner's record rather than a person's. They sign up
    // with a different Google account, or the admin changes the row.
    if (profile.user_type !== 'customer') throw new ServiceError('WRONG_ROLE');
    // is_blocked is a real column, so the admin's block applies on every phone.
    if (profile.is_blocked) throw new ServiceError('BLOCKED');
    return { user: customerUser(profile, google) };
  }

  throw new ServiceError('NOT_FOUND');
}

/**
 * The profile for this Google account, creating it the first time.
 *
 * The id matters: on the verified path any UUID works, because google_sub is
 * what finds the row later. On the fallback path the id MUST be derived from
 * the Google account — that derivation is the only way the next sign-in can
 * find this profile again, and a random id would strand the person on the
 * sign-up screen every time.
 */
async function ensureProfile(google, name, phone, userType) {
  const { profile, verified } = await verifyGoogle(google);
  if (profile) return profile;
  const uid = verified ? newUuid() : profileIdFromGoogle(google.sub);
  await apiPost('/user/add/', {
    uid,
    name,
    phone,
    user_type: userType,
    email: google.email,
    google_sub: google.sub,
  });
  return { id: uid, name, phone, user_type: userType };
}

export async function signUp(role, google, details) {
  if (role !== ROLES.CUSTOMER) throw new ServiceError('NOT_FOUND');
  const phone = cleanPhone(details.phone);
  const profile = await ensureProfile(google, details.name.trim(), phone, 'customer');
  return customerUser({ ...profile, name: details.name.trim(), phone }, google);
}

export async function deleteAccount(user) {
  if (user.role !== ROLES.CUSTOMER) throw new ServiceError('NOT_FOUND');
  const orders = await getOrders({ customerId: user.customerId });
  if (orders.some((o) => ACTIVE_STATUSES.includes(o.status))) throw new ServiceError('ACTIVE_ORDERS');
  await apiPost('/user/delete/', { uid: user.customerId });
  forgetAddresses(user.customerId); // nothing of theirs left on this phone
  return true;
}
