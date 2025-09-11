import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import inventarioUnita from '../models/inventario_unita.js';

const r = Router();

// GET /api/avvisi - Get dashboard alerts for admin
r.get('/', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const lowStock = inventarioUnita.getLowStockItems();
    const overdue = inventarioUnita.getOverdueLoans();
    const dueToday = inventarioUnita.getLoansDueToday();
    const dueTomorrow = inventarioUnita.getLoansDueTomorrow();
    
    res.json({
      scorte_basse: lowStock,
      prestiti_scaduti: overdue,
      scadenze_oggi: dueToday,
      scadenze_domani: dueTomorrow,
      totale_avvisi: lowStock.length + overdue.length + dueToday.length + dueTomorrow.length
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Errore nel caricamento avvisi' });
  }
});

// GET /api/avvisi/utente - Get user-specific alerts
r.get('/utente', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    
    const userOverdue = inventarioUnita.getOverdueLoans().filter(loan => loan.utente_id === userId);
    const userDueToday = inventarioUnita.getLoansDueToday().filter(loan => loan.utente_id === userId);
    const userDueTomorrow = inventarioUnita.getLoansDueTomorrow().filter(loan => loan.utente_id === userId);
    
    res.json({
      prestiti_scaduti: userOverdue,
      scadenze_oggi: userDueToday,
      scadenze_domani: userDueTomorrow,
      totale_avvisi: userOverdue.length + userDueToday.length + userDueTomorrow.length
    });
  } catch (error) {
    console.error('Error fetching user alerts:', error);
    res.status(500).json({ error: 'Errore nel caricamento avvisi utente' });
  }
});

export default r;



