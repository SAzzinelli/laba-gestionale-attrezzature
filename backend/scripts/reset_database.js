// Script per reset completo del database
import { query } from '../utils/postgres.js';

async function resetDatabase() {
  console.log('🧹 Inizio reset completo database...');
  
  try {
    // Disabilita foreign key checks temporaneamente
    await query('SET session_replication_role = replica;');
    
    // Pulisci tutte le tabelle in ordine corretto (dalle dipendenze alle tabelle principali)
    console.log('🗑️ Pulizia tabelle dipendenti...');
    
    await query('DELETE FROM inventario_unita;');
    await query('DELETE FROM inventario_corsi;');
    await query('DELETE FROM password_reset_requests;');
    await query('DELETE FROM segnalazioni;');
    await query('DELETE FROM riparazioni;');
    await query('DELETE FROM richieste;');
    await query('DELETE FROM prestiti;');
    await query('DELETE FROM inventario;');
    await query('DELETE FROM categorie;');
    await query('DELETE FROM corsi;');
    await query('DELETE FROM users WHERE id != -1;'); // Mantieni solo admin speciale
    
    // Riabilita foreign key checks
    await query('SET session_replication_role = DEFAULT;');
    
    // Reset sequence per ID
    console.log('🔄 Reset sequence ID...');
    await query('ALTER SEQUENCE users_id_seq RESTART WITH 1;');
    await query('ALTER SEQUENCE inventario_id_seq RESTART WITH 1;');
    await query('ALTER SEQUENCE prestiti_id_seq RESTART WITH 1;');
    await query('ALTER SEQUENCE richieste_id_seq RESTART WITH 1;');
    await query('ALTER SEQUENCE riparazioni_id_seq RESTART WITH 1;');
    await query('ALTER SEQUENCE segnalazioni_id_seq RESTART WITH 1;');
    await query('ALTER SEQUENCE inventario_unita_id_seq RESTART WITH 1;');
    await query('ALTER SEQUENCE password_reset_requests_id_seq RESTART WITH 1;');
    
    // Ricrea dati di base
    console.log('🌱 Ricreazione dati di base...');
    
    // Corsi accademici
    await query(`
      INSERT INTO corsi (corso) VALUES 
      ('Fotografia'),
      ('Pittura'),
      ('Design'),
      ('Interior Design'),
      ('Grafica'),
      ('Architettura')
      ON CONFLICT (corso) DO NOTHING;
    `);
    
    // Categorie
    await query(`
      INSERT INTO categorie (madre, figlia) VALUES 
      ('Fotografia', 'Macchine Fotografiche'),
      ('Fotografia', 'Obiettivi'),
      ('Fotografia', 'Accessori'),
      ('Pittura', 'Pennelli e Colori'),
      ('Pittura', 'Tele e Supporti'),
      ('Design', 'Computer e Software'),
      ('Design', 'Mobili'),
      ('Design', 'Strumenti'),
      ('Interior Design', 'Materiali'),
      ('Interior Design', 'Strumenti di Misura'),
      ('Grafica', 'Computer e Software'),
      ('Grafica', 'Tavoletta Grafica'),
      ('Architettura', 'Strumenti di Disegno'),
      ('Architettura', 'Modelli e Prototipi')
      ON CONFLICT (madre, figlia) DO NOTHING;
    `);
    
    // Crea un utente di test
    await query(`
      INSERT INTO users (email, password_hash, name, surname, phone, matricola, ruolo, corso_accademico)
      VALUES ('test@laba.it', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mario', 'Rossi', '1234567890', 'MAT001', 'user', 'Fotografia')
      ON CONFLICT (email) DO NOTHING;
    `);
    
    console.log('✅ Reset database completato con successo!');
    console.log('📊 Database pulito e pronto per l\'uso');
    
  } catch (error) {
    console.error('❌ Errore durante il reset:', error);
    throw error;
  }
}

// Esegui reset se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  resetDatabase()
    .then(() => {
      console.log('🎉 Reset completato!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Errore reset:', error);
      process.exit(1);
    });
}

export default resetDatabase;
