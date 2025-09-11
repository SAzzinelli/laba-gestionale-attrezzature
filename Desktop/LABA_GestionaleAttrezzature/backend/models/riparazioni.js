import db from '../utils/db.js'

// === Schema bootstrap (idempotent) ==========================================
db.prepare(`
  CREATE TABLE IF NOT EXISTS riparazioni (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventario_id INTEGER NOT NULL,
    descrizione TEXT,
    data_inizio TEXT NOT NULL,
    data_fine TEXT,
    stato TEXT,
    tipo TEXT,
    unit_ids_json TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`).run()

// Columns added over time — run safely
try { db.prepare('ALTER TABLE riparazioni ADD COLUMN unit_ids_json TEXT').run() } catch (_) {}
try { db.prepare('ALTER TABLE riparazioni ADD COLUMN tipo TEXT').run() } catch (_) {}

const VALID_TIPI = new Set(['GUASTO', 'RIPARAZIONE'])

// === Helpers =================================================================
const todayISO = () => new Date().toISOString().slice(0, 10)
const toISO = (d) => (d ? String(d).slice(0, 10) : todayISO())
function parseUnits(v) {
  if (!v) return []
  if (Array.isArray(v)) return v.map((x) => String(x || '').trim()).filter(Boolean)
  try { return (JSON.parse(v) || []).map((x) => String(x || '').trim()).filter(Boolean) } catch { return [] }
}
function normTipo(t) {
  const T = String(t || '').toUpperCase().trim()
  return VALID_TIPI.has(T) ? T : 'RIPARAZIONE'
}

// === Queries =================================================================
export function listRip() {
  const rows = db.prepare(`
    SELECT r.*, i.nome AS inventario_nome
    FROM riparazioni r
    JOIN inventario i ON i.id = r.inventario_id
    ORDER BY r.created_at DESC
  `).all()
  return rows.map((r) => ({ ...r, unit_ids: parseUnits(r.unit_ids_json), tipo: r.tipo || 'RIPARAZIONE' }))
}

export function getRip(id) {
  const r = db.prepare(`
    SELECT r.*, i.nome AS inventario_nome
    FROM riparazioni r
    JOIN inventario i ON i.id = r.inventario_id
    WHERE r.id = ?
  `).get(id)
  if (!r) return null
  return { ...r, unit_ids: parseUnits(r.unit_ids_json), tipo: r.tipo || 'RIPARAZIONE' }
}

export function addRip(body) {
  const inventario_id = Number(body.inventario_id)
  const unit_ids = parseUnits(body.unit_ids)
  const data_inizio = toISO(body.data_inizio)
  const data_fine = body.data_fine ? toISO(body.data_fine) : null
  const tipo = normTipo(body.tipo)
  const descrizione = body.descrizione ?? ''

  if (!inventario_id) throw new Error('inventario_id obbligatorio')
  if (!unit_ids.length) throw new Error("Seleziona almeno un'unità")
  if (data_fine && data_fine < data_inizio) throw new Error('La data di fine non può precedere la data di inizio')

  const info = db.prepare(`
    INSERT INTO riparazioni (inventario_id, descrizione, data_inizio, data_fine, tipo, unit_ids_json)
    VALUES (@inventario_id, @descrizione, @data_inizio, @data_fine, @tipo, @unit_ids_json)
  `).run({
    inventario_id,
    descrizione,
    data_inizio,
    data_fine,
    tipo,
    unit_ids_json: JSON.stringify(unit_ids)
  })
  return getRip(info.lastInsertRowid)
}

export function updateRip(id, body) {
  const inventario_id = Number(body.inventario_id)
  const unit_ids = parseUnits(body.unit_ids)
  const data_inizio = toISO(body.data_inizio)
  const data_fine = body.data_fine ? toISO(body.data_fine) : null
  const tipo = normTipo(body.tipo)
  const descrizione = body.descrizione ?? ''

  if (!inventario_id) throw new Error('inventario_id obbligatorio')
  if (!unit_ids.length) throw new Error("Seleziona almeno un'unità")
  if (data_fine && data_fine < data_inizio) throw new Error('La data di fine non può precedere la data di inizio')

  db.prepare(`
    UPDATE riparazioni SET
      inventario_id=@inventario_id,
      descrizione=@descrizione,
      data_inizio=@data_inizio,
      data_fine=@data_fine,
      tipo=@tipo,
      unit_ids_json=@unit_ids_json,
      updated_at=CURRENT_TIMESTAMP
    WHERE id=@id
  `).run({
    id,
    inventario_id,
    descrizione,
    data_inizio,
    data_fine,
    tipo,
    unit_ids_json: JSON.stringify(unit_ids)
  })
  return getRip(id)
}

export function delRip(id) {
  const info = db.prepare('DELETE FROM riparazioni WHERE id=?').run(id)
  return { deleted: info.changes > 0 }
}
