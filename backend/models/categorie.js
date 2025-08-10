import { db } from './db.js'
export function listCategorie(){ return db.prepare('SELECT * FROM categorie ORDER BY madre, figlia').all() }
export function addCategoria({ madre, figlia }){
  const M = (madre||'').toUpperCase()
  if(!['TRIENNIO','BIENNIO'].includes(M)) throw new Error('Madre non valida')
  if(!figlia) throw new Error('Nome sottocategoria obbligatorio')
  db.prepare('INSERT INTO categorie (madre,figlia) VALUES (?,?)').run(M, figlia)
  return { ok:true }
}
