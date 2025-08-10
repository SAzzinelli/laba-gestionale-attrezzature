import { db } from './db.js'

function todayISO(){ return new Date().toISOString().slice(0,10) }

export function listInventario(){
  const rows = db.prepare('SELECT * FROM inventario ORDER BY nome ASC').all()
  const t = todayISO()
  const inPrestito = db.prepare(`
    SELECT IFNULL(SUM(quantita),0) AS q FROM prestiti
    WHERE inventario_id=@id AND data_uscita<=@t AND (data_rientro IS NULL OR data_rientro='' OR data_rientro>=@t)
  `)
  return rows.map(r=>{
    const { q } = inPrestito.get({ id:r.id, t })
    const disponibili = Math.max(0, (r.quantita_totale||0) - (q||0))
    return { ...r, in_prestito:q||0, disponibili }
  })
}

export function getInventario(id){
  const r = db.prepare('SELECT * FROM inventario WHERE id=?').get(id)
  if(!r) return null
  const t = todayISO()
  const { q } = db.prepare(`
    SELECT IFNULL(SUM(quantita),0) AS q FROM prestiti
    WHERE inventario_id=@id AND data_uscita<=@t AND (data_rientro IS NULL OR data_rientro='' OR data_rientro>=@t)
  `).get({ id, t })
  const disponibili = Math.max(0, (r.quantita_totale||0) - (q||0))
  return { ...r, in_prestito:q||0, disponibili }
}

export function addInventario(b){
  const safe = {
    nome: b.nome,
    quantita_totale: parseInt(b.quantita_totale||0,10),
    categoria_madre: ['TRIENNIO','BIENNIO'].includes(b.categoria_madre)?b.categoria_madre:'TRIENNIO',
    categoria_figlia: b.categoria_figlia || null,
    posizione: b.posizione || null,
    note: b.note || null,
    in_manutenzione: b.in_manutenzione ? 1 : 0,
  }
  const info = db.prepare(`INSERT INTO inventario
    (nome,quantita_totale,categoria_madre,categoria_figlia,posizione,note,in_manutenzione)
    VALUES (@nome,@quantita_totale,@categoria_madre,@categoria_figlia,@posizione,@note,@in_manutenzione)`).run(safe)
  return getInventario(info.lastInsertRowid)
}

export function updateInventario(id,b){
  const safe = {
    nome: b.nome,
    quantita_totale: parseInt(b.quantita_totale||0,10),
    categoria_madre: ['TRIENNIO','BIENNIO'].includes(b.categoria_madre)?b.categoria_madre:'TRIENNIO',
    categoria_figlia: b.categoria_figlia || null,
    posizione: b.posizione || null,
    note: b.note || null,
    in_manutenzione: b.in_manutenzione ? 1 : 0,
    id
  }
  db.prepare(`UPDATE inventario SET
    nome=@nome, quantita_totale=@quantita_totale, categoria_madre=@categoria_madre, categoria_figlia=@categoria_figlia,
    posizione=@posizione, note=@note, in_manutenzione=@in_manutenzione, updated_at=CURRENT_TIMESTAMP
  WHERE id=@id`).run(safe)
  return getInventario(id)
}

export function delInventario(id){
  const info = db.prepare('DELETE FROM inventario WHERE id=?').run(id)
  return { deleted: info.changes>0 }
}

export function summary(){
  const inv = listInventario()
  const strumenti_totali = inv.length
  const strumenti_esauriti = inv.filter(r=>r.disponibili===0).length
  const t = todayISO()
  const strumenti_in_prestito = db.prepare(`
    SELECT COUNT(DISTINCT inventario_id) AS c FROM prestiti
    WHERE data_uscita<=@t AND (data_rientro IS NULL OR data_rientro='' OR data_rientro>=@t)
  `).get({ t }).c
  const prestiti_scaduti = db.prepare(`
    SELECT COUNT(*) AS c FROM prestiti
    WHERE data_rientro IS NOT NULL AND data_rientro<@t
  `).get({ t }).c
  return { strumenti_totali, strumenti_in_prestito, strumenti_esauriti, prestiti_scaduti }
}
