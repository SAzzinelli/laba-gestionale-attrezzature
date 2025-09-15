import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import AdvancedLoanModal from './AdvancedLoanModal';

const Loans = () => {
 const [requests, setRequests] = useState([]);
 const [loans, setLoans] = useState([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [showLoanModal, setShowLoanModal] = useState(false);
 const [selectedLoan, setSelectedLoan] = useState(null);
 const [activeTab, setActiveTab] = useState('active');
 const [searchTerm, setSearchTerm] = useState('');
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
 fetchData();
 }, []);

 const handleApprove = async (requestId) => {
 try {
 const response = await fetch(`/api/prestiti/${requestId}/approva`, {
 method: 'PUT',
 headers: {
 'Authorization': `Bearer ${token}`,
 'Content-Type': 'application/json'
 }
 });

 if (!response.ok) {
 const errorData = await response.json();
 throw new Error(errorData.error || 'Errore nell\'approvazione');
 }

 await fetchData();
 } catch (err) {
 setError(err.message);
 }
 };

 const handleReject = async (requestId) => {
 try {
 const response = await fetch(`/api/prestiti/${requestId}/rifiuta`, {
 method: 'PUT',
 headers: {
 'Authorization': `Bearer ${token}`,
 'Content-Type': 'application/json'
 }
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

 const handleReturn = async (loanId) => {
 try {
 const response = await fetch(`/api/prestiti/${loanId}/restituisci`, {
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
 data = requests.filter(r => r.stato !== 'in_attesa');
 break;
 case 'active':
 data = loans.filter(l => l.stato === 'attivo');
 break;
 default:
 data = [];
 }

 // Apply search filter
 if (searchTerm) {
 data = data.filter(item =>
 item.oggetto_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
 item.utente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
 item.utente_cognome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
 item.utente_email?.toLowerCase().includes(searchTerm.toLowerCase())
 );
 }

 return data;
 };

 const filteredData = getFilteredData();

 const getStatusBadge = (status) => {
 const statusConfig = {
 'in_attesa': { 
 className: 'alert-warning', 
 icon: (
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 ), 
 label: 'In Attesa' 
 },
 'approvata': { 
 className: 'status-available', 
 icon: (
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 ), 
 label: 'Approvata' 
 },
 'rifiutata': { 
 className: 'status-unavailable', 
 icon: (
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 ), 
 label: 'Rifiutata' 
 },
 'attivo': { 
 className: 'status-repair', 
 icon: (
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
 </svg>
 ), 
 label: 'Attivo' 
 },
 'completato': { 
 className: 'alert-info', 
 icon: (
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
 return (
 <div className="flex items-center justify-center h-64">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
 <span className="ml-2 text-gray-600">Caricamento prestiti...</span>
 </div>
 );
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
 className="btn-primary"
 >
 <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
 </svg>
 Nuovo Prestito
 </button>
 </div>
 </div>
 </div>

 {/* Search */}
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
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
 </svg>
 </div>
 </div>
 </div>

 {/* Tabs for Requests/Loans */}
 <div className="card p-0 overflow-hidden">
 <nav className="flex">
 <button
 onClick={() => setActiveTab('active')}
 className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
 >
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
 </svg>
 <span>Prestiti Attivi</span>
 <span className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs px-3 py-1 rounded-full ml-2 font-semibold shadow-sm">
 {loans.filter(l => l.stato === 'attivo').length}
 </span>
 </button>
 
 <button
 onClick={() => setActiveTab('pending')}
 className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
 >
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 <span>In Attesa</span>
 <span className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs px-3 py-1 rounded-full ml-2 font-semibold shadow-sm">
 {requests.filter(r => r.stato === 'in_attesa').length}
 </span>
 </button>
 
 <button
 onClick={() => setActiveTab('processed')}
 className={`tab-button ${activeTab === 'processed' ? 'active' : ''}`}
 >
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 <span>Processati</span>
 <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs px-3 py-1 rounded-full ml-2 font-semibold shadow-sm">
 {requests.filter(r => r.stato !== 'in_attesa').length}
 </span>
 </button>
 </nav>
 </div>

 {/* Content */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 {filteredData.length === 0 ? (
 <div className="lg:col-span-2">
 <div className="card text-center py-12">
 <div className="text-muted text-lg mb-2">
 <svg className="icon-lg mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
 </svg>
 </div>
 <p className="text-secondary">
 {searchTerm 
 ? 'Nessun elemento trovato con i filtri selezionati' 
 : `Nessuna ${activeTab === 'pending' ? 'richiesta in attesa' : activeTab === 'processed' ? 'richiesta processata' : 'prestito attivo'}`
 }
 </p>
 </div>
 </div>
 ) : (
 filteredData.map(item => (
 <div
 key={item.id}
 className="card card-clickable"
 onClick={() => setSelectedLoan(item)}
 >
 <div className="flex flex-col gap-4">
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <div className="flex items-center justify-between mb-3">
 <div>
 <h3 className="text-lg font-semibold text-primary">{item.oggetto_nome}</h3>
 {item.oggetto_id && (
 <span className="text-xs text-tertiary bg-gray-100 px-2 py-1 rounded-full">
 ID: {item.oggetto_id}
 </span>
 )}
 </div>
 {getStatusBadge(item.stato)}
 </div>
 
 <div className="flex items-center gap-2 mb-3">
 <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
 <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
 </svg>
 </div>
 <div>
 <p className="font-medium text-primary">{item.utente_nome} {item.utente_cognome}</p>
 <p className="text-xs text-tertiary">{item.utente_email}</p>
 </div>
 </div>
 </div>
 </div>
 
 <div className="bg-gray-50 rounded-lg p-4">
 <div className="grid grid-cols-2 gap-4 text-sm">
 <div className="flex flex-col">
 <span className="text-tertiary text-xs uppercase tracking-wide mb-1">Data Inizio</span>
 <span className="text-primary font-semibold text-base">{new Date(item.dal).toLocaleDateString('it-IT')}</span>
 </div>
 <div className="flex flex-col">
 <span className="text-tertiary text-xs uppercase tracking-wide mb-1">Data Fine</span>
 <span className="text-primary font-semibold text-base">{new Date(item.al).toLocaleDateString('it-IT')}</span>
 </div>
 {item.data_restituzione && (
 <div className="col-span-2 flex flex-col">
 <span className="text-tertiary text-xs uppercase tracking-wide mb-1">Restituito</span>
 <span className="text-green-600 font-semibold text-base">{new Date(item.data_restituzione).toLocaleDateString('it-IT')}</span>
 </div>
 )}
 </div>
 </div>

 {/* Action Buttons */}
 <div className="flex justify-between items-center pt-2 border-t border-primary">
 {activeTab === 'pending' && (
 <div className="flex gap-2">
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleApprove(item.id);
 }}
 className="btn-success btn-small"
 >
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
 </svg>
 Approva
 </button>
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleReject(item.id);
 }}
 className="btn-danger btn-small"
 >
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 Rifiuta
 </button>
 </div>
 )}
 
 {activeTab === 'active' && item.stato === 'attivo' && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleReturn(item.id);
 }}
 className="btn-success btn-small"
 >
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
 </svg>
 Termina prestito
 </button>
 )}
 </div>
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
 <div className="modal-content" onClick={(e) => e.stopPropagation()}>
 <div className="modal-header">
 <h2 className="text-xl font-bold text-primary">Dettagli {selectedLoan.oggetto_nome}</h2>
 <button
 onClick={() => setSelectedLoan(null)}
 className="text-muted hover:text-primary"
 >
 <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>
 <div className="modal-body">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="form-label">Oggetto</label>
 <div className="flex items-center gap-2">
 <p className="text-primary font-medium">{selectedLoan.oggetto_nome}</p>
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
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
 </svg>
 </div>
 <div>
 <p className="text-primary font-medium">{selectedLoan.utente_nome} {selectedLoan.utente_cognome}</p>
 </div>
 </div>
 </div>
 <div>
 <label className="form-label">Email</label>
 <p className="text-secondary">{selectedLoan.utente_email}</p>
 </div>
 <div>
 <label className="form-label">Dal</label>
 <p className="text-primary">{new Date(selectedLoan.dal).toLocaleDateString('it-IT')}</p>
 </div>
 <div>
 <label className="form-label">Al</label>
 <p className="text-primary">{new Date(selectedLoan.al).toLocaleDateString('it-IT')}</p>
 </div>
 {selectedLoan.data_restituzione && (
 <div className="md:col-span-2">
 <label className="form-label">Data Restituzione</label>
 <p className="text-primary">{new Date(selectedLoan.data_restituzione).toLocaleDateString('it-IT')}</p>
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
 </div>
 );
};

export default Loans;