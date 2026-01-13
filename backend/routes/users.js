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
    // IMPORTANTE: Solo prestiti con stato esattamente 'attivo' sono considerati attivi
    // Gli stati 'restituito', 'completato', NULL o vuoti NON sono considerati attivi
    const fullName = `${userName} ${userSurname}`.trim();
    
    console.log(`[DELETE USER] Valori di ricerca:`, {
      userId,
      userEmail,
      userName,
      userSurname,
      fullName,
      searchPatterns: {
        exactEmail: userEmail,
        exactFullName: fullName,
        likeEmail: `%${userEmail}%`,
        likeFullName: `%${fullName}%`,
        likeName: `%${userName}%`,
        likeSurname: `%${userSurname}%`
      }
    });
    
    // Prima verifica tutti i prestiti dell'utente per debug
    const allUserLoans = await query(`
      SELECT p.id, p.stato, p.chi, p.data_uscita, p.data_rientro, r.utente_id as richiesta_utente_id
      FROM prestiti p 
      LEFT JOIN richieste r ON r.id = p.richiesta_id
      WHERE (
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
    
    console.log(`[DELETE USER] Prestiti trovati per utente ${userId} (${userEmail}):`, allUserLoans);
    
    // Conta solo i prestiti con stato esattamente 'attivo' (case-insensitive)
    const activeLoansDetails = await query(`
      SELECT p.id, p.stato, p.chi, p.data_uscita, p.data_rientro, r.utente_id as richiesta_utente_id, r.stato as richiesta_stato
      FROM prestiti p 
      LEFT JOIN richieste r ON r.id = p.richiesta_id
      WHERE LOWER(TRIM(COALESCE(p.stato, ''))) = 'attivo'
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
    
    console.log(`[DELETE USER] Prestiti attivi trovati: ${activeLoansDetails.length}`);
    console.log(`[DELETE USER] Dettagli prestiti attivi:`, JSON.stringify(activeLoansDetails, null, 2));
    
    const activeLoansCount = activeLoansDetails.length;
    
    if (activeLoansCount > 0) {
      console.log(`[DELETE USER] BLOCCATO: Prestiti attivi trovati`);
      return res.status(400).json({ 
        error: 'Impossibile eliminare: utente ha prestiti attivi. Termina prima i prestiti.',
        details: activeLoansDetails
      });
    }
    
    // Controlla se l'utente ha richieste in attesa o approvate CON prestiti ancora attivi
    // Una richiesta "approvata" con prestito già "restituito" o "completato" NON blocca l'eliminazione
    const pendingRequests = await query(`
      SELECT r.id, r.stato, p.id as prestito_id, p.stato as prestito_stato
      FROM richieste r 
      LEFT JOIN prestiti p ON p.richiesta_id = r.id
      WHERE r.utente_id = $1 
      AND (
        -- Richieste in attesa bloccano sempre
        r.stato = 'in_attesa'
        OR
        -- Richieste approvate bloccano solo se non hanno prestito o se il prestito è ancora attivo
        (r.stato = 'approvata' AND (p.id IS NULL OR LOWER(TRIM(COALESCE(p.stato, ''))) = 'attivo'))
      )
    `, [userId]);
    
    console.log(`[DELETE USER] Richieste in attesa/approvate (con prestiti attivi) trovate:`, pendingRequests);
    
    if (pendingRequests.length > 0) {
      console.log(`[DELETE USER] BLOCCATO: Richieste in attesa/approvate trovate`);
      return res.status(400).json({ 
        error: 'Impossibile eliminare: utente ha richieste in attesa o approvate con prestiti ancora attivi. Gestisci prima le richieste.' 
      });
    }
    
    // Controlla se l'utente ha segnalazioni aperte
    const openReports = await query(`
      SELECT id, stato 
      FROM segnalazioni s 
      WHERE s.user_id = $1 AND s.stato = 'aperta'
    `, [userId]);
    
    console.log(`[DELETE USER] Segnalazioni aperte trovate:`, openReports);
    
    if (openReports.length > 0) {
      console.log(`[DELETE USER] BLOCCATO: Segnalazioni aperte trovate`);
      return res.status(400).json({ 
        error: 'Impossibile eliminare: utente ha segnalazioni aperte. Gestisci prima le segnalazioni.' 
      });
    }
    
    console.log(`[DELETE USER] Tutti i controlli superati, procedendo con l'eliminazione...`);
    
    // Elimina prima i riferimenti nelle tabelle correlate (se necessario)
    // Le penalità hanno ON DELETE CASCADE, quindi vengono eliminate automaticamente
    
    // IMPORTANTE: Ordine di eliminazione per rispettare i vincoli di foreign key
    // 1. Prima elimina i prestiti completati/restituiti dell'utente che referenziano le richieste
    console.log(`[DELETE USER] Eliminazione prestiti completati/restituiti che referenziano richieste...`);
    await query(`
      DELETE FROM prestiti 
      WHERE LOWER(TRIM(COALESCE(stato, ''))) != 'attivo'
      AND richiesta_id IN (SELECT id FROM richieste WHERE utente_id = $1)
    `, [userId]);
    
    // 2. Poi elimina gli altri prestiti completati/restituiti dell'utente (non referenziati da richieste)
    console.log(`[DELETE USER] Eliminazione altri prestiti completati/restituiti...`);
    await query(`
      DELETE FROM prestiti 
      WHERE LOWER(TRIM(COALESCE(stato, ''))) != 'attivo'
      AND (
        chi = $1 OR 
        chi = $2 OR 
        chi LIKE $3 OR 
        chi LIKE $4 OR
        (chi LIKE $5 AND chi LIKE $6)
      )
    `, [
      userEmail,
      fullName,
      `%${userEmail}%`,
      `%${fullName}%`,
      `%${userName}%`,
      `%${userSurname}%`
    ]);
    
    // 3. Rimuovi i riferimenti alle richieste dai prestiti rimanenti (se ce ne sono)
    console.log(`[DELETE USER] Rimozione riferimenti richieste dai prestiti rimanenti...`);
    await query(`
      UPDATE prestiti 
      SET richiesta_id = NULL 
      WHERE richiesta_id IN (SELECT id FROM richieste WHERE utente_id = $1)
    `, [userId]);
    
    // 4. Elimina le richieste completate/rifiutate dell'utente (ora che i prestiti non le referenziano più)
    console.log(`[DELETE USER] Eliminazione richieste...`);
    await query('DELETE FROM richieste WHERE utente_id = $1', [userId]);
    
    // 4. Elimina le segnalazioni chiuse dell'utente
    console.log(`[DELETE USER] Eliminazione segnalazioni chiuse...`);
    await query('DELETE FROM segnalazioni WHERE user_id = $1 AND stato != \'aperta\'', [userId]);
    
    // 5. Elimina l'utente
    console.log(`[DELETE USER] Eliminazione utente...`);
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
