#!/usr/bin/env node
// Script per sistemare le unità mancanti negli oggetti di inventario

import { query } from '../utils/postgres.js';

async function fixMissingUnits() {
  console.log('🔧 Controllo unità mancanti...');
  
  try {
    // Trova tutti gli oggetti di inventario
    const inventoryItems = await query(`
      SELECT 
        i.id,
        i.nome,
        i.quantita_totale,
        COUNT(iu.id) as unita_esistenti
      FROM inventario i
      LEFT JOIN inventario_unita iu ON iu.inventario_id = i.id
      GROUP BY i.id, i.nome, i.quantita_totale
      HAVING COUNT(iu.id) < i.quantita_totale
      ORDER BY i.nome
    `);
    
    console.log(`📋 Trovati ${inventoryItems.length} oggetti con unità mancanti:`);
    
    for (const item of inventoryItems) {
      console.log(`\n🔍 ${item.nome}: ${item.unita_esistenti}/${item.quantita_totale} unità`);
      
      // Calcola quante unità mancano
      const unitaMancanti = item.quantita_totale - item.unita_esistenti;
      console.log(`   Creo ${unitaMancanti} unità mancanti...`);
      
      // Crea le unità mancanti
      for (let i = 1; i <= unitaMancanti; i++) {
        const codiceUnivoco = `${item.nome}-${String(item.unita_esistenti + i).padStart(3, '0')}`;
        
        try {
          await query(`
            INSERT INTO inventario_unita (inventario_id, codice_univoco, stato, note)
            VALUES ($1, $2, 'disponibile', 'Creata automaticamente')
          `, [item.id, codiceUnivoco]);
          
          console.log(`   ✅ Creata unità: ${codiceUnivoco}`);
        } catch (error) {
          console.error(`   ❌ Errore creando ${codiceUnivoco}:`, error.message);
        }
      }
    }
    
    console.log('\n✅ Operazione completata!');
    
    // Verifica finale
    const verification = await query(`
      SELECT 
        i.nome,
        i.quantita_totale,
        COUNT(iu.id) as unita_create
      FROM inventario i
      LEFT JOIN inventario_unita iu ON iu.inventario_id = i.id
      GROUP BY i.id, i.nome, i.quantita_totale
      ORDER BY i.nome
    `);
    
    console.log('\n📊 Verifica finale:');
    verification.forEach(item => {
      const status = item.unita_create === item.quantita_totale ? '✅' : '❌';
      console.log(`${status} ${item.nome}: ${item.unita_create}/${item.quantita_totale}`);
    });
    
  } catch (error) {
    console.error('❌ Errore durante la riparazione:', error);
  }
  
  process.exit(0);
}

fixMissingUnits();
