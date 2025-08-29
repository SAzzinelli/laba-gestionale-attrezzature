import express from 'express';
import crypto from 'crypto';
import {
  listInventario as originalListInventario,
  getInventario as originalGetInventario,
  addInventario,
  updateInventario,
  delInventario,
  summary as originalSummary,
  lowStock as originalLowStock,
  listDisponibili,
} from '../models/inventario.js';

const router = express.Router();

// Anti-duplicazione per submit doppi (es. React StrictMode / doppio onSubmit)
const recentCreates = new Map(); // key -> { at: number, item: any }
const DUP_WINDOW_MS = 4000; // finestra di 4s
function makeBodyKey(body) {
  const normalized = {
    nome: body?.nome?.trim() || '',
    categoria_madre: body?.categoria_madre?.trim() || '',
    categoria_figlia: body?.categoria_figlia?.trim() || '',
    posizione: body?.posizione?.trim() || '',
    note: body?.note?.trim() || '',
    quantita_totale: Number.isFinite(+body?.quantita_totale) ? +body.quantita_totale : 0,
    in_manutenzione: body?.in_manutenzione ? 1 : 0,
  };
  return crypto.createHash('sha1').update(JSON.stringify(normalized)).digest('hex');
}
function getFromRecent(key) {
  const hit = recentCreates.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > DUP_WINDOW_MS) {
    recentCreates.delete(key);
    return null;
  }
  return hit.item;
}
function putRecent(key, item) {
  recentCreates.set(key, { at: Date.now(), item });
}

// Helper to normalize quantity field in a single item
function normalizeQuantita(item) {
  if (!item) return item;
  return { ...item, quantita: item.quantita ?? item.quantita_totale };
}

// Helper to normalize quantity field in a list of items
function normalizeList(list) {
  if (!Array.isArray(list)) return list; // safeguard: summary may return an object
  return list.map(normalizeQuantita);
}

// Elenco completo inventario
router.get('/', (_req, res) => {
  try {
    const result = originalListInventario();
    res.json(normalizeList(result));
  } catch (e) {
    res.status(500).json({ error: e.message || 'Errore' });
  }
});

// KPI riepilogo con soglia (es. /api/inventario/summary?threshold=2)
router.get('/summary', (req, res) => {
  try {
    const th = Number.parseInt(req.query.threshold ?? 1, 10);
    const result = originalSummary(th);
    // If the model returns an array, normalize items; otherwise return the KPI object as-is
    const payload = Array.isArray(result) ? normalizeList(result) : result;
    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Errore' });
  }
});

// Lista sotto scorta (es. /api/inventario/low-stock?threshold=2)
router.get('/low-stock', (req, res) => {
  try {
    const th = Number.parseInt(req.query.threshold ?? 1, 10);
    const result = originalLowStock(th);
    const list = Array.isArray(result) ? result : [];
    res.json(normalizeList(list));
  } catch (e) {
    res.status(500).json({ error: e.message || 'Errore' });
  }
});

// Solo elementi prenotabili (qta_disponibile > 0)
router.get('/available', (_req, res) => {
  try {
    const rows = listDisponibili();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Errore' });
  }
});

// Dettaglio per id
router.get('/:id', (req, res) => {
  try {
    const r = originalGetInventario(+req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json(normalizeQuantita(r));
  } catch (e) {
    res.status(500).json({ error: e.message || 'Errore' });
  }
});

// Crea
router.post('/', (req, res) => {
  try {
    const key = makeBodyKey(req.body);
    const cached = getFromRecent(key);
    if (cached) {
      return res.status(200).json(cached);
    }
    const out = addInventario(req.body);
    putRecent(key, out);
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
