import express from 'express'
import { listRip, addRip, updateRip, delRip, getRip } from '../models/riparazioni.js'

const router = express.Router()

// Normalizza il body per i nuovi campi
function normalizeBody(b = {}) {
  const out = { ...b }

  // Se arriva tipo in italiano/minuscolo, normalizza
  if (out.tipo) {
    const t = String(out.tipo).trim().toUpperCase()
    if (['GUASTO', 'RIPARAZIONE'].includes(t)) out.tipo = t
    else out.tipo = 'RIPARAZIONE'
  }

  // unit_ids: accetta array o CSV string -> array
  if (typeof out.unit_ids === 'string') {
    out.unit_ids = out.unit_ids
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }

  // assicurati che inventario_id sia numero
  if (out.inventario_id != null) out.inventario_id = Number(out.inventario_id)

  // normalizza date a YYYY-MM-DD (il model fa comunque i default/validazioni)
  const toISO = (d) => (d ? String(d).slice(0, 10) : d)
  if (out.data_inizio) out.data_inizio = toISO(out.data_inizio)
  if (out.data_fine) out.data_fine = toISO(out.data_fine)

  return out
}

router.get('/', (_, res) => res.json(listRip()))

router.get('/:id', (req, res) => {
  const r = getRip(+req.params.id)
  if (!r) return res.status(404).json({ error: 'Not found' })
  res.json(r)
})

router.post('/', (req, res) => {
  try {
    const body = normalizeBody(req.body)
    const created = addRip(body)
    res.status(201).json(created)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

router.put('/:id', (req, res) => {
  try {
    const body = normalizeBody(req.body)
    const updated = updateRip(+req.params.id, body)
    res.json(updated)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

router.delete('/:id', (req, res) => {
  res.json(delRip(+req.params.id))
})

export default router
