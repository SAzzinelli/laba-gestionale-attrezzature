// backend/routes/categorie_semplici.js - Categorie indipendenti
import { Router } from 'express';
import { query } from '../utils/postgres.js';

const r = Router();

// GET /api/categorie-semplici
r.get('/', async (req, res) => {
  try {
    const result = await query('SELECT id, nome FROM categorie_semplici ORDER BY nome');
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
      return res.status(409).json({ 
        error: `Impossibile eliminare: ci sono ${itemsUsingCategory[0].count} articoli che usano questa categoria` 
      });
    }

    // Elimina la categoria
    await query(
      'DELETE FROM categorie_semplici WHERE id = $1',
      [id]
    );

    res.json({ message: 'Categoria eliminata con successo' });
  } catch (error) {
    console.error('Errore DELETE categorie semplici:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

export default r;
