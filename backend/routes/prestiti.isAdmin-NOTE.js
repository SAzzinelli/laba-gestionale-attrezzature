// backend/routes/prestiti.js — update isAdmin for special admin id -1
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import db from '../utils/db.js';

const r = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getPayload(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

function isAdmin(userId) {
  if (userId === -1) return true; // special admin
  const row = db.prepare('SELECT ruolo FROM users WHERE id = ?').get(userId);
  return !!row && (row.ruolo === 'admin' || row.ruolo === 'ADMIN');
}

// ... resto identico alla tua versione precedente ...
export default r;
