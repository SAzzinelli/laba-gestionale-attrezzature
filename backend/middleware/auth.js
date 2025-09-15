// backend/middleware/auth.js
import jwt from 'jsonwebtoken';
import { query } from '../utils/postgres.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    
    if (!token) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }
    
    const payload = jwt.verify(token, JWT_SECRET);
    
    if (payload?.id === -1 || (payload?.email || '').toLowerCase() === 'admin') {
      req.user = { id: -1, email: 'admin', ruolo: 'admin', name: 'LABA', surname: 'Admin' };
      return next();
    }
    
    const users = await query('SELECT * FROM users WHERE id = $1', [payload.id]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }
    
    req.user = users[0];
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Non autorizzato' });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Non autorizzato' });
    if (req.user.id === -1) return next(); // special admin bypass
    const ok = (req.user.ruolo || '').toLowerCase() === String(role).toLowerCase();
    if (!ok) return res.status(403).json({ error: 'Solo ' + role });
    next();
  };
}
