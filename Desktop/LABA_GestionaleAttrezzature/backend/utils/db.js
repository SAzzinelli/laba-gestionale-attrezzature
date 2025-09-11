// backend/utils/db.js
// Centralized SQLite connection (better-sqlite3) + base schema bootstrap
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const DATA_DIR = process.env.DB_DIR || path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'app.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Minimal bootstrap: create essential tables if they do not exist.
// Adjust/extend freely; migrations can refine the schema.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    surname TEXT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    matricola TEXT,
    ruolo TEXT DEFAULT 'user',
    password_hash TEXT NOT NULL,
    corso_accademico TEXT
  );

  CREATE TABLE IF NOT EXISTS categorie (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS inventario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    categoria_id INTEGER,
    seriale TEXT,
    note TEXT,
    disponibile INTEGER DEFAULT 1,
    FOREIGN KEY (categoria_id) REFERENCES categorie(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS prestiti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventario_id INTEGER NOT NULL,
    utente_id INTEGER NOT NULL,
    dal TEXT NOT NULL,
    al TEXT NOT NULL,
    stato TEXT DEFAULT 'attivo',
    note TEXT,
    FOREIGN KEY (inventario_id) REFERENCES inventario(id) ON DELETE CASCADE,
    FOREIGN KEY (utente_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS richieste (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventario_id INTEGER NOT NULL,
    utente_id INTEGER NOT NULL,
    dal TEXT NOT NULL,
    al TEXT NOT NULL,
    stato TEXT DEFAULT 'in_attesa',
    motivo_rifiuto TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventario_id) REFERENCES inventario(id) ON DELETE CASCADE,
    FOREIGN KEY (utente_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS riparazioni (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventario_id INTEGER NOT NULL,
    descrizione TEXT,
    stato TEXT DEFAULT 'in_corso',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventario_id) REFERENCES inventario(id) ON DELETE CASCADE
  );

  -- Corsi + tabella ponte per assegnare più corsi a un oggetto
  CREATE TABLE IF NOT EXISTS corsi (
    corso TEXT PRIMARY KEY
  );

  CREATE TABLE IF NOT EXISTS inventario_corsi (
    inventario_id INTEGER NOT NULL,
    corso TEXT NOT NULL,
    PRIMARY KEY (inventario_id, corso),
    FOREIGN KEY (inventario_id) REFERENCES inventario(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS password_reset_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Seed minimo per evitare liste vuote durante i test
const seedCategorie = ['Regia e Videomaking','Graphic Design & Multimedia','Fashion Design','Pittura','Fotografia'];
for (const c of seedCategorie) {
  try { db.prepare('INSERT OR IGNORE INTO categorie(nome) VALUES (?)').run(c); } catch {}
}
for (const c of seedCategorie) {
  try { db.prepare('INSERT OR IGNORE INTO corsi(corso) VALUES (?)').run(c); } catch {}
}

export default db;
