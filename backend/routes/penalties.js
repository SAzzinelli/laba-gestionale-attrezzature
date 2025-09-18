import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { pool } from '../utils/postgres.js';

const router = Router();

// Funzione per calcolare i giorni di ritardo
const calculateDelayDays = (dataRientro, dataRestituzione = new Date()) => {
  const rientroDate = new Date(dataRientro);
  const restituzioneDate = new Date(dataRestituzione);
  
  // Se è stato restituito in tempo, nessun ritardo
  if (restituzioneDate <= rientroDate) {
    return 0;
  }
  
  // Calcola i giorni di ritardo
  const diffTime = restituzioneDate - rientroDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Funzione per calcolare gli strike basati sui giorni di ritardo
const calculateStrikes = (delayDays) => {
  if (delayDays <= 0) return 0;
  if (delayDays <= 3) return 1;  // 1-3 giorni = 1 strike
  if (delayDays <= 7) return 2;  // 4-7 giorni = 2 strike
  return 3;  // 8+ giorni = 3 strike (blocco immediato)
};

// Funzione per assegnare penalità a un utente
const assignPenalty = async (userId, prestitoId, delayDays, createdBy = null) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const strikes = calculateStrikes(delayDays);
    const motivo = `Ritardo di ${delayDays} giorno/i nella restituzione`;
    
    // Inserisci la penalità dettagliata
    await client.query(
      `INSERT INTO user_penalties (user_id, prestito_id, tipo, giorni_ritardo, strike_assegnati, motivo, created_by)
       VALUES ($1, $2, 'ritardo', $3, $4, $5, $6)`,
      [userId, prestitoId, delayDays, strikes, motivo, createdBy]
    );
    
    // Aggiorna i strike totali dell'utente
    const result = await client.query(
      `UPDATE users 
       SET penalty_strikes = penalty_strikes + $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING penalty_strikes`,
      [strikes, userId]
    );
    
    const totalStrikes = result.rows[0].penalty_strikes;
    
    // Se ha raggiunto 3 strike, blocca l'utente
    if (totalStrikes >= 3) {
      await client.query(
        `UPDATE users 
         SET is_blocked = TRUE,
             blocked_reason = 'Utente bloccato per aver accumulato 3 o più penalità per ritardi',
             blocked_at = CURRENT_TIMESTAMP,
             blocked_by = $1
         WHERE id = $2`,
        [createdBy, userId]
      );
    }
    
    await client.query('COMMIT');
    
    return {
      strikesAssigned: strikes,
      totalStrikes: totalStrikes,
      isBlocked: totalStrikes >= 3,
      motivo: motivo
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// GET /api/penalties/user/:userId - Ottieni penalità di un utente
router.get('/user/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verifica che l'utente possa vedere queste informazioni
    if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }
    
    const penalties = await pool.query(
      `SELECT p.*, pr.inventario_id, pr.data_uscita, pr.data_rientro, pr.chi,
              i.nome as articolo_nome,
              creator.name as created_by_name, creator.surname as created_by_surname
       FROM user_penalties p
       JOIN prestiti pr ON p.prestito_id = pr.id
       JOIN inventario i ON pr.inventario_id = i.id
       LEFT JOIN users creator ON p.created_by = creator.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId]
    );
    
    const userInfo = await pool.query(
      `SELECT penalty_strikes, is_blocked, blocked_reason, blocked_at, blocked_by
       FROM users WHERE id = $1`,
      [userId]
    );
    
    res.json({
      penalties: penalties.rows,
      userInfo: userInfo.rows[0] || {}
    });
    
  } catch (error) {
    console.error('Errore nel recupero penalità:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// POST /api/penalties/assign - Assegna penalità manualmente (solo admin)
router.post('/assign', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { userId, prestitoId, delayDays } = req.body;
    
    if (!userId || !prestitoId || delayDays === undefined) {
      return res.status(400).json({ error: 'Parametri mancanti' });
    }
    
    const result = await assignPenalty(userId, prestitoId, delayDays, req.user.id);
    
    res.json({
      message: 'Penalità assegnata con successo',
      ...result
    });
    
  } catch (error) {
    console.error('Errore nell\'assegnazione penalità:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// POST /api/penalties/check-and-assign - Controlla e assegna penalità automaticamente
router.post('/check-and-assign', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { prestitoId } = req.body;
    
    if (!prestitoId) {
      return res.status(400).json({ error: 'ID prestito mancante' });
    }
    
    // Ottieni informazioni del prestito
    const prestitoResult = await pool.query(
      `SELECT p.*, r.utente_id 
       FROM prestiti p
       LEFT JOIN richieste r ON p.richiesta_id = r.id
       WHERE p.id = $1`,
      [prestitoId]
    );
    
    if (prestitoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Prestito non trovato' });
    }
    
    const prestito = prestitoResult.rows[0];
    
    // Se non c'è utente_id dalla richiesta, cerca di trovarlo dal campo chi
    let userId = prestito.utente_id;
    if (!userId && prestito.chi) {
      const userResult = await pool.query(
        `SELECT id FROM users 
         WHERE email = $1 OR (name || ' ' || surname) = $2`,
        [prestito.chi, prestito.chi]
      );
      
      if (userResult.rows.length > 0) {
        userId = userResult.rows[0].id;
      }
    }
    
    if (!userId) {
      return res.status(400).json({ error: 'Impossibile identificare l\'utente per questo prestito' });
    }
    
    // Calcola i giorni di ritardo
    const delayDays = calculateDelayDays(prestito.data_rientro, new Date());
    
    if (delayDays <= 0) {
      return res.json({
        message: 'Nessun ritardo rilevato',
        delayDays: 0,
        strikesAssigned: 0
      });
    }
    
    // Controlla se è già stata assegnata una penalità per questo prestito
    const existingPenalty = await pool.query(
      'SELECT id FROM user_penalties WHERE prestito_id = $1',
      [prestitoId]
    );
    
    if (existingPenalty.rows.length > 0) {
      return res.status(400).json({ error: 'Penalità già assegnata per questo prestito' });
    }
    
    // Assegna la penalità
    const result = await assignPenalty(userId, prestitoId, delayDays, req.user.id);
    
    res.json({
      message: 'Penalità assegnata automaticamente',
      delayDays: delayDays,
      ...result
    });
    
  } catch (error) {
    console.error('Errore nel controllo e assegnazione penalità:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// POST /api/penalties/unblock-user - Sblocca un utente (solo admin)
router.post('/unblock-user', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { userId, resetStrikes = false } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'ID utente mancante' });
    }
    
    const updateQuery = resetStrikes 
      ? `UPDATE users 
         SET is_blocked = FALSE, 
             blocked_reason = NULL, 
             blocked_at = NULL, 
             blocked_by = NULL,
             penalty_strikes = 0,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`
      : `UPDATE users 
         SET is_blocked = FALSE, 
             blocked_reason = NULL, 
             blocked_at = NULL, 
             blocked_by = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`;
    
    await pool.query(updateQuery, [userId]);
    
    res.json({
      message: resetStrikes 
        ? 'Utente sbloccato e strike azzerati' 
        : 'Utente sbloccato (strike mantenuti)'
    });
    
  } catch (error) {
    console.error('Errore nello sblocco utente:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET /api/penalties/stats - Statistiche penalità (solo admin)
router.get('/stats', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(DISTINCT u.id) as total_users_with_penalties,
        COUNT(DISTINCT CASE WHEN u.is_blocked = TRUE THEN u.id END) as blocked_users,
        COUNT(p.id) as total_penalties,
        AVG(p.giorni_ritardo) as avg_delay_days,
        SUM(p.strike_assegnati) as total_strikes_assigned
      FROM users u
      LEFT JOIN user_penalties p ON u.id = p.user_id
      WHERE u.penalty_strikes > 0 OR p.id IS NOT NULL
    `);
    
    res.json(stats.rows[0]);
    
  } catch (error) {
    console.error('Errore nel recupero statistiche penalità:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

export { router, assignPenalty, calculateDelayDays, calculateStrikes };
export default router;
