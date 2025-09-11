// backend/middleware/auth.js
import jwt from 'jsonwebtoken';
import db from '../utils/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getUserFromToken(token) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload?.id === -1 || (payload?.email || '').toLowerCase() === 'admin') {
      return { id: -1, email: 'admin', ruolo: 'admin', name: 'LABA', surname: 'Admin' };
    }
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
    if (!u) return null;
    return u;
  } catch {
    return null;
  }
}

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const u = getUserFromToken(token);
  if (!u) return res.status(401).json({ error: 'Non autorizzato' });
  req.user = u;
  next();
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
