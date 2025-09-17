// Script per aggiornare i tipi delle riparazioni esistenti
import { query } from '../utils/postgres.js';

async function updateRepairTypes() {
  try {
    console.log('🔄 Aggiornamento tipi riparazioni...');
    
    // Aggiorna tutte le riparazioni che non hanno tipo
    const result = await query(`
      UPDATE riparazioni 
      SET tipo = 'riparazione', priorita = 'media'
      WHERE tipo IS NULL OR tipo = ''
      RETURNING id, tipo, priorita
    `);
    
    console.log(`✅ Aggiornate ${result.length} riparazioni`);
    result.forEach(repair => {
      console.log(`  ID ${repair.id}: tipo="${repair.tipo}", priorità="${repair.priorita}"`);
    });
    
    // Mostra tutte le riparazioni con i nuovi campi
    const allRepairs = await query(`
      SELECT id, inventario_id, tipo, priorita, stato, note, created_at
      FROM riparazioni 
      ORDER BY id
    `);
    
    console.log('\n📊 Riparazioni aggiornate:');
    allRepairs.forEach(repair => {
      console.log(`ID ${repair.id}: tipo="${repair.tipo}", priorità="${repair.priorita}", stato="${repair.stato}"`);
    });
    
    console.log('\n✅ Aggiornamento completato!');
    
  } catch (error) {
    console.error('❌ Errore durante l\'aggiornamento:', error);
  }
}

// Esegui lo script se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  updateRepairTypes().then(() => process.exit(0));
}

export default updateRepairTypes;
