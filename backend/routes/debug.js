// backend/routes/debug.js - Endpoint per debug
import { Router } from 'express';
import { query } from '../utils/postgres.js';

const r = Router();

// GET /api/debug/users - Lista tutti gli utenti
r.get('/users', async (req, res) => {
  try {
    const users = await query('SELECT id, email, name, surname, ruolo FROM users ORDER BY id');
    res.json(users);
  } catch (error) {
    console.error('Errore GET users:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET /api/debug/inventario-schema - Verifica schema tabella inventario
r.get('/inventario-schema', async (req, res) => {
  try {
    const schema = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'inventario' 
      ORDER BY ordinal_position
    `);
    res.json(schema);
  } catch (error) {
    console.error('Errore GET inventario schema:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

export default r;
