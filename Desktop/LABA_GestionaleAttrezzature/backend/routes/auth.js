// backend/routes/auth.js — HARD-CODED ADMIN SUPPORT
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { verifyCredentials, getByEmail as getUserByEmail, createUser, toClientUser } from '../models/users.js';
import db from '../utils/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const r = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// === Special admin (non persistente richiesto) ===
const SPECIAL_ADMIN_USERNAME = 'admin';
const SPECIAL_ADMIN_PASSWORD = 'laba2025'; // richiesto fisso
function isSpecialAdminLogin(identifier, password) {
  const id = (identifier || '').trim().toLowerCase();
  const pw = (password ?? '').toString().normalize('NFKC').replace(/\u00A0/g, ' ').trim();
  return id === SPECIAL_ADMIN_USERNAME && pw === SPECIAL_ADMIN_PASSWORD;
}
function specialAdminUser() {
  return {
    id: -1, // sentinel per admin speciale
    email: 'admin', // manteniamo 'admin' come identificatore
    ruolo: 'admin',
    name: 'LABA',
    surname: 'Admin',
    corso_accademico: null
  };
}

function signUser(u) {
  const payload = { id: u.id, email: u.email, ruolo: u.ruolo, corso_accademico: u.corso_accademico };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/login
r.post('/login', (req, res) => {
  let { email, username, password } = req.body || {};
  const identifier = (username ?? email ?? '').toString(); // supporta username o email
  // 1) Special admin bypass
  if (isSpecialAdminLogin(identifier, password)) {
    const admin = specialAdminUser();
    const token = signUser(admin);
    return res.json({ token, user: toClientUser(admin) });
  }

  // 2) Utenti normali (DB) — normalizza email
  let cleanEmail = identifier.trim().toLowerCase();
  if (!cleanEmail || !password) return res.status(400).json({ error: 'Email/username e password richieste' });
  const user = verifyCredentials(cleanEmail, password.toString());
  if (!user) return res.status(401).json({ error: 'Credenziali non valide' });
  const token = signUser(user);
  return res.json({ token, user: toClientUser(user) });
});

// Validazione email LABA
function validateLabEmail(email) {
  const cleanEmail = email.trim().toLowerCase();
  const labaDomain = '@labafirenze.com';
  
  if (!cleanEmail.endsWith(labaDomain)) {
    return { valid: false, error: `L'email deve terminare con ${labaDomain}` };
  }
  
  // Estrae nome e cognome dall'email
  const emailPrefix = cleanEmail.replace(labaDomain, '');
  const parts = emailPrefix.split('.');
  
  if (parts.length !== 2) {
    return { valid: false, error: 'Formato email non valido. Usa: nome.cognome@labafirenze.com' };
  }
  
  const [nome, cognome] = parts;
  if (nome.length < 2 || cognome.length < 2) {
    return { valid: false, error: 'Nome e cognome devono essere di almeno 2 caratteri' };
  }
  
  return { valid: true, nome: nome, cognome: cognome };
}

// POST /api/auth/register
r.post('/register', (req, res) => {
  const { email, password, name, surname, matricola, corso_accademico } = req.body || {};
  if (!email || !password || !name || !surname || !matricola || !corso_accademico) {
    return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
  }

  // Normalizza email
  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail.length < 5 || !cleanEmail.includes('@')) {
    return res.status(400).json({ error: 'Email non valida' });
  }

  // Validazione dominio LABA
  const emailValidation = validateLabEmail(cleanEmail);
  if (!emailValidation.valid) {
    return res.status(400).json({ error: emailValidation.error });
  }

  // Verifica che nome e cognome nell'email corrispondano ai campi
  if (emailValidation.nome !== name.toLowerCase().trim() || 
      emailValidation.cognome !== surname.toLowerCase().trim()) {
    return res.status(400).json({ 
      error: 'Nome e cognome nell\'email devono corrispondere ai campi inseriti' 
    });
  }

  // Controlla se esiste già
  const existing = getUserByEmail(cleanEmail);
  if (existing) {
    return res.status(400).json({ error: 'Email già registrata' });
  }

  try {
    const u = createUser({
      name: name.toString().trim(),
      surname: surname.toString().trim(),
      email: cleanEmail,
      matricola: matricola.toString().trim(),
      role: 'user',
      password,
      corso_accademico: corso_accademico.toString().trim()
    });
    const token = signUser(u);
    return res.json({ token, user: toClientUser(u) });
  } catch (e) {
    return res.status(400).json({ error: e.message || 'Errore registrazione' });
  }
});

// GET /api/auth/me — supporta admin speciale (id -1)
r.get('/me', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Non autorizzato' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.id === -1 || (payload.email || '').toLowerCase() === SPECIAL_ADMIN_USERNAME) {
      const admin = specialAdminUser();
      return res.json({ id: admin.id, email: admin.email, ruolo: admin.ruolo, corso_accademico: null, user: toClientUser(admin) });
    }
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
    if (!u) return res.status(401).json({ error: 'Utente non trovato' });
    const user = toClientUser(u);
    return res.json({ id: user.id, email: user.email, ruolo: user.ruolo, corso_accademico: user.corso_accademico, user });
  } catch {
    return res.status(401).json({ error: 'Token non valido' });
  }
});

// GET /api/auth/users - Get all users (admin only)
r.get('/users', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, surname, email, matricola, corso_accademico, phone, ruolo FROM users ORDER BY surname, name').all();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Errore nel caricamento utenti' });
  }
});

// PUT /api/auth/users/:id - Update user (admin only)
r.put('/users/:id', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params;
    const { name, surname, email, matricola, corso_accademico, phone } = req.body;

    // Check if user exists
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Update user
    const stmt = db.prepare(`
      UPDATE users 
      SET name = ?, surname = ?, email = ?, matricola = ?, corso_accademico = ?, phone = ?
      WHERE id = ?
    `);
    
    stmt.run(name, surname, email, matricola, corso_accademico, phone, id);
    
    res.json({ message: 'Utente aggiornato con successo' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento utente' });
  }
});

// PUT /api/auth/users/:id/reset-password - Reset user password (admin only)
r.put('/users/:id/reset-password', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    // Check if user exists
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Hash new password
    const scrypt = require('scrypt');
    const hashedPassword = scrypt.hashSync(newPassword, { N: 16384, r: 8, p: 1 }, 64);

    // Update password
    const stmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    stmt.run(hashedPassword.toString('hex'), id);
    
    res.json({ message: 'Password resettata con successo' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Errore nel reset password' });
  }
});

// DELETE /api/auth/users/:id - Delete user (admin only)
r.delete('/users/:id', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists and is not admin
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    if (user.ruolo === 'admin') {
      return res.status(403).json({ error: 'Non puoi eliminare un amministratore' });
    }

    // Delete user
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    stmt.run(id);
    
    res.json({ message: 'Utente eliminato con successo' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione utente' });
  }
});

// POST /api/auth/forgot-password - Request password reset
r.post('/forgot-password', (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email richiesta' });
    }

    // Check if user exists
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Create password reset request
    const resetRequest = {
      user_id: user.id,
      user_email: user.email,
      user_name: `${user.name} ${user.surname}`,
      requested_at: new Date().toISOString(),
      status: 'pending'
    };

    // Store in database (create table if not exists)
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS password_reset_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          user_email TEXT NOT NULL,
          user_name TEXT NOT NULL,
          requested_at TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      const stmt = db.prepare(`
        INSERT INTO password_reset_requests (user_id, user_email, user_name, requested_at, status)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run(user.id, user.email, `${user.name} ${user.surname}`, resetRequest.requested_at, 'pending');
    } catch (dbError) {
      console.error('Database error:', dbError);
    }

    // Send notification to admin (simulate)
    console.log(`🔔 NOTIFICA ADMIN: Richiesta reset password da ${user.name} ${user.surname} (${user.email})`);
    
    res.json({ 
      message: 'Richiesta inviata con successo. L\'amministratore riceverà una notifica.' 
    });
  } catch (error) {
    console.error('Error processing forgot password:', error);
    res.status(500).json({ error: 'Errore nel processamento della richiesta' });
  }
});

// GET /api/auth/password-reset-requests - Get pending password reset requests (admin only)
r.get('/password-reset-requests', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT prr.*, u.name, u.surname, u.email
      FROM password_reset_requests prr
      LEFT JOIN users u ON u.email = prr.email
      WHERE prr.status = 'pending'
      ORDER BY prr.created_at DESC
    `).all();
    
    res.json(requests);
  } catch (error) {
    console.error('Error fetching password reset requests:', error);
    res.status(500).json({ error: 'Errore nel caricamento delle richieste' });
  }
});

export default r;
