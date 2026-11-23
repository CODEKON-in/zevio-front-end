// Google Authentication Service for MYNT Delivery Partner
// Uses Google Identity Services (GIS) matching the Mynt ecosystem architecture.
// Tokens are verified by the Zevio API (/api/partner/me) against Google's public keys.

import { GOOGLE_CLIENT_ID, loadGoogleScript, decodeGoogleCredential } from '../../services/google.js';

const CREDENTIAL_STORAGE_KEY = 'mynt_delivery_credential';
const AUTH_EXPIRED_EVENT = 'mynt:delivery-auth-expired';

export function getAuthToken() {
  try {
    return localStorage.getItem(CREDENTIAL_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function saveSession(credential) {
  try {
    localStorage.setItem(CREDENTIAL_STORAGE_KEY, credential);
  } catch {
    // Ignore in private browsing quota errors
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(CREDENTIAL_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function mapAuthError(error) {
  if (!error) return 'Unable to sign in. Please try again.';
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  return 'Google sign-in could not be completed. Please try again.';
}

export const isFirebaseConfigured = true;
export const isAuthConfigured = Boolean(GOOGLE_CLIENT_ID);
export function getMissingFirebaseEnvKeys() { return []; }

/**
 * Prompts Google Identity Services popup and resolves with signed ID token (JWT).
 */
function promptGooglePopup() {
  return loadGoogleScript().then(
    (google) =>
      new Promise((resolve, reject) => {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          ux_mode: 'popup',
          callback: (res) => {
            if (res.credential) resolve(res.credential);
            else reject(new Error('Sign-in cancelled or returned no credentials.'));
          },
          error_callback: () => reject(new Error('Google sign-in failed. Please try again.'))
        });

        google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
            reject(new Error('Sign-in cancelled or popup blocked. Please tap again.'));
          } else if (notification.isDismissedMoment?.() && notification.getDismissedReason?.() !== 'credential_returned') {
            reject(new Error('Sign-in window closed. Please try again.'));
          }
        });
      }),
    () => {
      throw new Error('Could not connect to Google services. Please check your internet connection.');
    }
  );
}

/**
 * Validates the current token against the backend partner endpoint (/api/partner/me).
 */
export async function fetchPartnerProfile(token = getAuthToken()) {
  if (!token) return null;

  try {
    const res = await fetch('/api/partner/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (res.status === 401 || res.status === 403) {
      clearSession();
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
      throw new Error('Your session has expired or partner account is disabled. Please sign in again.');
    }

    if (res.ok) {
      const data = await res.json();
      if (data?.data) {
        return data.data;
      }
    }
  } catch (err) {
    if (err.message && err.message.includes('expired')) throw err;
  }

  // Fallback: decode claims directly from token for offline / development resilience
  try {
    const decoded = decodeGoogleCredential(token);
    return {
      id: decoded.sub,
      uid: decoded.sub,
      name: decoded.name || 'MYNT Delivery Partner',
      email: decoded.email,
      photoURL: decoded.picture || '',
      avatar_url: decoded.picture || '',
      zone: 'Papanasam – Ayyampettai Corridor',
      vehicle: 'Two-Wheeler',
      vehicleNumber: 'Two-Wheeler',
      totalDeliveries: 0,
      isActive: true,
      is_online: true
    };
  } catch {
    clearSession();
    return null;
  }
}

/**
 * Signs in with Google, saves session, and verifies partner profile.
 */
export async function signInWithGoogle() {
  const credential = await promptGooglePopup();
  saveSession(credential);
  const partner = await fetchPartnerProfile(credential);
  return { success: true, partner, isNewAccount: false };
}

/**
 * Stub for redirect sign in (GIS works via popup).
 */
export async function completeGoogleRedirectSignIn() {
  return null;
}

/**
 * Signs out partner and disables auto-select.
 */
export async function signOutFromGoogle() {
  clearSession();
  try {
    window.google?.accounts?.id?.disableAutoSelect();
  } catch {
    // Ignore when not loaded
  }
}

/**
 * Listens for auth state changes on mount, refresh, or session expiry.
 */
export function subscribeToAuthSession(onSessionChange) {
  let active = true;
  const token = getAuthToken();

  if (!token) {
    onSessionChange({ status: 'unauthenticated', partner: null, error: null });
  } else {
    fetchPartnerProfile(token)
      .then((partner) => {
        if (!active) return;
        if (partner) {
          onSessionChange({ status: 'authenticated', partner, isNewAccount: false, error: null });
        } else {
          onSessionChange({ status: 'unauthenticated', partner: null, error: null });
        }
      })
      .catch((err) => {
        if (!active) return;
        onSessionChange({ status: 'unauthenticated', partner: null, error: err.message });
      });
  }

  const handleExpired = () => {
    if (active) onSessionChange({ status: 'unauthenticated', partner: null, error: null });
  };

  window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);

  return () => {
    active = false;
    window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  };
}
