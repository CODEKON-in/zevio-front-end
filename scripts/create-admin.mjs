/**
 * Create an admin account for the admin panel (/admin).
 *
 *   npm run create-admin
 *
 * Asks for name, email, phone and password here in the terminal, then calls
 * the API's own "add admin" endpoint with the server key from .env.local.
 * The password is stored only as a hash on the server. Nothing is saved on
 * this computer.
 */
import { createInterface } from 'node:readline';
import { must, post } from './lib-api.mjs';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const lines = rl[Symbol.asyncIterator]();
let muted = false;
// Typed characters are echoed through here; muted while a password is typed.
rl._writeToOutput = (text) => {
  if (!muted) process.stdout.write(text);
};

async function ask(question) {
  process.stdout.write(question);
  const { value } = await lines.next();
  return value ?? '';
}

/** Ask without showing what is typed. */
async function askHidden(question) {
  process.stdout.write(question);
  muted = true;
  const { value } = await lines.next();
  muted = false;
  process.stdout.write('\n');
  return value ?? '';
}

const name = (await ask('Your name: ')).trim();
const email = (await ask('Email (you will log in with this): ')).trim();
const phone = (await ask('Phone (10 digits): ')).replace(/\D/g, '').slice(-10);
const password = await askHidden('Password (at least 8 characters, not shown): ');
const again = await askHidden('Password again: ');
rl.close();

if (password !== again) {
  console.error('✗ The two passwords are different. Run it again.');
  process.exit(1);
}
if (password.length < 8) {
  console.error('✗ The password needs at least 8 characters.');
  process.exit(1);
}

must(await post('/admin/add/', { name, email, phone, password }), 'Creating the admin');
console.log(`\n✓ Admin created. Log in at your site's /admin with ${email} and that password.`);
