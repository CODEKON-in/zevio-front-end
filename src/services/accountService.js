/**
 * Accounts for customers, shop owners and delivery partners: Google sign-in,
 * first-time sign-up, and delete account. Admins sign in in authService.js.
 *
 * A signed-in user looks like:
 *   { id, role, name, phone, email, picture, customerId? | shopId? | partnerId? }
 */
export { signIn as signInWithGoogle, signUp as completeSignUp, deleteAccount } from './api/apiAccount.js';
