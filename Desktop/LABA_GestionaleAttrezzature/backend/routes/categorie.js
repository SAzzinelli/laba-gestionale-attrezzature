// backend/routes/categorie.js
import express from "express";
import {
  listCategorie,
  addCategoria,
  removeCategoria,
  renameCategoria,
} from "../models/categorie.js";

const router = express.Router();

// GET tutte -> GET /api/categorie
router.get("/", async (_req, res) => {
  try {
    const rows = await listCategorie();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message || "Errore" });
  }
});

// POST nuova -> POST /api/categorie
router.post("/", async (req, res) => {
  try {
    const out = await addCategoria({
      madre: req.body?.madre,
      figlia: req.body?.figlia,
    });
    res.json(out);
  } catch (e) {
    const code = /mancanti|esistente|non trovata/i.test(e.message) ? 400 : 500;
    res.status(code).json({ error: e.message || "Errore" });
  }
});

// PUT rinomina -> PUT /api/categorie
router.put("/", async (req, res) => {
  try {
    const out = await renameCategoria({
      madre: req.body?.madre,
      figlia: req.body?.figlia,
      new_figlia: req.body?.new_figlia,
    });
    res.json(out);
  } catch (e) {
    const code = /mancanti|esistente|non trovata/i.test(e.message) ? 400 : 500;
    res.status(code).json({ error: e.message || "Errore" });
  }
});

// DELETE -> DELETE /api/categorie
router.delete("/", async (req, res) => {
  try {
    const madre = req.body?.madre ?? req.query?.madre;
    const figlia = req.body?.figlia ?? req.query?.figlia;
    const out = await removeCategoria({ madre, figlia });
    res.json(out);
  } catch (e) {
    const code = /mancanti|non trovata/i.test(e.message) ? 400 : 500;
    res.status(code).json({ error: e.message || "Errore" });
  }
});

// DELETE alternativa con params -> DELETE /api/categorie/:madre/:figlia
router.delete("/:madre/:figlia", async (req, res) => {
  try {
    const out = await removeCategoria({
      madre: req.params.madre,
      figlia: req.params.figlia,
    });
    res.json(out);
  } catch (e) {
    const code = /mancanti|non trovata/i.test(e.message) ? 400 : 500;
    res.status(code).json({ error: e.message || "Errore" });
  }
});

// Fallback POST helpers (compat vecchio frontend)
router.post("/delete", async (req, res) => {
  req.method = "DELETE";
  req.url = "/";
  res.app._router.handle(req, res);
});

router.post("/remove", async (req, res) => {
  req.method = "DELETE";
  req.url = "/";
  res.app._router.handle(req, res);
});

export default router;