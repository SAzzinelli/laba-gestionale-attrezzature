// backend/routes/migration.js - Endpoint per migrazioni database
import { Router } from 'express';
import { query } from '../utils/postgres.js';

const r = Router();

// POST /api/migration/setup-categories - Crea tabella categorie_semplici
r.post('/setup-categories', async (req, res) => {
  try {
    console.log('🔄 Eseguendo migrazione categorie...');
    
    // 1. Aggiungi colonna corso_accademico alla tabella inventario
    await query('ALTER TABLE inventario ADD COLUMN IF NOT EXISTS corso_accademico VARCHAR(255)');
    console.log('✅ Aggiunta colonna corso_accademico');
    
    // 2. Crea nuova tabella categorie_semplici
    await query(`
      CREATE TABLE IF NOT EXISTS categorie_semplici (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Creata tabella categorie_semplici');
    
    // 3. Aggiungi colonna categoria_id alla tabella inventario
    await query('ALTER TABLE inventario ADD COLUMN IF NOT EXISTS categoria_id INTEGER');
    console.log('✅ Aggiunta colonna categoria_id');
    
    // 4. Aggiungi foreign key constraint (se non esiste già)
    try {
      await query(`
        ALTER TABLE inventario 
        ADD CONSTRAINT fk_inventario_categoria 
        FOREIGN KEY (categoria_id) REFERENCES categorie_semplici(id)
      `);
      console.log('✅ Aggiunta foreign key constraint');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Foreign key constraint già esistente');
      } else {
        throw error;
      }
    }
    
    // 5. Aggiungi indici per performance
    await query('CREATE INDEX IF NOT EXISTS idx_inventario_corso_accademico ON inventario(corso_accademico)');
    await query('CREATE INDEX IF NOT EXISTS idx_inventario_categoria_id ON inventario(categoria_id)');
    console.log('✅ Aggiunti indici per performance');
    
    // 6. Rendi nullable le colonne vecchie per evitare errori
    await query('ALTER TABLE inventario ALTER COLUMN categoria_madre DROP NOT NULL');
    await query('ALTER TABLE inventario ALTER COLUMN categoria_figlia DROP NOT NULL');
    console.log('✅ Rese nullable le colonne vecchie');
    
    // 7. Migra le categorie esistenti (categoria_figlia) nella nuova tabella
    const existingCategories = await query(`
      SELECT DISTINCT categoria_figlia 
      FROM inventario 
      WHERE categoria_figlia IS NOT NULL AND categoria_figlia != ''
    `);
    
    for (const cat of existingCategories) {
      try {
        await query(`
          INSERT INTO categorie_semplici (nome) 
          VALUES ($1) 
          ON CONFLICT (nome) DO NOTHING
        `, [cat.categoria_figlia]);
      } catch (error) {
        console.log(`⚠️ Categoria ${cat.categoria_figlia} già esistente`);
      }
    }
    console.log('✅ Migrate categorie esistenti');
    
    // 8. Crea utente admin se non esiste
    const adminExists = await query('SELECT id FROM users WHERE email = $1', ['admin@laba.biz']);
    if (adminExists.length === 0) {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash('laba2025', 10);
      await query(`
        INSERT INTO users (email, password, name, surname, ruolo, corso_accademico)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['admin@laba.biz', hashedPassword, 'Admin', 'Sistema', 'admin', 'Fotografia']);
      console.log('✅ Creato utente admin');
    } else {
      console.log('✅ Utente admin già esistente');
    }
    
    res.json({ 
      success: true, 
      message: 'Migrazione categorie completata con successo!',
      migrated_categories: existingCategories.length
    });
  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: 'Errore durante la migrazione del database'
    });
  }
});

// POST /api/migration/remove-categoria-figlia - Rimuove colonna categoria_figlia
r.post('/remove-categoria-figlia', async (req, res) => {
  try {
    console.log('🔄 Rimuovendo colonna categoria_figlia...');
    
    // Verifica se la colonna esiste prima di rimuoverla
    const columnExists = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'inventario' 
      AND column_name = 'categoria_figlia'
    `);
    
    if (columnExists.length > 0) {
      // Rimuovi la colonna categoria_figlia
      await query('ALTER TABLE inventario DROP COLUMN categoria_figlia');
      console.log('✅ Rimossa colonna categoria_figlia');
    } else {
      console.log('✅ Colonna categoria_figlia già rimossa');
    }
    
    res.json({ 
      success: true, 
      message: 'Colonna categoria_figlia rimossa con successo!'
    });
  } catch (error) {
    console.error('❌ Errore durante la rimozione della colonna:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: 'Errore durante la rimozione della colonna categoria_figlia'
    });
  }
});

export default r;
