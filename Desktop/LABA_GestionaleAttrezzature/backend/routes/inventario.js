// backend/routes/inventario.js
import { Router } from 'express';
import db from '../utils/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';

const r = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getUserCourse(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.corso_accademico || null;
  } catch {
    return null;
  }
}

// GET /api/inventario
// Optional filtering by user corso_accademico (from JWT)
r.get('/', requireAuth, (req, res) => {
  const corso = getUserCourse(req);
  let rows;
  if (corso) {
    rows = db.prepare(`
      SELECT i.*, 
             GROUP_CONCAT(ic.corso, ',') as corsi_assegnati,
             (SELECT COUNT(*) FROM inventario_unita iu WHERE iu.inventario_id = i.id AND iu.stato = 'disponibile' AND iu.prestito_corrente_id IS NULL) as unita_disponibili,
             CASE 
               WHEN EXISTS(SELECT 1 FROM riparazioni r WHERE r.inventario_id = i.id AND r.stato = 'in_corso') 
               THEN 'in_riparazione'
               WHEN i.in_manutenzione = 1 OR (SELECT COUNT(*) FROM inventario_unita iu WHERE iu.inventario_id = i.id AND iu.stato = 'disponibile' AND iu.prestito_corrente_id IS NULL) = 0
               THEN 'non_disponibile'
               ELSE 'disponibile'
             END as stato_effettivo
      FROM inventario i
      LEFT JOIN inventario_corsi ic ON ic.inventario_id = i.id
      WHERE (ic.corso = ? OR ic.corso IS NULL)
      GROUP BY i.id
      ORDER BY i.id DESC
    `).all(corso);
  } else {
    rows = db.prepare(`
      SELECT i.*, 
             GROUP_CONCAT(ic.corso, ',') as corsi_assegnati,
             (SELECT COUNT(*) FROM inventario_unita iu WHERE iu.inventario_id = i.id AND iu.stato = 'disponibile' AND iu.prestito_corrente_id IS NULL) as unita_disponibili,
             CASE 
               WHEN EXISTS(SELECT 1 FROM riparazioni r WHERE r.inventario_id = i.id AND r.stato = 'in_corso') 
               THEN 'in_riparazione'
               WHEN i.in_manutenzione = 1 OR (SELECT COUNT(*) FROM inventario_unita iu WHERE iu.inventario_id = i.id AND iu.stato = 'disponibile' AND iu.prestito_corrente_id IS NULL) = 0
               THEN 'non_disponibile'
               ELSE 'disponibile'
             END as stato_effettivo
      FROM inventario i
      LEFT JOIN inventario_corsi ic ON ic.inventario_id = i.id
      GROUP BY i.id
      ORDER BY i.id DESC
    `).all();
  }
  return res.json(rows || []);
});

// GET /api/inventario/:id
r.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare(`
    SELECT i.*, 
           GROUP_CONCAT(ic.corso, ',') as corsi_assegnati,
           (SELECT COUNT(*) FROM inventario_unita iu WHERE iu.inventario_id = i.id AND iu.stato = 'disponibile' AND iu.prestito_corrente_id IS NULL) as unita_disponibili,
           CASE 
             WHEN EXISTS(SELECT 1 FROM riparazioni r WHERE r.inventario_id = i.id AND r.stato = 'in_corso') 
             THEN 'in_riparazione'
             WHEN i.in_manutenzione = 1 OR (SELECT COUNT(*) FROM inventario_unita iu WHERE iu.inventario_id = i.id AND iu.stato = 'disponibile' AND iu.prestito_corrente_id IS NULL) = 0
             THEN 'non_disponibile'
             ELSE 'disponibile'
           END as stato_effettivo
    FROM inventario i
    LEFT JOIN inventario_corsi ic ON ic.inventario_id = i.id
    WHERE i.id = ?
    GROUP BY i.id
  `).get(id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// POST /api/inventario  (create) — admin only
r.post('/', requireAuth, requireRole('admin'), (req, res) => {
  const { 
    nome, 
    categoria_madre, 
    categoria_figlia=null,
    posizione=null, 
    note=null, 
    quantita_totale=1, 
    corsi_assegnati=[],
    unita=[] 
  } = req.body || {};
  
  if (!nome) return res.status(400).json({ error: 'nome richiesto' });
  
  // Se categoria_madre non è fornita ma ci sono corsi_assegnati, usa il primo corso
  let finalCategoriaMadre = categoria_madre;
  if (!finalCategoriaMadre && corsi_assegnati && corsi_assegnati.length > 0) {
    finalCategoriaMadre = corsi_assegnati[0];
  }
  
  if (!finalCategoriaMadre) return res.status(400).json({ error: 'categoria_madre richiesta' });
  if (!quantita_totale || quantita_totale < 1) return res.status(400).json({ error: 'quantità totale richiesta' });
  
  try {
    // Check if nome already exists
    const existing = db.prepare('SELECT id FROM inventario WHERE nome = ?').get(nome);
    if (existing) {
      return res.status(400).json({ error: 'Un elemento con questo nome esiste già' });
    }
    
    // Check for duplicate unit codes if provided
    if (unita && unita.length > 0) {
      const unitCodes = unita.map(u => u.codice_univoco);
      const duplicates = unitCodes.filter((code, index) => unitCodes.indexOf(code) !== index);
      if (duplicates.length > 0) {
        return res.status(400).json({ error: `Codici duplicati: ${duplicates.join(', ')}` });
      }
      
      // Check if unit codes already exist
      for (const unit of unita) {
        const existingUnit = db.prepare('SELECT id FROM inventario_unita WHERE codice_univoco = ?').get(unit.codice_univoco);
        if (existingUnit) {
          return res.status(400).json({ error: `Codice univoco già esistente: ${unit.codice_univoco}` });
        }
      }
    }
    
    // Create inventory item
    const stmt = db.prepare(`
      INSERT INTO inventario (nome, categoria_madre, categoria_figlia, posizione, note, quantita_totale, quantita, in_manutenzione)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(nome, finalCategoriaMadre, categoria_figlia, posizione, note, quantita_totale, quantita_totale, 0);
    
    // Create units if provided
    if (unita && unita.length > 0) {
      const unitStmt = db.prepare(`
        INSERT INTO inventario_unita (inventario_id, codice_univoco, note)
        VALUES (?, ?, ?)
      `);
      
      for (const unit of unita) {
        unitStmt.run(info.lastInsertRowid, unit.codice_univoco, unit.note || null);
      }
    }
    
    // Assign to courses if specified
    if (corsi_assegnati && corsi_assegnati.length > 0) {
      const courseStmt = db.prepare(`
        INSERT OR IGNORE INTO inventario_corsi (inventario_id, corso)
        VALUES (?, ?)
      `);
      for (const corso of corsi_assegnati) {
        courseStmt.run(info.lastInsertRowid, corso);
      }
    }
    
    const row = db.prepare('SELECT * FROM inventario WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({ error: e.message || 'Errore creazione inventario' });
  }
});

// PUT /api/inventario/:id  (update) — admin only
r.put('/:id', requireAuth, requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const fields = ['nome', 'categoria_id', 'seriale', 'note', 'disponibile'];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (f in req.body) {
      updates.push(`${f} = ?`);
      if (f === 'disponibile') values.push(req.body[f] ? 1 : 0);
      else values.push(req.body[f]);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'Nessun campo da aggiornare' });
  
  try {
    // Check for duplicate nome (if being updated)
    if (req.body.nome) {
      const existing = db.prepare('SELECT id FROM inventario WHERE nome = ? AND id != ?').get(req.body.nome, id);
      if (existing) {
        return res.status(400).json({ error: 'Un elemento con questo nome esiste già' });
      }
    }
    
    // Check for duplicate seriale (if being updated)
    if (req.body.seriale) {
      const existingSeriale = db.prepare('SELECT id FROM inventario WHERE seriale = ? AND id != ?').get(req.body.seriale, id);
      if (existingSeriale) {
        return res.status(400).json({ error: 'Un elemento con questo numero seriale esiste già' });
      }
    }
    
    db.prepare(`UPDATE inventario SET ${updates.join(', ')} WHERE id = ?`).run(...values, id);
    const row = db.prepare('SELECT * FROM inventario WHERE id = ?').get(id);
    res.json(row);
  } catch (e) {
    res.status(400).json({ error: e.message || 'Errore aggiornamento inventario' });
  }
});

// DELETE /api/inventario/:id — admin only
r.delete('/:id', requireAuth, requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  // Delete units first (foreign key constraint)
  db.prepare('DELETE FROM inventario_unita WHERE inventario_id = ?').run(id);
  // Delete inventory item
  db.prepare('DELETE FROM inventario WHERE id = ?').run(id);
  res.json({ ok: true });
});

// GET /api/inventario/:id/unita - Get units for inventory item
r.get('/:id/unita', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  try {
    const units = db.prepare(`
      SELECT iu.*, 
             CASE 
               WHEN iu.prestito_corrente_id IS NOT NULL THEN 'in_prestito'
               WHEN iu.stato = 'in_riparazione' THEN 'in_riparazione'
               ELSE 'disponibile'
             END as stato_effettivo
      FROM inventario_unita iu
      WHERE iu.inventario_id = ?
      ORDER BY iu.codice_univoco
    `).all(id);
    res.json(units);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Errore nel caricamento unità' });
  }
});

// GET /api/inventario/:id/disponibili - Get available units for inventory item
r.get('/:id/disponibili', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  try {
    const units = db.prepare(`
      SELECT * FROM inventario_unita 
      WHERE inventario_id = ? AND stato = 'disponibile' AND prestito_corrente_id IS NULL
      ORDER BY codice_univoco
    `).all(id);
    res.json(units);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Errore nel caricamento unità disponibili' });
  }
});

export default r;
