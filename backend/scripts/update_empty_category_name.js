import pool from '../utils/postgres.js';

async function updateEmptyCategoryName() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Aggiornamento nome categoria vuota da "–" a "Nessuna categoria"...');
    
    // Verifica se esiste la categoria "–"
    const oldCategory = await client.query(
      'SELECT id, nome FROM categorie_semplici WHERE nome = $1',
      ['–']
    );
    
    if (oldCategory.rows.length > 0) {
      console.log(`✅ Trovata categoria "–" con ID ${oldCategory.rows[0].id}`);
      
      // Aggiorna il nome della categoria
      const updateResult = await client.query(
        'UPDATE categorie_semplici SET nome = $1 WHERE nome = $2 RETURNING *',
        ['Nessuna categoria', '–']
      );
      
      if (updateResult.rows.length > 0) {
        console.log(`✅ Categoria aggiornata con successo:`);
        console.log(`   ID: ${updateResult.rows[0].id}`);
        console.log(`   Nome: "${updateResult.rows[0].nome}"`);
        
        // Verifica quanti articoli usano questa categoria
        const itemsCount = await client.query(
          'SELECT COUNT(*) as count FROM inventario WHERE categoria_id = $1',
          [updateResult.rows[0].id]
        );
        
        console.log(`📦 Articoli che usano questa categoria: ${itemsCount.rows[0].count}`);
      }
    } else {
      console.log('ℹ️ Categoria "–" non trovata nel database');
      
      // Verifica se esiste già "Nessuna categoria"
      const newCategory = await client.query(
        'SELECT id, nome FROM categorie_semplici WHERE nome = $1',
        ['Nessuna categoria']
      );
      
      if (newCategory.rows.length > 0) {
        console.log(`✅ Categoria "Nessuna categoria" già esistente con ID ${newCategory.rows[0].id}`);
      } else {
        console.log('ℹ️ Nessuna categoria vuota trovata nel database');
      }
    }
    
    console.log('✅ Aggiornamento completato!');
    
  } catch (error) {
    console.error('❌ Errore durante l\'aggiornamento:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

updateEmptyCategoryName();
