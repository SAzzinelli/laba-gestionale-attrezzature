import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, "..");
const dbPath = path.join(dbDir, "data.db");
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
if (!fs.existsSync(dbPath)) fs.closeSync(fs.openSync(dbPath, "w"));

export const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

// --- CREAZIONE TABELLE BASE ---
// categorie
db.exec(`
  CREATE TABLE IF NOT EXISTS categorie (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    madre  TEXT NOT NULL,
    figlia TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_categorie_unique
    ON categorie (madre COLLATE NOCASE, figlia COLLATE NOCASE);
`);

// inventario
db.exec(`
  CREATE TABLE IF NOT EXISTS inventario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    quantita_totale INTEGER NOT NULL DEFAULT 0,
    categoria_madre TEXT NOT NULL,
    categoria_figlia TEXT,
    posizione TEXT,
    note TEXT,
    in_manutenzione INTEGER NOT NULL DEFAULT 0,
    unita TEXT DEFAULT '[]',
    quantita INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// prestiti
db.exec(`
  CREATE TABLE IF NOT EXISTS prestiti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventario_id INTEGER NOT NULL REFERENCES inventario(id) ON DELETE CASCADE,
    quantita INTEGER NOT NULL DEFAULT 1,
    chi TEXT,
    data_uscita TEXT NOT NULL,
    data_rientro TEXT,
    note TEXT,
    unita TEXT DEFAULT '[]',
    unit_ids_json TEXT DEFAULT '[]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_prestiti_inv ON prestiti(inventario_id);
`);

// riparazioni (alcuni router la interrogano: evitiamo 500 se manca)
db.exec(`
  CREATE TABLE IF NOT EXISTS riparazioni (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventario_id INTEGER NOT NULL REFERENCES inventario(id) ON DELETE CASCADE,
    quantita INTEGER NOT NULL DEFAULT 0,
    stato TEXT,
    note TEXT,
    unit_ids_json TEXT DEFAULT '[]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_riparazioni_inv ON riparazioni(inventario_id);
`);

// --- MIGRAZIONI SOFT E NORMALIZZAZIONI ---
// INVENTARIO: assicurati che quantita e quantita_totale esistano, siano non null e allineati
{
  const cols = db.prepare(`PRAGMA table_info(inventario)`).all();
  const hasQta = cols.some(c => c.name === "quantita");
  const hasQtaTot = cols.some(c => c.name === "quantita_totale");
  if (!hasQta) {
    db.exec(`ALTER TABLE inventario ADD COLUMN quantita INTEGER DEFAULT 0`);
  }
  if (!hasQtaTot) {
    db.exec(`ALTER TABLE inventario ADD COLUMN quantita_totale INTEGER DEFAULT 0`);
  }
  // porta eventuali NULL a 0
  db.exec(`UPDATE inventario SET quantita = COALESCE(quantita, 0)`);
  db.exec(`UPDATE inventario SET quantita_totale = COALESCE(quantita_totale, quantita)`);
  db.exec(`UPDATE inventario SET quantita = COALESCE(quantita, quantita_totale)`);
}

// PRESTITI: assicurati che quantita, unita, unit_ids_json esistano e siano valorizzati
{
  const cols = db.prepare(`PRAGMA table_info(prestiti)`).all();
  if (!cols.some(c => c.name === "quantita")) db.exec(`ALTER TABLE prestiti ADD COLUMN quantita INTEGER DEFAULT 1`);
  if (!cols.some(c => c.name === "unita")) db.exec(`ALTER TABLE prestiti ADD COLUMN unita TEXT DEFAULT '[]'`);
  if (!cols.some(c => c.name === "unit_ids_json")) db.exec(`ALTER TABLE prestiti ADD COLUMN unit_ids_json TEXT DEFAULT '[]'`);
  if (!cols.some(c => c.name === "created_at")) db.exec(`ALTER TABLE prestiti ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP`);
  if (!cols.some(c => c.name === "updated_at")) db.exec(`ALTER TABLE prestiti ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP`);
  // normalizza
  db.exec(`UPDATE prestiti SET quantita = COALESCE(quantita, 1)`);
  db.exec(`UPDATE prestiti SET unita = COALESCE(unita, '[]')`);
  db.exec(`UPDATE prestiti SET unit_ids_json = COALESCE(unit_ids_json, '[]')`);
}

// PRESTITI: anagrafica studente (Prestato a)
{
  const cols = db.prepare(`PRAGMA table_info(prestiti)`).all();
  const missing = (name) => !cols.some(c => c.name === name);
  if (missing("prestato_nome"))      db.exec(`ALTER TABLE prestiti ADD COLUMN prestato_nome TEXT`);
  if (missing("prestato_cognome"))   db.exec(`ALTER TABLE prestiti ADD COLUMN prestato_cognome TEXT`);
  if (missing("prestato_telefono"))  db.exec(`ALTER TABLE prestiti ADD COLUMN prestato_telefono TEXT`);
  if (missing("prestato_email"))     db.exec(`ALTER TABLE prestiti ADD COLUMN prestato_email TEXT`);
  if (missing("prestato_matricola")) db.exec(`ALTER TABLE prestiti ADD COLUMN prestato_matricola TEXT`);
}

// RIPARAZIONI: assicurati che unit_ids_json esista
{
  const cols = db.prepare(`PRAGMA table_info(riparazioni)`).all();
  if (!cols.some(c => c.name === "unit_ids_json")) db.exec(`ALTER TABLE riparazioni ADD COLUMN unit_ids_json TEXT DEFAULT '[]'`);
  if (!cols.some(c => c.name === "quantita")) db.exec(`ALTER TABLE riparazioni ADD COLUMN quantita INTEGER DEFAULT 0`);
  db.exec(`UPDATE riparazioni SET unit_ids_json = COALESCE(unit_ids_json, '[]')`);
  db.exec(`UPDATE riparazioni SET quantita = COALESCE(quantita, 0)`);
}

// --- TRIGGER aggiornamento updated_at ---
const triggers = [
  {
    table: "inventario",
    name: "tr_inventario_updated_at",
  },
  {
    table: "prestiti",
    name: "tr_prestiti_updated_at",
  },
  {
    table: "riparazioni",
    name: "tr_riparazioni_updated_at",
  }
];
for (const t of triggers) {
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS ${t.name}
    AFTER UPDATE ON ${t.table}
    BEGIN
      UPDATE ${t.table} SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);
}

// --- VISTE DI SUPPORTO (usate da /summary e /low-stock in alcune codebase) ---
// prestiti attivi = senza data_rientro (conteggia unità da unit_ids_json se presente)
try {
  db.exec(`DROP VIEW IF EXISTS v_prestiti_attivi;`);
  db.exec(`
    CREATE VIEW v_prestiti_attivi AS
    SELECT inventario_id,
           SUM(
             CASE
               WHEN json_valid(unit_ids_json) THEN json_array_length(unit_ids_json)
               ELSE COALESCE(quantita, 0)
             END
           ) AS qta_prestata
    FROM prestiti
    WHERE data_rientro IS NULL OR TRIM(data_rientro) = ''
    GROUP BY inventario_id;
  `);
} catch (_) {}

// riparazioni in corso (conteggia unità da unit_ids_json se presente)
try {
  db.exec(`DROP VIEW IF EXISTS v_riparazioni_impegnate;`);
  db.exec(`
    CREATE VIEW v_riparazioni_impegnate AS
    SELECT inventario_id,
           SUM(
             CASE
               WHEN json_valid(unit_ids_json) THEN json_array_length(unit_ids_json)
               ELSE COALESCE(quantita, 0)
             END
           ) AS qta_in_riparazione
    FROM riparazioni
    GROUP BY inventario_id;
  `);
} catch (_) {}

// aggregato stock disponibile (totale - prestiti attivi - riparazioni)
try {
  db.exec(`DROP VIEW IF EXISTS v_inventario_stock;`);
  db.exec(`
    CREATE VIEW v_inventario_stock AS
    SELECT i.id,
           i.nome,
           i.quantita_totale,
           COALESCE(p.qta_prestata, 0) AS qta_prestata,
           COALESCE(r.qta_in_riparazione, 0) AS qta_in_riparazione,
           (i.quantita_totale - COALESCE(p.qta_prestata, 0) - COALESCE(r.qta_in_riparazione, 0)) AS qta_disponibile
    FROM inventario i
    LEFT JOIN v_prestiti_attivi p ON p.inventario_id = i.id
    LEFT JOIN v_riparazioni_impegnate r ON r.inventario_id = i.id;
  `);
} catch (_) {}

export default db;