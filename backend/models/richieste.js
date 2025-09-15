// backend/models/richieste.js
import db from "../utils/db.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS richieste_prestito (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    inventario_id INTEGER NOT NULL,
    quantita INTEGER DEFAULT 1,
    unita TEXT DEFAULT '[]',
    note TEXT,
    stato TEXT DEFAULT 'in_attesa', -- in_attesa | approvata | rifiutata
    data_richiesta TEXT DEFAULT CURRENT_TIMESTAMP,
    data_uscita_richiesta TEXT,
    data_rientro_richiesta TEXT,
    deciso_da INTEGER,
    deciso_il TEXT,
    decisione_note TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(inventario_id) REFERENCES inventario(id)
  );
  CREATE INDEX IF NOT EXISTS idx_rich_user ON richieste_prestito (user_id);
  CREATE INDEX IF NOT EXISTS idx_rich_inv ON richieste_prestito (inventario_id);
  CREATE INDEX IF NOT EXISTS idx_rich_state ON richieste_prestito (stato);
`);

// migrate existing DBs (ignore errors if already added)
try { db.exec("ALTER TABLE richieste_prestito ADD COLUMN data_uscita_richiesta TEXT"); } catch {}
try { db.exec("ALTER TABLE richieste_prestito ADD COLUMN data_rientro_richiesta TEXT"); } catch {}

const normalize = (r) => {
  if (!r) return r;
  try { r.unita = JSON.parse(r.unita || "[]"); } catch { r.unita = []; }
  return r;
};

export function addRichiesta({ user_id, inventario_id, quantita=1, unita=[], note=null, dal=null, al=null }) {
  const info = db.prepare(`
    INSERT INTO richieste_prestito (user_id, inventario_id, quantita, unita, note, data_uscita_richiesta, data_rientro_richiesta)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(user_id, inventario_id, quantita, JSON.stringify(Array.isArray(unita)?unita:[]), note, dal, al);
  return getRichiesta(info.lastInsertRowid);
}

export function getRichiesta(id) {
  const r = db.prepare(`
    SELECT r.*, i.nome AS inventario_nome
    FROM richieste_prestito r
    LEFT JOIN inventario i ON i.id=r.inventario_id
    WHERE r.id=?
  `).get(id);
  return normalize(r);
}

export function listRichieste({ stato=null, user_id=null } = {}) {
  let sql = `
    SELECT r.*, i.nome AS inventario_nome, u.name, u.surname, u.email, u.matricola
    FROM richieste_prestito r
    LEFT JOIN inventario i ON i.id=r.inventario_id
    LEFT JOIN users u ON u.id=r.user_id
    WHERE 1=1
  `;
  const params = [];
  if (stato) { sql += " AND r.stato=?"; params.push(stato); }
  if (user_id) { sql += " AND r.user_id=?"; params.push(user_id); }
  sql += " ORDER BY r.data_richiesta DESC, r.id DESC";
  const rows = db.prepare(sql).all(...params);
  return rows.map(normalize);
}

export function decideRichiesta(id, { stato, deciso_da=null, decisione_note=null }) {
  if (!["approvata", "rifiutata"].includes(stato)) throw new Error("Stato non valido");
  db.prepare(`
    UPDATE richieste_prestito
    SET stato=?, deciso_da=?, deciso_il=CURRENT_TIMESTAMP, decisione_note=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(stato, deciso_da, decisione_note, id);
  return getRichiesta(id);
}

export function deleteRichiesta(id) {
  const info = db.prepare("DELETE FROM richieste_prestito WHERE id=?").run(id);
  return { deleted: info.changes > 0 };
}
