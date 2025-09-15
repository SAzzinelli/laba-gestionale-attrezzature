// backend/routes/riparazioni.js - PostgreSQL Version
import { Router } from 'express';
import { query } from '../utils/postgres.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const r = Router();

// GET /api/riparazioni
r.get('/', requireAuth, async (req, res) => {
  try {
    const result = await query(`
      SELECT r.*, i.nome as articolo_nome
      FROM riparazioni r
      LEFT JOIN inventario i ON r.inventario_id = i.id
      ORDER BY r.created_at DESC
    `);
    
    res.json(result || []);
  } catch (error) {
    console.error('Errore GET riparazioni:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// POST /api/riparazioni
r.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { inventario_id, quantita, stato, note, unit_ids_json } = req.body || {};
    
    if (!inventario_id || !stato) {
      return res.status(400).json({ error: 'Campi mancanti' });
    }
    
    const result = await query(`
      INSERT INTO riparazioni (inventario_id, quantita, stato, note, unit_ids_json)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [inventario_id, quantita || 0, stato, note || null, JSON.stringify(unit_ids_json || [])]);
    
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Errore POST riparazione:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// PUT /api/riparazioni/:id
r.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { quantita, stato, note, unit_ids_json } = req.body || {};
    
    const result = await query(`
      UPDATE riparazioni 
      SET quantita = $1, stato = $2, note = $3, unit_ids_json = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [quantita, stato, note, JSON.stringify(unit_ids_json || []), id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Riparazione non trovata' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Errore PUT riparazione:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// DELETE /api/riparazioni/:id
r.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM riparazioni WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Riparazione non trovata' });
    }
    
    res.json({ message: 'Riparazione eliminata' });
  } catch (error) {
    console.error('Errore DELETE riparazione:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

export default r;