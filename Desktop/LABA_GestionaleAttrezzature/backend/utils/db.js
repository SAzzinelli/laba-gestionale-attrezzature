// backend/utils/db.js
// Centralized SQLite connection (better-sqlite3) + base schema bootstrap
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const DATA_DIR = process.env.DB_DIR || path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'app.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Funzione per inizializzare il database
export async function initDatabase() {
  console.log('Inizializzazione database...');
  
  // Usa lo schema originale esistente - non creare nuove tabelle
  // Le tabelle vengono create automaticamente dai modelli esistenti
  
  // Inserisci admin user se non esiste (usando lo schema originale)
  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('laba2025', 10);
    
    // Usa lo schema originale per users
    db.prepare(`
      INSERT INTO users (email, password_hash, name, surname, ruolo, corso_accademico)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('admin', hashedPassword, 'Admin', 'Sistema', 'admin', 'Tutti');
    
    console.log('Admin user creato: admin / laba2025');
  }

  // Inserisci corsi accademici LABA (usando lo schema originale)
  const corsiLABA = [
    'Regia e Videomaking',
    'Graphic Design & Multimedia', 
    'Fashion Design',
    'Pittura',
    'Fotografia',
    'Interior Design',
    'Cinema e Audiovisivi',
    'Design'
  ];

  const insertCorso = db.prepare('INSERT OR IGNORE INTO corsi (corso) VALUES (?)');
  corsiLABA.forEach((nome) => {
    try {
      insertCorso.run(nome);
    } catch (e) {
      // Ignora se già esiste
    }
  });

  console.log('Database inizializzato con successo!');
  console.log('Admin user: admin / laba2025');
  console.log('Corsi inseriti:', corsiLABA.length);
}

export default db;
