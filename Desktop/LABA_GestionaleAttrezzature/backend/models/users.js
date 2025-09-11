// backend/models/users.js
// User model with scrypt password hashing (Node >= 20)
import crypto from 'node:crypto';
import db from '../utils/db.js';

const SCRYPT_N = 16384, SCRYPT_r = 8, SCRYPT_p = 1, KEYLEN = 64;

function hashPassword(password, salt = crypto.randomBytes(16)) {
  const derivedKey = crypto.scryptSync(password, salt, KEYLEN, { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p });
  return `scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.startsWith('scrypt$')) return false;
  const [, saltHex, keyHex] = stored.split('$');
  const salt = Buffer.from(saltHex, 'hex');
  const derivedKey = crypto.scryptSync(password, salt, KEYLEN, { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p });
  return crypto.timingSafeEqual(Buffer.from(keyHex, 'hex'), derivedKey);
}

export function toClientUser(u) {
  if (!u) return null;
  const { password_hash, ...rest } = u;
  return rest;
}

export function getById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function getByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

export function createUser({ name=null, surname=null, email, phone=null, matricola=null, role='user', password, corso_accademico=null }) {
  if (!email || !password) throw new Error('Email e password richieste');
  const exists = getByEmail(email);
  if (exists) throw new Error('Email già registrata');
  const password_hash = hashPassword(password);
  const stmt = db.prepare(`
    INSERT INTO users (name, surname, email, phone, matricola, ruolo, password_hash, corso_accademico)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(name, surname, email, phone, matricola, role, password_hash, corso_accademico);
  return getById(info.lastInsertRowid);
}

export function verifyCredentials(email, password) {
  const u = getByEmail(email);
  if (!u) return null;
  if (!verifyPassword(password, u.password_hash)) return null;
  return u;
}

export function updateUserCourse(userId, corso_accademico) {
  db.prepare('UPDATE users SET corso_accademico = ? WHERE id = ?').run(corso_accademico, userId);
  return getById(userId);
}

export default {
  toClientUser,
  getById,
  getByEmail,
  createUser,
  verifyCredentials,
  updateUserCourse
};
