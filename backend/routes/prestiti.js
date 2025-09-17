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
               u.name AS utente_nome, u.surname AS utente_cognome, u.email AS utente_email,
               r.dal, r.al, r.note AS richiesta_note
        FROM prestiti p
        LEFT JOIN inventario i ON i.id = p.inventario_id
        LEFT JOIN users u ON (p.chi = (u.name || ' ' || u.surname) OR p.chi LIKE '%' || u.email || '%' OR p.chi = u.email)
        LEFT JOIN richieste r ON r.id = p.richiesta_id
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
      LEFT JOIN richieste r ON r.id = p.richiesta_id
      WHERE r.utente_id = $1 OR p.chi LIKE $2 OR p.chi = $3
      ORDER BY p.id DESC
    `, [req.user.id, `%${req.user.email}%`, req.user.email]);
    
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
    const requestResult = await query('UPDATE richieste SET stato = $1 WHERE id = $2 RETURNING id', ['approvata', id]);
    if (requestResult.length === 0) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }
    
    // Get request details with user info
    const request = await query(`
      SELECT r.*, u.name, u.surname, u.email 
      FROM richieste r 
      LEFT JOIN users u ON r.utente_id = u.id 
      WHERE r.id = $1
    `, [id]);
    
    if (request.length === 0) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }
    
    const requestData = request[0];
    const userFullName = `${requestData.name} ${requestData.surname}`.trim() || requestData.email;
    
    // Create loan record
    const loanResult = await query(`
      INSERT INTO prestiti (inventario_id, chi, data_uscita, data_rientro, note, richiesta_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [requestData.inventario_id, userFullName, requestData.dal, requestData.al, requestData.note, id]);
    
    // Update inventory units status to 'prestato'
    if (requestData.unit_id) {
      // Se c'è un'unità specifica riservata, marcala come prestata
      await query(`
        UPDATE inventario_unita 
        SET stato = 'prestato', richiesta_riservata_id = NULL
        WHERE id = $1 AND richiesta_riservata_id = $2
      `, [requestData.unit_id, id]);
    } else {
      // Altrimenti marca le prime unità disponibili come prestate
      await query(`
        UPDATE inventario_unita 
        SET stato = 'prestato' 
        WHERE inventario_id = $1 
        AND stato = 'disponibile' 
        AND id IN (
          SELECT id FROM inventario_unita 
          WHERE inventario_id = $1 AND stato = 'disponibile' 
          LIMIT $2
        )
      `, [requestData.inventario_id, requestData.quantita || 1]);
    }
    
    res.json({ 
      message: 'Richiesta approvata e prestito creato',
      loanId: loanResult[0].id 
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
    
    // Get request details to free reserved units
    const request = await query('SELECT unit_id FROM richieste WHERE id = $1', [id]);
    
    // Update request status to rejected with reason
    const requestResult = await query(`
      UPDATE richieste 
      SET stato = $1, note = $2 
      WHERE id = $3
    `, ['rifiutata', motivazione, id]);
    
    if (requestResult.rowCount === 0) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }
    
    // Free reserved unit if exists
    if (request.length > 0 && request[0].unit_id) {
      await query(`
        UPDATE inventario_unita 
        SET stato = 'disponibile', richiesta_riservata_id = NULL
        WHERE id = $1 AND richiesta_riservata_id = $2
      `, [request[0].unit_id, id]);
      
      console.log(`✅ Unità ${request[0].unit_id} liberata dopo rifiuto richiesta ${id}`);
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
    
    // Get loan details first
    const loanDetails = await query('SELECT inventario_id FROM prestiti WHERE id = $1', [id]);
    
    if (loanDetails.length === 0) {
      return res.status(404).json({ error: 'Prestito non trovato' });
    }
    
    // Update loan status to returned
    const result = await query(`
      UPDATE prestiti 
      SET stato = 'restituito', data_rientro = CURRENT_DATE 
      WHERE id = $1
    `, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Prestito non trovato' });
    }
    
    // Set inventory units back to available
    await query(`
      UPDATE inventario_unita 
      SET stato = 'disponibile' 
      WHERE inventario_id = $1 AND stato = 'prestato'
    `, [loanDetails[0].inventario_id]);
    
    res.json({ message: 'Prestito terminato con successo' });
  } catch (error) {
    console.error('Errore PUT restituisci prestito:', error);
    res.status(400).json({ error: error.message || 'Errore nella restituzione' });
  }
});

// GET /api/prestiti/unit/:unitId (get loan details for specific unit) — admin only
r.get('/unit/:unitId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { unitId } = req.params;
    
    // Get loan details for the specific unit
    const result = await query(`
      SELECT p.*, u.name AS utente_nome, u.surname AS utente_cognome, u.email AS utente_email,
             i.nome AS articolo_nome, iu.codice_univoco
      FROM prestiti p
      LEFT JOIN users u ON (p.chi LIKE '%' || u.email || '%' OR p.chi = u.email)
      LEFT JOIN inventario i ON p.inventario_id = i.id
      LEFT JOIN inventario_unita iu ON iu.inventario_id = p.inventario_id
      WHERE iu.id = $1 AND iu.stato = 'prestato' AND p.stato = 'attivo'
      LIMIT 1
    `, [unitId]);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Prestito non trovato per questa unità' });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Errore GET unit loan details:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET /api/prestiti/:loanId/units (get units for specific loan) — user only
r.get('/:loanId/units', requireAuth, async (req, res) => {
  try {
    const { loanId } = req.params;
    
    // Get loan details first to verify ownership
    const loan = await query(`
      SELECT p.*, u.email 
      FROM prestiti p
      LEFT JOIN users u ON (p.chi = (u.name || ' ' || u.surname) OR p.chi LIKE '%' || u.email || '%' OR p.chi = u.email)
      WHERE p.id = $1
    `, [loanId]);
    
    if (loan.length === 0) {
      return res.status(404).json({ error: 'Prestito non trovato' });
    }
    
    // Verify user owns this loan
    if (loan[0].email !== req.user.email) {
      return res.status(403).json({ error: 'Non autorizzato per questo prestito' });
    }
    
    // Get units that are currently loaned for this specific loan
    // For now, we'll get units that are 'prestato' for this inventory item
    const units = await query(`
      SELECT iu.*, i.nome as item_name
      FROM inventario_unita iu
      LEFT JOIN inventario i ON i.id = iu.inventario_id
      WHERE iu.inventario_id = $1 AND iu.stato = 'prestato'
      ORDER BY iu.codice_univoco
    `, [loan[0].inventario_id]);
    
    res.json(units);
  } catch (error) {
    console.error('Errore GET loan units:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

export default r;