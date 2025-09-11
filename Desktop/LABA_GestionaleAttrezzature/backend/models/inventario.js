import db from "../utils/db.js";

function todayISO() { return new Date().toISOString().slice(0, 10); }
const norm = (v) => String(v ?? "").trim();

const ensureUnitaLen = (arr, len) => {
  const out = Array.isArray(arr) ? arr.slice(0, len) : [];
  if (out.length < len) out.push(...Array.from({ length: len - out.length }, () => ""));
  return out;
};
const parseUnita = (json, len) => {
  try { return ensureUnitaLen(JSON.parse(json ?? "[]"), Math.max(1, len || 0)); }
  catch { return ensureUnitaLen([], Math.max(1, len || 0)); }
};

/** Lista completa con calcolo e unita[] */
export function listInventario() {
  const rows = db.prepare("SELECT * FROM inventario ORDER BY nome ASC").all();
  const t = todayISO();
  const inPrestito = db.prepare(`
    SELECT IFNULL(SUM(COALESCE(quantita, json_array_length(unit_ids_json))),0) AS q
    FROM prestiti
    WHERE inventario_id=@id
      AND data_uscita<=@t
      AND (data_rientro IS NULL OR data_rientro='' OR data_rientro>=@t)
  `);
  const inRiparazione = db.prepare(`
    SELECT IFNULL(SUM(COALESCE(quantita, json_array_length(unit_ids_json))),0) AS q
    FROM riparazioni
    WHERE inventario_id=@id
      AND data_inizio<=@t
      AND (data_fine IS NULL OR data_fine='' OR data_fine>=@t)
  `);
  return rows.map((r) => {
    const { q: prestitoQ } = inPrestito.get({ id: r.id, t });
    const { q: riparazioneQ } = inRiparazione.get({ id: r.id, t });
    const disponibili = Math.max(0, (r.quantita_totale || 0) - (prestitoQ || 0) - (riparazioneQ || 0));
    const unita = parseUnita(r.unita, r.quantita_totale);
    return { ...r, in_prestito: prestitoQ || 0, in_riparazione: riparazioneQ || 0, disponibili, unita };
  });
}

export function getInventario(id) {
  const r = db.prepare("SELECT * FROM inventario WHERE id=?").get(id);
  if (!r) return null;
  const t = todayISO();
  const { q: prestitoQ } = db.prepare(`
    SELECT IFNULL(SUM(COALESCE(quantita, json_array_length(unit_ids_json))),0) AS q
    FROM prestiti
    WHERE inventario_id=@id
      AND data_uscita<=@t
      AND (data_rientro IS NULL OR data_rientro='' OR data_rientro>=@t)
  `).get({ id, t });
  const { q: riparazioneQ } = db.prepare(`
    SELECT IFNULL(SUM(COALESCE(quantita, json_array_length(unit_ids_json))),0) AS q
    FROM riparazioni
    WHERE inventario_id=@id
      AND data_inizio<=@t
      AND (data_fine IS NULL OR data_fine='' OR data_fine>=@t)
  `).get({ id, t });
  const disponibili = Math.max(0, (r.quantita_totale || 0) - (prestitoQ || 0) - (riparazioneQ || 0));
  const unita = parseUnita(r.unita, r.quantita_totale);
  return { ...r, in_prestito: prestitoQ || 0, in_riparazione: riparazioneQ || 0, disponibili, unita };
}

/** Insert (accetta opzionale unita[]) */
export function addInventario(body) {
  const safe = {
    nome: norm(body.nome),
    quantita_totale: parseInt(body.quantita_totale ?? 0, 10) || 0,
    categoria_madre: norm(body.categoria_madre),
    categoria_figlia: body.categoria_figlia ? norm(body.categoria_figlia) : null,
    posizione: body.posizione ? norm(body.posizione) : null,
    note: body.note != null ? String(body.note) : null,
    in_manutenzione: body.in_manutenzione ? 1 : 0,
  };
  const unitaArr = Array.isArray(body.unita)
    ? ensureUnitaLen(body.unita.map(norm), safe.quantita_totale)
    : ensureUnitaLen([], safe.quantita_totale);
  const info = db.prepare(`
    INSERT INTO inventario
      (nome, quantita_totale, quantita, categoria_madre, categoria_figlia, posizione, note, in_manutenzione, unita)
    VALUES
      (@nome, @quantita_totale, @quantita_totale, @categoria_madre, @categoria_figlia, @posizione, @note, @in_manutenzione, @unita)
  `).run({ ...safe, unita: JSON.stringify(unitaArr) });
  return getInventario(info.lastInsertRowid);
}

/** Update (se passi unita[], la aggiorna; altrimenti lascia quella esistente) */
export function updateInventario(id, body) {
  const safe = {
    id,
    nome: norm(body.nome),
    quantita_totale: parseInt(body.quantita_totale ?? 0, 10) || 0,
    categoria_madre: norm(body.categoria_madre),
    categoria_figlia: body.categoria_figlia ? norm(body.categoria_figlia) : null,
    posizione: body.posizione ? norm(body.posizione) : null,
    note: body.note != null ? String(body.note) : null,
    in_manutenzione: body.in_manutenzione ? 1 : 0,
  };
  const hasUnita = Array.isArray(body.unita);
  const unitaJSON = hasUnita
    ? JSON.stringify(ensureUnitaLen(body.unita.map(norm), safe.quantita_totale))
    : null;

  db.prepare(`
    UPDATE inventario SET
      nome=@nome,
      quantita_totale=@quantita_totale,
      quantita=@quantita_totale,
      categoria_madre=@categoria_madre,
      categoria_figlia=@categoria_figlia,
      posizione=@posizione,
      note=@note,
      in_manutenzione=@in_manutenzione,
      unita=COALESCE(@unita, unita),
      updated_at=CURRENT_TIMESTAMP
    WHERE id=@id
  `).run({ ...safe, unita: unitaJSON });

  return getInventario(id);
}

export function delInventario(id) {
  const info = db.prepare("DELETE FROM inventario WHERE id=?").run(id);
  return { deleted: info.changes > 0 };
}

/** KPI riepilogo */
export function summary(threshold = 1) {
  const inv = listInventario();
  const strumenti_totali = inv.length;
  const strumenti_esauriti = inv.filter((r) => r.disponibili === 0).length;

  const t = todayISO();
  const strumenti_in_prestito = db.prepare(`
    SELECT COUNT(DISTINCT inventario_id) AS c
    FROM prestiti
    WHERE data_uscita<=@t
      AND (data_rientro IS NULL OR data_rientro='' OR data_rientro>=@t)
  `).get({ t }).c;

  const prestiti_scaduti = db.prepare(`
    SELECT COUNT(*) AS c
    FROM prestiti
    WHERE data_rientro IS NOT NULL AND data_rientro<@t
  `).get({ t }).c;

  const th = Number(threshold);
  const sotto_soglia = inv.filter((r) => (r.disponibili ?? 0) <= th).length;

  return { strumenti_totali, strumenti_in_prestito, strumenti_esauriti, prestiti_scaduti, sotto_soglia, soglia_usata: th };
}

/** Elenco oggetti sotto soglia (<= threshold) */
export function lowStock(threshold = 1) {
  const inv = listInventario();
  const th = Number(threshold);
  return inv.filter((r) => (r.disponibili ?? 0) <= th);
}

// --- Helpers stock aggregato basati sulla vista v_inventario_stock ---
export function getStockRow(id) {
  return db.prepare(`
    SELECT 
      id,
      nome,
      COALESCE(quantita_totale, 0)     AS quantita_totale,
      COALESCE(qta_prestata, 0)        AS qta_prestata,
      COALESCE(qta_in_riparazione, 0)  AS qta_in_riparazione,
      COALESCE(qta_disponibile, 0)     AS qta_disponibile
    FROM v_inventario_stock
    WHERE id = ?
  `).get(id);
}

export function listWithStock() {
  return db.prepare(`
    SELECT 
      id,
      nome,
      COALESCE(quantita_totale, 0)     AS quantita_totale,
      COALESCE(qta_prestata, 0)        AS qta_prestata,
      COALESCE(qta_in_riparazione, 0)  AS qta_in_riparazione,
      COALESCE(qta_disponibile, 0)     AS qta_disponibile
    FROM v_inventario_stock
    ORDER BY nome ASC
  `).all();
}

export function listDisponibili() {
  return db.prepare(`
    SELECT 
      id,
      nome,
      COALESCE(quantita_totale, 0)     AS quantita_totale,
      COALESCE(qta_prestata, 0)        AS qta_prestata,
      COALESCE(qta_in_riparazione, 0)  AS qta_in_riparazione,
      COALESCE(qta_disponibile, 0)     AS qta_disponibile
    FROM v_inventario_stock
    WHERE COALESCE(qta_disponibile, 0) > 0
    ORDER BY nome ASC
  `).all();
}

export function isDisponibile(id, richiesta = 1) {
  const r = getStockRow(id);
  const disp = Number(r?.qta_disponibile ?? 0);
  const q = Number(richiesta ?? 1);
  return disp >= q;
}