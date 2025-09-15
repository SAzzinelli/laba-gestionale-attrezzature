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

export default r;