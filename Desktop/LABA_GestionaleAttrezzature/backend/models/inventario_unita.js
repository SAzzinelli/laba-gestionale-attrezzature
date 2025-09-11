import db from '../utils/db.js';

// Get all units for an inventory item
export function getUnitsByInventoryId(inventarioId) {
  return db.prepare(`
    SELECT * FROM inventario_unita 
    WHERE inventario_id = ? 
    ORDER BY codice_univoco
  `).all(inventarioId);
}

// Get available units for an inventory item
export function getAvailableUnits(inventarioId) {
  return db.prepare(`
    SELECT * FROM inventario_unita 
    WHERE inventario_id = ? AND stato = 'disponibile'
    ORDER BY codice_univoco
  `).all(inventarioId);
}

// Create multiple units for an inventory item
export function createUnits(inventarioId, units) {
  const stmt = db.prepare(`
    INSERT INTO inventario_unita (inventario_id, codice_univoco, stato, note)
    VALUES (?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((units) => {
    for (const unit of units) {
      stmt.run(inventarioId, unit.codice_univoco, 'disponibile', unit.note || null);
    }
  });
  
  insertMany(units);
}

// Update unit status
export function updateUnitStatus(unitId, status, prestitoId = null) {
  return db.prepare(`
    UPDATE inventario_unita 
    SET stato = ?, prestito_corrente_id = ?
    WHERE id = ?
  `).run(status, prestitoId, unitId);
}

// Get unit by unique code
export function getUnitByCode(codice) {
  return db.prepare(`
    SELECT iu.*, i.nome as oggetto_nome
    FROM inventario_unita iu
    JOIN inventario i ON iu.inventario_id = i.id
    WHERE iu.codice_univoco = ?
  `).get(codice);
}

// Get units by loan ID
export function getUnitsByLoanId(loanId) {
  return db.prepare(`
    SELECT * FROM inventario_unita 
    WHERE prestito_corrente_id = ?
  `).all(loanId);
}

// Get low stock items (below threshold)
export function getLowStockItems() {
  return db.prepare(`
    SELECT 
      i.*,
      COUNT(iu.id) as unita_disponibili,
      i.quantita_totale,
      i.soglia_minima,
      ROUND((COUNT(iu.id) * 100.0 / i.quantita_totale), 2) as percentuale_disponibile
    FROM inventario i
    LEFT JOIN inventario_unita iu ON iu.inventario_id = i.id AND iu.stato = 'disponibile'
    GROUP BY i.id
    HAVING COUNT(iu.id) <= i.soglia_minima
    ORDER BY percentuale_disponibile ASC
  `).all();
}

// Get overdue loans
export function getOverdueLoans() {
  return db.prepare(`
    SELECT 
      p.*,
      i.nome as oggetto_nome,
      u.name as utente_nome,
      u.surname as utente_cognome,
      u.email as utente_email,
      JULIANDAY('now') - JULIANDAY(p.al) as giorni_ritardo
    FROM prestiti p
    JOIN inventario i ON p.inventario_id = i.id
    JOIN users u ON p.utente_id = u.id
    WHERE p.stato = 'attivo' 
    AND DATE(p.al) < DATE('now')
    ORDER BY giorni_ritardo DESC
  `).all();
}

// Get loans due today
export function getLoansDueToday() {
  return db.prepare(`
    SELECT 
      p.*,
      i.nome as oggetto_nome,
      u.name as utente_nome,
      u.surname as utente_cognome,
      u.email as utente_email
    FROM prestiti p
    JOIN inventario i ON p.inventario_id = i.id
    JOIN users u ON p.utente_id = u.id
    WHERE p.stato = 'attivo' 
    AND DATE(p.al) = DATE('now')
    ORDER BY p.al
  `).all();
}

// Get loans due tomorrow
export function getLoansDueTomorrow() {
  return db.prepare(`
    SELECT 
      p.*,
      i.nome as oggetto_nome,
      u.name as utente_nome,
      u.surname as utente_cognome,
      u.email as utente_email
    FROM prestiti p
    JOIN inventario i ON p.inventario_id = i.id
    JOIN users u ON p.utente_id = u.id
    WHERE p.stato = 'attivo' 
    AND DATE(p.al) = DATE('now', '+1 day')
    ORDER BY p.al
  `).all();
}

export default {
  getUnitsByInventoryId,
  getAvailableUnits,
  createUnits,
  updateUnitStatus,
  getUnitByCode,
  getUnitsByLoanId,
  getLowStockItems,
  getOverdueLoans,
  getLoansDueToday,
  getLoansDueTomorrow
};



