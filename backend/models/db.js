import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dbPath = path.join(__dirname, '..', 'data.db')
if (!fs.existsSync(dbPath)) fs.closeSync(fs.openSync(dbPath,'w'))
export const db = new Database(dbPath)
db.pragma('foreign_keys=ON')

db.exec(`
CREATE TABLE IF NOT EXISTS categorie (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  madre TEXT CHECK (madre IN ('TRIENNIO','BIENNIO')) NOT NULL,
  figlia TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS inventario (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  quantita_totale INTEGER NOT NULL CHECK (quantita_totale>=0),
  categoria_madre TEXT CHECK (categoria_madre IN ('TRIENNIO','BIENNIO')) NOT NULL,
  categoria_figlia TEXT,
  posizione TEXT,
  note TEXT,
  in_manutenzione INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS prestiti (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inventario_id INTEGER NOT NULL,
  chi TEXT NOT NULL,
  data_uscita TEXT NOT NULL,
  data_rientro TEXT,
  quantita INTEGER NOT NULL CHECK (quantita>0),
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inventario_id) REFERENCES inventario(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS riparazioni (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inventario_id INTEGER NOT NULL,
  descrizione TEXT,
  data_inizio TEXT NOT NULL,
  data_fine TEXT,
  stato TEXT CHECK (stato IN ('APERTO','CHIUSO')) DEFAULT 'APERTO',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inventario_id) REFERENCES inventario(id) ON DELETE CASCADE
);
`)
