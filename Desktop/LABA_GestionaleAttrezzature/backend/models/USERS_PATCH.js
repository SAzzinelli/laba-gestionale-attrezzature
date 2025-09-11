// PATCH: backend/models/users.js (only the two functions below need to replace your current ones)
export function getByEmail(email) {
  // lookup email case-insensitively and ignore accidental spaces
  const norm = (email || '').trim().toLowerCase();
  return db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(norm);
}

export function createUser({ name=null, surname=null, email, phone=null, matricola=null, role='user', password, corso_accademico=null }) {
  if (!email || !password) throw new Error('Email e password richieste');
  const normEmail = email.trim().toLowerCase();
  const exists = getByEmail(normEmail);
  if (exists) throw new Error('Email già registrata');
  const password_hash = hashPassword(password);
  const stmt = db.prepare(`
    INSERT INTO users (name, surname, email, phone, matricola, ruolo, password_hash, corso_accademico)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(name, surname, normEmail, phone, matricola, role, password_hash, corso_accademico);
  return getById(info.lastInsertRowid);
}
