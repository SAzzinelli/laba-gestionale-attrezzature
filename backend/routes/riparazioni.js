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
    const { inventario_id, unit_id, descrizione, note_tecniche, priorita, stato } = req.body || {};
    
    if (!inventario_id || !unit_id || !descrizione) {
      return res.status(400).json({ error: 'Campi mancanti' });
    }
    
    // Create repair record
    const result = await query(`
      INSERT INTO riparazioni (inventario_id, quantita, stato, note, unit_ids_json, tipo, priorita)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [inventario_id, 1, stato || 'in_corso', `${descrizione}\n\nNote tecniche: ${note_tecniche || 'N/A'}`, JSON.stringify([unit_id]), 'riparazione', priorita || 'media']);
    
    // Mark unit as in repair
    await query(`
      UPDATE inventario_unita 
      SET stato = 'in_riparazione'
      WHERE id = $1
    `, [unit_id]);
    
    console.log(`✅ Unità ${unit_id} marcata come in riparazione`);
    
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
    const { stato } = req.body || {};
    
    if (!stato) {
      return res.status(400).json({ error: 'Stato richiesto' });
    }
    
    // Get current repair to check unit IDs
    const currentRepair = await query('SELECT unit_ids_json FROM riparazioni WHERE id = $1', [id]);
    
    if (currentRepair.length === 0) {
      return res.status(404).json({ error: 'Riparazione non trovata' });
    }
    
    // Update only the status
    const result = await query(`
      UPDATE riparazioni 
      SET stato = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [stato, id]);
    
    // If repair is completed or cancelled, mark units as available again
    if (stato === 'completata' || stato === 'annullata') {
      try {
        const unitIds = JSON.parse(currentRepair[0].unit_ids_json || '[]');
        if (unitIds.length > 0) {
          await query(`
            UPDATE inventario_unita 
            SET stato = 'disponibile'
            WHERE id = ANY($1::int[])
          `, [unitIds]);
          
          const action = stato === 'completata' ? 'completamento' : 'annullamento';
          console.log(`✅ Unità ${unitIds.join(', ')} rimesse disponibili dopo ${action} riparazione`);
        }
      } catch (jsonError) {
        console.warn('⚠️ Errore parsing unit_ids_json:', jsonError.message);
      }
    }
    
    res.json(result[0]);
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