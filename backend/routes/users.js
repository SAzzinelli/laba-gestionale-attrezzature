// backend/routes/users.js - Gestione utenti
import { Router } from 'express';
import { query } from '../utils/postgres.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

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
    
    res.json(result || []);
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
    
    res.json(result[0]);
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
    
    res.json(result[0]);
  } catch (error) {
    console.error('Errore PUT user:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento utente' });
  }
});

// DELETE /api/users/:id - Elimina utente (solo admin)
r.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Non permettere eliminazione dell'admin speciale
    if (id === '-1' || id === -1) {
      return res.status(400).json({ error: 'Non è possibile eliminare l\'admin principale' });
    }
    
    // Controlla se l'utente ha prestiti attivi
    const activeLoans = await query(`
      SELECT COUNT(*) as count 
      FROM prestiti p 
      WHERE p.chi LIKE $1 AND p.stato = 'attivo'
    `, [`%${id}%`]);
    
    if (activeLoans[0]?.count > 0) {
      return res.status(400).json({ 
        error: 'Impossibile eliminare: utente ha prestiti attivi. Termina prima i prestiti.' 
      });
    }
    
    // Controlla se l'utente ha richieste in attesa
    const pendingRequests = await query(`
      SELECT COUNT(*) as count 
      FROM richieste r 
      WHERE r.utente_id = $1 AND r.stato = 'in_attesa'
    `, [id]);
    
    if (pendingRequests[0]?.count > 0) {
      return res.status(400).json({ 
        error: 'Impossibile eliminare: utente ha richieste in attesa. Gestisci prima le richieste.' 
      });
    }
    
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    
    res.json({ message: 'Utente eliminato con successo' });
  } catch (error) {
    console.error('Errore DELETE user:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione utente' });
  }
});

export default r;
