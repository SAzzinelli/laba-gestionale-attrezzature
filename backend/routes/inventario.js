import express from 'express';
import {
  listInventario,
  getInventario,
  addInventario,
  updateInventario,
  delInventario,
  summary,
  lowStock,
} from '../models/inventario.js';

const router = express.Router();

// Elenco completo inventario
router.get('/', (_req, res) => {
  try {
    res.json(listInventario());
  } catch (e) {
    res.status(500).json({ error: e.message || 'Errore' });
  }
});

// KPI riepilogo con soglia (es. /api/inventario/summary?threshold=2)
router.get('/summary', (req, res) => {
  try {
    const th = Number(req.query.threshold ?? 1);
    res.json(summary(th));
  } catch (e) {
    res.status(500).json({ error: e.message || 'Errore' });
  }
});

// Lista sotto scorta (es. /api/inventario/low-stock?threshold=2)
router.get('/low-stock', (req, res) => {
  try {
    const th = Number(req.query.threshold ?? 1);
    res.json(lowStock(th));
  } catch (e) {
    res.status(500).json({ error: e.message || 'Errore' });
  }
});

// Dettaglio per id
router.get('/:id', (req, res) => {
  try {
    const r = getInventario(+req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Errore' });
  }
});

// Crea
router.post('/', (req, res) => {
  try {
    const out = addInventario(req.body);
    res.status(201).json(out);
  } catch (e) {
    res.status(400).json({ error: e.message || 'Errore' });
  }
});

// Aggiorna
router.put('/:id', (req, res) => {
  try {
    const out = updateInventario(+req.params.id, req.body);
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e.message || 'Errore' });
  }
});

// Elimina
router.delete('/:id', (req, res) => {
  try {
    res.json(delInventario(+req.params.id));
  } catch (e) {
    res.status(500).json({ error: e.message || 'Errore' });
  }
});

export default router;
