// backend/routes/auth.js - PostgreSQL Version
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from '../utils/postgres.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const r = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// === Special admin (non persistente richiesto) ===
const SPECIAL_ADMIN_USERNAME = 'admin';
const SPECIAL_ADMIN_PASSWORD = 'laba2025';
function isSpecialAdminLogin(identifier, password) {
  const id = (identifier || '').trim().toLowerCase();
  const pw = (password ?? '').toString().normalize('NFKC').replace(/\u00A0/g, ' ').trim();
  return id === SPECIAL_ADMIN_USERNAME && pw === SPECIAL_ADMIN_PASSWORD;
}
function specialAdminUser() {
  return {
    id: -1,
    email: SPECIAL_ADMIN_USERNAME,
    ruolo: 'admin',
    name: 'LABA',
    surname: 'Admin',
    corso_accademico: null,
  };
}

function signUser(u) {
  const payload = {
    id: u.id,
    email: u.email,
    ruolo: u.ruolo,
    corso_accademico: u.corso_accademico
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/login
r.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password richiesti' });
    }

    // Check special admin first
    if (isSpecialAdminLogin(email, password)) {
      const token = signUser(specialAdminUser());
      return res.json({
        token,
        user: specialAdminUser()
      });
    }

    // Check database users
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.length === 0) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const user = result[0];
    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const token = signUser(user);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        ruolo: user.ruolo,
        corso_accademico: user.corso_accademico
      }
    });
  } catch (error) {
    console.error('Errore login:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// POST /api/auth/register
r.post('/register', async (req, res) => {
  try {
    const { email, password, name, surname, phone, matricola, corso_accademico } = req.body || {};
    
    if (!email || !password || !name || !surname) {
      return res.status(400).json({ error: 'Email, password, nome e cognome richiesti' });
    }

    // Check if user already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Utente già esistente' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const result = await query(`
      INSERT INTO users (email, password_hash, name, surname, phone, matricola, corso_accademico)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, name, surname, ruolo, corso_accademico
    `, [email, hashedPassword, name, surname, phone || null, matricola || null, corso_accademico || null]);

    const user = result[0];
    const token = signUser(user);
    
    res.status(201).json({
      token,
      user
    });
  } catch (error) {
    console.error('Errore registrazione:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET /api/auth/me
r.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

// POST /api/auth/forgot-password
r.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email richiesta' });
    }

    // Check if user exists
    const result = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (result.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Generate reset token
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset request
    await query(`
      INSERT INTO password_reset_requests (email, token, expires_at)
      VALUES ($1, $2, $3)
    `, [email, token, expiresAt]);

    // In a real app, you would send an email here
    console.log(`Password reset token for ${email}: ${token}`);

    res.json({ message: 'Token di reset inviato via email' });
  } catch (error) {
    console.error('Errore forgot password:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// POST /api/auth/reset-password
r.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ error: 'Token e password richiesti' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const email = decoded.email;

    // Check if reset request exists and is valid
    const result = await query(`
      SELECT * FROM password_reset_requests 
      WHERE email = $1 AND token = $2 AND status = 'pending' AND expires_at > NOW()
    `, [email, token]);

    if (result.length === 0) {
      return res.status(400).json({ error: 'Token non valido o scaduto' });
    }

    // Update password
    const hashedPassword = bcrypt.hashSync(password, 10);
    await query('UPDATE users SET password_hash = $1 WHERE email = $2', [hashedPassword, email]);

    // Mark reset request as used
    await query('UPDATE password_reset_requests SET status = $1 WHERE token = $2', ['used', token]);

    res.json({ message: 'Password aggiornata con successo' });
  } catch (error) {
    console.error('Errore reset password:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET /api/auth/password-reset-requests (admin only)
r.get('/password-reset-requests', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await query(`
      SELECT email, token, status, created_at, expires_at
      FROM password_reset_requests
      ORDER BY created_at DESC
    `);
    
    res.json(result);
  } catch (error) {
    console.error('Errore GET password reset requests:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET /api/auth/users - Reindirizza a /api/users (admin only)
r.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id, email, name, surname, phone, matricola, 
        ruolo, corso_accademico, created_at, updated_at
      FROM users 
      ORDER BY created_at DESC
    `);
    
    res.json(result || []);
  } catch (error) {
    console.error('Errore GET auth users:', error);
    res.status(500).json({ error: 'Errore nel caricamento utenti' });
  }
});

export default r;