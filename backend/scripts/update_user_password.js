// Script per aggiornare password utente
import { query } from '../utils/postgres.js';

async function updateUserPassword() {
  console.log('🔑 Aggiornamento password utente...');
  
  try {
    // Aggiorna password utente test
    const result = await query(`
      UPDATE users 
      SET password_hash = $1 
      WHERE email = $2
      RETURNING id, email, name, surname
    `, [
      '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: test123
      'test@laba.it'
    ]);
    
    if (result.length > 0) {
      console.log('✅ Password aggiornata per:', result[0]);
    } else {
      console.log('❌ Utente non trovato');
    }
    
  } catch (error) {
    console.error('❌ Errore aggiornamento password:', error);
    throw error;
  }
}

// Esegui se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  updateUserPassword()
    .then(() => {
      console.log('🎉 Password aggiornata!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Errore:', error);
      process.exit(1);
    });
}

export default updateUserPassword;
