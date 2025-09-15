// backend/routes/corsi.js - PostgreSQL Version
import { Router } from 'express';
import { query } from '../utils/postgres.js';

const r = Router();

// GET /api/corsi
r.get('/', async (req, res) => {
  try {
    const result = await query('SELECT corso FROM corsi ORDER BY corso');
    
    // Trasforma i dati per il frontend
    const courses = result.map(row => ({
      id: row.corso, // Usa il nome del corso come ID
      nome: row.corso
    }));
    
    res.json(courses);
  } catch (error) {
    console.error('Errore GET corsi:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

export default r;