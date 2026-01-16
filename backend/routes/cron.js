// backend/routes/cron.js
// Endpoint per cron job esterni (es. reminder email, pulizie, ecc.)
import { Router } from 'express';
import { query } from '../utils/postgres.js';
import { sendReminderEmail } from '../utils/email.js';

const r = Router();

// GET /api/cron/send-reminders
// Endpoint da chiamare alle 18:00 ogni giorno per inviare reminder il giorno prima della riconsegna
// Può essere chiamato da un servizio esterno (cron-job.org, Railway cron, ecc.)
// Non richiede autenticazione ma usa un token segreto per sicurezza
r.get('/send-reminders', async (req, res) => {
  try {
    // Verifica token segreto (opzionale ma consigliato)
    const cronToken = process.env.CRON_SECRET_TOKEN;
    if (cronToken && req.query.token !== cronToken) {
      return res.status(401).json({ error: 'Token non valido' });
    }

    console.log('🔔 Avvio invio reminder email per riconsegne di domani...');
    
    // Trova tutti i prestiti attivi con data_rientro = domani
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
    
    console.log(`📅 Cercando prestiti con data_rientro = ${tomorrowStr}`);
    
    // Query per trovare prestiti attivi con riconsegna domani
    // Cerchiamo di collegare l'utente tramite richieste o tramite il campo 'chi'
    const loans = await query(`
      SELECT DISTINCT
        p.id as prestito_id,
        p.chi,
        p.data_uscita,
        p.data_rientro,
        i.nome as inventario_nome,
        r.utente_id,
        u.name,
        u.surname,
        u.email
      FROM prestiti p
      LEFT JOIN inventario i ON p.inventario_id = i.id
      LEFT JOIN richieste r ON r.id = p.richiesta_id
      LEFT JOIN users u ON (
        r.utente_id = u.id 
        OR p.chi = (u.name || ' ' || u.surname)
        OR p.chi LIKE '%' || u.email || '%'
        OR p.chi = u.email
      )
      WHERE p.stato = 'attivo'
        AND DATE(p.data_rientro) = $1
        AND u.email IS NOT NULL
        AND u.email != ''
      ORDER BY p.id
    `, [tomorrowStr]);
    
    console.log(`📋 Trovati ${loans.length} prestiti da notificare`);
    
    if (loans.length === 0) {
      return res.json({
        success: true,
        message: 'Nessun prestito da notificare per domani',
        count: 0,
        date: tomorrowStr
      });
    }
    
    // Invia email per ogni prestito
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const loan of loans) {
      try {
        const studentName = loan.name && loan.surname 
          ? `${loan.name} ${loan.surname}`.trim()
          : loan.chi || loan.email;
        
        console.log(`📧 Invio reminder a ${loan.email} per prestito ${loan.prestito_id} (${loan.inventario_nome})`);
        
        const emailResult = await sendReminderEmail({
          to: loan.email,
          studentName: studentName,
          itemName: loan.inventario_nome || 'Attrezzatura',
          returnDate: loan.data_rientro,
          startDate: loan.data_uscita || null
        });
        
        if (emailResult.success) {
          successCount++;
          results.push({
            prestito_id: loan.prestito_id,
            email: loan.email,
            status: 'success',
            messageId: emailResult.messageId
          });
        } else {
          errorCount++;
          results.push({
            prestito_id: loan.prestito_id,
            email: loan.email,
            status: 'error',
            error: emailResult.error
          });
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Errore invio reminder per prestito ${loan.prestito_id}:`, error);
        results.push({
          prestito_id: loan.prestito_id,
          email: loan.email,
          status: 'error',
          error: error.message
        });
      }
    }
    
    console.log(`✅ Invio reminder completato: ${successCount} successi, ${errorCount} errori`);
    
    res.json({
      success: true,
      message: `Reminder inviati: ${successCount} successi, ${errorCount} errori`,
      date: tomorrowStr,
      total: loans.length,
      successCount,
      errorCount,
      results
    });
    
  } catch (error) {
    console.error('❌ Errore cron send-reminders:', error);
    res.status(500).json({
      success: false,
      error: 'Errore interno del server',
      message: error.message
    });
  }
});

export default r;
