// Script per controllare utente
import { query } from '../utils/postgres.js';

async function checkUser() {
  console.log('👤 Controllo utente...');
  
  try {
    // Controlla utente test
    const result = await query(`
      SELECT id, email, name, surname, password_hash, ruolo, corso_accademico
      FROM users 
      WHERE email = $1
    `, ['test@laba.it']);
    
    if (result.length > 0) {
      console.log('✅ Utente trovato:', result[0]);
    } else {
      console.log('❌ Utente non trovato');
    }
    
  } catch (error) {
    console.error('❌ Errore controllo utente:', error);
    throw error;
  }
}

// Esegui se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  checkUser()
    .then(() => {
      console.log('🎉 Controllo completato!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Errore:', error);
      process.exit(1);
    });
}

export default checkUser;
