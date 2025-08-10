import { db } from './db.js'
export function listRip(){
  return db.prepare(`SELECT r.*, i.nome AS inventario_nome
    FROM riparazioni r JOIN inventario i ON i.id=r.inventario_id
    ORDER BY r.created_at DESC`).all()
}
export function addRip(b){
  const info = db.prepare(`INSERT INTO riparazioni
    (inventario_id, descrizione, data_inizio, data_fine, stato)
    VALUES (@inventario_id, @descrizione, @data_inizio, @data_fine, @stato)
  `).run({
    inventario_id: b.inventario_id,
    descrizione: b.descrizione || '',
    data_inizio: b.data_inizio,
    data_fine: b.data_fine || null,
    stato: b.stato || 'APERTO'
  })
  return getRip(info.lastInsertRowid)
}
export function updateRip(id,b){
  db.prepare(`UPDATE riparazioni SET
    inventario_id=@inventario_id, descrizione=@descrizione, data_inizio=@data_inizio, data_fine=@data_fine, stato=@stato,
    updated_at=CURRENT_TIMESTAMP WHERE id=@id`).run({ ...b, id })
  return getRip(id)
}
export function delRip(id){ const i=db.prepare('DELETE FROM riparazioni WHERE id=?').run(id); return {deleted:i.changes>0} }
export function getRip(id){
  return db.prepare(`SELECT r.*, i.nome AS inventario_nome
    FROM riparazioni r JOIN inventario i ON i.id=r.inventario_id WHERE r.id=?`).get(id)
}
