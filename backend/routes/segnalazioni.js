// backend/routes/segnalazioni.js - PostgreSQL Version
import { Router } from 'express';
import { query } from '../utils/postgres.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const r = Router();

// GET /api/segnalazioni
r.get('/', requireAuth, async (req, res) => {
  try {
    const result = await query(`
      SELECT s.*, u.name as user_name, u.email as user_email,
             p.id as prestito_id, i.nome as inventario_nome
      FROM segnalazioni s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN prestiti p ON s.prestito_id = p.id
      LEFT JOIN inventario i ON s.inventario_id = i.id
      ORDER BY s.created_at DESC
    `);
    
    res.json(result || []);
  } catch (error) {
    console.error('Errore GET segnalazioni:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// POST /api/segnalazioni
r.post('/', requireAuth, async (req, res) => {
  try {
    const { prestito_id, inventario_id, tipo, messaggio } = req.body || {};
    
    if (!tipo) {
      return res.status(400).json({ error: 'Tipo segnalazione richiesto' });
    }
    
    const result = await query(`
      INSERT INTO segnalazioni (user_id, prestito_id, inventario_id, tipo, messaggio)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [req.user.id, prestito_id || null, inventario_id || null, tipo, messaggio || null]);
    
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Errore POST segnalazione:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// PUT /api/segnalazioni/:id
r.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { stato, handled_by } = req.body || {};
    
    const result = await query(`
      UPDATE segnalazioni 
      SET stato = $1, handled_by = $2, handled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [stato, handled_by || req.user.id, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Segnalazione non trovata' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Errore PUT segnalazione:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// DELETE /api/segnalazioni/:id
r.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM segnalazioni WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Segnalazione non trovata' });
    }
    
    res.json({ message: 'Segnalazione eliminata' });
  } catch (error) {
    console.error('Errore DELETE segnalazione:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

export default r;