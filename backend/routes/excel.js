// backend/routes/excel.js - Gestione Import/Export Excel
import { Router } from 'express';
import { query } from '../utils/postgres.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';

const r = Router();

// Configurazione multer per upload file - solo memoria per Railway
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});

// GET /api/excel/inventario/export - Export inventario completo
r.get('/inventario/export', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        i.*,
        cs.nome as categoria_nome,
        STRING_AGG(ic.corso, ',') as corsi_assegnati,
        (SELECT COUNT(*) FROM inventario_unita iu 
         WHERE iu.inventario_id = i.id 
         AND iu.stato = 'disponibile' 
         AND iu.prestito_corrente_id IS NULL 
         AND iu.richiesta_riservata_id IS NULL) as unita_disponibili
      FROM inventario i
      LEFT JOIN categorie_semplici cs ON cs.id = i.categoria_id
      LEFT JOIN inventario_corsi ic ON ic.inventario_id = i.id
      GROUP BY i.id, cs.nome
      ORDER BY i.nome
    `);

    // Prepara dati per Excel
    const data = result.map(item => ({
      'ID': item.id,
      'Nome': item.nome,
      'Quantità Totale': item.quantita_totale || 0,
      'Corso Accademico': item.categoria_madre || '',
      'Categoria': item.categoria_nome || '',
      'Posizione': item.posizione || '',
      'Note': item.note || '',
      'Immagine URL': item.immagine_url || '',
      'In Manutenzione': item.in_manutenzione ? 'Sì' : 'No',
      'Soglia Minima': item.soglia_minima || 1,
      'Unità Disponibili': item.unita_disponibili || 0,
      'Corsi Assegnati': item.corsi_assegnati || '',
      'Data Creazione': new Date(item.created_at).toLocaleDateString('it-IT'),
      'Data Aggiornamento': new Date(item.updated_at).toLocaleDateString('it-IT')
    }));

    // Crea workbook Excel
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    
    // Set column widths
    const colWidths = [
      { wch: 5 },   // ID
      { wch: 25 },  // Nome
      { wch: 12 },  // Quantità Totale
      { wch: 20 },  // Corso Accademico
      { wch: 20 },  // Categoria
      { wch: 15 },  // Posizione
      { wch: 40 },  // Note
      { wch: 30 },  // Immagine URL
      { wch: 12 },  // In Manutenzione
      { wch: 12 },  // Soglia Minima
      { wch: 12 },  // Unità Disponibili
      { wch: 30 },  // Corsi Assegnati
      { wch: 15 },  // Data Creazione
      { wch: 15 }   // Data Aggiornamento
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    
    // Genera buffer Excel
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // Imposta headers per download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="inventario_laba.xlsx"');
    res.setHeader('Content-Length', excelBuffer.length);
    
    res.send(excelBuffer);
  } catch (error) {
    console.error('Errore export Excel inventario:', error);
    res.status(500).json({ error: 'Errore durante l\'export Excel' });
  }
});

// Middleware personalizzato per gestire file upload senza multer
const handleFileUpload = (req, res, next) => {
  if (req.method !== 'POST') return next();
  
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', () => {
    try {
      // Parse multipart form data manualmente
      const boundary = req.headers['content-type']?.split('boundary=')[1];
      if (!boundary) {
        return res.status(400).json({ error: 'Content-Type boundary mancante' });
      }
      
      const parts = body.split(`--${boundary}`);
      let fileData = null;
      
      for (const part of parts) {
        if (part.includes('Content-Disposition: form-data')) {
          const lines = part.split('\r\n');
          const disposition = lines.find(line => line.includes('Content-Disposition'));
          
          if (disposition && disposition.includes('filename=')) {
            const filename = disposition.match(/filename="([^"]+)"/)?.[1];
            const contentType = lines.find(line => line.startsWith('Content-Type:'))?.split(': ')[1];
            
            // Trova i dati del file (dopo le header)
            const headerEnd = part.indexOf('\r\n\r\n');
            if (headerEnd !== -1) {
              const fileContent = part.substring(headerEnd + 4);
              // Rimuovi l'ultimo \r\n se presente
              const cleanContent = fileContent.replace(/\r\n$/, '');
              
              fileData = {
                originalname: filename,
                mimetype: contentType,
                buffer: Buffer.from(cleanContent, 'binary'),
                size: cleanContent.length
              };
              break;
            }
          }
        }
      }
      
      req.file = fileData;
      next();
    } catch (error) {
      console.log('Errore parsing file:', error.message);
      res.status(400).json({ error: 'Errore nel parsing del file' });
    }
  });
};

// POST /api/excel/inventario/import - Import inventario da Excel
r.post('/inventario/import', requireAuth, requireRole('admin'), handleFileUpload, async (req, res) => {
  try {
    // Debug temporaneo per produzione
    console.log('=== DEBUG IMPORT EXCEL ===');
    console.log('req.file:', req.file);
    console.log('req.files:', req.files);
    console.log('req.body:', req.body);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Headers:', req.headers);
    console.log('========================');
    
    // Gestisci file con upload.any()
    let file = null;
    if (req.files && req.files.length > 0) {
      file = req.files[0]; // Prendi il primo file
      console.log('File trovato in req.files:', file.originalname, file.size, 'bytes');
    } else if (req.file) {
      file = req.file;
      console.log('File trovato in req.file:', file.originalname, file.size, 'bytes');
    } else {
      console.log('ERRORE: Nessun file trovato');
      console.log('req.files type:', typeof req.files);
      console.log('req.file type:', typeof req.file);
      console.log('req.body keys:', Object.keys(req.body));
      
      // Prova a recuperare il file dal body se è presente
      if (req.body && req.body.file) {
        console.log('File trovato nel body, ma non processato da multer');
        return res.status(400).json({ error: 'File non processato correttamente. Assicurati di selezionare un file Excel valido.' });
      }
      
      return res.status(400).json({ error: 'File Excel richiesto' });
    }

    // Leggi file Excel
    console.log('Tentativo di leggere file Excel...');
    console.log('File size:', file.size, 'bytes');
    console.log('File mimetype:', file.mimetype);
    console.log('File originalname:', file.originalname);
    
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    console.log('Workbook creato, sheet names:', workbook.SheetNames);
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    console.log('Worksheet caricato:', sheetName);
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    console.log('JSON data length:', jsonData.length);
    console.log('Prima riga:', jsonData[0]);
    
    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'File Excel vuoto' });
    }

    const results = {
      success: 0,
      errors: [],
      total: jsonData.length
    };

    // Processa ogni riga
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNum = i + 2; // +2 perché Excel inizia da 1 e c'è l'header
      
      try {
        // Validazione campi obbligatori
        if (!row.Nome) {
          throw new Error('Nome è obbligatorio');
        }

        // Prepara dati per inserimento (solo campi modificabili dall'utente)
        const itemData = {
          nome: row.Nome.toString().trim(),
          quantita_totale: parseInt(row['Quantità Totale']) || 1,
          categoria_madre: row['Corso Accademico']?.toString().trim() || null,
          posizione: row.Posizione?.toString().trim() || null,
          note: row.Note?.toString().trim() || null,
          immagine_url: row['Immagine URL']?.toString().trim() || null,
          in_manutenzione: row['In Manutenzione']?.toString().toLowerCase() === 'sì' || 
                          row['In Manutenzione']?.toString().toLowerCase() === 'si' || 
                          row['In Manutenzione']?.toString().toLowerCase() === 'yes' || 
                          row['In Manutenzione'] === 1,
          soglia_minima: parseInt(row['Soglia Minima']) || 1,
          fornitore: row.Fornitore?.toString().trim() || null,
          tipo_prestito: row['Tipo Prestito']?.toString().trim() || 'solo_esterno'
        };

        // Ignora campi automatici se presenti nel file
        // ID, Unità Disponibili, Data Creazione, Data Aggiornamento sono gestiti dal sistema

        // Validazione tipo_prestito
        if (!['solo_esterno', 'solo_interno', 'entrambi'].includes(itemData.tipo_prestito)) {
          throw new Error('Tipo Prestito deve essere: solo_esterno, solo_interno o entrambi');
        }

        // Gestisci categoria
        let categoria_id = null;
        if (row.Categoria) {
          const categoriaNome = row.Categoria.toString().trim();
          // Cerca categoria esistente
          const categoria = await query('SELECT id FROM categorie_semplici WHERE nome = $1', [categoriaNome]);
          if (categoria.length > 0) {
            categoria_id = categoria[0].id;
          } else {
            // Crea nuova categoria
            const newCategoria = await query('INSERT INTO categorie_semplici (nome) VALUES ($1) RETURNING id', [categoriaNome]);
            categoria_id = newCategoria[0].id;
          }
        }

        // Verifica se elemento esiste già
        const existing = await query('SELECT id FROM inventario WHERE nome = $1', [itemData.nome]);
        
        if (existing.length > 0) {
          // Aggiorna elemento esistente
          await query(`
            UPDATE inventario 
            SET quantita_totale = $2, categoria_madre = $3, categoria_id = $4, 
                posizione = $5, note = $6, immagine_url = $7, 
                in_manutenzione = $8, soglia_minima = $9, fornitore = $10, tipo_prestito = $11, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [
            existing[0].id, itemData.quantita_totale, itemData.categoria_madre, categoria_id,
            itemData.posizione, itemData.note, itemData.immagine_url,
            itemData.in_manutenzione, itemData.soglia_minima, itemData.fornitore, itemData.tipo_prestito
          ]);
        } else {
          // Inserisci nuovo elemento
          const newItem = await query(`
            INSERT INTO inventario (nome, quantita_totale, categoria_madre, categoria_id, 
                                   posizione, note, immagine_url, in_manutenzione, soglia_minima, fornitore, tipo_prestito)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
          `, [
            itemData.nome, itemData.quantita_totale, itemData.categoria_madre, categoria_id,
            itemData.posizione, itemData.note, itemData.immagine_url,
            itemData.in_manutenzione, itemData.soglia_minima, itemData.fornitore, itemData.tipo_prestito
          ]);

          // Gestisci corsi assegnati
          if (row['Corsi Assegnati']) {
            const corsi = row['Corsi Assegnati'].toString().split(',').map(c => c.trim()).filter(c => c);
            for (const corso of corsi) {
              // Inserisci corso se non esiste
              await query('INSERT INTO corsi (corso) VALUES ($1) ON CONFLICT (corso) DO NOTHING', [corso]);
              // Assegna corso all'inventario
              await query('INSERT INTO inventario_corsi (inventario_id, corso) VALUES ($1, $2) ON CONFLICT DO NOTHING', 
                         [newItem[0].id, corso]);
            }
          }
        }

        results.success++;
      } catch (error) {
        results.errors.push(`Riga ${rowNum}: ${error.message}`);
      }
    }

    res.json({
      message: `Import completato: ${results.success}/${results.total} elementi processati`,
      success: results.success,
      errors: results.errors,
      total: results.total
    });

  } catch (error) {
    console.error('Errore import Excel inventario:', error);
    res.status(500).json({ error: 'Errore durante l\'import Excel' });
  }
});

// GET /api/excel/inventario/template - Genera template Excel
r.get('/inventario/template', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const templateData = [
      {
        'Nome': 'Esempio: Macchina Fotografica Canon',
        'Quantità Totale': '5',
        'Corso Accademico': 'Fotografia',
        'Categoria': 'Fotocamere',
        'Posizione': 'Armadio A - Ripiano 1',
        'Note': 'Esempio: Macchina professionale per corsi di fotografia',
        'Immagine URL': 'https://example.com/fotocamera.jpg',
        'In Manutenzione': 'No (Sì/No)',
        'Soglia Minima': '2',
        'Corsi Assegnati': 'Fotografia, Video',
        'Fornitore': 'Esempio: Canon Italia',
        'Tipo Prestito': 'solo_esterno (solo_esterno/solo_interno/entrambi)'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    
    const colWidths = [
      { wch: 25 },  // Nome
      { wch: 12 },  // Quantità Totale
      { wch: 20 },  // Corso Accademico
      { wch: 20 },  // Categoria
      { wch: 15 },  // Posizione
      { wch: 40 },  // Note
      { wch: 30 },  // Immagine URL
      { wch: 12 },  // In Manutenzione
      { wch: 12 },  // Soglia Minima
      { wch: 30 },  // Corsi Assegnati
      { wch: 20 },  // Fornitore
      { wch: 25 }   // Tipo Prestito
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Template Inventario');
    
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="template_inventario_laba.xlsx"');
    res.setHeader('Content-Length', excelBuffer.length);
    
    res.send(excelBuffer);
  } catch (error) {
    console.error('Errore generazione template Excel:', error);
    res.status(500).json({ error: 'Errore durante la generazione del template' });
  }
});

export default r;
