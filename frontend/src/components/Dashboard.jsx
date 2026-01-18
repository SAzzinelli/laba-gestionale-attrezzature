import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import StepInventoryModal from './StepInventoryModal';
import QuickRequestModal from './QuickRequestModal';
import { DashboardSkeleton } from './SkeletonLoader';

const Dashboard = ({ onNavigate }) => {
 const [stats, setStats] = useState({
 inventory: 0,
 requests: 0,
 repairs: 0,
 reports: 0
 });
 const [recentRequests, setRecentRequests] = useState([]);
 const [recentReports, setRecentReports] = useState([]);
 const [alerts, setAlerts] = useState({
 scorte_basse: [],
 prestiti_scaduti: [],
 scadenze_oggi: [],
 scadenze_domani: [],
 totale_avvisi: 0
 });
 const [passwordResetRequests, setPasswordResetRequests] = useState([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [showAddModal, setShowAddModal] = useState(false);
 const [selectedRequest, setSelectedRequest] = useState(null);
 const [selectedAlert, setSelectedAlert] = useState(null);
 const [editingItemFromAlert, setEditingItemFromAlert] = useState(null);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [selectedPasswordRequest, setSelectedPasswordRequest] = useState(null);
  const { token, isAdmin, roleLabel } = useAuth();

 
  // Helper function to calculate time ago
  const getTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Ora";
    if (diffInMinutes < 60) return `${diffInMinutes} minuti fa`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ore fa`;
    return `${Math.floor(diffInMinutes / 1440)} giorni fa`;
  };

  // Helper function to safely format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'Data non specificata';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Data non valida';
      return date.toLocaleDateString('it-IT');
    } catch (error) {
      return 'Data non valida';
    }
  };

  // Handle password reset
  const handlePasswordReset = async (email, newPassword) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/admin-reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email, newPassword })
      });

      if (response.ok) {
        alert('Password aggiornata con successo!');
        setShowPasswordResetModal(false);
        setSelectedPasswordRequest(null);
        fetchDashboardData(); // Refresh data
      } else {
        const error = await response.json();
        alert(`Errore: ${error.error}`);
      }
    } catch (error) {
      console.error('Errore reset password:', error);
      alert('Errore durante l\'aggiornamento della password');
    }
  };

 // Fetch dashboard data
 const fetchDashboardData = useCallback(async () => {
 try {
 setLoading(true);
    const requests = [
      fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventario`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${import.meta.env.VITE_API_BASE_URL}/api/richieste?all=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${import.meta.env.VITE_API_BASE_URL}/api/riparazioni`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${import.meta.env.VITE_API_BASE_URL}/api/segnalazioni`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${import.meta.env.VITE_API_BASE_URL}/api/prestiti?all=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ];

    // Add alerts endpoint for admin or user-specific alerts
    if (isAdmin) {
      requests.push(fetch(`${import.meta.env.VITE_API_BASE_URL}/api/avvisi`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }));
      // Add password reset requests for admin
      requests.push(fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/password-reset-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }));
    } else {
      requests.push(fetch(`${import.meta.env.VITE_API_BASE_URL}/api/avvisi/utente`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }));
    }

 const responses = await Promise.all(requests);
 const [inventoryRes, requestsRes, repairsRes, reportsRes, prestitiRes, alertsRes, passwordResetRes] = responses;

 if (!inventoryRes.ok) throw new Error('Errore nel caricamento inventario');
 if (!requestsRes.ok) throw new Error('Errore nel caricamento richieste');
 if (!repairsRes.ok) throw new Error('Errore nel caricamento riparazioni');
 if (!reportsRes.ok) throw new Error('Errore nel caricamento segnalazioni');
 if (!prestitiRes.ok) throw new Error('Errore nel caricamento prestiti');
 if (!alertsRes.ok) throw new Error('Errore nel caricamento avvisi');

 const [inventoryData, requestsData, repairsData, reportsData, prestitiData, alertsData] = await Promise.all([
 inventoryRes.json(),
 requestsRes.json(),
 repairsRes.json(),
 reportsRes.json(),
 prestitiRes.json(),
 alertsRes.json()
 ]);

// Calcola statistiche corrette
const activeLoans = prestitiData.filter(p => p.stato === 'attivo').length;
// Conta le UNITÀ disponibili totali, non gli articoli
// Assicuriamoci che unita_disponibili sia un numero
const availableItems = inventoryData.reduce((total, item) => {
  const unita = Number(item.unita_disponibili) || 0;
  return total + unita;
}, 0);
const activeRepairs = repairsData.filter(repair => {
  const status = (repair.stato || '').toString().toLowerCase().replace(/\s+/g, '_');
  return status === 'in_corso';
});

const activeRepairCount = activeRepairs.length;

const inRepairItems = activeRepairs.reduce((total, repair) => {
  const raw = repair.unit_ids_json;
  if (Array.isArray(raw)) {
    return total + raw.length;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return total + parsed.length;
      }
      if (parsed && typeof parsed === 'object') {
        return total + Object.keys(parsed).length;
      }
    } catch (err) {
      console.warn('Impossibile analizzare unit_ids_json', err);
    }
  }
  if (raw && typeof raw === 'object') {
    return total + Object.keys(raw).length;
  }
  if (Number.isFinite(repair.quantita)) {
    return total + Number(repair.quantita);
  }
  return total;
}, 0);

// Conta solo le richieste veramente attive:
// - in_attesa: sempre attive
// - approvata: solo se non ha prestito o se il prestito è ancora 'attivo'
// Escludi quelle rifiutate, completate o con prestito già restituito/completato
const activeRequests = requestsData.filter(request => {
  const stato = (request.stato || '').toString().toLowerCase().trim();
  const prestitoStato = (request.prestito_stato || '').toString().toLowerCase().trim();
  
  // Richieste in attesa sono sempre attive
  if (stato === 'in_attesa') {
    return true;
  }
  
  // Richieste approvate sono attive solo se:
  // - Non hanno un prestito associato (non ancora convertite in prestito), OPPURE
  // - Hanno un prestito associato ma è ancora 'attivo'
  if (stato === 'approvata') {
    // Se non c'è prestito associato, la richiesta è ancora attiva
    if (!request.prestito_id) {
      return true;
    }
    // Se c'è un prestito, è attiva solo se il prestito è ancora 'attivo'
    return prestitoStato === 'attivo';
  }
  
  // Tutte le altre (rifiutata, completata, etc.) non sono attive
  return false;
});

// Debug: log per verificare il conteggio
console.log('[Dashboard] Total requests:', requestsData.length);
console.log('[Dashboard] Active requests (in_attesa/approvata):', activeRequests.length);
console.log('[Dashboard] Request states:', requestsData.map(r => ({ id: r.id, stato: r.stato })));
 
 // Calcola scorte basse basate sui PRESTITI ATTIVI e sulla SCARSITÀ
 const calculateLowStockItems = () => {
 const lowStockItems = [];
 
 inventoryData.forEach(item => {
 const totalQuantity = item.quantita_totale || 0;
 const availableQuantity = item.unita_disponibili || 0;
 const loanedQuantity = totalQuantity - availableQuantity;
 
 // Verifica se l'oggetto ha riparazioni attive
 const itemRepairs = activeRepairs.filter(repair => repair.inventario_id === item.id);
 const hasActiveRepairs = itemRepairs.length > 0;
 
 // Se l'oggetto è in riparazione, NON considerarlo come scorta bassa
 if (hasActiveRepairs) {
 return; // Salta questo oggetto - è in riparazione, non è una scorta bassa
 }
 
 // REGOLA SPECIALE: Se c'è solo 1 oggetto e è disponibile, NON è scarsità
 if (totalQuantity === 1 && availableQuantity === 1) {
 return; // Salta questo oggetto - oggetti singoli disponibili NON sono scarsità
 }
 
 // Solo se c'è almeno 1 oggetto in inventario e non è il caso speciale 1/1
 if (totalQuantity > 0) {
 // Calcola la percentuale di oggetti in prestito
 const loanedPercentage = (loanedQuantity / totalQuantity) * 100;
 
 // Trova la prima data di ritorno per questo oggetto
 const itemLoans = prestitiData.filter(p => 
 p.inventario_id === item.id && 
 p.stato === 'attivo' && 
 p.data_fine
 );
 
 let firstReturnDate = null;
 if (itemLoans.length > 0) {
 const returnDates = itemLoans
 .map(p => new Date(p.data_fine))
 .filter(date => !isNaN(date.getTime()))
 .sort((a, b) => a - b);
 
 firstReturnDate = returnDates.length > 0 ? returnDates[0] : null;
 }
 
 // Se disponibili = 0, significa che TUTTI sono in prestito (ESAURITO)
 // Ma solo se NON è in riparazione (già controllato sopra)
 if (availableQuantity === 0) {
 lowStockItems.push({
 ...item,
 firstReturnDate: firstReturnDate,
 reason: 'ESAURITO - Tutti gli oggetti sono in prestito',
 status: 'esaurito',
 loanedPercentage: 100
 });
 }
 // Se disponibili = 1 e totali > 1, significa che solo 1 rimane (ATTENZIONE)
 else if (availableQuantity === 1 && totalQuantity > 1) {
 lowStockItems.push({
 ...item,
 firstReturnDate: firstReturnDate,
 reason: 'ATTENZIONE - Solo 1 oggetto disponibile',
 status: 'attenzione',
 loanedPercentage: loanedPercentage
 });
 }
 // Se la percentuale di prestiti è >= 80%, significa che scarseggia
 else if (loanedPercentage >= 80 && totalQuantity > 1) {
 lowStockItems.push({
 ...item,
 firstReturnDate: firstReturnDate,
 reason: `SCARSEGGIA - ${Math.round(loanedPercentage)}% in prestito`,
 status: 'scarseggia',
 loanedPercentage: loanedPercentage
 });
 }
 // Se la percentuale di prestiti è >= 60%, significa che si sta esaurendo
 else if (loanedPercentage >= 60 && totalQuantity > 1) {
 lowStockItems.push({
 ...item,
 firstReturnDate: firstReturnDate,
 reason: `SI STA ESAURENDO - ${Math.round(loanedPercentage)}% in prestito`,
 status: 'si_sta_esaurendo',
 loanedPercentage: loanedPercentage
 });
 }
 }
 });
 
 return lowStockItems;
 };

 const lowStockWithDates = calculateLowStockItems();

 // Calcola le richieste in attesa
 const pendingRequests = requestsData.filter(req => req.stato === 'in_attesa');

 setStats({
 inventory: inventoryData.length,
 requests: activeRequests.length,
  repairs: activeRepairCount,
 reports: reportsData.length,
 activeLoans: activeLoans,
 availableItems: availableItems,
 inRepairItems: inRepairItems,
 lowStockItems: lowStockWithDates.length,
 lowStockWithDates: lowStockWithDates,
 pendingRequests: pendingRequests.length,
 pendingRequestsData: pendingRequests
 });

 setAlerts(alertsData);

 // Handle password reset requests for admin
 if (isAdmin && passwordResetRes) {
 const passwordResetData = await passwordResetRes.json();
 setPasswordResetRequests(passwordResetData);
 }

console.log('Dashboard - requestsData:', requestsData);
setRecentRequests((requestsData || []).slice(0, 5));
setRecentReports(reportsData.slice(0, 5));
 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 }, [token, isAdmin]);

 useEffect(() => {
 // Aspetta che token sia disponibile prima di caricare i dati
 if (token) {
   fetchDashboardData();
 }
 }, [token, isAdmin, fetchDashboardData]);

 if (loading) {
 return <DashboardSkeleton />;
 }

return (
<div className="min-h-screen bg-gray-50 space-y-6">
  {/* Header */}
  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard {roleLabel}</h1>
        <p className="text-gray-600 text-lg">Panoramica del sistema di gestione attrezzature</p>
      </div>
    </div>
  </div>

  {/* Statistics Cards */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">Inventario</p>
          <p className="text-3xl font-bold text-gray-900">{stats.inventory}</p>
          <p className="text-sm text-gray-500">Elementi totali</p>
        </div>
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
      </div>
    </div>
    
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">Richieste</p>
          <p className="text-3xl font-bold text-gray-900">{stats.requests}</p>
          <p className="text-sm text-gray-500">Richieste di prestito</p>
        </div>
        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
      </div>
    </div>
    
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">Riparazioni</p>
          <p className="text-3xl font-bold text-gray-900">{stats.repairs}</p>
          <p className="text-sm text-gray-500">In riparazione</p>
        </div>
        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      </div>
    </div>
    
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">Segnalazioni</p>
          <p className="text-3xl font-bold text-gray-900">{stats.reports}</p>
          <p className="text-sm text-gray-500">Segnalazioni attive</p>
        </div>
        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
      </div>
    </div>
  </div>

  {/* Richieste da Approvare - Separata come card dedicata */}
  {stats.pendingRequests > 0 && (
    <div className="bg-white rounded-xl shadow-lg border border-yellow-200 overflow-hidden mb-8">
      <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Richieste da Approvare</h2>
              <p className="text-yellow-100 text-sm">Richieste in attesa di approvazione</p>
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="text-white font-bold text-lg">{stats.pendingRequests}</span>
            <span className="text-yellow-100 ml-1">richieste</span>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-3">
          {stats.pendingRequestsData && stats.pendingRequestsData.slice(0, 5).map(request => (
            <div 
              key={request.id} 
              className="bg-yellow-50 rounded-lg p-4 border border-yellow-200 hover:bg-yellow-100 transition-colors cursor-pointer"
              onClick={() => {
                if (onNavigate) {
                  onNavigate('prestiti', { initialTab: 'pending' });
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-base mb-1">
                    {request.articolo_nome || request.oggetto_nome || 'Oggetto sconosciuto'}
                  </div>
                  <div className="text-yellow-700 font-medium text-sm">
                    {request.name || request.utente_nome || ''} {request.surname || request.utente_cognome || ''}
                  </div>
                  <div className="text-gray-600 text-xs mt-1">
                    Dal {new Date(request.dal).toLocaleDateString('it-IT')} al {new Date(request.al).toLocaleDateString('it-IT')}
                  </div>
                </div>
                <div className="ml-4">
                  <span className="bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full">IN ATTESA</span>
                </div>
              </div>
            </div>
          ))}
          {stats.pendingRequests > 5 && (
            <div 
              className="text-center text-yellow-600 text-sm font-medium cursor-pointer hover:text-yellow-700"
              onClick={() => {
                if (onNavigate) {
                  onNavigate('prestiti', { initialTab: 'pending' });
                }
              }}
            >
              +{stats.pendingRequests - 5} altre richieste...
            </div>
          )}
        </div>
      </div>
    </div>
  )}

  {/* Alerts Section - Redesigned */}
 {alerts.totale_avvisi > 0 && (
 <div className="bg-white rounded-xl shadow-lg border border-red-200 overflow-hidden">
 <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center">
 <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
 <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
 </svg>
 </div>
 <div>
 <h2 className="text-2xl font-bold text-white">Avvisi Importanti</h2>
 <p className="text-red-100 text-sm">Attenzione richiesta per questi elementi</p>
 </div>
 </div>
 <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
 <span className="text-white font-bold text-lg">{alerts.totale_avvisi}</span>
 <span className="text-red-100 ml-1">avvisi</span>
 </div>
 </div>
 </div>
 
 <div className="p-6">
 
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {/* Scorte Basse */}
 {alerts.scorte_basse.length > 0 && (
 <div 
 className="bg-red-50 border border-red-200 rounded-lg p-4 cursor-pointer hover:bg-red-100 transition-colors"
 onClick={() => setSelectedAlert({ type: 'scorte', data: alerts.scorte_basse })}
 >
 <div className="flex items-center mb-3">
 <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3">
 <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
 </svg>
 </div>
 <h3 className="text-lg font-bold text-red-800">
 Scorte Basse ({alerts.scorte_basse.length})
 </h3>
 </div>
 <div className="space-y-2">
 {alerts.scorte_basse.slice(0, 3).map(item => (
 <div key={item.id} className={`bg-white rounded-lg p-3 border ${
 item.stato_scorte === 'esaurito' ? 'border-red-500' :
 item.stato_scorte === 'attenzione' ? 'border-orange-500' :
 item.stato_scorte === 'scarseggia' ? 'border-yellow-500' :
 'border-blue-500'
 }`}>
 <div className="font-semibold text-gray-900 text-sm">{item.nome}</div>
 <div className={`font-medium text-xs mt-1 ${
 item.stato_scorte === 'esaurito' ? 'text-red-600' :
 item.stato_scorte === 'attenzione' ? 'text-orange-600' :
 item.stato_scorte === 'scarseggia' ? 'text-yellow-600' :
 'text-blue-600'
 }`}>
 {item.motivo}
 </div>
 <div className="text-gray-500 text-xs mt-1">
 Disponibili: {item.unita_disponibili || 0}/{item.quantita_totale}
 {item.percentuale_disponibile !== null && ` (${item.percentuale_disponibile}% disponibili)`}
 </div>
 </div>
 ))}
 {alerts.scorte_basse.length > 3 && (
 <div className="text-center text-red-600 text-sm font-medium">
 +{alerts.scorte_basse.length - 3} altri elementi...
 </div>
 )}
 </div>
 </div>
 )}

 {/* Prestiti Scaduti */}
 {alerts.prestiti_scaduti.length > 0 && (
 <div 
 className="bg-orange-50 border border-orange-200 rounded-lg p-4 cursor-pointer hover:bg-orange-100 transition-colors"
 onClick={() => setSelectedAlert({ type: 'ritardi', data: alerts.prestiti_scaduti })}
 >
 <div className="flex items-center mb-3">
 <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-3">
 <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 </div>
 <h3 className="text-lg font-bold text-orange-800">
 Ritardi ({alerts.prestiti_scaduti.length})
 </h3>
 </div>
 <div className="space-y-2">
               {alerts.prestiti_scaduti.slice(0, 3).map(prestito => (
                <div key={prestito.id} className="bg-white rounded-lg p-3 border border-orange-200">
                <div className="font-semibold text-gray-900 text-sm">
                 {prestito.utente_nome_reale && prestito.utente_cognome ? 
                   `${prestito.utente_nome_reale} ${prestito.utente_cognome}` : 
                   prestito.utente_nome}
                </div>
 <div className="text-orange-600 font-medium text-xs mt-1">
 {Math.floor(prestito.giorni_ritardo)} giorni di ritardo
 </div>
 </div>
 ))}
 {alerts.prestiti_scaduti.length > 3 && (
 <div className="text-center text-orange-600 text-sm font-medium">
 +{alerts.prestiti_scaduti.length - 3} altri prestiti...
 </div>
 )}
 </div>
 </div>
 )}

 {/* Scadenze Oggi */}
 {alerts.scadenze_oggi.length > 0 && (
 <div 
 className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 cursor-pointer hover:bg-yellow-100 transition-colors"
 onClick={() => setSelectedAlert({ type: 'oggi', data: alerts.scadenze_oggi })}
 >
 <div className="flex items-center mb-3">
 <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mr-3">
 <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
 </svg>
 </div>
 <h3 className="text-lg font-bold text-yellow-800">
 Scadenze Oggi ({alerts.scadenze_oggi.length})
 </h3>
 </div>
 <div className="space-y-2">
 {alerts.scadenze_oggi.slice(0, 3).map(prestito => (
 <div key={prestito.id} className="bg-white rounded-lg p-3 border border-yellow-200">
 <div className="font-semibold text-gray-900 text-sm">
 {prestito.utente_nome_reale && prestito.utente_cognome ? 
                   `${prestito.utente_nome_reale} ${prestito.utente_cognome}` : 
                   prestito.utente_nome}
 </div>
 <div className="text-yellow-600 font-medium text-xs mt-1">
 {prestito.oggetto_nome}
 </div>
 </div>
 ))}
 {alerts.scadenze_oggi.length > 3 && (
 <div className="text-center text-yellow-600 text-sm font-medium">
 +{alerts.scadenze_oggi.length - 3} altri prestiti...
 </div>
 )}
 </div>
 </div>
 )}

    {/* Scadenze Domani - Cambiato da rosso a viola */}
    {alerts.scadenze_domani.length > 0 && (
    <div 
    className="bg-purple-50 border border-purple-200 rounded-lg p-4 cursor-pointer hover:bg-purple-100 transition-colors"
    onClick={() => setSelectedAlert({ type: 'domani', data: alerts.scadenze_domani })}
    >
    <div className="flex items-center mb-3">
    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
    </div>
    <h3 className="text-lg font-bold text-purple-800">
    In scadenza domani: ({alerts.scadenze_domani.length})
    </h3>
    </div>
    <div className="space-y-2">
    {alerts.scadenze_domani.slice(0, 3).map(prestito => (
    <div key={prestito.id} className="bg-white rounded-lg p-3 border border-purple-200">
    <div className="font-semibold text-gray-900 text-sm">
    {prestito.utente_nome_reale && prestito.utente_cognome ? 
                  `${prestito.utente_nome_reale} ${prestito.utente_cognome}` : 
                  prestito.utente_nome}
    </div>
    <div className="text-purple-600 font-medium text-xs mt-1">
    {prestito.oggetto_nome}
    </div>
    </div>
    ))}
    {alerts.scadenze_domani.length > 3 && (
    <div className="text-center text-purple-600 text-sm font-medium">
    +{alerts.scadenze_domani.length - 3} altri prestiti...
    </div>
    )}
    </div>
    </div>
    )}
 </div>
 </div>
 </div>
 )}

  {/* Quick Actions */}
  {isAdmin && (
    <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Azioni Rapide</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => setShowAddModal(true)}
          className="group bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer"
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Aggiungi Elemento</h3>
          </div>
          <p className="text-gray-600">Aggiungi un nuovo elemento all'inventario</p>
        </div>
        
        <div 
          onClick={() => onNavigate('prestiti')}
          className="group bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer"
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Gestisci Richieste</h3>
          </div>
          <p className="text-gray-600">Visualizza e gestisci le richieste di prestito</p>
        </div>
        
        <div 
          onClick={() => onNavigate('riparazioni')}
          className="group bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer"
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Gestisci Riparazioni</h3>
          </div>
          <p className="text-gray-600">Visualizza e gestisci le riparazioni</p>
        </div>
      </div>
    </div>
  )}

    {/* Password Reset Requests Section - Moved to bottom */}
    {isAdmin && passwordResetRequests.length > 0 && (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center mr-3">
              <svg className="icon text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            Richieste Reset Password
          </h2>
          <span className="status-badge bg-orange-100 text-orange-800">
            {passwordResetRequests.length} richieste
          </span>
        </div>
        
        <div className="space-y-3">
          {passwordResetRequests.map((request) => (
            <div key={request.id} className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-3">
                  {request.user_name ? request.user_name.charAt(0) : '?'}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {request.user_name && request.user_surname 
                      ? `${request.user_name} ${request.user_surname}` 
                      : 'Utente sconosciuto'
                    }
                  </p>
                  <p className="text-sm text-gray-600">{request.user_email || request.email || 'Email non disponibile'}</p>
                  <p className="text-xs text-gray-500">
                    Richiesto: {formatDate(request.requested_at)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedPasswordRequest(request);
                  setShowPasswordResetModal(true);
                }}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
              >
                Gestisci
              </button>
            </div>
          ))}
        </div>
      </div>
    )}



    {/* Recent Activity */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
    {/* Recent Requests */}
    <div className="bg-white rounded-2xl shadow-lg p-6">
    <div className="flex items-center justify-between mb-6">
    <h2 className="text-xl font-bold text-gray-900">Richieste Recenti</h2>
    <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">{recentRequests.length} richieste</span>
    </div>
 <div className="space-y-3">
 {recentRequests.length === 0 ? (
 <div className="text-center py-12">
 <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
 <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
 </svg>
 </div>
 <p className="text-gray-500 font-medium">Nessuna richiesta recente</p>
 </div>
 ) : (
 recentRequests.map((request, index) => (
 <div 
 key={index} 
 className={`flex items-center py-4 px-4 rounded-xl transition-all duration-200 ${
 request.stato === 'in_attesa' 
 ? 'bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:shadow-md cursor-pointer' 
 : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
 }`}
 onClick={() => request.stato === 'in_attesa' && setSelectedRequest(request)}
 >
 <div className={`w-3 h-3 rounded-full mr-4 ${
 request.stato === 'in_attesa' ? 'bg-blue-500' : 
 request.stato === 'approvata' ? 'bg-green-500' : 'bg-red-500'
 }`}></div>
 <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {request.articolo_nome || request.oggetto_nome || 'Oggetto sconosciuto'}
                </p>
                <p className="text-sm text-gray-600">
                  {request.name || request.utente_nome || ''} {request.surname || request.utente_cognome || ''}
                </p>
 </div>
 <div className="flex-shrink-0">
 <span className={`px-3 py-1 rounded-full text-xs font-medium ${
 request.stato === 'in_attesa' ? 'bg-yellow-100 text-yellow-800' :
 request.stato === 'approvata' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
 }`}>
 {request.stato === 'in_attesa' ? 'In Attesa' : 
 request.stato === 'approvata' ? 'Approvata' : 'Rifiutata'}
 </span>
 </div>
 </div>
 ))
 )}
 </div>
 </div>

 {/* Recent Reports */}
 <div className="bg-white rounded-2xl shadow-lg p-6">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-bold text-gray-900">Segnalazioni Recenti</h2>
 <span className="bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full">{recentReports.length} segnalazioni</span>
 </div>
 <div className="space-y-3">
 {recentReports.length === 0 ? (
 <div className="text-center py-12">
 <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
 <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
 </svg>
 </div>
 <p className="text-gray-500 font-medium">Nessuna segnalazione recente</p>
 </div>
 ) : (
 recentReports.map((report, index) => (
 <div key={index} className="flex items-center py-4 px-4 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 hover:shadow-md cursor-pointer transition-all duration-200">
 <div className="w-3 h-3 bg-red-500 rounded-full mr-4"></div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-semibold text-gray-900 truncate">
 {report.tipo}: {report.messaggio}
 </p>
                <p className="text-sm text-gray-600">
                  {formatDate(report.created_at)}
                </p>
 </div>
 <div className="flex-shrink-0">
 <span className={`px-3 py-1 rounded-full text-xs font-medium ${
 report.stato === 'aperta' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
 }`}>
 {report.stato === 'aperta' ? 'Aperta' : 'Chiusa'}
 </span>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 </div>

 {/* Error Message */}
 {error && (
 <div className="alert-card alert-danger">
 <div className="flex items-center">
 <svg className="icon text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 <p className="text-red-800 ">{error}</p>
 </div>
 </div>
 )}

 {/* Alert Details Modal */}
 {selectedAlert && (
 <div className="modal-overlay" onClick={() => setSelectedAlert(null)}>
 <div className="modal-content max-w-[95vw] lg:max-w-7xl xl:max-w-[90vw] mx-4 lg:mx-8" onClick={(e) => e.stopPropagation()}>
 <div className="modal-header">
    <h2 className="text-xl font-bold text-primary">
    {selectedAlert.type === 'scorte' ? 'Scorte Basse' :
    selectedAlert.type === 'ritardi' ? 'Prestiti in Ritardo' :
    selectedAlert.type === 'oggi' ? 'Scadenze Oggi' :
    'In scadenza domani:'}
    </h2>
 <button
 onClick={() => setSelectedAlert(null)}
 className="text-muted hover:text-primary"
 >
 <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>
 
 <div className="modal-body">
 <div className={`grid ${selectedAlert.type === 'scorte' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3' : 'grid-cols-1'} gap-4 lg:gap-6`}>
 {selectedAlert.data.map((item, index) => (
 <div key={index} className="card">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="font-medium text-primary">
 {selectedAlert.type === 'scorte' ? item.nome : 
 item.utente_nome_reale && item.utente_cognome ? 
                   `${item.utente_nome_reale} ${item.utente_cognome}` : 
                   item.utente_nome}
 </h3>
 <p className="text-sm text-secondary">
 {selectedAlert.type === 'scorte' 
 ? `${item.reason || 'Scorta bassa'} - Disponibili: ${item.unita_disponibili || 0}/${item.quantita_totale || 0}${item.loanedPercentage ? ` (${Math.round(item.loanedPercentage)}% in prestito)` : ''}`
 : selectedAlert.type === 'ritardi'
 ? `${item.oggetto_nome || 'Oggetto'} - ${Math.floor(item.giorni_ritardo || 0)} giorni di ritardo`
 : item.oggetto_nome || 'Oggetto'
 }
 </p>
 {selectedAlert.type === 'scorte' && item.firstReturnDate && (
 <p className="text-xs text-muted mt-1">
 Primo ritorno: {item.firstReturnDate.toLocaleDateString('it-IT')}
 </p>
 )}
 </div>
 {selectedAlert.type === 'scorte' && (
 <button
 onClick={() => {
 setEditingItemFromAlert(item);
 setSelectedAlert(null);
 }}
 className="btn-danger btn-small"
 >
 Gestisci
 </button>
 )}
 {selectedAlert.type === 'ritardi' && (
 <button
 onClick={() => {
 setSelectedAlert(null);
 onNavigate && onNavigate('prestiti');
 }}
 className="btn-danger btn-small"
 >
 Gestisci Ritardo
 </button>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>
 
 <div className="modal-footer">
 <button
 onClick={() => setSelectedAlert(null)}
 className="btn-secondary"
 >
 Chiudi
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Add Inventory Modal */}
 <StepInventoryModal
 isOpen={showAddModal || !!editingItemFromAlert}
 onClose={() => {
   setShowAddModal(false);
   setEditingItemFromAlert(null);
 }}
 onSuccess={() => {
 fetchDashboardData();
 setShowAddModal(false);
   setEditingItemFromAlert(null);
 }}
 editingItem={editingItemFromAlert ? {
   ...editingItemFromAlert,
   // Assicurati che tutti i campi necessari siano presenti
   nome: editingItemFromAlert.nome || '',
   quantita_totale: editingItemFromAlert.quantita_totale || 1,
   posizione: editingItemFromAlert.posizione || editingItemFromAlert.scaffale || '',
   categoria_id: editingItemFromAlert.categoria_id || '',
   note: editingItemFromAlert.note || '',
   immagine_url: editingItemFromAlert.immagine_url || '',
   tipo_prestito: editingItemFromAlert.tipo_prestito || 'solo_esterno',
   corsi_assegnati: editingItemFromAlert.corsi_assegnati || []
 } : null}
 />

 {/* Quick Request Modal */}
 <QuickRequestModal
 isOpen={!!selectedRequest}
 onClose={() => setSelectedRequest(null)}
 request={selectedRequest}
 onSuccess={() => {
 fetchDashboardData();
 setSelectedRequest(null);
 }}
 />


    {/* Password Reset Modal */}
    {showPasswordResetModal && selectedPasswordRequest && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">Reset Password</h3>
            <button
              onClick={() => {
                setShowPasswordResetModal(false);
                setSelectedPasswordRequest(null);
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6">
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Utente:</p>
              <p className="font-medium text-gray-900">
                {selectedPasswordRequest.user_name && selectedPasswordRequest.user_surname 
                  ? `${selectedPasswordRequest.user_name} ${selectedPasswordRequest.user_surname}`
                  : 'Nome non disponibile'
                }
              </p>
              <p className="text-sm text-gray-600">{selectedPasswordRequest.user_email || selectedPasswordRequest.email}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nuova Password
              </label>
              <input
                type="password"
                id="newPassword"
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                placeholder="Inserisci nuova password"
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPasswordResetModal(false);
                  setSelectedPasswordRequest(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  const newPassword = document.getElementById('newPassword').value;
                  if (newPassword) {
                    handlePasswordReset(selectedPasswordRequest.email, newPassword);
                  } else {
                    alert('Inserisci una nuova password');
                  }
                }}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Aggiorna Password
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);
};

// Stat Card Component
function StatCard({ title, value, description }) {
 const iconMap = {
 'Inventario': (
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
 </svg>
 ),
 'Richieste': (
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
 </svg>
 ),
 'Riparazioni': (
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
 </svg>
 ),
 'Segnalazioni': (
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
 </svg>
 )
 };

 const colorMap = {
 'Inventario': 'bg-gradient-to-br from-blue-100 to-blue-200 ',
 'Richieste': 'bg-gradient-to-br from-purple-100 to-purple-200 ', 
 'Riparazioni': 'bg-gradient-to-br from-orange-100 to-orange-200 ',
 'Segnalazioni': 'bg-gradient-to-br from-red-100 to-red-200 '
 };

 return (
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:scale-105 transition-transform p-6">
 <div className="flex items-center">
 <div className={`w-12 h-12 ${colorMap[title]} rounded-lg flex items-center justify-center ${
 title === 'Inventario' ? 'text-blue-600' :
 title === 'Richieste' ? 'text-purple-600' :
 title === 'Riparazioni' ? 'text-orange-600' :
 'text-red-600'
 } shadow-lg`}>
 {iconMap[title]}
 </div>
 <div className="ml-4">
 <p className="text-sm font-medium text-gray-700">{title}</p>
 <p className="text-2xl font-bold text-gray-900">{value}</p>
 </div>
 </div>
 <p className="text-xs text-gray-500 mt-2">{description}</p>
 </div>
 );
}


// Quick Action Button Component 
function QuickActionButton({ title, description, icon, onClick, color = 'blue' }) {
 const colorClasses = {
 blue: 'bg-gradient-to-br from-blue-500 to-blue-600',
 green: 'bg-gradient-to-br from-green-500 to-green-600', 
 orange: 'bg-gradient-to-br from-orange-500 to-orange-600',
 purple: 'bg-gradient-to-br from-purple-500 to-purple-600'
 };

 return (
 <button
 onClick={onClick}
 className="card card-clickable text-left w-full hover:scale-105 transition-transform"
 >
 <div className="flex items-center">
 <div className={`w-12 h-12 ${colorClasses[color]} rounded-lg flex items-center justify-center text-white mr-4 shadow-lg`}>
 {icon}
 </div>
 <div>
 <p className="font-semibold text-primary">{title}</p>
 <p className="text-sm text-secondary">{description}</p>
 </div>
 </div>
 </button>
 );
}

export default Dashboard;