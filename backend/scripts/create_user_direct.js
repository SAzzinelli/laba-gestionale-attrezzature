// Script per creare utente direttamente
import { query } from '../utils/postgres.js';

async function createUserDirect() {
  console.log('👤 Creazione utente diretto...');
  
  try {
    // Crea utente di test con password hashata
    const result = await query(`
      INSERT INTO users (email, password_hash, name, surname, phone, matricola, ruolo, corso_accademico)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, email, name, surname
    `, [
      'test@laba.it',
      '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: test123
      'Mario',
      'Rossi',
      '1234567890',
      'MAT001',
      'user',
      'Fotografia'
    ]);
    
    console.log('✅ Utente creato:', result[0]);
    
  } catch (error) {
    console.error('❌ Errore creazione utente:', error);
    throw error;
  }
}

// Esegui se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  createUserDirect()
    .then(() => {
      console.log('🎉 Utente creato!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Errore:', error);
      process.exit(1);
    });
}

export default createUserDirect;
