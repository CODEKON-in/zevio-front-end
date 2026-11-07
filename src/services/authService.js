/**
 * Customers sign in with Google — see accountService.js. Admins sign in with
 * Google through Firebase, invite-only — see services/adminAuth and
 * context/AdminAuthContext.jsx. The old email-and-password admin login
 * (POST /api/auth/admin) is no longer used, and the site's /api proxy no
 * longer lets it through.
 */
import { ServiceError } from '../utils/errors.js';

export function login() {
  return Promise.reject(new ServiceError('NOT_FOUND'));
}

export async function logout() {
  return true;
}
