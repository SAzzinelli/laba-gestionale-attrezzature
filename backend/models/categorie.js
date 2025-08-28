import { db } from './db.js'

// Ritorna tutte le sottocategorie ordinate
export function listCategorie() {
  return db.prepare('SELECT madre, figlia FROM categorie ORDER BY madre, figlia').all()
}

// Aggiunge una sottocategoria
export function addCategoria({ madre, figlia }) {
  const M = String(madre || '').toUpperCase()
  const F = String(figlia || '').trim()
  if (!['TRIENNIO', 'BIENNIO'].includes(M)) throw new Error('Madre non valida')
  if (!F) throw new Error('Nome sottocategoria obbligatorio')
  const exists = db.prepare('SELECT 1 FROM categorie WHERE madre=? AND figlia=?').get(M, F)
  if (exists) throw new Error('La sottocategoria esiste già')
  db.prepare('INSERT INTO categorie (madre, figlia) VALUES (?, ?)').run(M, F)
  return { ok: true }
}

// Elimina una sottocategoria (e libera i riferimenti negli oggetti inventario)
export function removeCategoria({ madre, figlia }) {
  const M = String(madre || '').toUpperCase()
  const F = String(figlia || '').trim()
  if (!['TRIENNIO', 'BIENNIO'].includes(M)) throw new Error('Madre non valida')
  if (!F) throw new Error('Nome sottocategoria obbligatorio')

  const del = db.prepare('DELETE FROM categorie WHERE madre=? AND figlia=?').run(M, F)
  if (!del.changes) throw new Error('Sottocategoria non trovata')

  try {
    db.prepare('UPDATE inventario SET categoria_figlia=NULL WHERE categoria_madre=? AND categoria_figlia=?').run(M, F)
  } catch {}
  return { ok: true, removed: del.changes }
}

// Rinomina una sottocategoria e propaga sugli oggetti inventario
export function renameCategoria({ madre, figlia, new_figlia }) {
  const M = String(madre || '').toUpperCase()
  const F = String(figlia || '').trim()
  const N = String(new_figlia || '').trim()
  if (!['TRIENNIO', 'BIENNIO'].includes(M)) throw new Error('Madre non valida')
  if (!F || !N) throw new Error('Nomi obbligatori')
  if (F === N) return { ok: true, changed: 0 }

  const dup = db.prepare('SELECT 1 FROM categorie WHERE madre=? AND figlia=?').get(M, N)
  if (dup) throw new Error('Esiste già una sottocategoria con quel nome')

  const upd = db.prepare('UPDATE categorie SET figlia=? WHERE madre=? AND figlia=?').run(N, M, F)
  if (!upd.changes) throw new Error('Sottocategoria non trovata')

  try {
    db.prepare('UPDATE inventario SET categoria_figlia=? WHERE categoria_madre=? AND categoria_figlia=?').run(N, M, F)
  } catch {}
  return { ok: true, changed: upd.changes }
}