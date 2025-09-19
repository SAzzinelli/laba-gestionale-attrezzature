// backend/routes/categorie_semplici.js - Categorie indipendenti
import { Router } from 'express';
import { query } from '../utils/postgres.js';

const r = Router();

// GET /api/categorie-semplici
r.get('/', async (req, res) => {
  try {
    // Escludi la categoria speciale "Nessuna categoria" dalle liste pubbliche
    const result = await query('SELECT id, nome FROM categorie_semplici WHERE nome != $1 ORDER BY nome', ['Nessuna categoria']);
    res.json(result);
  } catch (error) {
    console.error('Errore GET categorie semplici:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// POST /api/categorie-semplici
r.post('/', async (req, res) => {
  try {
    const { nome } = req.body;
    
    if (!nome || nome.trim() === '') {
      return res.status(400).json({ error: 'Nome categoria è obbligatorio' });
    }

    // Verifica se la categoria esiste già
    const existing = await query(
      'SELECT id FROM categorie_semplici WHERE nome = $1',
      [nome.trim()]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Categoria già esistente' });
    }

    // Inserisci la nuova categoria
    const result = await query(
      'INSERT INTO categorie_semplici (nome) VALUES ($1) RETURNING *',
      [nome.trim()]
    );

    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Errore POST categorie semplici:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// PUT /api/categorie-semplici/:id
r.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;
    
    if (!nome || nome.trim() === '') {
      return res.status(400).json({ error: 'Nome categoria è obbligatorio' });
    }

    // Verifica se la categoria esiste
    const existing = await query(
      'SELECT id, nome FROM categorie_semplici WHERE id = $1',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Categoria non trovata' });
    }

    // Impedisci la modifica della categoria speciale "Nessuna categoria"
    if (existing[0].nome === 'Nessuna categoria') {
      return res.status(403).json({ 
        error: 'La categoria speciale "Nessuna categoria" non può essere modificata' 
      });
    }

    // Verifica se il nuovo nome è già in uso (da un'altra categoria)
    const nameExists = await query(
      'SELECT id FROM categorie_semplici WHERE nome = $1 AND id != $2',
      [nome.trim(), id]
    );

    if (nameExists.length > 0) {
      return res.status(409).json({ error: 'Nome categoria già esistente' });
    }

    // Aggiorna la categoria
    const result = await query(
      'UPDATE categorie_semplici SET nome = $1 WHERE id = $2 RETURNING *',
      [nome.trim(), id]
    );

    res.json(result[0]);
  } catch (error) {
    console.error('Errore PUT categorie semplici:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// DELETE /api/categorie-semplici/:id
r.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verifica se la categoria esiste
    const existing = await query(
      'SELECT id FROM categorie_semplici WHERE id = $1',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Categoria non trovata' });
    }

    // Verifica se ci sono articoli che usano questa categoria
    const itemsUsingCategory = await query(
      'SELECT COUNT(*) as count FROM inventario WHERE categoria_id = $1',
      [id]
    );

    if (itemsUsingCategory[0].count > 0) {
      // Crea o ottieni la categoria speciale "Nessuna categoria"
      let emptyCategoryId;
      const emptyCategory = await query(
        'SELECT id FROM categorie_semplici WHERE nome = $1',
        ['Nessuna categoria']
      );
      
      if (emptyCategory.length === 0) {
        // Crea la categoria speciale se non esiste
        const newEmptyCategory = await query(
          'INSERT INTO categorie_semplici (nome) VALUES ($1) RETURNING id',
          ['Nessuna categoria']
        );
        emptyCategoryId = newEmptyCategory[0].id;
      } else {
        emptyCategoryId = emptyCategory[0].id;
      }
      
      // Sposta tutti gli articoli che usano questa categoria alla categoria "Nessuna categoria"
      await query(
        'UPDATE inventario SET categoria_id = $1 WHERE categoria_id = $2',
        [emptyCategoryId, id]
      );
    }

    // Impedisci l'eliminazione della categoria speciale "Nessuna categoria"
    const categoryToDelete = await query(
      'SELECT nome FROM categorie_semplici WHERE id = $1',
      [id]
    );
    
    if (categoryToDelete.length > 0 && categoryToDelete[0].nome === 'Nessuna categoria') {
      return res.status(403).json({ 
        error: 'La categoria speciale "Nessuna categoria" non può essere eliminata' 
      });
    }

    // Elimina la categoria
    await query(
      'DELETE FROM categorie_semplici WHERE id = $1',
      [id]
    );

    // Messaggio di successo più informativo
    const message = itemsUsingCategory[0].count > 0 
      ? `Categoria eliminata con successo. ${itemsUsingCategory[0].count} articoli sono stati spostati nella categoria "nessuna categoria".`
      : 'Categoria eliminata con successo';
    
    res.json({ message });
  } catch (error) {
    console.error('Errore DELETE categorie semplici:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

export default r;
