// Script per correggere manualmente i prestiti "User 6"
import { query } from '../utils/postgres.js';

async function fixUser6Loans() {
  try {
    console.log('🔄 Correzione prestiti User 6...');
    
    // Trova l'utente con email simone.azzinelli@labafirenze.com
    const user = await query(`
      SELECT id, name, surname, email 
      FROM users 
      WHERE email LIKE '%simone%' OR name LIKE '%Simone%'
      LIMIT 1
    `);
    
    if (user.length === 0) {
      console.log('❌ Utente Simone non trovato');
      return;
    }
    
    const userData = user[0];
    const fullName = `${userData.name} ${userData.surname}`.trim();
    
    console.log(`👤 Utente trovato: ${fullName} (${userData.email})`);
    
    // Aggiorna tutti i prestiti "User 6" con i dati di Simone
    const result = await query(`
      UPDATE prestiti 
      SET chi = $1 
      WHERE chi = 'User 6'
      RETURNING id, chi
    `, [fullName]);
    
    console.log(`✅ Aggiornati ${result.length} prestiti:`);
    result.forEach(loan => {
      console.log(`  Prestito ${loan.id}: ${loan.chi}`);
    });
    
    console.log('\n✅ Correzione User 6 completata!');
    
  } catch (error) {
    console.error('❌ Errore durante la correzione:', error);
  }
}

// Esegui lo script se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  fixUser6Loans().then(() => process.exit(0));
}

export default fixUser6Loans;
