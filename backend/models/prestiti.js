import { db } from "./db.js";
import { getInventario } from "./inventario.js";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  const d1 = new Date(a + "T00:00:00");
  const d2 = new Date(b + "T00:00:00");
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

function availableOnDay(inventario_id, dayISO) {
  const inv = getInventario(inventario_id);
  if (!inv) return 0;
  const used = db
    .prepare(
      `
    SELECT IFNULL(SUM(quantita),0) AS used
    FROM prestiti
    WHERE inventario_id=@id
      AND data_uscita<=@d
      AND (data_rientro IS NULL OR data_rientro='' OR data_rientro>=@d)
  `,
    )
    .get({ id: inventario_id, d: dayISO }).used;
  return Math.max(0, (inv.quantita_totale || 0) - (used || 0));
}

/**
 * Trova la prima data di inizio (>= startISO) in cui tutto l'intervallo [start, end]
 * può essere soddisfatto con la quantità richiesta.
 */
function firstAvailable(inventario_id, startISO, endISO, qty) {
  const step = 86400000;
  const s = new Date(startISO);
  const e = new Date(endISO || startISO);

  // prova fino a 180 giorni nel futuro
  for (let k = 0; k < 180; k++) {
    const s2 = new Date(s.getTime() + k * step);
    const e2 = new Date(e.getTime() + k * step);
    let ok = true;
    for (let t = new Date(s2); t <= e2; t = new Date(t.getTime() + step)) {
      const day = t.toISOString().slice(0, 10);
      if (qty > availableOnDay(inventario_id, day)) {
        ok = false;
        break;
      }
    }
    if (ok) return s2.toISOString().slice(0, 10);
  }
  return null;
}

export function listPrestiti() {
  const rows = db
    .prepare(
      `
    SELECT p.*, i.nome AS inventario_nome, i.categoria_madre, i.categoria_figlia, i.posizione
    FROM prestiti p
    JOIN inventario i ON i.id = p.inventario_id
    ORDER BY p.created_at DESC
  `,
    )
    .all();
  const today = todayISO();
  return rows.map((r) => {
    const tot = r.data_rientro
      ? daysBetween(r.data_uscita, r.data_rientro) + 1
      : 1;
    const rem = r.data_rientro
      ? daysBetween(today, r.data_rientro)
      : daysBetween(today, r.data_uscita) >= 0
        ? 1
        : 0;
    return { ...r, giorni_totali: tot, giorni_rimanenti: rem };
  });
}

export function addPrestito(b) {
  const inv = getInventario(b.inventario_id);
  if (!inv) throw new Error("Oggetto inesistente");

  const q = parseInt(b.quantita, 10);
  if (q < 1 || q > 10) throw new Error("Quantità non valida (1–10)");

  const start = b.data_uscita;
  const end = b.data_rientro || b.data_uscita;
  const step = 86400000;

  for (
    let t = new Date(start);
    t <= new Date(end);
    t = new Date(t.getTime() + step)
  ) {
    const day = t.toISOString().slice(0, 10);
    const left = availableOnDay(b.inventario_id, day);
    if (q > left) {
      const first = firstAvailable(b.inventario_id, start, end, q);
      const [y, m, d] = (first || "").split("-");
      const when = first ? `${d}/${m}/${y}` : "—";
      throw new Error(
        `Non ci sono sufficienti ${inv.nome} disponibili: max ${left} per queste date. Prima data utile: ${when}`,
      );
    }
  }

  const info = db
    .prepare(
      `
    INSERT INTO prestiti (inventario_id, chi, data_uscita, data_rientro, quantita, note)
    VALUES (@inventario_id, @chi, @data_uscita, @data_rientro, @quantita, @note)
  `,
    )
    .run(b);

  return getPrestito(info.lastInsertRowid);
}

export function updatePrestito(id, b) {
  const inv = getInventario(b.inventario_id);
  if (!inv) throw new Error("Oggetto inesistente");

  const q = parseInt(b.quantita, 10);
  if (q < 1 || q > 10) throw new Error("Quantità non valida (1–10)");

  const start = b.data_uscita;
  const end = b.data_rientro || b.data_uscita;
  const step = 86400000;

  for (
    let t = new Date(start);
    t <= new Date(end);
    t = new Date(t.getTime() + step)
  ) {
    const day = t.toISOString().slice(0, 10);
    const used = db
      .prepare(
        `
      SELECT IFNULL(SUM(quantita),0) AS used
      FROM prestiti
      WHERE inventario_id=@id
        AND data_uscita<=@d
        AND (data_rientro IS NULL OR data_rientro='' OR data_rientro>=@d)
        AND id != @self
    `,
      )
      .get({ id: b.inventario_id, d: day, self: id }).used;
    const left = Math.max(0, (inv.quantita_totale || 0) - (used || 0));
    if (q > left) {
      throw new Error(
        `Non ci sono sufficienti ${inv.nome} disponibili: max ${left} per queste date.`,
      );
    }
  }

  db.prepare(
    `
    UPDATE prestiti SET
      inventario_id=@inventario_id,
      chi=@chi,
      data_uscita=@data_uscita,
      data_rientro=@data_rientro,
      quantita=@quantita,
      note=@note,
      updated_at=CURRENT_TIMESTAMP
    WHERE id=@id
  `,
  ).run({ ...b, id });

  return getPrestito(id);
}

export function delPrestito(id) {
  const info = db.prepare("DELETE FROM prestiti WHERE id = ?").run(id);
  return { deleted: info.changes > 0 };
}

export function getPrestito(id) {
  const r = db
    .prepare(
      `
    SELECT p.*, i.nome AS inventario_nome
    FROM prestiti p
    JOIN inventario i ON i.id = p.inventario_id
    WHERE p.id = ?
  `,
    )
    .get(id);
  if (!r) return null;
  const today = todayISO();
  const tot = r.data_rientro
    ? daysBetween(r.data_uscita, r.data_rientro) + 1
    : 1;
  const rem = r.data_rientro
    ? daysBetween(today, r.data_rientro)
    : daysBetween(today, r.data_uscita) >= 0
      ? 1
      : 0;
  return { ...r, giorni_totali: tot, giorni_rimanenti: rem };
}
