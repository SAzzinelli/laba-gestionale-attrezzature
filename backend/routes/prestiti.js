// backend/routes/prestiti.js - PostgreSQL Version
import { Router } from 'express';
import { query } from '../utils/postgres.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const r = Router();

function isAdminUser(u) {
  if (!u) return false;
  if (u.id === -1) return true;
  return (u.ruolo || '').toLowerCase() === 'admin';
}

// GET /api/prestiti
r.get('/', requireAuth, async (req, res) => {
  try {
    const wantAll = (req.query.all === '1' || req.query.all === 'true');
    let result;
    
    if (wantAll) {
      if (!isAdminUser(req.user)) return res.status(403).json({ error: 'Solo admin' });
      result = await query(`
        SELECT p.*, i.nome AS articolo_nome, i.note AS articolo_descrizione, 
               p.chi AS utente_nome
        FROM prestiti p
        LEFT JOIN inventario i ON i.id = p.inventario_id
        ORDER BY p.id DESC
      `);
    } else {
      result = await query(`
        SELECT p.*, i.nome AS articolo_nome, i.note AS articolo_descrizione,
               i.categoria_madre, cs.nome as categoria_figlia
        FROM prestiti p
        LEFT JOIN inventario i ON i.id = p.inventario_id
        LEFT JOIN categorie_semplici cs ON cs.id = i.categoria_id
        WHERE p.chi LIKE $1 OR p.chi = $2
        ORDER BY p.id DESC
      `, [`%${req.user.email}%`, req.user.email]);
    }
    
    res.json(result || []);
  } catch (error) {
    console.error('Errore GET prestiti:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET /api/prestiti/mie
r.get('/mie', requireAuth, async (req, res) => {
  try {
    const result = await query(`
      SELECT p.*, i.nome AS articolo_nome, i.note AS articolo_descrizione,
             i.categoria_madre, cs.nome as categoria_figlia,
             p.data_uscita AS data_inizio, p.data_rientro AS data_fine
      FROM prestiti p
      LEFT JOIN inventario i ON i.id = p.inventario_id
      LEFT JOIN categorie_semplici cs ON cs.id = i.categoria_id
      WHERE p.chi LIKE $1 OR p.chi = $2
      ORDER BY p.id DESC
    `, [`%${req.user.email}%`, req.user.email]);
    
    res.json(result || []);
  } catch (error) {
    console.error('Errore GET mie prestiti:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// POST /api/prestiti (create) — admin only
r.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { inventario_id, chi, data_uscita, data_rientro, note = null } = req.body || {};
    
    if (!inventario_id || !chi || !data_uscita || !data_rientro) {
      return res.status(400).json({ error: 'campi mancanti' });
    }
    
    // Validazione date
    const dataUscita = new Date(data_uscita);
    const dataRientro = new Date(data_rientro);
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    
    if (dataUscita < oggi) {
      return res.status(400).json({ error: 'La data di uscita non può essere nel passato' });
    }
    
    if (dataRientro < dataUscita) {
      return res.status(400).json({ error: 'La data di rientro deve essere successiva alla data di uscita' });
    }
    
    // Verifica che l'oggetto esista
    const inventarioCheck = await query('SELECT id FROM inventario WHERE id = $1', [inventario_id]);
    if (inventarioCheck.length === 0) {
      return res.status(400).json({ error: 'Oggetto non trovato' });
    }
    
    const result = await query(`
      INSERT INTO prestiti (inventario_id, chi, data_uscita, data_rientro, note)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [inventario_id, chi, data_uscita, data_rientro, note]);
    
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Errore POST prestito:', error);
    res.status(400).json({ error: error.message || 'Errore creazione prestito' });
  }
});

// PUT /api/prestiti/:id (update) — admin only
r.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { inventario_id, chi, data_uscita, data_rientro, note = null, stato } = req.body || {};
    
    if (!inventario_id || !chi || !data_uscita || !data_rientro || !stato) {
      return res.status(400).json({ error: 'campi mancanti' });
    }
    
    const result = await query(`
      UPDATE prestiti 
      SET inventario_id = $1, chi = $2, data_uscita = $3, data_rientro = $4, note = $5, stato = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [inventario_id, chi, data_uscita, data_rientro, note, stato, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prestito non trovato' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Errore PUT prestito:', error);
    res.status(400).json({ error: error.message || 'Errore aggiornamento prestito' });
  }
});

// DELETE /api/prestiti/:id (delete) — admin only
r.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM prestiti WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Prestito non trovato' });
    }
    
    res.json({ message: 'Prestito eliminato' });
  } catch (error) {
    console.error('Errore DELETE prestito:', error);
    res.status(400).json({ error: error.message || 'Errore eliminazione prestito' });
  }
});

// PUT /api/prestiti/:id/approva (approve request and create loan) — admin only
r.put('/:id/approva', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    // Update request status to approved
    const requestResult = await query('UPDATE richieste SET stato = $1 WHERE id = $2', ['approvata', id]);
    if (requestResult.rowCount === 0) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }
    
    // Get request details
    const request = await query('SELECT * FROM richieste WHERE id = $1', [id]);
    
    if (request.length === 0) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }
    
    const requestData = request[0];
    
    // Create loan record
    const loanResult = await query(`
      INSERT INTO prestiti (inventario_id, chi, data_uscita, data_rientro, note)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [requestData.inventario_id, `User ${requestData.utente_id}`, requestData.dal, requestData.al, requestData.note]);
    
    res.json({ 
      message: 'Richiesta approvata e prestito creato',
      loanId: loanResult.rows[0].id 
    });
  } catch (error) {
    console.error('Errore PUT approva prestito:', error);
    res.status(400).json({ error: error.message || 'Errore nell\'approvazione' });
  }
});

// PUT /api/prestiti/:id/rifiuta (reject request) — admin only
r.put('/:id/rifiuta', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { motivazione } = req.body || {};
    
    if (!motivazione) {
      return res.status(400).json({ error: 'Motivazione del rifiuto richiesta' });
    }
    
    // Update request status to rejected with reason
    const requestResult = await query(`
      UPDATE richieste 
      SET stato = $1, note = $2 
      WHERE id = $3
    `, ['rifiutata', motivazione, id]);
    
    if (requestResult.rowCount === 0) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }
    
    res.json({ message: 'Richiesta rifiutata' });
  } catch (error) {
    console.error('Errore PUT rifiuta prestito:', error);
    res.status(400).json({ error: error.message || 'Errore nel rifiuto' });
  }
});

// PUT /api/prestiti/:id/restituisci (return loan) — admin only
r.put('/:id/restituisci', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    // Update loan status to returned
    const result = await query(`
      UPDATE prestiti 
      SET stato = 'restituito', data_restituzione = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Prestito non trovato' });
    }
    
    res.json({ message: 'Prestito terminato con successo' });
  } catch (error) {
    console.error('Errore PUT restituisci prestito:', error);
    res.status(400).json({ error: error.message || 'Errore nella restituzione' });
  }
});

export default r;