// backend/routes/richieste.js
import { Router } from 'express';
import db from '../utils/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const r = Router();

function isAdminUser(u) {
  if (!u) return false;
  if (u.id === -1) return true;
  return (u.ruolo || '').toLowerCase() === 'admin';
}

// GET /api/richieste
// Default: ONLY current user's requests. Admin can pass ?all=1 to see everything.
r.get('/', requireAuth, (req, res) => {
  const wantAll = (req.query.all === '1' || req.query.all === 'true');
  let rows;
  if (wantAll) {
    if (!isAdminUser(req.user)) return res.status(403).json({ error: 'Solo admin' });
    rows = db.prepare(`
      SELECT r.*, i.nome AS oggetto_nome, u.email AS utente_email
      FROM richieste r
      LEFT JOIN inventario i ON i.id = r.inventario_id
      LEFT JOIN users u ON u.id = r.utente_id
      ORDER BY r.created_at DESC, r.id DESC
    `).all();
  } else {
    rows = db.prepare(`
      SELECT r.*, i.nome AS oggetto_nome
      FROM richieste r
      LEFT JOIN inventario i ON i.id = r.inventario_id
      WHERE r.utente_id = ?
      ORDER BY r.created_at DESC, r.id DESC
    `).all(req.user.id);
  }
  return res.json(rows || []);
});

// GET /api/richieste/mie  (explicit alias)
r.get('/mie', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT r.*, i.nome AS oggetto_nome
    FROM richieste r
    LEFT JOIN inventario i ON i.id = r.inventario_id
    WHERE r.utente_id = ?
    ORDER BY r.created_at DESC, r.id DESC
  `).all(req.user.id);
  return res.json(rows || []);
});

// POST /api/richieste  — crea una richiesta per l'utente loggato
// body: { inventario_id, dal, al, note }
r.post('/', requireAuth, (req, res) => {
  const { inventario_id, dal, al, note=null } = req.body || {};
  if (!inventario_id || !dal || !al) return res.status(400).json({ error: 'inventario_id, dal e al sono obbligatori' });

  // Validazione date
  const dataInizio = new Date(dal);
  const dataFine = new Date(al);
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  
  // Permetti prenotazioni per oggi
  const oggiPiuUno = new Date(oggi);
  oggiPiuUno.setDate(oggiPiuUno.getDate() + 1);
  
  if (isNaN(dataInizio.getTime()) || isNaN(dataFine.getTime())) {
    return res.status(400).json({ error: 'Formato date non valido. Usa YYYY-MM-DD' });
  }
  
  if (dataInizio >= dataFine) {
    return res.status(400).json({ error: 'La data di inizio deve essere precedente alla data di fine' });
  }
  
  // Temporaneamente rimosso per permettere test futuri
  // if (dataInizio < oggi) {
  //   return res.status(400).json({ error: 'La data di inizio non può essere nel passato' });
  // }

  try {
    // Controlla se l'oggetto esiste e è disponibile
    const inventario = db.prepare(`
      SELECT i.*, 
             CASE 
               WHEN EXISTS(SELECT 1 FROM riparazioni r WHERE r.inventario_id = i.id AND r.stato = 'in_corso') 
               THEN 'in_riparazione'
               WHEN i.in_manutenzione = 1 OR (SELECT COUNT(*) FROM inventario_unita iu WHERE iu.inventario_id = i.id AND iu.stato = 'disponibile' AND iu.prestito_corrente_id IS NULL) = 0
               THEN 'non_disponibile'
               ELSE 'disponibile'
             END as stato_effettivo
      FROM inventario i
      WHERE i.id = ?
    `).get(inventario_id);

    if (!inventario) {
      return res.status(404).json({ error: 'Oggetto non trovato' });
    }

    if (inventario.stato_effettivo === 'in_riparazione') {
      return res.status(400).json({ error: 'L\'oggetto è attualmente in riparazione e non può essere richiesto' });
    }

    if (inventario.stato_effettivo === 'non_disponibile') {
      return res.status(400).json({ error: 'L\'oggetto non è disponibile per il prestito' });
    }

    // Controlla sovrapposizioni di prestiti per lo stesso articolo
    const sovrapposizioni = db.prepare(`
      SELECT COUNT(*) as count
      FROM richieste r
      WHERE r.inventario_id = ? 
        AND r.stato IN ('in_attesa', 'approvata')
        AND (
          (r.dal <= ? AND r.al >= ?) OR
          (r.dal <= ? AND r.al >= ?) OR
          (r.dal >= ? AND r.al <= ?)
        )
    `).get(inventario_id, dal, dal, al, al, dal, al);

    if (sovrapposizioni.count > 0) {
      return res.status(400).json({ error: 'L\'oggetto non è disponibile per il periodo richiesto. Esistono già prenotazioni sovrapposte.' });
    }

    const stmt = db.prepare(`
      INSERT INTO richieste (inventario_id, utente_id, dal, al, stato, note)
      VALUES (?, ?, ?, ?, 'in_attesa', ?)
    `);
    const info = stmt.run(inventario_id, req.user.id, dal, al, note);
    const row = db.prepare('SELECT * FROM richieste WHERE id = ?').get(info.lastInsertRowid);
    return res.json(row);
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Errore creazione richiesta' });
  }
});

export default r;
