// Script per verificare lo stato delle riparazioni
import { query } from '../utils/postgres.js';

async function checkRepairs() {
  try {
    console.log('🔍 Verifica riparazioni nel database...');
    
    // Mostra tutte le riparazioni
    const repairs = await query(`
      SELECT r.*, i.nome as articolo_nome
      FROM riparazioni r
      LEFT JOIN inventario i ON r.inventario_id = i.id
      ORDER BY r.created_at DESC
    `);
    
    console.log(`\n📊 Totale riparazioni: ${repairs.length}`);
    
    repairs.forEach(repair => {
      console.log(`\nRiparazione ID: ${repair.id}`);
      console.log(`  Oggetto: ${repair.articolo_nome}`);
      console.log(`  Stato: ${repair.stato}`);
      console.log(`  Note: ${repair.note}`);
      console.log(`  Unit IDs: ${repair.unit_ids_json}`);
      console.log(`  Created: ${repair.created_at}`);
    });
    
    // Verifica unità in riparazione
    const unitsInRepair = await query(`
      SELECT iu.*, i.nome as articolo_nome
      FROM inventario_unita iu
      LEFT JOIN inventario i ON i.id = iu.inventario_id
      WHERE iu.stato = 'in_riparazione'
      ORDER BY iu.codice_univoco
    `);
    
    console.log(`\n🔧 Unità in riparazione: ${unitsInRepair.length}`);
    unitsInRepair.forEach(unit => {
      console.log(`  ${unit.codice_univoco} (${unit.articolo_nome}): ${unit.stato}`);
    });
    
  } catch (error) {
    console.error('❌ Errore durante la verifica:', error);
  }
}

// Esegui lo script se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  checkRepairs().then(() => process.exit(0));
}

export default checkRepairs;
