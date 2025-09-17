// backend/routes/richieste.js - PostgreSQL Version
import { Router } from 'express';
import { query } from '../utils/postgres.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const r = Router();

// GET /api/richieste
r.get('/', requireAuth, async (req, res) => {
  try {
    const wantAll = (req.query.all === '1' || req.query.all === 'true');
    let result;
    
    if (wantAll) {
      if (req.user.ruolo !== 'admin') {
        return res.status(403).json({ error: 'Solo admin' });
      }
      result = await query(`
        SELECT r.*, 
               u.name as utente_nome, u.surname as utente_cognome, u.email as utente_email, 
               i.nome as oggetto_nome, i.nome as articolo_nome
        FROM richieste r
        LEFT JOIN users u ON r.utente_id = u.id
        LEFT JOIN inventario i ON r.inventario_id = i.id
        ORDER BY r.created_at DESC
      `);
    } else {
      result = await query(`
        SELECT r.*, i.nome as oggetto_nome, i.nome as articolo_nome
        FROM richieste r
        LEFT JOIN inventario i ON r.inventario_id = i.id
        WHERE r.utente_id = $1
        ORDER BY r.created_at DESC
      `, [req.user.id]);
    }
    
    res.json(result || []);
  } catch (error) {
    console.error('Errore GET richieste:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET /api/richieste/mie
r.get('/mie', requireAuth, async (req, res) => {
  try {
    const result = await query(`
      SELECT r.*, i.nome as oggetto_nome, i.nome as articolo_nome
      FROM richieste r
      LEFT JOIN inventario i ON r.inventario_id = i.id
      WHERE r.utente_id = $1
      ORDER BY r.created_at DESC
    `, [req.user.id]);
    
    res.json(result || []);
  } catch (error) {
    console.error('Errore GET mie richieste:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// POST /api/richieste
r.post('/', requireAuth, async (req, res) => {
  try {
    const { unit_id, inventario_id, dal, al, motivo, note } = req.body || {};
    
    // Support both unit_id (new) and inventario_id (legacy)
    let actualInventarioId = inventario_id;
    
    if (unit_id) {
      // Get inventario_id from unit
      const unitResult = await query('SELECT inventario_id FROM inventario_unita WHERE id = $1 AND stato = $2 AND prestito_corrente_id IS NULL', [unit_id, 'disponibile']);
      if (unitResult.length === 0) {
        return res.status(400).json({ error: 'Unità non disponibile o non trovata' });
      }
      actualInventarioId = unitResult[0].inventario_id;
    }
    
    if (!actualInventarioId || !dal || !al) {
      return res.status(400).json({ error: 'Campi mancanti' });
    }
    
    // Validazione date
    const dataInizio = new Date(dal);
    const dataFine = new Date(al);
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0); // Reset ore per confronto solo date
    
    if (dataInizio < oggi) {
      return res.status(400).json({ error: 'La data di inizio non può essere nel passato' });
    }
    
    if (dataFine < dataInizio) {
      return res.status(400).json({ error: 'La data di fine deve essere successiva alla data di inizio' });
    }
    
    // Verifica che l'oggetto esista
    const inventarioCheck = await query('SELECT id FROM inventario WHERE id = $1', [actualInventarioId]);
    if (inventarioCheck.length === 0) {
      return res.status(400).json({ error: 'Oggetto non trovato' });
    }
    
    const result = await query(`
      INSERT INTO richieste (utente_id, inventario_id, dal, al, motivo, note, unit_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [req.user.id, actualInventarioId, dal, al, motivo || null, note || null, unit_id || null]);
    
    // Se è stata specificata un'unità, riservala
    if (unit_id) {
      await query(`
        UPDATE inventario_unita 
        SET stato = 'riservato', richiesta_riservata_id = $1
        WHERE id = $2
      `, [result[0].id, unit_id]);
      
      console.log(`✅ Unità ${unit_id} riservata per richiesta ${result[0].id}`);
    }
    
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Errore POST richiesta:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// PUT /api/richieste/:id
r.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { stato, motivo, note } = req.body || {};
    
    const result = await query(`
      UPDATE richieste 
      SET stato = $1, motivo = $2, note = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [stato, motivo, note, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Errore PUT richiesta:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// DELETE /api/richieste/:id
r.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user owns the request or is admin
    const checkResult = await query('SELECT utente_id FROM richieste WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }
    
    if (checkResult.rows[0].utente_id !== req.user.id && req.user.ruolo !== 'admin') {
      return res.status(403).json({ error: 'Non autorizzato' });
    }
    
    const result = await query('DELETE FROM richieste WHERE id = $1', [id]);
    res.json({ message: 'Richiesta eliminata' });
  } catch (error) {
    console.error('Errore DELETE richiesta:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

export default r;