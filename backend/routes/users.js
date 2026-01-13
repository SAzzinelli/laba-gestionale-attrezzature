// backend/routes/users.js - Gestione utenti
import { Router } from 'express';
import { query } from '../utils/postgres.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { normalizeUser } from '../utils/roles.js';

const r = Router();

// GET /api/users - Lista utenti (solo admin)
r.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id, email, name, surname, phone, matricola, 
        ruolo, corso_accademico, created_at, updated_at
      FROM users 
      ORDER BY created_at DESC
    `);
    
    const normalized = (result || []).map(normalizeUser);
    res.json(normalized);
  } catch (error) {
    console.error('Errore GET users:', error);
    res.status(500).json({ error: 'Errore nel caricamento utenti' });
  }
});

// GET /api/users/:id - Dettaglio utente (solo admin)
r.get('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT 
        id, email, name, surname, phone, matricola, 
        ruolo, corso_accademico, created_at, updated_at
      FROM users 
      WHERE id = $1
    `, [id]);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    
    res.json(normalizeUser(result[0]));
  } catch (error) {
    console.error('Errore GET user:', error);
    res.status(500).json({ error: 'Errore nel caricamento utente' });
  }
});

// PUT /api/users/:id - Aggiorna utente (solo admin)
r.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, surname, phone, matricola, ruolo, corso_accademico } = req.body || {};
    
    const result = await query(`
      UPDATE users 
      SET name = $1, surname = $2, phone = $3, matricola = $4, 
          ruolo = $5, corso_accademico = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING id, email, name, surname, phone, matricola, ruolo, corso_accademico
    `, [name, surname, phone, matricola, ruolo, corso_accademico, id]);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    
    res.json(normalizeUser(result[0]));
  } catch (error) {
    console.error('Errore PUT user:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento utente' });
  }
});

// DELETE /api/users/:id - Elimina utente (solo admin)
r.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);
    
    // Verifica che l'ID sia valido
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID utente non valido' });
    }
    
    // Non permettere eliminazione dell'admin speciale
    if (userId === -1) {
      return res.status(400).json({ error: 'Non è possibile eliminare l\'admin principale' });
    }
    
    // Prima ottengo i dati dell'utente
    const userResult = await query('SELECT email, ruolo, name, surname FROM users WHERE id = $1', [userId]);
    if (userResult.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    const { email: userEmail, ruolo: targetRole, name: userName, surname: userSurname } = userResult[0];

    const requesterRole = (req.user?.ruolo || '').toLowerCase();
    const isSupervisor = requesterRole === 'supervisor';
    const targetIsAdmin = (targetRole || '').toLowerCase() === 'admin';

    if (isSupervisor && targetIsAdmin) {
      return res.status(403).json({ error: 'I supervisori non possono eliminare l\'admin di sistema' });
    }

    // Controlla se l'utente ha prestiti attivi
    // Verifica sia tramite il campo 'chi' che tramite le richieste collegate
    const fullName = `${userName} ${userSurname}`.trim();
    const activeLoans = await query(`
      SELECT COUNT(*)::int as count 
      FROM prestiti p 
      LEFT JOIN richieste r ON r.id = p.richiesta_id
      WHERE p.stato = 'attivo'
      AND (
        -- Controllo tramite campo chi (nome/email)
        p.chi = $1 OR 
        p.chi = $2 OR 
        p.chi LIKE $3 OR 
        p.chi LIKE $4 OR
        (p.chi LIKE $5 AND p.chi LIKE $6)
        OR
        -- Controllo tramite richiesta collegata
        r.utente_id = $7
      )
    `, [
      userEmail,
      fullName,
      `%${userEmail}%`,
      `%${fullName}%`,
      `%${userName}%`,
      `%${userSurname}%`,
      userId
    ]);
    
    if (activeLoans[0]?.count > 0) {
      return res.status(400).json({ 
        error: 'Impossibile eliminare: utente ha prestiti attivi. Termina prima i prestiti.' 
      });
    }
    
    // Controlla se l'utente ha richieste in attesa o approvate
    const pendingRequests = await query(`
      SELECT COUNT(*)::int as count 
      FROM richieste r 
      WHERE r.utente_id = $1 AND r.stato IN ('in_attesa', 'approvata')
    `, [userId]);
    
    if (pendingRequests[0]?.count > 0) {
      return res.status(400).json({ 
        error: 'Impossibile eliminare: utente ha richieste in attesa o approvate. Gestisci prima le richieste.' 
      });
    }
    
    // Controlla se l'utente ha segnalazioni aperte
    const openReports = await query(`
      SELECT COUNT(*)::int as count 
      FROM segnalazioni s 
      WHERE s.user_id = $1 AND s.stato = 'aperta'
    `, [userId]);
    
    if (openReports[0]?.count > 0) {
      return res.status(400).json({ 
        error: 'Impossibile eliminare: utente ha segnalazioni aperte. Gestisci prima le segnalazioni.' 
      });
    }
    
    // Elimina prima i riferimenti nelle tabelle correlate (se necessario)
    // Le penalità hanno ON DELETE CASCADE, quindi vengono eliminate automaticamente
    
    // Elimina le richieste completate/rifiutate dell'utente
    await query('DELETE FROM richieste WHERE utente_id = $1', [userId]);
    
    // Elimina le segnalazioni chiuse dell'utente
    await query('DELETE FROM segnalazioni WHERE user_id = $1 AND stato != \'aperta\'', [userId]);
    
    // Elimina l'utente
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    
    res.json({ message: 'Utente eliminato con successo' });
  } catch (error) {
    console.error('Errore DELETE user:', error);
    console.error('Stack:', error.stack);
    
    // Gestisci errori specifici di foreign key constraint
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({ 
        error: 'Impossibile eliminare: l\'utente ha ancora riferimenti attivi nel sistema. Verifica prestiti, richieste o segnalazioni.' 
      });
    }
    
    res.status(500).json({ 
      error: error.message || 'Errore nell\'eliminazione utente',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default r;
