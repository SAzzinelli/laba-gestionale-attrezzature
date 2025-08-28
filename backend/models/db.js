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

// inventario (con colonna unita JSON)
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
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_prestiti_inv ON prestiti(inventario_id);
`);

// MIGRAZIONI SOFT
// inventario.unita
{
  const colsInv = db.prepare(`PRAGMA table_info(inventario)`).all();
  if (!colsInv.some(c => c.name === "unita")) {
    db.exec(`ALTER TABLE inventario ADD COLUMN unita TEXT DEFAULT '[]'`);
  }
}
// prestiti columns
{
  const colsP = db.prepare(`PRAGMA table_info(prestiti)`).all();
  if (!colsP.some(c => c.name === "chi")) db.exec(`ALTER TABLE prestiti ADD COLUMN chi TEXT`);
  if (!colsP.some(c => c.name === "created_at")) db.exec(`ALTER TABLE prestiti ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP`);
  if (!colsP.some(c => c.name === "updated_at")) db.exec(`ALTER TABLE prestiti ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP`);
  if (!colsP.some(c => c.name === "unita")) db.exec(`ALTER TABLE prestiti ADD COLUMN unita TEXT DEFAULT '[]'`);
}

export default db;