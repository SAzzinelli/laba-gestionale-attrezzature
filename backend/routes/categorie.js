import express from 'express'
import { listCategorie, addCategoria, removeCategoria, renameCategoria } from '../models/categorie.js'

const router = express.Router()

// helper: prende madre/figlia da path, body o query
const pick = (req) => ({
  madre: req.params?.madre ?? req.body?.madre ?? req.query?.madre,
  figlia: req.params?.figlia ?? req.body?.figlia ?? req.query?.figlia,
})

// LISTA
router.get('/', (_req, res) => {
  res.json(listCategorie())
})

// CREA
router.post('/', (req, res) => {
  try {
    const out = addCategoria(req.body || {})
    res.status(201).json(out)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// RINOMINA: { madre, figlia, new_figlia }
router.put('/', (req, res) => {
  try {
    const out = renameCategoria(req.body || {})
    res.json(out)
  } catch (e) {
    const msg = e?.message || 'Errore'
    const status = msg.includes('non trovata') ? 404 : msg.includes('già') ? 409 : 400
    res.status(status).json({ error: msg })
  }
})

// ELIMINA (body, query o path)
function handleDelete(req, res) {
  try {
    const { madre, figlia } = pick(req)
    if (!madre || !figlia) return res.status(400).json({ error: 'madre e figlia sono obbligatorie' })
    const out = removeCategoria({ madre, figlia })
    res.json(out)
  } catch (e) {
    const msg = e?.message || 'Errore'
    const status = msg.includes('non trovata') ? 404 : 400
    res.status(status).json({ error: msg })
  }
}

router.delete('/', handleDelete)
router.delete('/:madre/:figlia', handleDelete)
router.post('/delete', handleDelete)
router.post('/remove', handleDelete)

export default router