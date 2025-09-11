// backend/routes/segnalazioni.js
import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { addSegnalazione, listSegnalazioni, closeSegnalazione, deleteSegnalazione } from "../models/segnalazioni.js";

const router = express.Router();

// USER: crea
router.post("/", requireAuth, (req, res) => {
  try {
    const { prestito_id=null, inventario_id=null, tipo, messaggio=null } = req.body || {};
    if (!tipo) return res.status(400).json({ error: "tipo mancante" });
    const out = addSegnalazione({ user_id: req.user.id, prestito_id, inventario_id, tipo, messaggio });
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e.message || "Errore" });
  }
});

// USER: mie
router.get("/mie", requireAuth, (req, res) => {
  res.json(listSegnalazioni({ user_id: req.user.id }));
});

// ADMIN: tutte
router.get("/", requireAuth, requireRole("admin"), (req, res) => {
  const { stato=null } = req.query || {};
  res.json(listSegnalazioni({ stato: stato || null }));
});

// ADMIN: chiudi
router.post("/:id/chiudi", requireAuth, requireRole("admin"), (req, res) => {
  const id = Number(req.params.id);
  res.json(closeSegnalazione(id, { handled_by: req.user.id }));
});

// ADMIN: elimina
router.delete("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const id = Number(req.params.id);
  res.json(deleteSegnalazione(id));
});

export default router;