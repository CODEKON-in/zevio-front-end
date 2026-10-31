/**
 * Admin sign-in. Customers, shop owners and delivery partners sign in with
 * Google instead — see accountService.js.
 *
 * The admin is a real row in the database: the API checks the password against
 * the stored hash (POST /api/auth/admin) and answers 401 if it does not match.
 */
import { loginAdmin } from './api/apiAuth.js';
import { ServiceError } from '../utils/errors.js';
import { ROLES } from '../utils/constants.js';

/**
 * @param {'admin'} role
 * @param {{email?:string, password?:string}} [details]
 */
export function login(role, details = {}) {
  if (role === ROLES.ADMIN) return loginAdmin(details);
  return Promise.reject(new ServiceError('NOT_FOUND'));
}

export async function logout() {
  return true;
}
