// Script per verificare lo stato dei prestiti nel database
import { query } from '../utils/postgres.js';

async function checkLoanStatus() {
  try {
    console.log('🔍 Verifica stato prestiti nel database...');
    
    // Mostra tutti i prestiti con dettagli completi
    const allLoans = await query(`
      SELECT p.*, i.nome as articolo_nome, r.stato as richiesta_stato
      FROM prestiti p
      LEFT JOIN inventario i ON p.inventario_id = i.id
      LEFT JOIN richieste r ON r.id = p.richiesta_id
      ORDER BY p.id DESC
    `);
    
    console.log(`\n📊 Totale prestiti: ${allLoans.length}`);
    
    allLoans.forEach(loan => {
      console.log(`\nPrestito ID: ${loan.id}`);
      console.log(`  Oggetto: ${loan.articolo_nome}`);
      console.log(`  Chi: ${loan.chi}`);
      console.log(`  Stato prestito: ${loan.stato}`);
      console.log(`  Stato richiesta: ${loan.richiesta_stato || 'N/A'}`);
      console.log(`  Data uscita: ${loan.data_uscita}`);
      console.log(`  Data rientro: ${loan.data_rientro}`);
      console.log(`  Richiesta ID: ${loan.richiesta_id || 'N/A'}`);
    });
    
    // Verifica stato unità
    const unitsStatus = await query(`
      SELECT iu.*, i.nome as articolo_nome
      FROM inventario_unita iu
      LEFT JOIN inventario i ON i.id = iu.inventario_id
      WHERE i.nome = 'FX3'
      ORDER BY iu.codice_univoco
    `);
    
    console.log(`\n📦 Stato unità FX3:`);
    unitsStatus.forEach(unit => {
      console.log(`  ${unit.codice_univoco}: ${unit.stato}`);
    });
    
  } catch (error) {
    console.error('❌ Errore durante la verifica:', error);
  }
}

// Esegui lo script se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  checkLoanStatus().then(() => process.exit(0));
}

export default checkLoanStatus;
