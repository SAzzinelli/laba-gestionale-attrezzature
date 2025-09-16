import pkg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pkg;

// Configurazione Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.kzqabwmtpmlhaueqiuoc:Dittafono26!@aws-1-eu-north-1.pooler.supabase.com:6543/postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

// Test connessione
pool.on('connect', () => {
  console.log('✅ Connesso a PostgreSQL/Supabase');
});

pool.on('error', (err) => {
  console.error('❌ Errore connessione PostgreSQL:', err);
});

// Funzione per inizializzare il database
export async function initDatabase() {
  console.log('🔄 Inizializzazione database PostgreSQL...');
  
  try {
    // Test connessione
    const client = await pool.connect();
    console.log('✅ Connessione PostgreSQL verificata');
    
    // Crea schema unificato completo
    await client.query(`
      -- Tabella users
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        surname VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        matricola VARCHAR(50),
        ruolo VARCHAR(50) DEFAULT 'user',
        corso_accademico VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabella categorie_semplici
      CREATE TABLE IF NOT EXISTS categorie_semplici (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL UNIQUE
      );

      -- Tabella inventario
      CREATE TABLE IF NOT EXISTS inventario (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        quantita_totale INTEGER NOT NULL DEFAULT 0,
        categoria_madre VARCHAR(255) NOT NULL,
        categoria_id INTEGER REFERENCES categorie_semplici(id),
        posizione VARCHAR(255),
        note TEXT,
        in_manutenzione BOOLEAN NOT NULL DEFAULT FALSE,
        unita JSONB DEFAULT '[]',
        quantita INTEGER DEFAULT 0,
        soglia_minima INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabella prestiti
      CREATE TABLE IF NOT EXISTS prestiti (
        id SERIAL PRIMARY KEY,
        inventario_id INTEGER NOT NULL REFERENCES inventario(id) ON DELETE CASCADE,
        quantita INTEGER NOT NULL DEFAULT 1,
        chi VARCHAR(255),
        data_uscita DATE NOT NULL,
        data_rientro DATE,
        note TEXT,
        unita JSONB DEFAULT '[]',
        unit_ids_json JSONB DEFAULT '[]',
        stato VARCHAR(50) DEFAULT 'attivo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_prestiti_inv ON prestiti(inventario_id);

      -- Tabella riparazioni
      CREATE TABLE IF NOT EXISTS riparazioni (
        id SERIAL PRIMARY KEY,
        inventario_id INTEGER NOT NULL REFERENCES inventario(id) ON DELETE CASCADE,
        quantita INTEGER NOT NULL DEFAULT 0,
        stato VARCHAR(50),
        note TEXT,
        unit_ids_json JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_riparazioni_inv ON riparazioni(inventario_id);

      -- Tabella richieste
      CREATE TABLE IF NOT EXISTS richieste (
        id SERIAL PRIMARY KEY,
        utente_id INTEGER NOT NULL,
        inventario_id INTEGER NOT NULL,
        dal DATE NOT NULL,
        al DATE NOT NULL,
        stato VARCHAR(50) DEFAULT 'in_attesa',
        motivo TEXT,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(utente_id) REFERENCES users(id),
        FOREIGN KEY(inventario_id) REFERENCES inventario(id)
      );
      CREATE INDEX IF NOT EXISTS idx_rich_user ON richieste (utente_id);
      CREATE INDEX IF NOT EXISTS idx_rich_inv ON richieste (inventario_id);
      CREATE INDEX IF NOT EXISTS idx_rich_state ON richieste (stato);

      -- Tabella segnalazioni
      CREATE TABLE IF NOT EXISTS segnalazioni (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        prestito_id INTEGER,
        inventario_id INTEGER,
        tipo VARCHAR(100) NOT NULL,
        messaggio TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        handled_by INTEGER,
        handled_at TIMESTAMP,
        stato VARCHAR(50) DEFAULT 'aperta',
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(prestito_id) REFERENCES prestiti(id),
        FOREIGN KEY(inventario_id) REFERENCES inventario(id)
      );
      CREATE INDEX IF NOT EXISTS idx_segn_user ON segnalazioni (user_id);
      CREATE INDEX IF NOT EXISTS idx_segn_tipo ON segnalazioni (tipo);
      CREATE INDEX IF NOT EXISTS idx_segn_state ON segnalazioni (stato);

      -- Tabella corsi
      CREATE TABLE IF NOT EXISTS corsi (
        corso VARCHAR(255) PRIMARY KEY
      );

      -- Tabella inventario_corsi
      CREATE TABLE IF NOT EXISTS inventario_corsi (
        inventario_id INTEGER NOT NULL,
        corso VARCHAR(255) NOT NULL,
        PRIMARY KEY (inventario_id, corso),
        FOREIGN KEY (inventario_id) REFERENCES inventario(id) ON DELETE CASCADE
      );

      -- Tabella inventario_unita
      CREATE TABLE IF NOT EXISTS inventario_unita (
        id SERIAL PRIMARY KEY,
        inventario_id INTEGER NOT NULL,
        codice_univoco VARCHAR(255) UNIQUE NOT NULL,
        stato VARCHAR(50) DEFAULT 'disponibile',
        prestito_corrente_id INTEGER,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (inventario_id) REFERENCES inventario(id),
        FOREIGN KEY (prestito_corrente_id) REFERENCES prestiti(id)
      );
      CREATE INDEX IF NOT EXISTS idx_inv_unita_inv ON inventario_unita (inventario_id);
      CREATE INDEX IF NOT EXISTS idx_inv_unita_codice ON inventario_unita (codice_univoco);

      -- Tabella password_reset_requests
      CREATE TABLE IF NOT EXISTS password_reset_requests (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      );
    `);

    // Inserisci admin user se non esiste
    const adminExists = await client.query('SELECT id FROM users WHERE email = $1', ['admin']);
    if (adminExists.rows.length === 0) {
      const hashedPassword = bcrypt.hashSync('laba2025', 10);
      
      await client.query(`
        INSERT INTO users (email, password_hash, name, surname, ruolo, corso_accademico)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['admin', hashedPassword, 'Admin', 'Sistema', 'admin', 'Tutti']);
      
      console.log('✅ Admin user creato: admin / laba2025');
    }

    // Inserisci corsi accademici LABA
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

    for (const nome of corsiLABA) {
      await client.query('INSERT INTO corsi (corso) VALUES ($1) ON CONFLICT (corso) DO NOTHING', [nome]);
    }

    // Inserisci categorie semplici di esempio
    const categorieSemplici = [
      'Attrezzature Video',
      'Computer e Software', 
      'Macchine da Cucire',
      'Pennelli e Colori',
      'Macchine Fotografiche',
      'Obiettivi',
      'Tavoli da Disegno',
      'Software Design'
    ];

    for (const nome of categorieSemplici) {
      await client.query('INSERT INTO categorie_semplici (nome) VALUES ($1) ON CONFLICT (nome) DO NOTHING', [nome]);
    }

    client.release();
    
    console.log('✅ Database PostgreSQL inizializzato con successo!');
    console.log('✅ Schema unificato creato con tutte le tabelle');
    console.log('✅ Admin user: admin / laba2025');
    console.log(`✅ Corsi inseriti: ${corsiLABA.length}`);
    console.log(`✅ Categorie semplici inserite: ${categorieSemplici.length}`);
    
  } catch (error) {
    console.error('❌ Errore durante l\'inizializzazione del database:', error);
    throw error;
  }
}

// Wrapper per query con gestione errori
export async function query(text, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows;
  } catch (error) {
    console.error('❌ Errore query PostgreSQL:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Wrapper per transazioni
export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default pool;
