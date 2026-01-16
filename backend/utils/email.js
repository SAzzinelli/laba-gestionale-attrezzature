// backend/utils/email.js
// Utility per l'invio di email tramite Mailgun API REST o SMTP
import nodemailer from 'nodemailer';

// Configurazione da variabili d'ambiente
const EMAIL_FROM = process.env.EMAIL_FROM || 'service@labafirenze.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'LABA Firenze - Gestionale Attrezzature';

// Mailgun API REST (preferito)
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || 'labafirenze.com';
const MAILGUN_REGION = process.env.MAILGUN_REGION || 'eu'; // 'eu' o 'us'

// SMTP (fallback)
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || 'service@labafirenze.com';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;

// Crea transporter (lazy initialization)
let transporter = null;

function getTransporter() {
  if (!transporter) {
    if (!SMTP_PASSWORD) {
      console.warn('⚠️ SMTP_PASSWORD non configurata. Le email non verranno inviate.');
      console.warn('⚠️ Configurazione SMTP:', {
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        user: SMTP_USER,
        passwordSet: !!SMTP_PASSWORD
      });
      return null;
    }

    // Rimuovi spazi dalla password (Gmail App Password non deve avere spazi)
    const cleanPassword = SMTP_PASSWORD.replace(/\s+/g, '');
    if (SMTP_PASSWORD !== cleanPassword) {
      console.warn('⚠️ La password SMTP contiene spazi. Rimossi automaticamente.');
      console.warn('⚠️ IMPORTANTE: Assicurati che la password per app di Gmail non abbia spazi nelle variabili d\'ambiente!');
    }

    console.log('📧 Configurazione SMTP:', {
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      user: SMTP_USER,
      from: EMAIL_FROM,
      fromName: EMAIL_FROM_NAME,
      passwordLength: cleanPassword.length
    });
    
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: cleanPassword
      },
      tls: {
        rejectUnauthorized: false // Necessario per alcuni server SMTP o ambienti di sviluppo
      },
      connectionTimeout: 20000, // 20 secondi per stabilire connessione (aumentato per Gmail)
      greetingTimeout: 20000, // 20 secondi per greeting
      socketTimeout: 20000, // 20 secondi per operazioni socket
      debug: process.env.NODE_ENV === 'development', // Debug solo in sviluppo
      logger: process.env.NODE_ENV === 'development' // Log solo in sviluppo
    });
  }
  return transporter;
}

/**
 * Invia email tramite Mailgun API REST
 */
async function sendViaMailgunAPI({ to, subject, html, text }) {
  if (!MAILGUN_API_KEY) {
    throw new Error('MAILGUN_API_KEY non configurata');
  }

  if (!MAILGUN_DOMAIN) {
    throw new Error('MAILGUN_DOMAIN non configurata');
  }

  // Costruisci l'URL dell'API correttamente
  const apiBaseUrl = `https://api.${MAILGUN_REGION === 'us' ? '' : MAILGUN_REGION + '.'}mailgun.net/v3/${MAILGUN_DOMAIN}`;
  const apiUrl = `${apiBaseUrl}/messages`;

  console.log('📧 Invio email via Mailgun API:', {
    apiUrl,
    domain: MAILGUN_DOMAIN,
    region: MAILGUN_REGION,
    from: EMAIL_FROM,
    to
  });

  const formData = new URLSearchParams();
  formData.append('from', `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`);
  formData.append('to', to);
  formData.append('subject', subject);
  formData.append('html', html);
  formData.append('text', text);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  });

  const responseText = await response.text();
  
  if (!response.ok) {
    let errorMessage = `Mailgun API error: ${response.status} - ${responseText}`;
    
    // Messaggi di errore più chiari
    if (response.status === 403) {
      try {
        const errorJson = JSON.parse(responseText);
        if (errorJson.message && errorJson.message.includes('unverified')) {
          errorMessage = `Dominio non verificato: ${errorJson.message}\n\n` +
            'Per risolvere:\n' +
            '1. Vai su Mailgun → Domain Settings → DNS records\n' +
            '2. Verifica che tutti i record DNS siano stati aggiunti correttamente\n' +
            '3. Attendi la propagazione DNS (può richiedere fino a 30 minuti)\n' +
            '4. Clicca "Verify DNS Settings" su Mailgun';
        }
      } catch (e) {
        // Se non è JSON, usa il messaggio originale
      }
    } else if (response.status === 404) {
      errorMessage = `URL API non trovato: ${apiUrl}\n\n` +
        'Verifica che:\n' +
        `- MAILGUN_DOMAIN sia corretto (attuale: ${MAILGUN_DOMAIN})\n` +
        `- MAILGUN_REGION sia corretto (attuale: ${MAILGUN_REGION}, deve essere 'eu' o 'us')`;
    }
    
    throw new Error(errorMessage);
  }

  let result;
  try {
    result = JSON.parse(responseText);
  } catch (e) {
    result = { message: responseText, id: 'unknown' };
  }
  
  return result;
}

/**
 * Invia email di notifica approvazione richiesta
 * @param {Object} options - Opzioni per l'email
 * @param {string} options.to - Email destinatario
 * @param {string} options.studentName - Nome studente
 * @param {string} options.itemName - Nome oggetto noleggiato
 * @param {string} options.startDate - Data inizio prestito (YYYY-MM-DD)
 * @param {string} options.endDate - Data fine prestito (YYYY-MM-DD)
 * @param {string} [options.notes] - Note aggiuntive
 * @returns {Promise<Object>} Risultato invio email
 */
export async function sendApprovalEmail({ to, studentName, itemName, startDate, endDate, notes }) {
  console.log('📧 Tentativo invio email di approvazione:', { to, studentName, itemName });
  
  if (!to) {
    console.error('❌ Email non inviata: destinatario mancante');
    return { success: false, error: 'Destinatario mancante' };
  }

  // Formatta le date in formato italiano
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formattedStartDate = formatDate(startDate);
  const formattedEndDate = formatDate(endDate);

  const subject = '✅ Richiesta di Noleggio Approvata - LABA Firenze';
  const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #033157 0%, #0ea5e9 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background: #ffffff;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-top: none;
            border-radius: 0 0 8px 8px;
          }
          .success-icon {
            font-size: 48px;
            margin-bottom: 20px;
          }
          .info-box {
            background: #f0f9ff;
            border-left: 4px solid #0ea5e9;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .detail-row {
            margin: 15px 0;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .detail-label {
            font-weight: 600;
            color: #033157;
            margin-bottom: 5px;
          }
          .detail-value {
            color: #666;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="success-icon">✅</div>
          <h1 style="margin: 0; font-size: 24px;">Richiesta Approvata!</h1>
        </div>
        <div class="content">
          <p>Ciao <strong>${studentName}</strong>,</p>
          
          <p>La tua richiesta di noleggio è stata <strong>approvata</strong>!</p>
          
          <div class="info-box">
            <p style="margin: 0;"><strong>Puoi ritirare l'attrezzatura presso la segreteria.</strong></p>
          </div>
          
          <h2 style="color: #033157; margin-top: 30px;">Dettagli del Noleggio</h2>
          
          <div class="detail-row">
            <div class="detail-label">Oggetto</div>
            <div class="detail-value">${itemName}</div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">Data Inizio</div>
            <div class="detail-value">${formattedStartDate}</div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">Data Fine (Riconsegna)</div>
            <div class="detail-value">${formattedEndDate}</div>
          </div>
          
          ${notes ? `
          <div class="detail-row">
            <div class="detail-label">Note</div>
            <div class="detail-value">${notes}</div>
          </div>
          ` : ''}
          
          <div class="info-box" style="background: #fef3c7; border-left-color: #f59e0b; margin-top: 20px;">
            <p style="margin: 0;"><strong>⚠️ Importante:</strong> Ricorda di riconsegnare l'attrezzatura entro la data di fine indicata per evitare penalità.</p>
          </div>
          
          <div class="footer">
            <p>LABA Firenze - Gestionale Attrezzature</p>
            <p>Per domande o assistenza, contatta la segreteria.</p>
          </div>
        </div>
      </body>
      </html>
    `;

  const text = `
Richiesta di Noleggio Approvata - LABA Firenze

Ciao ${studentName},

La tua richiesta di noleggio è stata approvata!

Puoi ritirare l'attrezzatura presso la segreteria.

Dettagli del Noleggio:
- Oggetto: ${itemName}
- Data Inizio: ${formattedStartDate}
- Data Fine (Riconsegna): ${formattedEndDate}
${notes ? `- Note: ${notes}` : ''}

⚠️ Importante: Ricorda di riconsegnare l'attrezzatura entro la data di fine indicata per evitare penalità.

LABA Firenze - Gestionale Attrezzature
Per domande o assistenza, contatta la segreteria.
  `.trim();

  // Prova prima con Mailgun API REST, poi fallback a SMTP
  try {
    if (MAILGUN_API_KEY) {
      console.log('📧 Invio email tramite Mailgun API REST...');
      const result = await sendViaMailgunAPI({ to, subject, html, text });
      console.log('✅ Email di approvazione inviata con successo via Mailgun API!', {
        to,
        messageId: result.id || result.message,
        result
      });
      return { success: true, messageId: result.id || result.message };
    } else {
      // Fallback a SMTP
      console.log('📧 Invio email tramite SMTP (fallback)...');
      const emailTransporter = getTransporter();
      
      if (!emailTransporter) {
        console.error('❌ Email non inviata: né Mailgun API né SMTP configurati');
        return { success: false, error: 'Nessun metodo di invio email configurato' };
      }

      const mailOptions = {
        from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
        to: to,
        subject: subject,
        html: html,
        text: text
      };

      const info = await emailTransporter.sendMail(mailOptions);
      console.log('✅ Email di approvazione inviata con successo via SMTP!', {
        to,
        messageId: info.messageId,
        response: info.response
      });
      return { success: true, messageId: info.messageId };
    }
  } catch (error) {
    console.error('❌ Errore invio email di approvazione:', {
      message: error.message,
      code: error.code,
      response: error.response,
      stack: error.stack
    });
    return { success: false, error: error.message, details: error };
  }
}

/**
 * Test connessione email (Mailgun API o SMTP)
 */
export async function testEmailConnection() {
  // Prova prima con Mailgun API
  if (MAILGUN_API_KEY) {
    try {
      // Costruisci l'URL dell'API correttamente
      // Per US: https://api.mailgun.net/v3/domains/{domain}
      // Per EU: https://api.eu.mailgun.net/v3/domains/{domain}
      const apiBaseUrl = MAILGUN_REGION === 'us' 
        ? `https://api.mailgun.net/v3`
        : `https://api.${MAILGUN_REGION}.mailgun.net/v3`;
      const domainUrl = `${apiBaseUrl}/domains/${MAILGUN_DOMAIN}`;
      
      console.log('🔍 Test connessione Mailgun API...', {
        domain: MAILGUN_DOMAIN,
        region: MAILGUN_REGION,
        apiUrl: domainUrl
      });
      
      // Test: verifica che il dominio esista e sia accessibile (GET /domains/{domain})
      const response = await fetch(domainUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64')}`
        },
        signal: AbortSignal.timeout(10000) // 10 secondi timeout
      });
      
      const responseText = await response.text();
      
      if (response.ok) {
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          result = { message: responseText };
        }
        console.log('✅ Connessione Mailgun API verificata con successo', result);
        return { 
          success: true, 
          method: 'Mailgun API',
          domain: result.domain?.name || MAILGUN_DOMAIN,
          state: result.domain?.state || 'unknown'
        };
      } else {
        let errorMessage = `Mailgun API error: ${response.status} - ${responseText}`;
        
        if (response.status === 404) {
          errorMessage = `Dominio non trovato: ${MAILGUN_DOMAIN}\n\n` +
            'Verifica che:\n' +
            `- MAILGUN_DOMAIN sia corretto (attuale: ${MAILGUN_DOMAIN})\n` +
            `- Il dominio sia stato aggiunto su Mailgun\n` +
            `- MAILGUN_REGION sia corretto (attuale: ${MAILGUN_REGION}, deve essere 'eu' o 'us')`;
        } else if (response.status === 401) {
          errorMessage = `Autenticazione fallita: API key non valida\n\n` +
            'Verifica che MAILGUN_API_KEY sia corretta su Railway';
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ Errore verifica Mailgun API:', error);
      return { 
        success: false, 
        error: error.message || 'Errore sconosciuto durante verifica Mailgun API',
        method: 'Mailgun API'
      };
    }
  }
  
  // Fallback a SMTP
  const emailTransporter = getTransporter();
  
  if (!emailTransporter) {
    return { success: false, error: 'Né Mailgun API né SMTP configurati' };
  }

  try {
    console.log('🔍 Tentativo connessione a SMTP...', {
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      user: SMTP_USER,
      passwordLength: SMTP_PASSWORD ? SMTP_PASSWORD.replace(/\s+/g, '').length : 0
    });
    
    // Timeout di 20 secondi per la verifica SMTP
    const verifyPromise = emailTransporter.verify();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 20000)
    );
    
    await Promise.race([verifyPromise, timeoutPromise]);
    console.log('✅ Connessione SMTP verificata con successo');
    return { success: true, method: 'SMTP' };
  } catch (error) {
    console.error('❌ Errore verifica SMTP:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      syscall: error.syscall,
      address: error.address
    });
    
    // Messaggi di errore più specifici
    let errorMessage = error.message || 'Errore sconosciuto durante verifica SMTP';
    
    if (error.message.includes('timeout') || error.message === 'Connection timeout' || error.code === 'ETIMEDOUT') {
      const isMailgun = SMTP_HOST && SMTP_HOST.includes('mailgun');
      errorMessage = 'Connection timeout - Impossibile connettersi al server SMTP.\n\n' +
        'Possibili cause:\n' +
        (isMailgun ? 
          '1. Credenziali Mailgun errate (verifica SMTP_USER e SMTP_PASSWORD su Railway)\n' +
          '2. Dominio Mailgun non verificato completamente\n' +
          '3. Firewall/rete blocca porta 587\n' +
          '4. Problemi di rete tra Railway e Mailgun EU\n\n' +
          'Soluzioni:\n' +
          '- Verifica che SMTP_HOST sia smtp.eu.mailgun.org (per regione EU)\n' +
          '- Verifica che SMTP_USER sia l\'email completa (es. service@labafirenze.com)\n' +
          '- Controlla su Mailgun che il dominio sia verificato\n' +
          '- Prova a resettare la password SMTP su Mailgun'
          :
          '1. Password SMTP errata o con spazi (verifica su Railway)\n' +
          '2. Server SMTP blocca connessioni da Railway (IP non autorizzato)\n' +
          '3. Firewall/rete blocca porta 587\n' +
          '4. Account email ha restrizioni di sicurezza\n\n' +
          'Soluzioni:\n' +
          '- Verifica che SMTP_PASSWORD su Railway sia corretta\n' +
          '- Verifica che SMTP_HOST e SMTP_PORT siano corretti\n' +
          '- Controlla le impostazioni del provider email');
    } else if (error.code === 'EAUTH') {
      errorMessage = 'Autenticazione fallita - Verifica username e password SMTP';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      errorMessage = `Connessione rifiutata - Verifica host (${SMTP_HOST}) e porta (${SMTP_PORT}) SMTP`;
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Timeout connessione - Il server SMTP non risponde';
    }
    
    return { 
      success: false, 
      error: errorMessage,
      details: {
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode
      }
    };
  }
}
