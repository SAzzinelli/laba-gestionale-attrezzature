// backend/utils/email.js
// Utility per l'invio di email tramite nodemailer
import nodemailer from 'nodemailer';

// Configurazione SMTP da variabili d'ambiente
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || 'service@labafirenze.com';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || 'service@labafirenze.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'LABA Firenze - Gestionale Attrezzature';

// Crea transporter (lazy initialization)
let transporter = null;

function getTransporter() {
  if (!transporter) {
    if (!SMTP_PASSWORD) {
      console.warn('⚠️ SMTP_PASSWORD non configurata. Le email non verranno inviate.');
      return null;
    }

    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD
      }
    });
  }
  return transporter;
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
  const emailTransporter = getTransporter();
  
  if (!emailTransporter) {
    console.warn('⚠️ Email non inviata: SMTP non configurato');
    return { success: false, error: 'SMTP non configurato' };
  }

  if (!to) {
    console.warn('⚠️ Email non inviata: destinatario mancante');
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

  const mailOptions = {
    from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
    to: to,
    subject: '✅ Richiesta di Noleggio Approvata - LABA Firenze',
    html: `
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
    `,
    text: `
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
    `.trim()
  };

  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log('✅ Email di approvazione inviata:', {
      to,
      messageId: info.messageId,
      response: info.response
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Errore invio email di approvazione:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test connessione SMTP
 */
export async function testEmailConnection() {
  const emailTransporter = getTransporter();
  
  if (!emailTransporter) {
    return { success: false, error: 'SMTP non configurato' };
  }

  try {
    await emailTransporter.verify();
    console.log('✅ Connessione SMTP verificata');
    return { success: true };
  } catch (error) {
    console.error('❌ Errore verifica SMTP:', error);
    return { success: false, error: error.message };
  }
}
