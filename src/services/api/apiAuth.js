/**
 * Admin sign-in against the Zevio API. Everyone else signs in with Google
 * (see apiAccount.js).
 */
import { apiPost } from './client.js';
import { ServiceError } from '../../utils/errors.js';
import { ROLES } from '../../utils/constants.js';

/**
 * The admin is a profile with user_type = 'admin'; the API checks the password
 * against the stored hash and answers 401 if it does not match.
 */
export async function loginAdmin(details = {}) {
  const email = (details.email || '').trim().toLowerCase();
  const password = details.password || '';
  if (!email || !password) throw new ServiceError('ADMIN_CREDENTIALS');
  let profile;
  try {
    profile = await apiPost('/auth/admin', { email, password });
  } catch (e) {
    // 401 here means "wrong email or password", not a misconfigured API key.
    if (e.code === 'API_AUTH') throw new ServiceError('ADMIN_CREDENTIALS');
    throw e;
  }
  return {
    id: profile.id,
    name: profile.name,
    phone: profile.phone,
    email: profile.email,
    role: ROLES.ADMIN,
  };
}
