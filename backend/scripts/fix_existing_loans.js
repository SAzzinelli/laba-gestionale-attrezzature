// Script per correggere lo stato delle unità per prestiti esistenti
import { query } from '../utils/postgres.js';

async function fixExistingLoans() {
  try {
    console.log('🔄 Correzione stato unità per prestiti esistenti...');
    
    // Trova tutti i prestiti attivi
    const activeLoans = await query(`
      SELECT p.*, i.nome as articolo_nome 
      FROM prestiti p
      LEFT JOIN inventario i ON p.inventario_id = i.id
      WHERE p.stato = 'attivo'
    `);
    
    console.log(`📋 Trovati ${activeLoans.length} prestiti attivi`);
    
    for (const loan of activeLoans) {
      console.log(`🔧 Aggiornamento unità per prestito ${loan.id} (${loan.articolo_nome})`);
      
      // Marca le prime unità disponibili come prestate
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
        RETURNING id, codice_univoco
      `, [loan.inventario_id, quantita]);
      
      console.log(`✅ Aggiornate ${updatedUnits.length} unità per ${loan.articolo_nome}`);
      updatedUnits.forEach(unit => {
        console.log(`   - ${unit.codice_univoco} → prestato`);
      });
    }
    
    console.log('✅ Correzione completata!');
    
    // Mostra un riepilogo finale
    const summary = await query(`
      SELECT 
        i.nome,
        COUNT(CASE WHEN iu.stato = 'disponibile' THEN 1 END) as disponibili,
        COUNT(CASE WHEN iu.stato = 'prestato' THEN 1 END) as prestato,
        COUNT(*) as totale
      FROM inventario i
      LEFT JOIN inventario_unita iu ON iu.inventario_id = i.id
      GROUP BY i.id, i.nome
      ORDER BY i.nome
    `);
    
    console.log('\n📊 Riepilogo stato unità:');
    summary.forEach(item => {
      console.log(`${item.nome}: ${item.disponibili} disponibili, ${item.prestato} in prestito, ${item.totale} totali`);
    });
    
  } catch (error) {
    console.error('❌ Errore durante la correzione:', error);
  }
}

// Esegui lo script se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  fixExistingLoans().then(() => process.exit(0));
}

export default fixExistingLoans;
