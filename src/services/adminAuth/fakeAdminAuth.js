/**
 * DEVELOPMENT ONLY — a stand-in for Firebase so the admin screens can be tried
 * without a Firebase project. Enabled by VITE_ADMIN_AUTH_FAKE=true under
 * `npm run dev`; index.js refuses it in a production build.
 *
 * "Continue with Google" asks for an email in a prompt. The allowlist lives in
 * localStorage and starts with the one superadmin. It mirrors the Firestore
 * rules closely enough to exercise the screens, but it is not security: the
 * real rules are in firestore.rules and the real server check in api/proxy.js.
 */
import { emailKey } from './index.js';

const USERS = 'mynt.fakeAdmin.users';
const SESSION = 'mynt.fakeAdmin.session';
const SEED = { 'waheedx212@gmail.com': { email: 'waheedx212@gmail.com', role: 'superadmin', active: true, invitedBy: 'seed', createdAt: '2026-11-07T00:00:00.000Z', lastLoginAt: null } };

const read = (k, f) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? f;
  } catch {
    return f;
  }
};
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

export function createFakeAdminAuth() {
  if (!localStorage.getItem(USERS)) write(USERS, SEED);
  const listeners = new Set();
  const current = () => {
    const email = read(SESSION, null);
    return email ? { email, name: email.split('@')[0], photo: null, emailVerified: true } : null;
  };
  const emit = () => listeners.forEach((cb) => cb(current()));
  const users = () => read(USERS, {});
  const me = () => users()[emailKey(read(SESSION, ''))];
  const isSuper = () => me()?.role === 'superadmin' && me()?.active;
  const denied = () => Object.assign(new Error('permission-denied'), { code: 'permission-denied' });

  return {
    configured: true,
    onUserChanged(cb) {
      listeners.add(cb);
      setTimeout(() => cb(current()), 0);
      return () => listeners.delete(cb);
    },
    async signInWithGoogle() {
      // eslint-disable-next-line no-alert
      const email = window.prompt('Fake Google sign-in (development only) — email:');
      if (!email) throw Object.assign(new Error('closed'), { code: 'auth/popup-closed-by-user' });
      write(SESSION, email.trim());
      emit();
    },
    async signOut() {
      localStorage.removeItem(SESSION);
      emit();
    },
    getIdToken: async () => (current() ? `fake:${current().email}` : null),
    async getAdminUser(email) {
      if (emailKey(email) !== emailKey(read(SESSION, '')) && !isSuper()) throw denied();
      return users()[emailKey(email)] || null;
    },
    async touchLastLogin(email) {
      const all = users();
      if (all[emailKey(email)]) {
        all[emailKey(email)].lastLoginAt = new Date().toISOString();
        write(USERS, all);
      }
    },
    async listAdminUsers() {
      if (!isSuper()) throw denied();
      return Object.values(users());
    },
    async createAdminUser(data) {
      if (!isSuper()) throw denied();
      const all = users();
      const id = emailKey(data.email);
      if (all[id]) throw Object.assign(new Error('duplicate'), { code: 'DUPLICATE' });
      all[id] = { ...data, email: id, createdAt: new Date().toISOString(), lastLoginAt: null };
      write(USERS, all);
    },
    async updateAdminUser(email, patch) {
      if (!isSuper()) throw denied();
      const all = users();
      all[emailKey(email)] = { ...all[emailKey(email)], ...patch };
      write(USERS, all);
    },
    async deleteAdminUser(email) {
      if (!isSuper() || emailKey(email) === emailKey(read(SESSION, ''))) throw denied();
      const all = users();
      delete all[emailKey(email)];
      write(USERS, all);
    },
  };
}
