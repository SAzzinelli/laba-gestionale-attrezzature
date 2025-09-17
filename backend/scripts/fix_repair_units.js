// Script per correggere le unità delle riparazioni
import { query } from '../utils/postgres.js';

async function fixRepairUnits() {
  try {
    console.log('🔄 Correzione unità riparazioni...');
    
    // Trova riparazioni senza unit_ids_json o con unit_ids_json vuoto
    const repairsWithoutUnits = await query(`
      SELECT r.*, i.nome as articolo_nome
      FROM riparazioni r
      LEFT JOIN inventario i ON r.inventario_id = i.id
      WHERE r.stato = 'in_corso' 
      AND (r.unit_ids_json IS NULL OR r.unit_ids_json = '' OR r.unit_ids_json = '[]')
    `);
    
    console.log(`📋 Riparazioni senza unità assegnate: ${repairsWithoutUnits.length}`);
    
    for (const repair of repairsWithoutUnits) {
      console.log(`\n🔧 Riparazione ID: ${repair.id} (${repair.articolo_nome})`);
      console.log(`   Note: ${repair.note}`);
      console.log(`   Unit IDs JSON: ${repair.unit_ids_json}`);
      
      // Trova la prima unità disponibile per questo oggetto
      const availableUnit = await query(`
        SELECT id, codice_univoco 
        FROM inventario_unita 
        WHERE inventario_id = $1 AND stato = 'disponibile'
        LIMIT 1
      `, [repair.inventario_id]);
      
      if (availableUnit.length > 0) {
        const unitId = availableUnit[0].id;
        const unitCode = availableUnit[0].codice_univoco;
        
        console.log(`   → Assegnando unità ${unitCode} (ID: ${unitId})`);
        
        // Aggiorna la riparazione con l'unità
        await query(`
          UPDATE riparazioni 
          SET unit_ids_json = $1
          WHERE id = $2
        `, [JSON.stringify([unitId]), repair.id]);
        
        // Marca l'unità come in riparazione
        await query(`
          UPDATE inventario_unita 
          SET stato = 'in_riparazione'
          WHERE id = $1
        `, [unitId]);
        
        console.log(`   ✅ Unità ${unitCode} marcata come in riparazione`);
      } else {
        console.log(`   ⚠️ Nessuna unità disponibile per ${repair.articolo_nome}`);
      }
    }
    
    console.log('\n✅ Correzione completata!');
    
    // Mostra stato finale
    const finalRepairs = await query(`
      SELECT r.*, i.nome as articolo_nome
      FROM riparazioni r
      LEFT JOIN inventario i ON r.inventario_id = i.id
      WHERE r.stato = 'in_corso'
      ORDER BY r.id
    `);
    
    console.log('\n📊 Riparazioni attive:');
    finalRepairs.forEach(repair => {
      const unitIds = JSON.parse(repair.unit_ids_json || '[]');
      console.log(`ID ${repair.id} (${repair.articolo_nome}): ${unitIds.length} unità - [${unitIds.join(', ')}]`);
    });
    
    const unitsInRepair = await query(`
      SELECT codice_univoco, stato 
      FROM inventario_unita 
      WHERE stato = 'in_riparazione'
      ORDER BY codice_univoco
    `);
    
    console.log('\n🔧 Unità in riparazione:');
    unitsInRepair.forEach(unit => {
      console.log(`  ${unit.codice_univoco}: ${unit.stato}`);
    });
    
  } catch (error) {
    console.error('❌ Errore durante la correzione:', error);
  }
}

// Esegui lo script se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  fixRepairUnits().then(() => process.exit(0));
}

export default fixRepairUnits;
