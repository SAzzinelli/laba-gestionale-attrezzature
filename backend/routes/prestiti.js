// backend/routes/prestiti.js
import express from "express";
import {
  listPrestiti,
  addPrestito,
  chiudiPrestito,
  updatePrestito,
  deletePrestito,
  unitAvailability, // 👈 nuovo: API disponibilità per disabilitare unità/overbooking
} from "../models/prestiti.js";

const router = express.Router();

const mapPayload = (b = {}) => ({
  inventario_id: b.inventario_id,
  quantita: b.quantita,
  chi: b.chi,
  data_uscita: b.data_uscita ?? b.uscita,
  data_rientro: b.data_rientro ?? b.riconsegna ?? b.rientro,
  note: b.note,
  unita: b.unita,
});

// Normalizza errori dai model in HTTP status sensati (400 vs 500)
const httpError = (e) => {
  const msg = e?.message || "Errore";
  const code =
    typeof e?.code === "number"
      ? e.code
      : /mancanti|non valida|insufficiente|non disponibile|inesisten/i.test(msg)
      ? 400
      : 500;
  return { code, msg };
};

// 👉 Disponibilità per un range (serve alla modale per disabilitare unità occupate)
router.get("/availability", (req, res) => {
  try {
    const { inventario_id, dal, al, exclude_id } = req.query;
    const data = unitAvailability({
      inventario_id: Number(inventario_id),
      dal,
      al: al || null,
      exclude_id: exclude_id ? Number(exclude_id) : null,
    });
    res.json(data);
  } catch (e) {
    const { code, msg } = httpError(e);
    res.status(code).json({ error: msg });
  }
});

// GET elenco
router.get("/", (_req, res) => {
  try {
    res.json(listPrestiti());
  } catch (e) {
    const { code, msg } = httpError(e);
    res.status(code).json({ error: msg });
  }
});

// Crea prestito
router.post("/", (req, res) => {
  try {
    const out = addPrestito(mapPayload(req.body || {}));
    res.json(out);
  } catch (e) {
    const { code, msg } = httpError(e);
    res.status(code).json({ error: msg });
  }
});

// Aggiorna prestito (salva anche riconsegna)
router.put("/:id", (req, res) => {
  try {
    const out = updatePrestito(req.params.id, mapPayload(req.body || {}));
    res.json(out);
  } catch (e) {
    const { code, msg } = httpError(e);
    res.status(code).json({ error: msg });
  }
});

// Chiudi prestito (compat) — accetta anche { riconsegna: 'DD/MM/YYYY' }
router.put("/:id/chiudi", (req, res) => {
  try {
    const out = chiudiPrestito(req.params.id, {
      data_rientro: req.body?.data_rientro ?? req.body?.riconsegna,
    });
    res.json(out);
  } catch (e) {
    const { code, msg } = httpError(e);
    res.status(code).json({ error: msg });
  }
});

// Elimina prestito
router.delete("/:id", (req, res) => {
  try {
    res.json(deletePrestito(req.params.id));
  } catch (e) {
    const { code, msg } = httpError(e);
    res.status(code).json({ error: msg });
  }
});

// Compat: DELETE con id in body/query
router.delete("/", (req, res) => {
  try {
    const id = req.body?.id ?? req.query?.id;
    if (!id) return res.status(400).json({ error: "Parametri mancanti: id" });
    res.json(deletePrestito(id));
  } catch (e) {
    const { code, msg } = httpError(e);
    res.status(code).json({ error: msg });
  }
});

export default router;