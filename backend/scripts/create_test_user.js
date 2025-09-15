// Script per creare utente di test
import { query } from '../utils/postgres.js';
import bcrypt from 'bcryptjs';

async function createTestUser() {
  console.log('👤 Creazione utente di test...');
  
  try {
    // Crea utente di test
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    await query(`
      INSERT INTO users (email, password_hash, name, surname, phone, matricola, ruolo, corso_accademico)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (email) DO NOTHING
    `, [
      'test@laba.it',
      hashedPassword,
      'Mario',
      'Rossi',
      '1234567890',
      'MAT001',
      'user',
      'Fotografia'
    ]);
    
    console.log('✅ Utente di test creato con successo!');
    console.log('📧 Email: test@laba.it');
    console.log('🔑 Password: test123');
    
  } catch (error) {
    console.error('❌ Errore creazione utente:', error);
    throw error;
  }
}

// Esegui se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  createTestUser()
    .then(() => {
      console.log('🎉 Utente creato!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Errore:', error);
      process.exit(1);
    });
}

export default createTestUser;
