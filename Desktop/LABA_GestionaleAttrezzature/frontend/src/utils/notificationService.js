// Servizio per gestire notifiche desktop del browser
class NotificationService {
  constructor() {
    this.isSupported = 'Notification' in window;
    this.permission = this.isSupported ? Notification.permission : 'denied';
    this.registration = null;
  }

  // Richiede permessi per notifiche desktop
  async requestPermission() {
    if (!this.isSupported) {
      throw new Error('Le notifiche non sono supportate da questo browser');
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission === 'denied') {
      throw new Error('Le notifiche sono state negate. Abilita le notifiche nelle impostazioni del browser.');
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    } catch (error) {
      throw new Error('Errore nella richiesta dei permessi: ' + error.message);
    }
  }

  // Registra il service worker
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker non supportato');
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      return this.registration;
    } catch (error) {
      throw new Error('Errore nella registrazione del Service Worker: ' + error.message);
    }
  }

  // Mostra notifica desktop
  async showDesktopNotification(title, options = {}) {
    if (!this.isSupported || this.permission !== 'granted') {
      throw new Error('Notifiche desktop non disponibili');
    }

    const defaultOptions = {
      body: '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      silent: false,
      tag: 'laba-notification',
      data: {
        timestamp: Date.now(),
        url: window.location.href
      }
    };

    const notificationOptions = { ...defaultOptions, ...options };

    try {
      const notification = new Notification(title, notificationOptions);
      
      // Auto-close dopo 5 secondi se non richiede interazione
      if (!notificationOptions.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      // Gestisce il click sulla notifica
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (error) {
      throw new Error('Errore nella creazione della notifica: ' + error.message);
    }
  }

  // Notifica per nuove richieste (admin)
  async notifyNewRequest(request) {
    const title = 'Nuova Richiesta di Prestito';
    const body = `${request.utente_nome} ${request.utente_cognome} ha richiesto: ${request.oggetto_nome}`;
    
    return this.showDesktopNotification(title, {
      body,
      icon: '/favicon.ico',
      tag: `request-${request.id}`,
      requireInteraction: true,
      data: {
        type: 'new_request',
        requestId: request.id,
        url: '/#prestiti'
      }
    });
  }

  // Notifica per richieste approvate/rifiutate (utente)
  async notifyRequestStatus(request, status) {
    const title = status === 'approvata' ? 'Richiesta Approvata!' : 'Richiesta Rifiutata';
    const body = `La tua richiesta per ${request.oggetto_nome} è stata ${status}`;
    
    return this.showDesktopNotification(title, {
      body,
      icon: '/favicon.ico',
      tag: `request-status-${request.id}`,
      requireInteraction: true,
      data: {
        type: 'request_status',
        requestId: request.id,
        status,
        url: '/#richieste'
      }
    });
  }

  // Notifica per riparazioni completate
  async notifyRepairCompleted(repair) {
    const title = 'Riparazione Completata';
    const body = `La riparazione di ${repair.oggetto_nome} è stata completata`;
    
    return this.showDesktopNotification(title, {
      body,
      icon: '/favicon.ico',
      tag: `repair-${repair.id}`,
      requireInteraction: true,
      data: {
        type: 'repair_completed',
        repairId: repair.id,
        url: '/#riparazioni'
      }
    });
  }

  // Notifica per segnalazioni
  async notifyNewReport(report) {
    const title = 'Nuova Segnalazione';
    const body = `${report.utente_nome} ${report.utente_cognome}: ${report.tipo} - ${report.messaggio}`;
    
    return this.showDesktopNotification(title, {
      body,
      icon: '/favicon.ico',
      tag: `report-${report.id}`,
      requireInteraction: true,
      data: {
        type: 'new_report',
        reportId: report.id,
        url: '/#segnalazioni'
      }
    });
  }

  // Notifica generica
  async notifyGeneric(title, message, type = 'info') {
    const icons = {
      info: '/favicon.ico',
      success: '/favicon.ico',
      warning: '/favicon.ico',
      error: '/favicon.ico'
    };

    return this.showDesktopNotification(title, {
      body: message,
      icon: icons[type] || icons.info,
      tag: `generic-${Date.now()}`,
      data: {
        type: 'generic',
        notificationType: type
      }
    });
  }

  // Controlla se le notifiche sono abilitate
  isEnabled() {
    return this.isSupported && this.permission === 'granted';
  }

  // Ottiene lo stato dei permessi
  getPermissionStatus() {
    return {
      supported: this.isSupported,
      permission: this.permission,
      enabled: this.isEnabled()
    };
  }

  // Disabilita le notifiche (rimuove il service worker)
  async disable() {
    if (this.registration) {
      await this.registration.unregister();
      this.registration = null;
    }
  }
}

// Istanza singleton
const notificationService = new NotificationService();

export default notificationService;


