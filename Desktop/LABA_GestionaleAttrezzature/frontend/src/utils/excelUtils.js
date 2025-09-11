import * as XLSX from 'xlsx';

// Export inventario to Excel
export const exportInventoryToExcel = (inventory, filename = 'inventario_laba.xlsx') => {
  const data = inventory.map(item => ({
    'ID': item.id,
    'Nome': item.nome,
    'Seriale': item.seriale || '',
    'Categoria': item.categoria_nome || '',
    'Stato': item.stato_effettivo === 'disponibile' ? 'Disponibile' : 
             item.stato_effettivo === 'in_riparazione' ? 'In Riparazione' : 'Non Disponibile',
    'Corsi Assegnati': item.corsi_assegnati || '',
    'Note': item.note || '',
    'Data Creazione': new Date(item.created_at).toLocaleDateString('it-IT')
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  
  // Set column widths
  const colWidths = [
    { wch: 5 },   // ID
    { wch: 25 },  // Nome
    { wch: 15 },  // Seriale
    { wch: 20 },  // Categoria
    { wch: 15 },  // Stato
    { wch: 30 },  // Corsi
    { wch: 40 },  // Note
    { wch: 15 }   // Data
  ];
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
  XLSX.writeFile(wb, filename);
};

// Export richieste to Excel
export const exportRequestsToExcel = (requests, filename = 'richieste_laba.xlsx') => {
  const data = requests.map(request => ({
    'ID': request.id,
    'Oggetto': request.oggetto_nome,
    'Utente': `${request.utente_nome} ${request.utente_cognome}`,
    'Email': request.utente_email,
    'Corso': request.utente_corso,
    'Dal': new Date(request.dal).toLocaleDateString('it-IT'),
    'Al': new Date(request.al).toLocaleDateString('it-IT'),
    'Stato': request.stato === 'in_attesa' ? 'In Attesa' :
             request.stato === 'approvata' ? 'Approvata' : 'Rifiutata',
    'Note': request.note || '',
    'Data Richiesta': new Date(request.created_at).toLocaleDateString('it-IT')
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  
  const colWidths = [
    { wch: 5 },   // ID
    { wch: 25 },  // Oggetto
    { wch: 20 },  // Utente
    { wch: 25 },  // Email
    { wch: 20 },  // Corso
    { wch: 12 },  // Dal
    { wch: 12 },  // Al
    { wch: 12 },  // Stato
    { wch: 30 },  // Note
    { wch: 15 }   // Data Richiesta
  ];
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Richieste');
  XLSX.writeFile(wb, filename);
};

// Export riparazioni to Excel
export const exportRepairsToExcel = (repairs, filename = 'riparazioni_laba.xlsx') => {
  const data = repairs.map(repair => ({
    'ID': repair.id,
    'Elemento': repair.oggetto_nome || 'N/A',
    'Descrizione': repair.descrizione,
    'Stato': repair.stato === 'in_corso' ? 'In Corso' :
             repair.stato === 'completata' ? 'Completata' : 'Annullata',
    'Data Inizio': repair.data_inizio ? new Date(repair.data_inizio).toLocaleDateString('it-IT') : '',
    'Data Fine': repair.data_fine ? new Date(repair.data_fine).toLocaleDateString('it-IT') : '',
    'Costo (€)': repair.costo || '',
    'Note': repair.note || '',
    'Data Creazione': new Date(repair.created_at).toLocaleDateString('it-IT')
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  
  const colWidths = [
    { wch: 5 },   // ID
    { wch: 25 },  // Elemento
    { wch: 40 },  // Descrizione
    { wch: 12 },  // Stato
    { wch: 12 },  // Data Inizio
    { wch: 12 },  // Data Fine
    { wch: 10 },  // Costo
    { wch: 30 },  // Note
    { wch: 15 }   // Data Creazione
  ];
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Riparazioni');
  XLSX.writeFile(wb, filename);
};

// Generate template for inventory import
export const generateInventoryTemplate = () => {
  const templateData = [
    {
      'Nome': 'Esempio: Macchina Fotografica Canon',
      'Seriale': 'Esempio: CF123456789',
      'Categoria': 'Esempio: Fotografia',
      'Note': 'Esempio: Macchina professionale per corsi di fotografia',
      'Disponibile': '1 (1=Disponibile, 0=Non Disponibile)'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  const wb = XLSX.utils.book_new();
  
  const colWidths = [
    { wch: 30 },  // Nome
    { wch: 20 },  // Seriale
    { wch: 20 },  // Categoria
    { wch: 40 },  // Note
    { wch: 15 }   // Disponibile
  ];
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Template Inventario');
  XLSX.writeFile(wb, 'template_inventario_laba.xlsx');
};

// Parse Excel file for inventory import
export const parseInventoryExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Validate and clean data
        const cleanedData = jsonData.map((row, index) => {
          if (!row.Nome) {
            throw new Error(`Riga ${index + 2}: Nome è obbligatorio`);
          }
          
          return {
            nome: row.Nome?.toString().trim(),
            seriale: row.Seriale?.toString().trim() || null,
            categoria: row.Categoria?.toString().trim() || null,
            note: row.Note?.toString().trim() || null,
            disponibile: row.Disponibile === '1' || row.Disponibile === 1 ? 1 : 0
          };
        });
        
        resolve(cleanedData);
      } catch (error) {
        reject(new Error(`Errore nel parsing del file: ${error.message}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Errore nella lettura del file'));
    reader.readAsArrayBuffer(file);
  });
};

// Export segnalazioni to Excel
export const exportReportsToExcel = (reports, filename = 'segnalazioni_laba.xlsx') => {
  const data = reports.map(report => ({
    'ID': report.id,
    'Tipo': report.tipo,
    'Oggetto': report.oggetto_nome || 'N/A',
    'Messaggio': report.messaggio,
    'Stato': report.stato === 'aperta' ? 'Aperta' : 'Chiusa',
    'Utente': `${report.utente_nome} ${report.utente_cognome}`,
    'Email': report.utente_email,
    'Data Segnalazione': new Date(report.created_at).toLocaleDateString('it-IT')
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  
  const colWidths = [
    { wch: 5 },   // ID
    { wch: 15 },  // Tipo
    { wch: 25 },  // Oggetto
    { wch: 40 },  // Messaggio
    { wch: 12 },  // Stato
    { wch: 20 },  // Utente
    { wch: 25 },  // Email
    { wch: 15 }   // Data Segnalazione
  ];
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Segnalazioni');
  XLSX.writeFile(wb, filename);
};


