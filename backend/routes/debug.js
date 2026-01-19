// backend/routes/debug.js - Endpoint per debug
import { Router } from 'express';
import { query } from '../utils/postgres.js';
import { testEmailConnection, sendApprovalEmail } from '../utils/email.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const r = Router();

// GET /api/debug/users - Lista tutti gli utenti
r.get('/users', async (req, res) => {
  try {
    const users = await query('SELECT id, email, name, surname, ruolo FROM users ORDER BY id');
    res.json(users);
  } catch (error) {
    console.error('Errore GET users:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET /api/debug/inventario-schema - Verifica schema tabella inventario
r.get('/inventario-schema', async (req, res) => {
  try {
    const schema = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'inventario' 
      ORDER BY ordinal_position
    `);
    res.json(schema);
  } catch (error) {
    console.error('Errore GET inventario schema:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET /api/debug/test-email - Test connessione SMTP (admin only)
r.get('/test-email', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    console.log('🧪 Test connessione SMTP richiesto da admin');
    const result = await testEmailConnection();
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Connessione SMTP verificata con successo',
        config: {
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: process.env.SMTP_PORT || '587',
          user: process.env.SMTP_USER || 'service@labafirenze.com',
          passwordSet: !!process.env.SMTP_PASSWORD
        }
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error,
        config: {
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: process.env.SMTP_PORT || '587',
          user: process.env.SMTP_USER || 'service@labafirenze.com',
          passwordSet: !!process.env.SMTP_PASSWORD
        }
      });
    }
  } catch (error) {
    console.error('Errore test email:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
});

// GET /api/debug/timezone - Verifica timezone e ora corrente del database
r.get('/timezone', requireAuth, async (req, res) => {
  try {
    // Verifica timezone del database
    const timezoneInfo = await query(`
      SELECT 
        current_setting('timezone') as database_timezone,
        CURRENT_TIMESTAMP as database_now,
        CURRENT_DATE as database_today,
        NOW() as database_now_with_tz,
        (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') as utc_now,
        (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Rome') as rome_now,
        extract(timezone from NOW()) / 3600 as timezone_offset_hours
    `);
    
    // Ora corrente del server Node.js
    const serverNow = new Date();
    const serverTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    res.json({
      database: {
        timezone: timezoneInfo[0]?.database_timezone || 'unknown',
        current_timestamp: timezoneInfo[0]?.database_now || null,
        current_date: timezoneInfo[0]?.database_today || null,
        now_with_tz: timezoneInfo[0]?.database_now_with_tz || null,
        utc_now: timezoneInfo[0]?.utc_now || null,
        rome_now: timezoneInfo[0]?.rome_now || null,
        timezone_offset_hours: timezoneInfo[0]?.timezone_offset_hours || 0
      },
      server: {
        timezone: serverTimezone,
        current_time: serverNow.toISOString(),
        current_time_local: serverNow.toLocaleString('it-IT', { timeZone: 'Europe/Rome' })
      },
      formatted: {
        database_now_formatted: timezoneInfo[0]?.database_now 
          ? new Date(timezoneInfo[0].database_now).toLocaleString('it-IT', { timeZone: 'Europe/Rome' })
          : null,
        server_now_formatted: serverNow.toLocaleString('it-IT', { timeZone: 'Europe/Rome' })
      }
    });
  } catch (error) {
    console.error('Errore GET timezone:', error);
    res.status(500).json({ error: 'Errore interno del server', details: error.message });
  }
});

// POST /api/debug/send-test-email - Invia email di test (admin only)
r.post('/send-test-email', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: 'Email destinatario richiesta (campo "to")' });
    }
    
    console.log(`🧪 Invio email di test a ${to} richiesto da admin`);
    
    const result = await sendApprovalEmail({
      to: to,
      studentName: 'Test User',
      itemName: 'Oggetto di Test',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: 'Questa è una email di test per verificare la configurazione SMTP.'
    });
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: `Email di test inviata con successo a ${to}`,
        messageId: result.messageId
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error,
        details: result.details
      });
    }
  } catch (error) {
    console.error('Errore invio email di test:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
});

export default r;
