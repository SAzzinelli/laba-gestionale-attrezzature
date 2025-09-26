// backend/routes/inventario.js - PostgreSQL Version
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { query } from '../utils/postgres.js';

const r = Router();

// Helper function to get user course
function getUserCourse(req) {
  return req.user?.corso_accademico || null;
}

// GET /api/inventario - Solo per admin
r.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { search, corso } = req.query;
    let queryText = `
      SELECT
        i.id, i.nome, i.quantita_totale, i.categoria_madre, i.categoria_id,
        i.posizione, i.note, i.immagine_url, i.in_manutenzione, i.tipo_prestito, i.created_at, i.updated_at,
        CONCAT(COALESCE(i.categoria_madre, ''), ' - ', COALESCE(cs.nome, '')) as categoria_nome,
        COALESCE(json_agg(DISTINCT ic.corso) FILTER (WHERE ic.corso IS NOT NULL), '[]') AS corsi_assegnati,
        (SELECT COUNT(*) FROM inventario_unita iu WHERE iu.inventario_id = i.id AND iu.stato = 'disponibile') AS unita_disponibili,
        CASE
          WHEN i.in_manutenzione = TRUE THEN 'in_manutenzione'
          WHEN (SELECT COUNT(*) FROM inventario_unita iu WHERE iu.inventario_id = i.id AND iu.stato = 'disponibile' AND iu.prestito_corrente_id IS NULL AND iu.richiesta_riservata_id IS NULL) = 0 THEN 'non_disponibile'
          ELSE 'disponibile'
        END AS stato_effettivo
      FROM inventario i
      LEFT JOIN categorie_semplici cs ON cs.id = i.categoria_id
      LEFT JOIN inventario_corsi ic ON ic.inventario_id = i.id
    `;
    const queryParams = [];
    const conditions = [];

    if (corso) {
      conditions.push(`EXISTS (SELECT 1 FROM inventario_corsi WHERE inventario_id = i.id AND corso = $${queryParams.length + 1})`);
      queryParams.push(corso);
    }
    if (search) {
      conditions.push(`(i.nome ILIKE $${queryParams.length + 1} OR i.note ILIKE $${queryParams.length + 2} OR i.posizione ILIKE $${queryParams.length + 3})`);
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      queryText += ` WHERE ${conditions.join(' AND ')}`;
    }

    queryText += ` GROUP BY i.id, cs.nome ORDER BY i.nome`;

    const rows = await query(queryText, queryParams);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Errore nel recupero inventario' });
  }
});

// GET /api/inventario/disponibili - Per utenti (solo oggetti del loro corso) e admin (tutti)
r.get('/disponibili', requireAuth, async (req, res) => {
  try {
    const userCourse = getUserCourse(req);
    let result;
    
    if (req.user.ruolo === 'admin') {
      // Admin vede tutti gli oggetti
      result = await query(`
        SELECT
          i.id, i.nome, i.categoria_madre, i.categoria_id, i.posizione, i.note, i.immagine_url, i.tipo_prestito,
          CONCAT(COALESCE(i.categoria_madre, ''), ' - ', COALESCE(cs.nome, '')) as categoria_nome,
          (SELECT COUNT(*) FROM inventario_unita iu WHERE iu.inventario_id = i.id AND iu.stato = 'disponibile' AND iu.prestito_corrente_id IS NULL AND iu.richiesta_riservata_id IS NULL) AS unita_disponibili,
          CASE
            WHEN EXISTS(SELECT 1 FROM riparazioni r WHERE r.inventario_id = i.id AND r.stato = 'in_corso') THEN 'in_riparazione'
            WHEN i.in_manutenzione = TRUE OR (SELECT COUNT(*) FROM inventario_unita iu WHERE iu.inventario_id = i.id AND iu.stato = 'disponibile' AND iu.prestito_corrente_id IS NULL AND iu.richiesta_riservata_id IS NULL) = 0 THEN 'non_disponibile'
            ELSE 'disponibile'
          END AS stato_effettivo
        FROM inventario i
        LEFT JOIN categorie_semplici cs ON cs.id = i.categoria_id
        ORDER BY i.nome
      `);
  } else {
      // Utenti vedono solo oggetti del loro corso
      if (!userCourse) {
        return res.status(403).json({ error: 'Corso accademico non assegnato' });
      }

      result = await query(`
        SELECT
          i.id, i.nome, i.categoria_madre, i.categoria_id, i.posizione, i.note, i.immagine_url, i.tipo_prestito,
          CONCAT(COALESCE(i.categoria_madre, ''), ' - ', COALESCE(cs.nome, '')) as categoria_nome,
          (SELECT COUNT(*) FROM inventario_unita iu WHERE iu.inventario_id = i.id AND iu.stato = 'disponibile' AND iu.prestito_corrente_id IS NULL AND iu.richiesta_riservata_id IS NULL) AS unita_disponibili,
          CASE
            WHEN i.in_manutenzione = TRUE THEN 'in_manutenzione'
            WHEN (SELECT COUNT(*) FROM inventario_unita iu WHERE iu.inventario_id = i.id AND iu.stato = 'disponibile') = 0 THEN 'non_disponibile'
            ELSE 'disponibile'
          END AS stato_effettivo
        FROM inventario i
        LEFT JOIN categorie_semplici cs ON cs.id = i.categoria_id
        WHERE EXISTS (SELECT 1 FROM inventario_corsi WHERE inventario_id = i.id AND corso = $1)
        ORDER BY i.nome
      `, [userCourse]);
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching available inventory:', error);
    res.status(500).json({ error: 'Errore nel recupero oggetti disponibili' });
  }
});

// GET /api/inventario/unita-disponibili - Per utenti iOS (singole unità disponibili)
r.get('/unita-disponibili', requireAuth, async (req, res) => {
  try {
    const userCourse = getUserCourse(req);
    console.log(`🔍 User requesting unita-disponibili: ${req.user.nome} ${req.user.cognome} (${req.user.email})`);
    console.log(`🎓 User course: ${userCourse}`);
    console.log(`👤 User role: ${req.user.ruolo}`);
    
    let result;
    
    if (req.user.ruolo === 'admin') {
      // Admin vede tutte le unità
      result = await query(`
        SELECT
          iu.id, iu.codice_univoco, iu.stato,
          i.id as inventario_id, i.nome, i.categoria_madre, i.categoria_id, i.posizione, i.note, i.immagine_url,
          CONCAT(COALESCE(i.categoria_madre, ''), ' - ', COALESCE(cs.nome, '')) as categoria_nome
        FROM inventario_unita iu
        JOIN inventario i ON i.id = iu.inventario_id
        LEFT JOIN categorie_semplici cs ON cs.id = i.categoria_id
        WHERE iu.stato = 'disponibile' 
          AND iu.prestito_corrente_id IS NULL 
          AND iu.richiesta_riservata_id IS NULL
          AND i.in_manutenzione = FALSE
        ORDER BY i.nome, iu.codice_univoco
      `);
    } else {
      // Utenti vedono solo unità del loro corso
      if (!userCourse) {
        return res.status(403).json({ error: 'Corso accademico non assegnato' });
      }

      result = await query(`
        SELECT
          iu.id, iu.codice_univoco, iu.stato,
          i.id as inventario_id, i.nome, i.categoria_madre, i.categoria_id, i.posizione, i.note, i.immagine_url,
          CONCAT(COALESCE(i.categoria_madre, ''), ' - ', COALESCE(cs.nome, '')) as categoria_nome
        FROM inventario_unita iu
        JOIN inventario i ON i.id = iu.inventario_id
        LEFT JOIN categorie_semplici cs ON cs.id = i.categoria_id
        WHERE iu.stato = 'disponibile' 
          AND iu.prestito_corrente_id IS NULL 
          AND iu.richiesta_riservata_id IS NULL
          AND i.in_manutenzione = FALSE
          AND EXISTS (SELECT 1 FROM inventario_corsi WHERE inventario_id = i.id AND corso = $1)
        ORDER BY i.nome, iu.codice_univoco
      `, [userCourse]);
    }

    console.log(`📦 Found ${result.length} available units for user`);
    if (result.length > 0) {
      console.log(`📋 Units: ${result.map(unit => `${unit.nome}-${unit.codice_univoco} (stato: ${unit.stato})`).join(', ')}`);
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching available units:', error);
    res.status(500).json({ error: 'Errore nel recupero unità disponibili' });
  }
});

// GET /api/inventario/:id
r.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT i.*, 
             STRING_AGG(ic.corso, ',') as corsi_assegnati,
             (SELECT COUNT(*) FROM inventario_unita iu WHERE iu.inventario_id = i.id AND iu.stato = 'disponibile' AND iu.prestito_corrente_id IS NULL AND iu.richiesta_riservata_id IS NULL) as unita_disponibili,
             CASE 
               WHEN i.in_manutenzione = true THEN 'in_manutenzione'
               WHEN (SELECT COUNT(*) FROM inventario_unita iu WHERE iu.inventario_id = i.id AND iu.stato = 'disponibile') = 0 THEN 'non_disponibile'
               ELSE 'disponibile'
             END as stato_effettivo
    FROM inventario i
    LEFT JOIN inventario_corsi ic ON ic.inventario_id = i.id
      WHERE i.id = $1
    GROUP BY i.id
    `, [id]);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Errore GET inventario by id:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// POST /api/inventario (create) — admin only
r.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { 
      nome, 
      categoria_madre,
      categoria_id,
      posizione = null, 
      fornitore = null,
      note = null, 
      immagine_url = null,
      quantita_totale = 1, 
      tipo_prestito = 'solo_esterno',
      corsi_assegnati = [], 
      unita = [] 
    } = req.body || {};
    
    if (!nome) return res.status(400).json({ error: 'nome richiesto' });
    if (!categoria_madre) return res.status(400).json({ error: 'categoria_madre (corso accademico) richiesta' });
    if (!quantita_totale || quantita_totale < 1) return res.status(400).json({ error: 'quantità totale richiesta' });
    if (!['solo_interno', 'solo_esterno', 'entrambi'].includes(tipo_prestito)) {
      return res.status(400).json({ error: 'tipo_prestito deve essere "solo_interno", "solo_esterno" o "entrambi"' });
    }
    
    // Check if nome already exists
    const existing = await query('SELECT id FROM inventario WHERE nome = $1', [nome]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Un elemento con questo nome esiste già' });
    }
    
    // Check for duplicate unit codes if provided
    if (unita && unita.length > 0) {
      const unitCodes = unita.map(u => u.codice_univoco);
      const duplicates = unitCodes.filter((code, index) => unitCodes.indexOf(code) !== index);
      if (duplicates.length > 0) {
        return res.status(400).json({ error: `Codici duplicati: ${duplicates.join(', ')}` });
      }
      
      // Check if unit codes already exist
      for (const unit of unita) {
        const existingUnit = await query('SELECT id FROM inventario_unita WHERE codice_univoco = $1', [unit.codice_univoco]);
        if (existingUnit.length > 0) {
          return res.status(400).json({ error: `Codice univoco già esistente: ${unit.codice_univoco}` });
        }
      }
    }
    
    // Create inventory item
    const result = await query(`
      INSERT INTO inventario (nome, categoria_madre, categoria_id, posizione, fornitore, note, immagine_url, quantita_totale, quantita, in_manutenzione, tipo_prestito)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [nome, categoria_madre, categoria_id, posizione, fornitore, note, immagine_url, quantita_totale, quantita_totale, false, tipo_prestito]);
    
    const newItem = result[0];
    
    // Create units - either provided ones or auto-generate
    if (unita && unita.length > 0) {
      // Use provided units
      for (const unit of unita) {
        await query(`
          INSERT INTO inventario_unita (inventario_id, codice_univoco, note)
          VALUES ($1, $2, $3)
        `, [newItem.id, unit.codice_univoco, unit.note || null]);
      }
    } else {
      // Auto-generate units based on quantita_totale
      for (let i = 1; i <= quantita_totale; i++) {
        const codiceUnivoco = `${nome}-${String(i).padStart(3, '0')}`;
        await query(`
          INSERT INTO inventario_unita (inventario_id, codice_univoco, stato, note)
          VALUES ($1, $2, 'disponibile', NULL)
        `, [newItem.id, codiceUnivoco]);
      }
    }
    
    // Assign to courses if specified
    if (corsi_assegnati && corsi_assegnati.length > 0) {
      for (const corso of corsi_assegnati) {
        await query(`
          INSERT INTO inventario_corsi (inventario_id, corso)
          VALUES ($1, $2)
          ON CONFLICT (inventario_id, corso) DO NOTHING
        `, [newItem.id, corso]);
      }
    }
    
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Errore POST inventario:', error);
    res.status(400).json({ error: error.message || 'Errore creazione inventario' });
  }
});

// PUT /api/inventario/:id (update) — admin only
r.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nome, 
      categoria_madre,
      categoria_id,
      posizione = null, 
      fornitore = null,
      note = null, 
      immagine_url = null,
      quantita_totale, 
      in_manutenzione,
      tipo_prestito = 'solo_esterno',
      corsi_assegnati = [],
      unita = []
    } = req.body || {};

    if (!nome) return res.status(400).json({ error: 'nome richiesto' });
    if (!categoria_madre) return res.status(400).json({ error: 'categoria_madre (corso accademico) richiesta' });
    if (!quantita_totale || quantita_totale < 1) return res.status(400).json({ error: 'quantità totale richiesta' });
    if (!['solo_interno', 'solo_esterno', 'entrambi'].includes(tipo_prestito)) {
      return res.status(400).json({ error: 'tipo_prestito deve essere "solo_interno", "solo_esterno" o "entrambi"' });
    }

    // Check if nome already exists for another item
    const existing = await query('SELECT id FROM inventario WHERE nome = $1 AND id != $2', [nome, id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Un altro elemento con questo nome esiste già' });
    }

    // Update inventory item
    const result = await query(`
      UPDATE inventario 
      SET nome = $1, categoria_madre = $2, categoria_id = $3, posizione = $4, fornitore = $5, note = $6, 
          immagine_url = $7, quantita_totale = $8, quantita = $9, in_manutenzione = $10, tipo_prestito = $11, updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `, [nome, categoria_madre, categoria_id, posizione, fornitore, note, immagine_url, quantita_totale, quantita_totale, in_manutenzione || false, tipo_prestito, id]);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Elemento inventario non trovato' });
    }

    // Update units: handle carefully to avoid deleting units in use
    if (unita && unita.length > 0) {
      // Only update if units are explicitly provided
      // Check if any units are currently in use
      const unitsInUse = await query(`
        SELECT COUNT(*) as count FROM inventario_unita 
        WHERE inventario_id = $1 AND (prestito_corrente_id IS NOT NULL OR stato != 'disponibile')
      `, [id]);
      
      if (unitsInUse[0].count > 0) {
        return res.status(400).json({ 
          error: 'Non è possibile modificare le unità perché alcune sono in uso o non disponibili' 
        });
      }
      
      // Update existing units instead of deleting and recreating to avoid foreign key constraints
      const existingUnits = await query('SELECT id, codice_univoco FROM inventario_unita WHERE inventario_id = $1 ORDER BY id', [id]);
      
      // Update existing units
      for (let i = 0; i < Math.min(existingUnits.length, unita.length); i++) {
        const existingUnit = existingUnits[i];
        const newUnit = unita[i];
        await query(`
          UPDATE inventario_unita 
          SET codice_univoco = $1, note = $2
          WHERE id = $3
        `, [newUnit.codice_univoco, newUnit.note || null, existingUnit.id]);
      }
      
      // Add new units if needed
      if (unita.length > existingUnits.length) {
        for (let i = existingUnits.length; i < unita.length; i++) {
          const unit = unita[i];
          await query(`
            INSERT INTO inventario_unita (inventario_id, codice_univoco, note)
            VALUES ($1, $2, $3)
          `, [id, unit.codice_univoco, unit.note || null]);
        }
      }
      
      // Remove excess units if needed (only if they're not in use)
      if (unita.length < existingUnits.length) {
        const excessUnits = existingUnits.slice(unita.length);
        for (const excessUnit of excessUnits) {
          // Check if unit is referenced in richieste
          const referenced = await query('SELECT COUNT(*) as count FROM richieste WHERE unit_id = $1', [excessUnit.id]);
          if (referenced[0].count === 0) {
            await query('DELETE FROM inventario_unita WHERE id = $1', [excessUnit.id]);
          }
        }
      }
    } else {
      // Auto-adjust units based on new quantita_totale
      const currentUnits = await query('SELECT COUNT(*) as count FROM inventario_unita WHERE inventario_id = $1', [id]);
      const currentCount = currentUnits[0].count;
      
      if (quantita_totale > currentCount) {
        // Add missing units
        for (let i = currentCount + 1; i <= quantita_totale; i++) {
          const codiceUnivoco = `${nome}-${String(i).padStart(3, '0')}`;
          await query(`
            INSERT INTO inventario_unita (inventario_id, codice_univoco, stato, note)
            VALUES ($1, $2, 'disponibile', NULL)
          `, [id, codiceUnivoco]);
        }
      } else if (quantita_totale < currentCount) {
        // Remove excess units (only if available)
        const excessUnits = await query(`
          SELECT id FROM inventario_unita 
          WHERE inventario_id = $1 AND stato = 'disponibile' AND prestito_corrente_id IS NULL
          ORDER BY id DESC
          LIMIT $2
        `, [id, currentCount - quantita_totale]);
        
        for (const unit of excessUnits) {
          await query('DELETE FROM inventario_unita WHERE id = $1', [unit.id]);
        }
      }
    }

    // Update courses: delete existing and re-create
    await query('DELETE FROM inventario_corsi WHERE inventario_id = $1', [id]);
    if (corsi_assegnati && corsi_assegnati.length > 0) {
      for (const corso of corsi_assegnati) {
        await query(`
          INSERT INTO inventario_corsi (inventario_id, corso)
          VALUES ($1, $2)
        `, [id, corso]);
      }
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Errore PUT inventario:', error);
    res.status(400).json({ error: error.message || 'Errore aggiornamento inventario' });
  }
});

// DELETE /api/inventario/:id (delete) — admin only
r.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Controlla se ci sono prestiti attivi per questo oggetto
    const activeLoans = await query(`
      SELECT COUNT(*) as count 
      FROM prestiti p 
      WHERE p.inventario_id = $1 AND p.stato = 'attivo'
    `, [id]);
    
    if (activeLoans[0]?.count > 0) {
      return res.status(400).json({ 
        error: 'Impossibile eliminare: oggetto ha prestiti attivi. Termina prima i prestiti.' 
      });
    }
    
    // Controlla se ci sono richieste in attesa per questo oggetto
    const pendingRequests = await query(`
      SELECT COUNT(*) as count 
      FROM richieste r 
      WHERE r.inventario_id = $1 AND r.stato = 'in_attesa'
    `, [id]);
    
    if (pendingRequests[0]?.count > 0) {
      return res.status(400).json({ 
        error: 'Impossibile eliminare: oggetto ha richieste in attesa. Gestisci prima le richieste.' 
      });
    }
    
    // Prima elimina le unità associate
    await query('DELETE FROM inventario_unita WHERE inventario_id = $1', [id]);
    
    // Poi elimina l'articolo principale
    const result = await query('DELETE FROM inventario WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Elemento inventario non trovato' });
    }
    
    res.json({ message: 'Elemento inventario eliminato con successo' });
  } catch (error) {
    console.error('Errore DELETE inventario:', error);
    res.status(400).json({ error: error.message || 'Errore eliminazione inventario' });
  }
});

// GET /api/inventario/:id/units - Get all units for an inventory item
r.get('/:id/units', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT iu.*, i.nome as item_name 
      FROM inventario_unita iu
      LEFT JOIN inventario i ON i.id = iu.inventario_id
      WHERE iu.inventario_id = $1 
      ORDER BY iu.codice_univoco
    `, [id]);
    res.json(result);
  } catch (error) {
    console.error('Errore GET units:', error);
    res.status(500).json({ error: error.message || 'Errore nel recupero delle unità' });
  }
});

// GET /api/inventario/:id/disponibili - Get available units for an inventory item
r.get('/:id/disponibili', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT 
        iu.id,
        iu.codice_univoco,
        iu.stato,
        iu.note,
        iu.inventario_id,
        i.nome as item_name
      FROM inventario_unita iu
      JOIN inventario i ON i.id = iu.inventario_id
      WHERE iu.inventario_id = $1 
        AND iu.stato = 'disponibile' 
        AND iu.prestito_corrente_id IS NULL
      ORDER BY iu.codice_univoco
    `, [id]);
    res.json(result);
  } catch (error) {
    console.error('Errore GET disponibili:', error);
    res.status(500).json({ error: error.message || 'Errore nel recupero delle unità disponibili' });
  }
});

// PUT /api/inventario/units/:unitId/status - Update unit status
r.put('/units/:unitId/status', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { unitId } = req.params;
    const { stato, prestito_corrente_id = null } = req.body;
    
    if (!stato) return res.status(400).json({ error: 'Stato richiesto' });
    
    const result = await query(`
      UPDATE inventario_unita 
      SET stato = $1, prestito_corrente_id = $2
      WHERE id = $3
    `, [stato, prestito_corrente_id, unitId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Unità non trovata' });
    }
    
    res.json({ message: 'Stato unità aggiornato' });
  } catch (error) {
    console.error('Errore PUT unit status:', error);
    res.status(500).json({ error: error.message || 'Errore nell\'aggiornamento dello stato unità' });
  }
});

export default r;