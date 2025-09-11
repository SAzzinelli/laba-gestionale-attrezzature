// backend/routes/prestiti.js
import { Router } from 'express';
import db from '../utils/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const r = Router();

function isAdminUser(u) {
  if (!u) return false;
  if (u.id === -1) return true;
  return (u.ruolo || '').toLowerCase() === 'admin';
}

// GET /api/prestiti  — default SOLO i prestiti dell'utente; admin può vedere tutti con ?all=1
r.get('/', requireAuth, (req, res) => {
  const wantAll = (req.query.all === '1' || req.query.all === 'true');
  let rows;
  if (wantAll) {
    if (!isAdminUser(req.user)) return res.status(403).json({ error: 'Solo admin' });
    rows = db.prepare(`
      SELECT p.*, i.nome AS articolo_nome, i.note AS articolo_descrizione, 
             p.chi AS utente_nome
      FROM prestiti p
      LEFT JOIN inventario i ON i.id = p.inventario_id
      ORDER BY p.id DESC
    `).all();
  } else {
    rows = db.prepare(`
      SELECT p.*, i.nome AS articolo_nome, i.note AS articolo_descrizione,
             i.categoria_madre, i.categoria_figlia
      FROM prestiti p
      LEFT JOIN inventario i ON i.id = p.inventario_id
      WHERE p.chi LIKE ? OR p.chi = ?
      ORDER BY p.id DESC
    `).all(`%${req.user.email}%`, req.user.email);
  }
  return res.json(rows || []);
});

// GET /api/prestiti/mie — alias per i prestiti dell'utente corrente
r.get('/mie', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, i.nome AS articolo_nome, i.note AS articolo_descrizione,
           i.categoria_madre, i.categoria_figlia,
           p.data_uscita AS data_inizio, p.data_rientro AS data_fine
    FROM prestiti p
    LEFT JOIN inventario i ON i.id = p.inventario_id
    WHERE p.chi LIKE ? OR p.chi = ?
    ORDER BY p.id DESC
  `).all(`%${req.user.email}%`, req.user.email);
  return res.json(rows || []);
});

// (eventuale) POST per creare un prestito — admin only
r.post('/', requireAuth, requireRole('admin'), (req, res) => {
  const { inventario_id, chi, data_uscita, data_rientro, note=null } = req.body || {};
  if (!inventario_id || !chi || !data_uscita || !data_rientro) return res.status(400).json({ error: 'campi mancanti' });
  const info = db.prepare(`
    INSERT INTO prestiti (inventario_id, chi, data_uscita, data_rientro, note)
    VALUES (?, ?, ?, ?, ?)
  `).run(inventario_id, chi, data_uscita, data_rientro, note);
  const row = db.prepare('SELECT * FROM prestiti WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

// PUT /api/prestiti/:id/approva — admin only
r.put('/:id/approva', requireAuth, requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  try {
    // Update request status to approved
    const requestResult = db.prepare('UPDATE richieste SET stato = ? WHERE id = ?').run('approvata', id);
    if (requestResult.changes === 0) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }
    
    // Get request details
    const request = db.prepare('SELECT * FROM richieste WHERE id = ?').get(id);
    
    // Create loan record using original schema
    const loanResult = db.prepare(`
      INSERT INTO prestiti (inventario_id, chi, data_uscita, data_rientro, note)
      VALUES (?, ?, ?, ?, ?)
    `).run(request.inventario_id, `User ${request.utente_id}`, request.dal, request.al, request.note);
    
    res.json({ 
      message: 'Richiesta approvata e prestito creato',
      loanId: loanResult.lastInsertRowid 
    });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Errore nell\'approvazione' });
  }
});

// PUT /api/prestiti/:id/rifiuta — admin only
r.put('/:id/rifiuta', requireAuth, requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  try {
    const result = db.prepare('UPDATE richieste SET stato = ? WHERE id = ?').run('rifiutata', id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }
    
    res.json({ message: 'Richiesta rifiutata' });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Errore nel rifiuto' });
  }
});

// PUT /api/prestiti/:id/restituisci — admin only
r.put('/:id/restituisci', requireAuth, requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  try {
    const result = db.prepare('UPDATE prestiti SET stato = ?, data_restituzione = ? WHERE id = ?').run('restituito', new Date().toISOString(), id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Prestito non trovato' });
    }
    
    res.json({ message: 'Prestito restituito' });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Errore nella restituzione' });
  }
});

export default r;
