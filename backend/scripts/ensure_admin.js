// backend/scripts/ensure_admin.js
// Crea o promuove un utente admin in base a variabili d'ambiente.
//   ADMIN_EMAIL=admin@labafirenze.com ADMIN_PASSWORD=SuperSegreta node backend/scripts/ensure_admin.js
// Opzionale: ADMIN_NAME, ADMIN_SURNAME, ADMIN_PHONE, ADMIN_MATRICOLA, ADMIN_RESET=1

import crypto from 'node:crypto';
import db from '../utils/db.js';

const KEYLEN = 64;
const SCRYPT_N = 16384, SCRYPT_r = 8, SCRYPT_p = 1;
function hashPassword(password, salt = crypto.randomBytes(16)) {
  const derivedKey = crypto.scryptSync(password, salt, KEYLEN, { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p });
  return `scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) {
  console.error('ADMIN_EMAIL e ADMIN_PASSWORD sono richiesti');
  process.exit(1);
}

const name = process.env.ADMIN_NAME || 'Admin';
const surname = process.env.ADMIN_SURNAME || '';
const phone = process.env.ADMIN_PHONE || null;
const matricola = process.env.ADMIN_MATRICOLA || null;
const reset = process.env.ADMIN_RESET === '1';

const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
if (!existing) {
  const stmt = db.prepare(`
    INSERT INTO users (name, surname, email, phone, matricola, ruolo, password_hash)
    VALUES (?, ?, ?, ?, ?, 'admin', ?)
  `);
  const info = stmt.run(name, surname, email, phone, matricola, hashPassword(password));
  console.log('Creato admin id', info.lastInsertRowid, 'email', email);
  process.exit(0);
} else {
  db.prepare('UPDATE users SET ruolo = ? WHERE id = ?').run('admin', existing.id);
  if (reset) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), existing.id);
    console.log('Promosso a admin e password reimpostata per', email);
  } else {
    console.log('Promosso a admin (password invariata) per', email);
  }
  process.exit(0);
}
