// Script per correggere lo stato dei prestiti che dovrebbero essere attivi
import { query } from '../utils/postgres.js';

async function fixLoanStatus() {
  try {
    console.log('🔄 Correzione stato prestiti...');
    
    // Trova prestiti che dovrebbero essere attivi ma sono marcati come restituiti
    // (data_rientro nel futuro o oggi, ma stato = 'restituito')
    const loansToFix = await query(`
      SELECT p.*, i.nome as articolo_nome
      FROM prestiti p
      LEFT JOIN inventario i ON p.inventario_id = i.id
      WHERE p.stato = 'restituito' 
      AND p.data_rientro >= CURRENT_DATE
      ORDER BY p.id DESC
    `);
    
    console.log(`📋 Trovati ${loansToFix.length} prestiti da correggere`);
    
    for (const loan of loansToFix) {
      console.log(`🔧 Correzione prestito ${loan.id} (${loan.articolo_nome})`);
      console.log(`   Chi: ${loan.chi}`);
      console.log(`   Data rientro: ${loan.data_rientro}`);
      console.log(`   Stato attuale: ${loan.stato} → attivo`);
      
      // Cambia stato da 'restituito' a 'attivo'
      await query(`
        UPDATE prestiti 
        SET stato = 'attivo'
        WHERE id = $1
      `, [loan.id]);
      
      // Marca le unità come prestate
      const quantita = loan.quantita || 1;
      const updatedUnits = await query(`
        UPDATE inventario_unita 
        SET stato = 'prestato' 
        WHERE inventario_id = $1 
        AND stato = 'disponibile' 
        AND id IN (
          SELECT id FROM inventario_unita 
          WHERE inventario_id = $1 AND stato = 'disponibile' 
          LIMIT $2
        )
        RETURNING codice_univoco
      `, [loan.inventario_id, quantita]);
      
      console.log(`✅ Prestito ${loan.id} → attivo, ${updatedUnits.length} unità → prestate`);
      updatedUnits.forEach(unit => {
        console.log(`     - ${unit.codice_univoco}`);
      });
    }
    
    console.log('\n✅ Correzione completata!');
    
    // Riepilogo finale
    const finalStatus = await query(`
      SELECT 
        stato, 
        COUNT(*) as count 
      FROM prestiti 
      GROUP BY stato
    `);
    
    console.log('\n📊 Riepilogo stati prestiti:');
    finalStatus.forEach(item => {
      console.log(`${item.stato}: ${item.count} prestiti`);
    });
    
  } catch (error) {
    console.error('❌ Errore durante la correzione:', error);
  }
}

// Esegui lo script se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  fixLoanStatus().then(() => process.exit(0));
}

export default fixLoanStatus;
