// backend/models/categorie.js
import db from "../utils/db.js";

const norm = (v) => String(v ?? "").trim();

/** Ritorna tutte le coppie (madre, figlia) ordinate */
export function listCategorie() {
  return db
    .prepare(
      "SELECT madre, figlia FROM categorie WHERE madre IS NOT NULL AND figlia IS NOT NULL AND madre != '' AND figlia != '' ORDER BY madre COLLATE NOCASE, figlia COLLATE NOCASE"
    )
    .all();
}

/** Crea una categoria */
export function addCategoria({ madre, figlia }) {
  const M = norm(madre);
  const F = norm(figlia);
  if (!M || !F) throw new Error("Parametri mancanti");

  // Evita duplicati (case-insensitive)
  const dup = db
    .prepare(
      "SELECT 1 FROM categorie WHERE madre = ? COLLATE NOCASE AND figlia = ? COLLATE NOCASE LIMIT 1"
    )
    .get(M, F);
  if (dup) throw new Error("Categoria già esistente");

  const info = db
    .prepare("INSERT INTO categorie (nome, madre, figlia) VALUES (?, ?, ?)")
    .run(`${M} - ${F}`, M, F);

  return { id: info.lastInsertRowid, madre: M, figlia: F };
}

/** Elimina una categoria */
export function removeCategoria({ madre, figlia }) {
  const M = norm(madre);
  const F = norm(figlia);
  if (!M || !F) throw new Error("Parametri mancanti");

  const info = db
    .prepare(
      "DELETE FROM categorie WHERE madre = ? COLLATE NOCASE AND figlia = ? COLLATE NOCASE"
    )
    .run(M, F);

  if (info.changes === 0) throw new Error("Categoria non trovata");
  return { removed: { madre: M, figlia: F } };
}

/** Rinomina una categoria figlia all'interno della stessa madre */
export function renameCategoria({ madre, figlia, new_figlia }) {
  const M = norm(madre);
  const F = norm(figlia);
  const NF = norm(new_figlia);
  if (!M || !F || !NF) throw new Error("Parametri mancanti");

  // esiste la vecchia?
  const exists = db
    .prepare(
      "SELECT 1 FROM categorie WHERE madre = ? COLLATE NOCASE AND figlia = ? COLLATE NOCASE LIMIT 1"
    )
    .get(M, F);
  if (!exists) throw new Error("Categoria non trovata");

  // conflitto sul nuovo nome?
  const clash = db
    .prepare(
      "SELECT 1 FROM categorie WHERE madre = ? COLLATE NOCASE AND figlia = ? COLLATE NOCASE LIMIT 1"
    )
    .get(M, NF);
  if (clash) throw new Error("Categoria già esistente");

  db.prepare(
    "UPDATE categorie SET figlia = ? WHERE madre = ? COLLATE NOCASE AND figlia = ? COLLATE NOCASE"
  ).run(NF, M, F);

  return { madre: M, from: F, to: NF };
}