const Database = require('better-sqlite3');
const path = require('path');

// Crea la directory data se non esiste
const fs = require('fs');
const dataDir = path.join(process.cwd(), 'backend', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'app.db'));

console.log('Inizializzazione database...');

// Crea tabella users
db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    surname TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    corso_accademico TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// Crea tabella corsi
db.exec(`
CREATE TABLE IF NOT EXISTS corsi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descrizione TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// Crea tabella categorie
db.exec(`
CREATE TABLE IF NOT EXISTS categorie (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descrizione TEXT,
    madre TEXT,
    figlia TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// Crea tabella inventario
db.exec(`
CREATE TABLE IF NOT EXISTS inventario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descrizione TEXT,
    categoria_id INTEGER,
    quantita_totale INTEGER DEFAULT 0,
    quantita_disponibile INTEGER DEFAULT 0,
    corso_accademico TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorie(id)
);
`);

// Crea tabella inventario_unita
db.exec(`
CREATE TABLE IF NOT EXISTS inventario_unita (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventario_id INTEGER NOT NULL,
    codice_univoco TEXT UNIQUE NOT NULL,
    stato TEXT DEFAULT 'disponibile',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventario_id) REFERENCES inventario(id)
);
`);

// Crea tabella richieste
db.exec(`
CREATE TABLE IF NOT EXISTS richieste (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    utente_id INTEGER NOT NULL,
    inventario_id INTEGER NOT NULL,
    quantita INTEGER NOT NULL,
    data_inizio DATE NOT NULL,
    data_fine DATE NOT NULL,
    stato TEXT DEFAULT 'pending',
    motivo TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utente_id) REFERENCES users(id),
    FOREIGN KEY (inventario_id) REFERENCES inventario(id)
);
`);

// Crea tabella prestiti
db.exec(`
CREATE TABLE IF NOT EXISTS prestiti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    richiesta_id INTEGER NOT NULL,
    inventario_unita_id INTEGER NOT NULL,
    data_inizio DATE NOT NULL,
    data_fine DATE NOT NULL,
    data_restituzione DATE,
    stato TEXT DEFAULT 'attivo',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (richiesta_id) REFERENCES richieste(id),
    FOREIGN KEY (inventario_unita_id) REFERENCES inventario_unita(id)
);
`);

// Crea tabella riparazioni
db.exec(`
CREATE TABLE IF NOT EXISTS riparazioni (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventario_unita_id INTEGER NOT NULL,
    descrizione TEXT NOT NULL,
    stato TEXT DEFAULT 'pending',
    data_inizio DATE,
    data_fine DATE,
    costo DECIMAL(10,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventario_unita_id) REFERENCES inventario_unita(id)
);
`);

// Crea tabella segnalazioni
db.exec(`
CREATE TABLE IF NOT EXISTS segnalazioni (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    utente_id INTEGER NOT NULL,
    inventario_unita_id INTEGER NOT NULL,
    tipo TEXT NOT NULL,
    descrizione TEXT NOT NULL,
    stato TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utente_id) REFERENCES users(id),
    FOREIGN KEY (inventario_unita_id) REFERENCES inventario_unita(id)
);
`);

// Crea tabella password_reset_requests
db.exec(`
CREATE TABLE IF NOT EXISTS password_reset_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL
);
`);

// Inserisci admin user
const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin');
if (!adminExists) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync('laba2025', 10);
    
    db.prepare(`
        INSERT INTO users (email, password, name, surname, role, corso_accademico)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run('admin', hashedPassword, 'Admin', 'Sistema', 'admin', 'Tutti');
    
    console.log('Admin user creato: admin / laba2025');
}

// Inserisci corsi di esempio
const corsi = [
    ['Fotografia', 'Corso di Fotografia Digitale'],
    ['Graphic Design', 'Design Grafico e Comunicazione Visiva'],
    ['Web Design', 'Progettazione e Sviluppo Web'],
    ['Video Making', 'Produzione Video e Montaggio'],
    ['Illustrazione', 'Illustrazione Digitale e Tradizionale']
];

const insertCorso = db.prepare('INSERT INTO corsi (nome, descrizione) VALUES (?, ?)');
corsi.forEach(([nome, descrizione]) => {
    try {
        insertCorso.run(nome, descrizione);
    } catch (e) {
        // Ignora se già esiste
    }
});

console.log('Database inizializzato con successo!');
console.log('Tabelle create: users, corsi, categorie, inventario, inventario_unita, richieste, prestiti, riparazioni, segnalazioni, password_reset_requests');
console.log('Admin user: admin / laba2025');
console.log('Corsi inseriti:', corsi.length);

db.close();
