// backend/routes/corsi.js - PostgreSQL Version
import { Router } from 'express';
import { query } from '../utils/postgres.js';

const r = Router();

// GET /api/corsi
r.get('/', async (req, res) => {
  try {
    const result = await query('SELECT corso FROM corsi ORDER BY corso');
    res.json(result.rows);
  } catch (error) {
    console.error('Errore GET corsi:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

export default r;