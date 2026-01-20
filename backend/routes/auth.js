// backend/routes/auth.js - PostgreSQL Version
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from '../utils/postgres.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { normalizeUser, normalizeRole } from '../utils/roles.js';

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

function signUser(user) {
  const u = normalizeUser(user);
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

    const user = normalizeUser(result[0]);
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
    const { email, password, name, surname, phone, matricola, corso_accademico, ruolo } = req.body || {};
    
    if (!email || !password || !name || !surname) {
      return res.status(400).json({ error: 'Email, password, nome e cognome richiesti' });
    }

    // Check if user already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Utente già esistente' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const userRole = normalizeRole(ruolo, null, email);
    const storedRole = userRole === 'admin' ? 'supervisor' : userRole;

    const result = await query(`
      INSERT INTO users (email, password_hash, name, surname, phone, matricola, corso_accademico, ruolo)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, email, name, surname, ruolo, corso_accademico
    `, [email, hashedPassword, name, surname, phone || null, matricola || null, corso_accademico || null, storedRole]);

    const user = normalizeUser(result[0]);
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
      SELECT 
        prr.email, 
        prr.token, 
        prr.status, 
        prr.created_at as requested_at, 
        prr.expires_at,
        u.name as user_name,
        u.surname as user_surname,
        u.email as user_email
      FROM password_reset_requests prr
      LEFT JOIN users u ON prr.email = u.email
      WHERE prr.status = 'pending'
      ORDER BY prr.created_at DESC
    `);
    
    res.json(result);
  } catch (error) {
    console.error('Errore GET password reset requests:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// POST /api/auth/admin-reset-password (admin only)
r.post('/admin-reset-password', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email e nuova password sono obbligatorie' });
    }
    
    // Verifica che l'utente esista
    const user = await query('SELECT id, email FROM users WHERE email = $1', [email]);
    if (user.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    
    // Hash della nuova password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    
    // Aggiorna la password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2',
      [hashedPassword, email]
    );
    
    // Marca la richiesta come completata
    await query(
      'UPDATE password_reset_requests SET status = $1 WHERE email = $2',
      ['completed', email]
    );
    
    res.json({ message: 'Password aggiornata con successo' });
  } catch (error) {
    console.error('Errore admin reset password:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// DELETE /api/auth/password-reset-requests/:email (admin only) - Annulla richiesta
r.delete('/password-reset-requests/:email', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { email } = req.params;
    
    // Verifica che la richiesta esista
    const request = await query(
      'SELECT * FROM password_reset_requests WHERE email = $1 AND status = $2',
      [email, 'pending']
    );
    
    if (request.length === 0) {
      return res.status(404).json({ error: 'Richiesta non trovata o già gestita' });
    }
    
    // Marca la richiesta come annullata
    await query(
      'UPDATE password_reset_requests SET status = $1 WHERE email = $2 AND status = $3',
      ['cancelled', email, 'pending']
    );
    
    console.log(`✅ Richiesta reset password annullata per ${email}`);
    
    res.json({ message: 'Richiesta di reset password annullata' });
  } catch (error) {
    console.error('Errore annullamento richiesta reset password:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET /api/auth/users - Reindirizza a /api/users (admin only)
r.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id, email, name, surname, phone, matricola, 
        ruolo, corso_accademico, created_at, updated_at,
        penalty_strikes, is_blocked, blocked_reason, blocked_at
      FROM users 
      ORDER BY created_at DESC
    `);
    
    const normalized = (result || []).map(normalizeUser);
    res.json(normalized);
  } catch (error) {
    console.error('Errore GET auth users:', error);
    res.status(500).json({ error: 'Errore nel caricamento utenti' });
  }
});

export default r;