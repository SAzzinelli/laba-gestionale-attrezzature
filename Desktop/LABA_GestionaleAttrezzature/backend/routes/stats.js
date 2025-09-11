import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import db from '../utils/db.js';

const router = express.Router();

// Middleware per autenticazione admin
router.use(requireAuth);

// Top 5 utenti che prenotano di più
router.get('/top-users', (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    
    const query = `
      SELECT 
        u.id,
        u.name,
        u.surname,
        u.corso_accademico,
        COUNT(r.id) as count
      FROM users u
      LEFT JOIN richieste r ON u.id = r.utente_id
      WHERE r.created_at >= datetime('now', '-${days} days')
      GROUP BY u.id, u.name, u.surname, u.corso_accademico
      HAVING count > 0
      ORDER BY count DESC
      LIMIT 5
    `;
    
    const users = db.prepare(query).all();
    res.json(users);
  } catch (error) {
    console.error('Error fetching top users:', error);
    res.status(500).json({ error: 'Errore nel recupero delle statistiche utenti' });
  }
});

// Top 5 oggetti più richiesti
router.get('/top-items', (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    
    const query = `
      SELECT 
        i.id,
        i.nome,
        i.categoria_madre,
        i.categoria_figlia,
        COUNT(r.id) as count
      FROM inventario i
      LEFT JOIN richieste r ON i.id = r.inventario_id
      WHERE r.created_at >= datetime('now', '-${days} days')
      GROUP BY i.id, i.nome, i.categoria_madre, i.categoria_figlia
      HAVING count > 0
      ORDER BY count DESC
      LIMIT 5
    `;
    
    const items = db.prepare(query).all();
    res.json(items);
  } catch (error) {
    console.error('Error fetching top items:', error);
    res.status(500).json({ error: 'Errore nel recupero delle statistiche oggetti' });
  }
});

// Top 5 dipartimenti/corsi accademici che richiedono di più
router.get('/top-departments', (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    
    const query = `
      SELECT 
        u.corso_accademico,
        COUNT(r.id) as count,
        COUNT(DISTINCT u.id) as user_count
      FROM users u
      LEFT JOIN richieste r ON u.id = r.utente_id
      WHERE r.created_at >= datetime('now', '-${days} days')
        AND u.corso_accademico IS NOT NULL 
        AND u.corso_accademico != ''
      GROUP BY u.corso_accademico
      HAVING count > 0
      ORDER BY count DESC
      LIMIT 5
    `;
    
    const departments = db.prepare(query).all();
    res.json(departments);
  } catch (error) {
    console.error('Error fetching top departments:', error);
    res.status(500).json({ error: 'Errore nel recupero delle statistiche dipartimenti' });
  }
});

// Dati mensili per grafico
router.get('/monthly-requests', (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    
    let query;
    if (days <= 30) {
      // Dati giornalieri per ultimi 30 giorni
      query = `
        SELECT 
          DATE(created_at) as day,
          COUNT(*) as count
        FROM richieste
        WHERE created_at >= datetime('now', '-${days} days')
        GROUP BY DATE(created_at)
        ORDER BY created_at ASC
      `;
    } else if (days <= 90) {
      // Dati settimanali per ultimi 90 giorni
      query = `
        SELECT 
          strftime('%Y-W%W', created_at) as week,
          COUNT(*) as count
        FROM richieste
        WHERE created_at >= datetime('now', '-${days} days')
        GROUP BY strftime('%Y-W%W', created_at)
        ORDER BY created_at ASC
      `;
    } else {
      // Dati mensili per ultimo anno
      query = `
        SELECT 
          strftime('%Y-%m', created_at) as month,
          COUNT(*) as count
        FROM richieste
        WHERE created_at >= datetime('now', '-${days} days')
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY created_at ASC
      `;
    }
    
    const data = db.prepare(query).all();
    res.json(data);
  } catch (error) {
    console.error('Error fetching monthly data:', error);
    res.status(500).json({ error: 'Errore nel recupero dei dati mensili' });
  }
});

// Statistiche generali
router.get('/overview', (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    
    const queries = {
      totalRequests: `
        SELECT COUNT(*) as count
        FROM richieste
        WHERE created_at >= datetime('now', '-${days} days')
      `,
      totalUsers: `
        SELECT COUNT(DISTINCT utente_id) as count
        FROM richieste
        WHERE created_at >= datetime('now', '-${days} days')
      `,
      totalItems: `
        SELECT COUNT(DISTINCT inventario_id) as count
        FROM richieste
        WHERE created_at >= datetime('now', '-${days} days')
      `,
      approvedRequests: `
        SELECT COUNT(*) as count
        FROM richieste
        WHERE created_at >= datetime('now', '-${days} days')
        AND stato = 'approvata'
      `
    };
    
    const results = {};
    for (const [key, query] of Object.entries(queries)) {
      const result = db.prepare(query).get();
      results[key] = result.count;
    }
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching overview stats:', error);
    res.status(500).json({ error: 'Errore nel recupero delle statistiche generali' });
  }
});

export default router;
