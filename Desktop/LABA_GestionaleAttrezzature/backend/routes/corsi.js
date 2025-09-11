import { Router } from 'express';
import db from '../utils/db.js';

const r = Router();

// GET /api/corsi - Get all courses
r.get('/', (req, res) => {
  try {
    const courses = db.prepare('SELECT corso FROM corsi ORDER BY corso').all();
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Errore nel caricamento dei corsi' });
  }
});

// POST /api/corsi - Create new course
r.post('/', (req, res) => {
  try {
    const { nome, descrizione } = req.body;
    
    if (!nome) {
      return res.status(400).json({ error: 'Il nome del corso è obbligatorio' });
    }

    const result = db.prepare('INSERT INTO corsi (corso) VALUES (?)').run(nome);
    
    res.status(201).json({ 
      id: result.lastInsertRowid, 
      nome, 
      descrizione: descrizione || '' 
    });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Errore nella creazione del corso' });
  }
});

// PUT /api/corsi/:id - Update course
r.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descrizione } = req.body;
    
    if (!nome) {
      return res.status(400).json({ error: 'Il nome del corso è obbligatorio' });
    }

    const result = db.prepare('UPDATE corsi SET corso = ? WHERE corso = (SELECT corso FROM corsi LIMIT 1 OFFSET ?)').run(nome, id-1);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Corso non trovato' });
    }

    res.json({ id: parseInt(id), nome, descrizione: descrizione || '' });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento del corso' });
  }
});

// DELETE /api/corsi/:id - Delete course
r.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const result = db.prepare('DELETE FROM corsi WHERE corso = (SELECT corso FROM corsi LIMIT 1 OFFSET ?)').run(id-1);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Corso non trovato' });
    }

    res.json({ message: 'Corso eliminato con successo' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione del corso' });
  }
});

export default r;