// routes/prestiti.js
import express from "express";
import {
  listPrestiti,
  addPrestito,
  chiudiPrestito,
  updatePrestito,
  deletePrestito,
  unitAvailability,
} from "../models/prestiti.js";
import { isDisponibile, getStockRow } from "../models/inventario.js";

const router = express.Router();

// Mappa la payload mantenendo retrocompatibilità con i nomi campo
const mapPayload = (b = {}) => ({
  inventario_id: b.inventario_id,
  quantita: b.quantita,
  chi: b.chi,
  data_uscita: b.data_uscita ?? b.uscita,
  data_rientro: b.data_rientro ?? b.riconsegna ?? b.rientro,
  note: b.note,
  unita: b.unita,
});

// Normalizza errori in HTTP status sensati
const httpError = (e) => {
  const code = typeof e?.code === "number" ? e.code : (/non valida|mancanti|inesisten|insufficiente|disponibil/i.test(e?.message||"") ? 400 : 500);
  return { code, msg: e?.message || "Errore", details: e?.details };
};

// 👉 Disponibilità per un range (disabilitare unità occupate in UI)
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

// GET elenco prestiti
router.get("/", (_req, res) => {
  try {
    res.json(listPrestiti());
  } catch (e) {
    const { code, msg } = httpError(e);
    res.status(code).json({ error: msg });
  }
});

// Crea prestito con controllo disponibilità (riparazioni incluse)
router.post("/", (req, res) => {
  try {
    const inventario_id = Number(req.body?.inventario_id);
    const quantita = Number(req.body?.quantita);
    if (!Number.isFinite(inventario_id) || inventario_id <= 0 || !Number.isFinite(quantita) || quantita <= 0) {
      return res.status(400).json({ error: "Parametri mancanti o non validi: inventario_id, quantita" });
    }

    // Check stock aggregato (scala prestiti e riparazioni)
    if (!isDisponibile(inventario_id, quantita)) {
      const stock = getStockRow(inventario_id);
      return res.status(409).json({
        error: "Quantità richiesta non disponibile",
        dettagli: {
          richiesti: quantita,
          qta_disponibile: Number(stock?.qta_disponibile ?? 0),
          qta_in_riparazione: Number(stock?.qta_in_riparazione ?? 0),
          qta_prestata: Number(stock?.qta_prestata ?? 0),
        },
      });
    }

    // Se sono state richieste unità specifiche, verifico che siano libere nel periodo
    const dal = req.body?.data_uscita || req.body?.uscita || null;
    const al  = req.body?.data_rientro || req.body?.riconsegna || req.body?.rientro || null;
    const requestedUnits = Array.isArray(req.body?.unita) ? req.body.unita : [];
    if (requestedUnits.length > 0) {
      const avail = unitAvailability({ inventario_id, dal, al, exclude_id: null });
      const allowed = new Set(
        Array.isArray(avail?.units)
          ? avail.units.filter(u => u?.name && u.available).map(u => u.name)
          : Array.isArray(avail?.disponibili) ? avail.disponibili : []
      );
      const allOk = requestedUnits.every(u => allowed.has(u));
      if (!allOk) {
        return res.status(409).json({
          error: "Unità selezionate non disponibili per il periodo richiesto",
          dettagli: { richieste: requestedUnits, disponibili: Array.from(allowed) }
        });
      }
      if (requestedUnits.length !== quantita) {
        return res.status(400).json({ error: "Quantità e lista unità non coerenti" });
      }
    }

    const out = addPrestito(mapPayload(req.body || {}));
    res.status(201).json(out);
  } catch (e) {
    const { code, msg } = httpError(e);
    res.status(code).json({ error: msg });
  }
});

// Aggiorna prestito
router.put("/:id", (req, res) => {
  try {
    const out = updatePrestito(req.params.id, mapPayload(req.body || {}));
    res.json(out);
  } catch (e) {
    const { code, msg } = httpError(e);
    res.status(code).json({ error: msg });
  }
});

// Chiudi prestito (accetta anche { riconsegna: 'DD/MM/YYYY' })
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