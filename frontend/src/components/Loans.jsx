import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import AdvancedLoanModal from './AdvancedLoanModal';
import { TableSkeleton } from './SkeletonLoader';

const Loans = ({ selectedRequestFromNotification, onRequestHandled, initialTab, onTabSet }) => {
 const [requests, setRequests] = useState([]);
 const [loans, setLoans] = useState([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [showLoanModal, setShowLoanModal] = useState(false);
 const [selectedLoan, setSelectedLoan] = useState(null);
 const [activeTab, setActiveTab] = useState(initialTab || 'active');
 const [searchTerm, setSearchTerm] = useState('');
 const [showRejectModal, setShowRejectModal] = useState(false);
 const [rejectRequestId, setRejectRequestId] = useState(null);
 const [rejectReason, setRejectReason] = useState('');
 const [approvingRequestId, setApprovingRequestId] = useState(null);
 const { token } = useAuth();

 const fetchData = async () => {
 try {
 setLoading(true);
 const [requestsRes, loansRes] = await Promise.all([
      fetch(`${import.meta.env.VITE_API_BASE_URL}/api/richieste?all=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${import.meta.env.VITE_API_BASE_URL}/api/prestiti?all=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
 ]);

 if (!requestsRes.ok) throw new Error('Errore nel caricamento richieste');
 if (!loansRes.ok) throw new Error('Errore nel caricamento prestiti');

 const [requestsData, loansData] = await Promise.all([
 requestsRes.json(),
 loansRes.json()
 ]);

 setRequests(requestsData);
 setLoans(loansData);
 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 if (token) {
   fetchData();
 }
 }, [token]);

 // Gestisce l'apertura automatica del modale dalla notifica
 useEffect(() => {
   if (selectedRequestFromNotification && requests.length > 0) {
     // Trova la richiesta corrispondente
     const request = requests.find(r => r.id === selectedRequestFromNotification.id);
     if (request && request.stato === 'in_attesa') {
       // Passa al tab "In Attesa" e apri il modale
       setActiveTab('pending');
       setSelectedLoan(request);
       setShowLoanModal(true);
       // Notifica che la richiesta è stata gestita
       if (onRequestHandled) {
         onRequestHandled();
       }
     }
   }
 }, [selectedRequestFromNotification, requests, onRequestHandled]);

 // Gestisce il tab iniziale quando si naviga dalla dashboard
 useEffect(() => {
   if (initialTab) {
     setActiveTab(initialTab);
     // Notifica che il tab è stato impostato
     if (onTabSet) {
       onTabSet();
     }
   }
 }, [initialTab, onTabSet]);

const handleApprove = async (requestId) => {
try {
// Disabilita il bottone durante l'approvazione per evitare doppi click
setApprovingRequestId(requestId);
setError(null);

const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/prestiti/${requestId}/approva`, {
method: 'PUT',
headers: {
'Authorization': `Bearer ${token}`,
'Content-Type': 'application/json'
}
});

const responseData = await response.json();

if (!response.ok) {
// Handle user blocked error specially
if (responseData.userBlocked) {
setError(`❌ UTENTE BLOCCATO: ${responseData.message}\n\nMotivo: ${responseData.reason}\n\nL'utente deve presentarsi di persona per sbloccare l'account.`);
} else {
throw new Error(responseData.error || 'Errore nell\'approvazione');
}
setApprovingRequestId(null);
return;
}

// Show penalty warning if user has strikes
if (responseData.penaltyInfo && responseData.penaltyInfo.hasStrikes) {
const warningMessage = responseData.penaltyInfo.warning;
if (responseData.penaltyInfo.strikes >= 2) {
alert(`⚠️ ATTENZIONE PENALITÀ\n\n${warningMessage}`);
} else {
console.log('ℹ️ Info penalità:', warningMessage);
}
}

// Chiudi il modale se è aperto per questa richiesta
if (showLoanModal && selectedLoan && selectedLoan.id === requestId) {
setShowLoanModal(false);
setSelectedLoan(null);
}

// Rimuovi immediatamente la richiesta dalla lista "pending" per feedback visivo immediato
setRequests(prevRequests => prevRequests.filter(req => req.id !== requestId));

// Send approval notification to user
window.dispatchEvent(new CustomEvent('showNotification', {
detail: {
type: 'success',
data: { 
title: 'Richiesta Approvata!', 
body: 'La tua richiesta di noleggio è stata approvata. Puoi ritirare l\'attrezzatura.',
icon: '/favicon.ico'
}
}
}));

// Ricarica i dati per avere lo stato aggiornato completo (incluso il nuovo prestito)
const [updatedRequestsData, updatedLoansData] = await Promise.all([
  fetch(`${import.meta.env.VITE_API_BASE_URL}/api/richieste?all=1`, {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(res => res.json()),
  fetch(`${import.meta.env.VITE_API_BASE_URL}/api/prestiti?all=1`, {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(res => res.json())
]);

setRequests(updatedRequestsData);
setLoans(updatedLoansData);

// Se siamo nel tab "pending" e non ci sono più richieste, passa al tab "active" per mostrare il nuovo prestito
const remainingPending = updatedRequestsData.filter(r => r.stato === 'in_attesa');
if (activeTab === 'pending' && remainingPending.length === 0) {
  setActiveTab('active');
}

setApprovingRequestId(null);
} catch (err) {
setError(err.message);
setApprovingRequestId(null);
}
};

 const handleReject = async (requestId, motivazione) => {
 try {
 if (!motivazione || motivazione.trim() === '') {
   throw new Error('Motivazione del rifiuto richiesta');
 }

 const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/prestiti/${requestId}/rifiuta`, {
 method: 'PUT',
 headers: {
 'Authorization': `Bearer ${token}`,
 'Content-Type': 'application/json'
 },
 body: JSON.stringify({ motivazione: motivazione.trim() })
 });

 if (!response.ok) {
 const errorData = await response.json();
 throw new Error(errorData.error || 'Errore nel rifiuto');
 }

 await fetchData();
 } catch (err) {
 setError(err.message);
 }
 };

 const openRejectModal = (requestId) => {
   setRejectRequestId(requestId);
   setRejectReason('');
   setShowRejectModal(true);
 };

 const confirmReject = async () => {
   if (!rejectReason.trim()) {
     setError('Motivazione del rifiuto richiesta');
     return;
   }
   
   try {
     await handleReject(rejectRequestId, rejectReason);
     setShowRejectModal(false);
     setRejectRequestId(null);
     setRejectReason('');
   } catch (err) {
     setError(err.message);
   }
 };

 const handleReturn = async (loanId) => {
 try {
 const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/prestiti/${loanId}/restituisci`, {
 method: 'PUT',
 headers: {
 'Authorization': `Bearer ${token}`,
 'Content-Type': 'application/json'
 }
 });

 if (!response.ok) {
 const errorData = await response.json();
 throw new Error(errorData.error || 'Errore nella restituzione');
 }

 await fetchData();
 } catch (err) {
 setError(err.message);
 }
 };

 // Filter data based on active tab
 const getFilteredData = () => {
 let data = [];
 
 switch (activeTab) {
 case 'pending':
 data = requests.filter(r => r.stato === 'in_attesa');
 break;
 case 'processed':
 data = loans.filter(l => l.stato === 'restituito');
 break;
 case 'active':
 data = loans.filter(l => l.stato === 'attivo');
 break;
 default:
 data = [];
 }

 // Apply search filter
  if (searchTerm) {
    data = data.filter(item => {
      const unitaStr = Array.isArray(item.unita) ? item.unita.join(' ') : (item.unita || '');
      const searchLower = searchTerm.toLowerCase();
      
      // Cerca nel nome completo (nome + cognome insieme)
      const fullName = `${item.utente_nome || ''} ${item.utente_cognome || ''}`.trim().toLowerCase();
      const chiField = (item.chi || '').toLowerCase();
      
      return (item.articolo_nome || item.oggetto_nome || '').toLowerCase().includes(searchLower) ||
             unitaStr.toLowerCase().includes(searchLower) ||
             (item.utente_nome || '').toLowerCase().includes(searchLower) ||
             (item.utente_cognome || '').toLowerCase().includes(searchLower) ||
             fullName.includes(searchLower) ||
             chiField.includes(searchLower) ||
             (item.utente_email || '').toLowerCase().includes(searchLower) ||
             (item.note || '').toLowerCase().includes(searchLower);
    });
  }

 return data;
 };

const filteredData = getFilteredData();

const formatDate = (dateString) => {
  if (!dateString) return 'Non specificata';
  try {
    return new Date(dateString).toLocaleDateString('it-IT');
  } catch (error) {
    return 'Data non valida';
  }
};

const canTerminateLoan = (loan) => {
  // Admin può terminare il prestito in qualsiasi momento
  return loan.stato === 'attivo';
};

const getTerminateButtonTooltip = (loan) => {
  return loan.stato === 'attivo' ? 'Clicca per terminare il prestito' : 'Prestito non attivo';
};

const getStatusBadge = (status) => {
 const statusConfig = {
 'in_attesa': { 
 className: 'alert-warning', 
 icon: (
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 ), 
 label: 'In Attesa' 
 },
 'approvata': { 
 className: 'status-available', 
 icon: (
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 ), 
 label: 'Approvata' 
 },
 'rifiutata': { 
 className: 'status-unavailable', 
 icon: (
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 ), 
 label: 'Rifiutata' 
 },
 'attivo': { 
 className: 'status-repair', 
 icon: (
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
 </svg>
 ), 
 label: 'Attivo' 
 },
 'completato': { 
 className: 'alert-info', 
 icon: (
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 ), 
 label: 'Completato' 
 },
 'restituito': { 
 className: 'alert-info', 
 icon: (
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 ), 
 label: 'Completato' 
 }
 };
 
 const config = statusConfig[status] || statusConfig['in_attesa'];
 
 return (
 <span className={`status-badge ${config.className}`}>
 {config.icon}
 {config.label}
 </span>
 );
 };

 if (loading) {
 return <TableSkeleton rows={8} cols={6} />;
}

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="card">
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h1 className="text-2xl font-bold text-primary">Gestione Prestiti</h1>
 <p className="text-secondary mt-1">Gestisci richieste, approvazioni e prestiti attivi</p>
 </div>
 <div className="flex items-center space-x-4">
        <button
          onClick={() => setShowLoanModal(true)}
          className="group bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center"
        >
          <svg className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Nuovo Prestito</span>
        </button>
 </div>
 </div>
 </div>

    {/* Pending Requests Alert */}
    {requests.filter(r => r.stato === 'in_attesa').length > 0 && (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              {requests.filter(r => r.stato === 'in_attesa').length} {requests.filter(r => r.stato === 'in_attesa').length === 1 ? 'richiesta in attesa' : 'richieste in attesa'} di approvazione
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              Ci sono prestiti che necessitano della tua attenzione per essere approvati o rifiutati.
            </p>
          </div>
          <div className="ml-auto">
            <button
              onClick={() => setActiveTab('pending')}
              className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-md text-sm font-medium hover:bg-yellow-200 transition-colors"
            >
              Visualizza
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Tabs for Requests/Loans */}
    <div className="border-b border-gray-200">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <nav className="flex space-x-8">
        <button
          onClick={() => setActiveTab('active')}
          className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'active'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
          </svg>
          Prestiti Attivi
          <span className="ml-2 bg-green-100 text-green-900 text-xs px-2 py-1 rounded-full">
            {loans.filter(l => l.stato === 'attivo').length}
          </span>
        </button>
        
        <button
          onClick={() => setActiveTab('pending')}
          className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'pending'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          In Attesa
          <span className="ml-2 bg-orange-100 text-orange-900 text-xs px-2 py-1 rounded-full">
            {requests.filter(r => r.stato === 'in_attesa').length}
          </span>
        </button>
        
        <button
          onClick={() => setActiveTab('processed')}
          className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'processed'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Completati
          <span className="ml-2 bg-blue-100 text-blue-900 text-xs px-2 py-1 rounded-full">
            {loans.filter(l => l.stato === 'restituito').length}
          </span>
        </button>
        </nav>
        
        {/* Search - Desktop only */}
        <div className="hidden lg:block mt-4 lg:mt-0">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca prestiti..."
              className="w-64 px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    {/* Search - Mobile only */}
    <div className="lg:hidden">
      <div className="card">
        <div className="form-group">
          <label className="form-label">Cerca prestiti</label>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca per oggetto, utente o email..."
              className="input-field pl-10"
            />
            <svg className="search-icon icon-sm text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    {/* Desktop Grid View */}
    <div className="hidden lg:block space-y-4">
      {filteredData.length === 0 ? (
        <div>
          <div className="card text-center py-12">
            <div className="text-muted text-lg mb-2">
              <svg className="icon-lg mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-secondary">
              {searchTerm 
                ? 'Nessun elemento trovato con i filtri selezionati' 
                : `Nessuna ${activeTab === 'pending' ? 'richiesta in attesa' : activeTab === 'processed' ? 'prestito completato' : 'prestito attivo'}`
              }
            </p>
          </div>
        </div>
      ) : (
        filteredData.map(item => (
          <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
            {/* Card Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {item.articolo_nome || item.oggetto_nome}
                            {item.unita && item.unita.length > 0 && (
                              <span className="text-gray-500"> - {Array.isArray(item.unita) ? item.unita.join(', ') : item.unita}</span>
                            )}
                          </h3>
                          {item.inventario_id && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              ID: {item.inventario_id}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <div className="flex items-center gap-2 ml-4">
                      {item.penalty_strikes > 0 && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          item.is_blocked ? 'bg-red-100 text-red-800' :
                          item.penalty_strikes >= 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {item.is_blocked ? 'BLOCCATO' : `${item.penalty_strikes} Strike`}
                        </div>
                      )}
                      {getStatusBadge(item.stato)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* User Info */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{item.utente_nome || ''} {item.utente_cognome || ''}</p>
                    <p className="text-sm text-gray-500">{item.utente_email}</p>
                  </div>
                </div>

                {/* Date Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Dal</p>
                    <p className="text-sm font-semibold text-gray-900">{formatDate(item.dal || item.data_uscita)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Al</p>
                    <p className="text-sm font-semibold text-gray-900">{formatDate(item.al || item.data_rientro)}</p>
                  </div>
                </div>

                {/* Return Info */}
                <div>
                  {item.stato === 'restituito' && item.data_rientro && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Restituito</p>
                      <p className="text-sm font-semibold text-green-600">{formatDate(item.data_rientro)}</p>
                    </div>
                  )}
                  {item.stato === 'attivo' && (item.al || item.data_rientro) && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Restituirà il</p>
                      <p className="text-sm font-semibold text-orange-600">{formatDate(item.al || item.data_rientro)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card Footer - Actions */}
            {(activeTab === 'pending' || (activeTab === 'active' && item.stato === 'attivo')) && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedLoan(item)}
                    className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
                  >
                    Visualizza Dettagli
                  </button>
                  
                  <div className="flex items-center gap-2">
                    {activeTab === 'pending' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(item.id);
                          }}
                          disabled={approvingRequestId === item.id || approvingRequestId !== null}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {approvingRequestId === item.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                              Approvazione...
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Approva
                            </>
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openRejectModal(item.id);
                          }}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Rifiuta
                        </button>
                      </>
                    )}
                    
                    {activeTab === 'active' && item.stato === 'attivo' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canTerminateLoan(item)) {
                            handleReturn(item.id);
                          }
                        }}
                        disabled={!canTerminateLoan(item)}
                        className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md transition-colors ${
                          canTerminateLoan(item) 
                            ? 'text-white bg-green-600 hover:bg-green-700' 
                            : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                        }`}
                        title={getTerminateButtonTooltip(item)}
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        Termina prestito
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* For completed loans, just show details button */}
            {activeTab === 'processed' && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="flex justify-center">
                  <button
                    onClick={() => setSelectedLoan(item)}
                    className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
                  >
                    Visualizza Dettagli
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
     )}
    </div>

    {/* Mobile Card View */}
    <div className="lg:hidden space-y-4">
      {filteredData.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-muted text-lg mb-2">
            <svg className="icon-lg mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-secondary">
            {searchTerm 
              ? 'Nessun elemento trovato con i filtri selezionati' 
              : `Nessuna ${activeTab === 'pending' ? 'richiesta in attesa' : activeTab === 'processed' ? 'prestito completato' : 'prestito attivo'}`
            }
          </p>
        </div>
      ) : (
        filteredData.map(item => (
          <div key={item.id} className="card">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                  {(item.utente_nome || '').charAt(0)}{(item.utente_cognome || '').charAt(0)}
                </div>
                <div className="ml-3">
                  <div className="text-lg font-semibold text-primary">
                    {item.utente_nome || ''} {item.utente_cognome || ''}
                  </div>
                  <div className="text-sm text-tertiary">
                    {item.utente_email}
                  </div>
                </div>
              </div>
              {getStatusBadge(item.stato)}
            </div>

            {/* Object Info */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-primary mb-2">
                {item.articolo_nome || item.oggetto_nome}
                {item.unita_seriale && (
                  <span className="text-gray-500"> - {item.unita_seriale}</span>
                )}
              </h3>
              {item.oggetto_id && (
                <span className="text-xs text-tertiary bg-gray-100 px-2 py-1 rounded-full">
                  ID: {item.oggetto_id}
                </span>
              )}
            </div>

            {/* Dates */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex flex-col">
                  <span className="text-tertiary text-xs uppercase tracking-wide mb-1">Data Inizio</span>
                  <span className="text-primary font-semibold text-base">{formatDate(item.dal || item.data_uscita)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-tertiary text-xs uppercase tracking-wide mb-1">Data Fine</span>
                  <span className="text-primary font-semibold text-base">{formatDate(item.al || item.data_rientro)}</span>
                </div>
                {item.stato === 'restituito' && item.data_rientro && (
                  <div className="col-span-2 flex flex-col">
                    <span className="text-tertiary text-xs uppercase tracking-wide mb-1">Restituito</span>
                    <span className="text-green-600 font-semibold text-base">{formatDate(item.data_rientro)}</span>
                  </div>
                )}
                {item.stato === 'attivo' && (item.al || item.data_rientro) && (
                  <div className="col-span-2 flex flex-col">
                    <span className="text-tertiary text-xs uppercase tracking-wide mb-1">Restituirà il</span>
                    <span className="text-orange-600 font-semibold text-base">{formatDate(item.al || item.data_rientro)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {activeTab === 'pending' && (
                <>
                  <button
                    onClick={() => handleApprove(item.id)}
                    disabled={approvingRequestId === item.id || approvingRequestId !== null}
                    className="w-full btn-success text-center py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {approvingRequestId === item.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                        Approvazione...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Approva Richiesta
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => openRejectModal(item.id)}
                    className="w-full bg-red-500 hover:bg-red-600 text-white rounded-lg py-2 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Rifiuta Richiesta
                  </button>
                </>
              )}
              
              {activeTab === 'active' && item.stato === 'attivo' && (
                <button
                  onClick={() => handleReturn(item.id)}
                  className="w-full btn-success text-center py-2"
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Termina Prestito
                </button>
              )}

              <button
                onClick={() => setSelectedLoan(item)}
                className="w-full btn-secondary text-center py-2"
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Visualizza Dettagli
              </button>
            </div>
          </div>
        ))
      )}
    </div>

 {/* Advanced Loan Modal */}
 <AdvancedLoanModal
 isOpen={showLoanModal}
 onClose={() => setShowLoanModal(false)}
 onSuccess={() => {
 fetchData();
 setShowLoanModal(false);
 }}
 />

 {/* Loan Details Modal - Simple version */}
{selectedLoan && (
<div className="modal-overlay" onClick={() => setSelectedLoan(null)}>
<div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '48rem', width: '95vw'}}>
 <div className="modal-header">
 <h2 className="text-xl font-bold text-primary">
   Dettagli {selectedLoan.articolo_nome || selectedLoan.oggetto_nome}
   {selectedLoan.unita && selectedLoan.unita.length > 0 && ` - ${Array.isArray(selectedLoan.unita) ? selectedLoan.unita.join(', ') : selectedLoan.unita}`}
 </h2>
 <button
 onClick={() => setSelectedLoan(null)}
 className="text-muted hover:text-primary"
 >
 <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>
 <div className="modal-body">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="form-label">Oggetto</label>
 <div className="flex items-center gap-2">
                <p className="text-primary font-medium">{selectedLoan.articolo_nome || selectedLoan.oggetto_nome}</p>
 {selectedLoan.oggetto_id && (
 <span className="text-xs text-tertiary bg-gray-100 px-2 py-1 rounded-full">
 ID: {selectedLoan.oggetto_id}
 </span>
 )}
 </div>
 </div>
 <div>
 <label className="form-label">Stato</label>
 {getStatusBadge(selectedLoan.stato)}
 </div>
 <div>
 <label className="form-label">Richiedente</label>
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
 <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
 </svg>
 </div>
 <div>
 <p className="text-primary font-medium">{selectedLoan.utente_nome || ''} {selectedLoan.utente_cognome || ''}</p>
 </div>
 </div>
 </div>
 <div>
 <label className="form-label">Email</label>
 <p className="text-secondary">{selectedLoan.utente_email}</p>
 </div>
                <div>
                  <label className="form-label">Dal</label>
                <p className="text-primary">{formatDate(selectedLoan.dal || selectedLoan.data_uscita)}</p>
                </div>
                <div>
                  <label className="form-label">Al</label>
                  <p className="text-primary">{formatDate(selectedLoan.al || selectedLoan.data_rientro)}</p>
                </div>
                {selectedLoan.data_rientro && (
                  <div className="md:col-span-2">
                    <label className="form-label">Data Restituzione</label>
                    <p className="text-primary">{formatDate(selectedLoan.data_rientro)}</p>
                  </div>
                )}
 {selectedLoan.note && (
 <div className="md:col-span-2">
 <label className="form-label">Note</label>
 <p className="text-secondary">{selectedLoan.note}</p>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Reject Modal */}
 {showRejectModal && (
   <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
     <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
       <div className="flex items-center justify-between p-6 border-b border-gray-200">
         <h2 className="text-xl font-semibold text-gray-900">Rifiuta Richiesta</h2>
         <button
           onClick={() => {
             setShowRejectModal(false);
             setError(null);
           }}
           className="text-gray-400 hover:text-gray-600 transition-colors"
         >
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
           </svg>
         </button>
       </div>
       
       <div className="p-6">
         <p className="text-gray-600 mb-4">Inserisci il motivo del rifiuto per questa richiesta:</p>
         <textarea
           value={rejectReason}
           onChange={(e) => setRejectReason(e.target.value)}
           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
           rows={4}
           placeholder="Motivo del rifiuto..."
           required
         />
         {error && (
           <p className="text-red-600 text-sm mt-2">{error}</p>
         )}
       </div>
       
       <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
         <button
           onClick={() => {
             setShowRejectModal(false);
             setError(null);
           }}
           className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
         >
           Annulla
         </button>
         <button
           onClick={confirmReject}
           disabled={!rejectReason.trim()}
           className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
         >
           Conferma Rifiuto
         </button>
       </div>
     </div>
   </div>
 )}

 {/* Error Message */}
 {error && (
 <div className="alert-card alert-danger">
 <div className="flex items-center">
 <svg className="icon text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 <p className="text-red-800 ">{error}</p>
 </div>
 </div>
 )}
 </div>
 );
};

export default Loans;