// Script per correggere i nomi utenti nei prestiti esistenti
import { query } from '../utils/postgres.js';

async function fixUserNamesInLoans() {
  try {
    console.log('🔄 Correzione nomi utenti nei prestiti esistenti...');
    
    // Trova tutti i prestiti con "User X" nel campo chi
    const loansWithUserIds = await query(`
      SELECT p.*, r.utente_id, u.name, u.surname, u.email
      FROM prestiti p
      LEFT JOIN richieste r ON r.id = p.richiesta_id
      LEFT JOIN users u ON u.id = r.utente_id
      WHERE p.chi LIKE 'User %'
    `);
    
    console.log(`📋 Trovati ${loansWithUserIds.length} prestiti con 'User X'`);
    
    for (const loan of loansWithUserIds) {
      if (loan.name && loan.surname) {
        const fullName = `${loan.name} ${loan.surname}`.trim();
        
        console.log(`🔧 Aggiornamento prestito ${loan.id}: "${loan.chi}" → "${fullName}"`);
        
        await query(`
          UPDATE prestiti 
          SET chi = $1 
          WHERE id = $2
        `, [fullName, loan.id]);
        
        console.log(`✅ Prestito ${loan.id} aggiornato`);
      } else {
        console.log(`⚠️ Prestito ${loan.id}: dati utente non trovati`);
      }
    }
    
    // Trova prestiti che potrebbero essere collegati tramite email
    const loansWithEmails = await query(`
      SELECT p.*, u.name, u.surname, u.email
      FROM prestiti p
      LEFT JOIN users u ON (p.chi LIKE '%' || u.email || '%' OR p.chi = u.email)
      WHERE p.chi LIKE 'User %' AND u.name IS NOT NULL
    `);
    
    console.log(`📋 Trovati ${loansWithEmails.length} prestiti collegabili tramite email`);
    
    for (const loan of loansWithEmails) {
      const fullName = `${loan.name} ${loan.surname}`.trim();
      
      console.log(`🔧 Aggiornamento prestito ${loan.id}: "${loan.chi}" → "${fullName}"`);
      
      await query(`
        UPDATE prestiti 
        SET chi = $1 
        WHERE id = $2
      `, [fullName, loan.id]);
      
      console.log(`✅ Prestito ${loan.id} aggiornato tramite email`);
    }
    
    console.log('✅ Correzione nomi completata!');
    
    // Mostra un riepilogo finale
    const summary = await query(`
      SELECT chi, COUNT(*) as count
      FROM prestiti 
      GROUP BY chi
      ORDER BY count DESC
    `);
    
    console.log('\n📊 Riepilogo nomi nei prestiti:');
    summary.forEach(item => {
      console.log(`${item.chi}: ${item.count} prestiti`);
    });
    
  } catch (error) {
    console.error('❌ Errore durante la correzione:', error);
  }
}

// Esegui lo script se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  fixUserNamesInLoans().then(() => process.exit(0));
}

export default fixUserNamesInLoans;
