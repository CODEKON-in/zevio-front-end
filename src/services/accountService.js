/**
 * Customer accounts: Google sign-in,
 * first-time sign-up, and delete account. Customers are the only people who sign in.
 *
 * A signed-in user looks like:
 *   { id, role: "customer", name, phone, email, picture, customerId }
 */
export { signIn as signInWithGoogle, signUp as completeSignUp, deleteAccount } from './api/apiAccount.js';
