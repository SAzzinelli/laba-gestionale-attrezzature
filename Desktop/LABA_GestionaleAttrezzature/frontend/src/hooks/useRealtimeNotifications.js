import { useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import notificationService from '../utils/notificationService';

// Hook per gestire notifiche in tempo reale
export const useRealtimeNotifications = () => {
  const { token, isAdmin } = useAuth();
  const intervalRef = useRef(null);
  const lastCheckRef = useRef(Date.now());

  useEffect(() => {
    // Disabilitato per evitare notifiche continue
    return;
    if (!token || !notificationService.isEnabled()) return;

    // Funzione per controllare nuove notifiche
    const checkForNotifications = async () => {
      try {
        if (isAdmin) {
          // Controlla nuove richieste per admin
          const requestsResponse = await fetch('/api/richieste?all=1', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (requestsResponse.ok) {
            const requests = await requestsResponse.json();
            const newRequests = requests.filter(req => 
              req.stato === 'in_attesa' && 
              new Date(req.created_at).getTime() > lastCheckRef.current
            );
            
            for (const request of newRequests) {
              await notificationService.notifyNewRequest(request);
            }
          }

          // Controlla nuove segnalazioni per admin
          const reportsResponse = await fetch('/api/segnalazioni', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (reportsResponse.ok) {
            const reports = await reportsResponse.json();
            const newReports = reports.filter(report => 
              report.stato === 'aperta' && 
              new Date(report.created_at).getTime() > lastCheckRef.current
            );
            
            for (const report of newReports) {
              await notificationService.notifyNewReport(report);
            }
          }
        } else {
          // Controlla aggiornamenti richieste per utenti
          const requestsResponse = await fetch('/api/richieste/mie', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (requestsResponse.ok) {
            const requests = await requestsResponse.json();
            const updatedRequests = requests.filter(req => 
              new Date(req.updated_at || req.created_at).getTime() > lastCheckRef.current
            );
            
            for (const request of updatedRequests) {
              if (request.stato !== 'in_attesa') {
                await notificationService.notifyRequestStatus(request, request.stato);
              }
            }
          }
        }

        lastCheckRef.current = Date.now();
      } catch (error) {
        console.warn('Errore nel controllo notifiche:', error);
      }
    };

    // Controlla ogni 30 secondi
    intervalRef.current = setInterval(checkForNotifications, 30000);

    // Controlla immediatamente
    checkForNotifications();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [token, isAdmin]);

  return {
    isEnabled: notificationService.isEnabled(),
    permissionStatus: notificationService.getPermissionStatus()
  };
};


