// Script per pulire i dati delle riparazioni corrotti
import { query } from '../utils/postgres.js';

async function cleanRepairData() {
  try {
    console.log('🔄 Pulizia dati riparazioni corrotti...');
    
    // Mostra tutte le riparazioni raw
    const allRepairs = await query(`
      SELECT id, inventario_id, stato, note, unit_ids_json, created_at
      FROM riparazioni 
      ORDER BY id
    `);
    
    console.log(`📊 Riparazioni trovate: ${allRepairs.length}`);
    
    for (const repair of allRepairs) {
      console.log(`\nRiparazione ID: ${repair.id}`);
      console.log(`  Inventario ID: ${repair.inventario_id}`);
      console.log(`  Stato: ${repair.stato}`);
      console.log(`  Unit IDs JSON: "${repair.unit_ids_json}"`);
      console.log(`  Note: ${repair.note}`);
      
      // Prova a parsare il JSON
      try {
        const unitIds = JSON.parse(repair.unit_ids_json || '[]');
        console.log(`  ✅ JSON valido: [${unitIds.join(', ')}]`);
      } catch (e) {
        console.log(`  ❌ JSON corrotto: ${e.message}`);
        
        // Correggi il JSON corrotto
        console.log(`  🔧 Correzione JSON...`);
        await query(`
          UPDATE riparazioni 
          SET unit_ids_json = '[]'
          WHERE id = $1
        `, [repair.id]);
        console.log(`  ✅ JSON corretto`);
      }
    }
    
    // Verifica se ci sono riparazioni duplicate (stesso inventario_id e note simili)
    const duplicates = await query(`
      SELECT inventario_id, COUNT(*) as count, array_agg(id) as ids
      FROM riparazioni 
      WHERE stato = 'in_corso'
      GROUP BY inventario_id
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.length > 0) {
      console.log('\n⚠️ Riparazioni duplicate trovate:');
      duplicates.forEach(dup => {
        console.log(`  Inventario ${dup.inventario_id}: ${dup.count} riparazioni (IDs: ${dup.ids.join(', ')})`);
      });
      
      // Rimuovi duplicati mantenendo solo il più recente
      for (const dup of duplicates) {
        const idsToDelete = dup.ids.slice(0, -1); // Rimuovi tutti tranne l'ultimo
        
        if (idsToDelete.length > 0) {
          console.log(`  🗑️ Rimozione riparazioni duplicate: ${idsToDelete.join(', ')}`);
          await query(`
            DELETE FROM riparazioni 
            WHERE id = ANY($1::int[])
          `, [idsToDelete]);
          console.log(`  ✅ Duplicate rimosse`);
        }
      }
    }
    
    console.log('\n✅ Pulizia completata!');
    
  } catch (error) {
    console.error('❌ Errore durante la pulizia:', error);
  }
}

// Esegui lo script se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanRepairData().then(() => process.exit(0));
}

export default cleanRepairData;
