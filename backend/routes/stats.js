// backend/routes/stats.js - PostgreSQL Version
import { Router } from 'express';
import { query } from '../utils/postgres.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const r = Router();

// GET /api/stats
r.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    // Statistiche generali
    const inventario = await query('SELECT COUNT(*) as totale FROM inventario');
    const prestiti = await query('SELECT COUNT(*) as totale FROM prestiti');
    const richieste = await query('SELECT COUNT(*) as totale FROM richieste');
    const riparazioni = await query('SELECT COUNT(*) as totale FROM riparazioni');
    const segnalazioni = await query('SELECT COUNT(*) as totale FROM segnalazioni');
    const users = await query('SELECT COUNT(*) as totale FROM users');

    // Prestiti attivi
    const prestitiAttivi = await query(`
      SELECT COUNT(*) as totale 
      FROM prestiti 
      WHERE stato = 'attivo'
    `);

    // Richieste in attesa
    const richiesteInAttesa = await query(`
      SELECT COUNT(*) as totale 
      FROM richieste 
      WHERE stato = 'in_attesa'
    `);

    // Riparazioni in corso
    const riparazioniInCorso = await query(`
      SELECT COUNT(*) as totale 
      FROM riparazioni 
      WHERE stato = 'in_corso'
    `);

    // Segnalazioni aperte
    const segnalazioniAperte = await query(`
      SELECT COUNT(*) as totale 
      FROM segnalazioni 
      WHERE stato = 'aperta'
    `);

    res.json({
      inventario: parseInt(inventario[0].totale),
      prestiti: parseInt(prestiti[0].totale),
      richieste: parseInt(richieste[0].totale),
      riparazioni: parseInt(riparazioni[0].totale),
      segnalazioni: parseInt(segnalazioni[0].totale),
      users: parseInt(users[0].totale),
      prestiti_attivi: parseInt(prestitiAttivi[0].totale),
      richieste_in_attesa: parseInt(richiesteInAttesa[0].totale),
      riparazioni_in_corso: parseInt(riparazioniInCorso[0].totale),
      segnalazioni_aperte: parseInt(segnalazioniAperte[0].totale)
    });
  } catch (error) {
    console.error('Errore GET stats:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET /api/stats/top-users - Top utenti per richieste
r.get('/top-users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const daysAgo = parseInt(period);
    
    const result = await query(`
      SELECT 
        u.id, u.name, u.surname, u.email, u.corso_accademico,
        COUNT(r.id) as count
      FROM users u
      LEFT JOIN richieste r ON r.utente_id = u.id 
        AND r.created_at >= NOW() - INTERVAL '${daysAgo} days'
      WHERE u.ruolo != 'admin'
      GROUP BY u.id, u.name, u.surname, u.email, u.corso_accademico
      HAVING COUNT(r.id) > 0
      ORDER BY count DESC
      LIMIT 5
    `);
    
    res.json(result || []);
  } catch (error) {
    console.error('Errore GET top-users:', error);
    res.status(500).json({ error: 'Errore nel caricamento top utenti' });
  }
});

// GET /api/stats/top-items - Top oggetti per richieste
r.get('/top-items', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const daysAgo = parseInt(period);
    
    const result = await query(`
      SELECT 
        i.id, i.nome, i.categoria_madre, i.categoria_id,
        cs.nome as categoria_figlia,
        COUNT(r.id) as count
      FROM inventario i
      LEFT JOIN richieste r ON r.inventario_id = i.id 
        AND r.created_at >= NOW() - INTERVAL '${daysAgo} days'
      LEFT JOIN categorie_semplici cs ON cs.id = i.categoria_id
      GROUP BY i.id, i.nome, i.categoria_madre, i.categoria_id, cs.nome
      HAVING COUNT(r.id) > 0
      ORDER BY count DESC
      LIMIT 5
    `);
    
    res.json(result || []);
  } catch (error) {
    console.error('Errore GET top-items:', error);
    res.status(500).json({ error: 'Errore nel caricamento top oggetti' });
  }
});

// GET /api/stats/top-departments - Top dipartimenti per richieste
r.get('/top-departments', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const daysAgo = parseInt(period);
    
    const result = await query(`
      SELECT 
        u.corso_accademico,
        COUNT(r.id) as count,
        COUNT(DISTINCT u.id) as student_count
      FROM users u
      LEFT JOIN richieste r ON r.utente_id = u.id 
        AND r.created_at >= NOW() - INTERVAL '${daysAgo} days'
      WHERE u.ruolo != 'admin' AND u.corso_accademico IS NOT NULL
      GROUP BY u.corso_accademico
      HAVING COUNT(r.id) > 0
      ORDER BY count DESC
      LIMIT 5
    `);
    
    res.json(result || []);
  } catch (error) {
    console.error('Errore GET top-departments:', error);
    res.status(500).json({ error: 'Errore nel caricamento top dipartimenti' });
  }
});

// GET /api/stats/monthly-requests - Andamento richieste mensili
r.get('/monthly-requests', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const daysAgo = parseInt(period);
    
    let groupBy, dateFormat;
    if (daysAgo <= 30) {
      // Ultimi 30 giorni - raggruppa per giorno
      groupBy = "DATE(r.created_at)";
      dateFormat = "TO_CHAR(DATE(r.created_at), 'DD/MM')";
    } else if (daysAgo <= 90) {
      // Ultimi 90 giorni - raggruppa per settimana
      groupBy = "DATE_TRUNC('week', r.created_at)";
      dateFormat = "TO_CHAR(DATE_TRUNC('week', r.created_at), 'DD/MM')";
    } else {
      // Ultimo anno - raggruppa per mese
      groupBy = "DATE_TRUNC('month', r.created_at)";
      dateFormat = "TO_CHAR(DATE_TRUNC('month', r.created_at), 'MM/YYYY')";
    }
    
    const result = await query(`
      SELECT 
        ${dateFormat} as period,
        COUNT(r.id) as count
      FROM richieste r
      WHERE r.created_at >= NOW() - INTERVAL '${daysAgo} days'
      GROUP BY ${groupBy}
      ORDER BY ${groupBy} ASC
      LIMIT 12
    `);
    
    // Formatta i risultati per il frontend
    const formattedResult = result.map(row => ({
      month: row.period,
      week: row.period,
      day: row.period,
      count: parseInt(row.count)
    }));
    
    res.json(formattedResult || []);
  } catch (error) {
    console.error('Errore GET monthly-requests:', error);
    res.status(500).json({ error: 'Errore nel caricamento andamento richieste' });
  }
});

export default r;