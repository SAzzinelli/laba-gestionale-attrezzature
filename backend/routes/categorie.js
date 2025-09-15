// backend/routes/categorie.js - PostgreSQL Version
import { Router } from 'express';
import { query } from '../utils/postgres.js';

const r = Router();

// GET /api/categorie
r.get('/', async (req, res) => {
  try {
    const result = await query('SELECT madre, figlia FROM categorie ORDER BY madre, figlia');
    // Trasforma i dati per il frontend
    const categories = result.map(row => ({
      id: `${row.madre}-${row.figlia}`,
      madre: row.madre,
      figlia: row.figlia,
      nome: `${row.madre} - ${row.figlia}`
    }));
    res.json(categories);
  } catch (error) {
    console.error('Errore GET categorie:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

export default r;