// backend/routes/avvisi.js - PostgreSQL Version
import { Router } from 'express';
import { query } from '../utils/postgres.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();

// GET /api/avvisi
r.get('/', requireAuth, async (req, res) => {
  try {
    // Scorte basse
    const scorteBasse = await query(`
      SELECT 
        i.*,
        COUNT(iu.id) as unita_disponibili,
        i.quantita_totale,
        ROUND((COUNT(iu.id) * 100.0 / i.quantita_totale), 2) as percentuale_disponibile
      FROM inventario i
      LEFT JOIN inventario_unita iu ON iu.inventario_id = i.id AND iu.stato = 'disponibile'
      GROUP BY i.id
      HAVING COUNT(iu.id) < 1
      ORDER BY percentuale_disponibile ASC
    `);

    // Prestiti scaduti
    const prestitiScaduti = await query(`
      SELECT 
        p.*,
        i.nome as oggetto_nome,
        p.chi as utente_nome,
        u.name as utente_nome_reale,
        u.surname as utente_cognome,
        (CURRENT_DATE - p.data_rientro) as giorni_ritardo
      FROM prestiti p
      JOIN inventario i ON p.inventario_id = i.id
      LEFT JOIN users u ON (p.chi LIKE '%' || u.email || '%' OR p.chi = u.email)
      WHERE p.stato = 'attivo'
      AND p.data_rientro IS NOT NULL
      AND p.data_rientro < CURRENT_DATE
      ORDER BY giorni_ritardo DESC
    `);

    // Scadenze oggi
    const scadenzeOggi = await query(`
      SELECT 
        p.*,
        i.nome as oggetto_nome,
        p.chi as utente_nome,
        u.name as utente_nome_reale,
        u.surname as utente_cognome
      FROM prestiti p
      JOIN inventario i ON p.inventario_id = i.id
      LEFT JOIN users u ON (p.chi LIKE '%' || u.email || '%' OR p.chi = u.email)
      WHERE p.stato = 'attivo'
      AND p.data_rientro IS NOT NULL
      AND p.data_rientro = CURRENT_DATE
      ORDER BY p.data_rientro
    `);

    // Scadenze domani
    const scadenzeDomani = await query(`
      SELECT 
        p.*,
        i.nome as oggetto_nome,
        p.chi as utente_nome,
        u.name as utente_nome_reale,
        u.surname as utente_cognome
      FROM prestiti p
      JOIN inventario i ON p.inventario_id = i.id
      LEFT JOIN users u ON (p.chi LIKE '%' || u.email || '%' OR p.chi = u.email)
      WHERE p.stato = 'attivo'
      AND p.data_rientro IS NOT NULL
      AND p.data_rientro = CURRENT_DATE + INTERVAL '1 day'
      ORDER BY p.data_rientro
    `);

    const totaleAvvisi = scorteBasse.length + prestitiScaduti.length + 
                        scadenzeOggi.length + scadenzeDomani.length;

    res.json({
      scorte_basse: scorteBasse,
      prestiti_scaduti: prestitiScaduti,
      scadenze_oggi: scadenzeOggi,
      scadenze_domani: scadenzeDomani,
      totale_avvisi: totaleAvvisi
    });
  } catch (error) {
    console.error('Errore GET avvisi:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

export default r;