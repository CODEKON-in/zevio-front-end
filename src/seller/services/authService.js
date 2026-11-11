import { apiRequest, clearSession, saveSession, getCredential, AUTH_EXPIRED_EVENT } from './api';
import { GOOGLE_CLIENT_ID, loadGoogleScript } from '../../services/google.js';

export const ACCESS_DENIED_MESSAGE =
  "You don't have access yet. Contact Mynt to get set up.";

function toUser(me) {
  const shop = me.shop || {};
  return {
    email: (me.email || '').toLowerCase(),
    name: me.name || 'Seller',
    photo: me.photo || '',
    shopId: shop.id,
    invitedBy: null,
    createdAt: me.profile?.created_at || null,
  };
}

/** Asks the API who this token belongs to. Denied → session cleared. */
async function fetchSeller() {
  try {
    return toUser(await apiRequest('/me'));
  } catch (err) {
    clearSession();
    if (err.status === 403 || err.status === 401) throw new Error(ACCESS_DENIED_MESSAGE);
    throw err;
  }
}

/** Shows Google's account chooser and resolves with a Google ID token. */
function getGoogleCredential() {
  return loadGoogleScript().then(
    (google) =>
      new Promise((resolve, reject) => {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          ux_mode: 'popup',
          callback: (res) => (res.credential ? resolve(res.credential) : reject(new Error('Sign-in failed. Please try again.'))),
          error_callback: () => reject(new Error('Sign-in failed. Please try again.')),
        });
        google.accounts.id.prompt((n) => {
          if (n.isNotDisplayed?.() || n.isSkippedMoment?.()) {
            reject(new Error('Sign-in cancelled. Please try again.'));
          } else if (n.isDismissedMoment?.() && n.getDismissedReason?.() !== 'credential_returned') {
            reject(new Error('Sign-in cancelled. Please try again.'));
          }
        });
      }),
    () => {
      throw new Error('Could not load Google sign-in. Check your connection.');
    }
  );
}

/** Sign in with Google; only sellers known to the API get through. */
export async function loginWithGoogle() {
  const credential = await getGoogleCredential();
  saveSession(credential);
  return fetchSeller();
}

export async function logoutUser() {
  clearSession();
  try {
    window.google?.accounts?.id?.disableAutoSelect();
  } catch {
    /* not loaded */
  }
}

/** Restores a signed-in session on load, and reacts to it expiring. */
export function subscribeToAuthState(callback) {
  let active = true;
  const signedOut = (error = null) => active && callback({ user: null, seller: null, loading: false, error });

  if (!getCredential()) {
    signedOut();
  } else {
    fetchSeller().then(
      (user) => active && callback({ user, seller: user, loading: false, error: null }),
      (err) => signedOut(err.message === ACCESS_DENIED_MESSAGE ? err.message : null)
    );
  }

  const onExpired = () => signedOut();
  window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
  return () => {
    active = false;
    window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  };
}
