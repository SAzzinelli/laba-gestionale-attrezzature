import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import notificationService from '../utils/notificationService';

const UserArea = () => {
 const [inventory, setInventory] = useState([]);
 const [requests, setRequests] = useState([]);
 const [reports, setReports] = useState([]);
 const [alerts, setAlerts] = useState({
 prestiti_scaduti: [],
 scadenze_oggi: [],
 scadenze_domani: [],
 totale_avvisi: 0
 });
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [activeTab, setActiveTab] = useState('inventory');
 const [showRequestModal, setShowRequestModal] = useState(false);
 const [showReportModal, setShowReportModal] = useState(false);
 const [selectedItem, setSelectedItem] = useState(null);
 const { token, user } = useAuth();

 // Fetch data
 const fetchData = async () => {
 try {
 setLoading(true);
 const [inventoryRes, requestsRes, reportsRes, alertsRes] = await Promise.all([
      fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventario`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${import.meta.env.VITE_API_BASE_URL}/api/richieste/mie`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${import.meta.env.VITE_API_BASE_URL}/api/segnalazioni/mie`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${import.meta.env.VITE_API_BASE_URL}/api/avvisi/utente`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
 ]);

 if (!inventoryRes.ok) throw new Error('Errore nel caricamento inventario');
 if (!requestsRes.ok) throw new Error('Errore nel caricamento richieste');
 if (!reportsRes.ok) throw new Error('Errore nel caricamento segnalazioni');
 if (!alertsRes.ok) throw new Error('Errore nel caricamento avvisi');

 const [inventoryData, requestsData, reportsData, alertsData] = await Promise.all([
 inventoryRes.json(),
 requestsRes.json(),
 reportsRes.json(),
 alertsRes.json()
 ]);

 setInventory(inventoryData);
 setRequests(requestsData);
 setReports(reportsData);
 setAlerts(alertsData);
 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchData();
 }, []);

 // Get status badge
 const getStatusBadge = (status) => {
 const statusConfig = {
 'disponibile': { color: 'bg-green-100 text-green-800', icon: '✅', label: 'Disponibile' },
 'in_riparazione': { color: 'bg-orange-100 text-orange-800', icon: '🔧', label: 'In Riparazione' },
 'non_disponibile': { color: 'bg-red-100 text-red-800', icon: '❌', label: 'Non Disponibile' }
 };
 
 const config = statusConfig[status] || statusConfig['disponibile'];
 
 return (
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
 <span className="mr-1">{config.icon}</span>
 {config.label}
 </span>
 );
 };

 // Get request status badge
 const getRequestStatusBadge = (status) => {
 const statusConfig = {
 'in_attesa': { color: 'bg-yellow-100 text-yellow-800', icon: '⏳', label: 'In Attesa' },
 'approvata': { color: 'bg-green-100 text-green-800', icon: '✅', label: 'Approvata' },
 'rifiutata': { color: 'bg-red-100 text-red-800', icon: '❌', label: 'Rifiutata' }
 };
 
 const config = statusConfig[status] || statusConfig['in_attesa'];
 
 return (
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
 <span className="mr-1">{config.icon}</span>
 {config.label}
 </span>
 );
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="bg-white rounded-lg shadow-sm border p-6">
 <div className="flex items-center space-x-4">
 <div className="w-12 h-12 bg-gradient-to-r from-sky-400 to-[#033157] rounded-full flex items-center justify-center">
 <span className="text-white font-bold text-xl">
 {user?.name?.[0]}{user?.surname?.[0]}
 </span>
 </div>
 <div>
 <h1 className="text-2xl font-bold text-gray-900">Ciao, {user?.name}!</h1>
 <p className="text-gray-600">Gestisci le tue richieste e segnalazioni</p>
 </div>
 </div>
 </div>

 {/* Tabs */}
 <div className="bg-white rounded-lg shadow-sm border">
 <div className="border-b border-gray-200">
 <nav className="flex space-x-8 px-6">
 <button
 onClick={() => setActiveTab('inventory')}
 className={`py-4 px-1 border-b-2 font-medium text-sm ${
 activeTab === 'inventory'
 ? 'border-blue-500 text-blue-600'
 : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
 }`}
 >
 📦 Inventario Disponibile
 </button>
 <button
 onClick={() => setActiveTab('requests')}
 className={`py-4 px-1 border-b-2 font-medium text-sm ${
 activeTab === 'requests'
 ? 'border-blue-500 text-blue-600'
 : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
 }`}
 >
 📝 Le Mie Richieste ({requests.length})
 </button>
 <button
 onClick={() => setActiveTab('reports')}
 className={`py-4 px-1 border-b-2 font-medium text-sm ${
 activeTab === 'reports'
 ? 'border-blue-500 text-blue-600'
 : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
 }`}
 >
 🚨 Le Mie Segnalazioni ({reports.length})
 </button>
 </nav>
 </div>

 {/* User Alerts */}
 {alerts.totale_avvisi > 0 && (
 <div className="mx-6 mt-6 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border-2 border-red-200 p-4">
 <h3 className="text-lg font-bold text-red-800 flex items-center mb-3">
 <span className="animate-pulse mr-2">🚨</span>
 I Tuoi Avvisi ({alerts.totale_avvisi})
 </h3>
 
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {/* Prestiti Scaduti */}
 {alerts.prestiti_scaduti.length > 0 && (
 <div className="bg-white rounded-lg p-3 border-l-4 border-red-500">
 <h4 className="font-semibold text-red-700 text-sm mb-2">
 ⏰ Sei in Ritardo! ({alerts.prestiti_scaduti.length})
 </h4>
 {alerts.prestiti_scaduti.map(prestito => (
 <div key={prestito.id} className="text-sm">
 <span className="font-medium text-gray-900 ">{prestito.oggetto_nome}</span>
 <div className="text-red-600 animate-pulse">
 {Math.floor(prestito.giorni_ritardo)} giorni di ritardo
 </div>
 </div>
 ))}
 </div>
 )}

 {/* Scadenze Oggi */}
 {alerts.scadenze_oggi.length > 0 && (
 <div className="bg-white rounded-lg p-3 border-l-4 border-orange-500">
 <h4 className="font-semibold text-orange-700 text-sm mb-2">
 📅 Riconsegna Oggi! ({alerts.scadenze_oggi.length})
 </h4>
 {alerts.scadenze_oggi.map(prestito => (
 <div key={prestito.id} className="text-sm">
 <span className="font-medium text-gray-900 ">{prestito.oggetto_nome}</span>
 </div>
 ))}
 </div>
 )}

 {/* Scadenze Domani */}
 {alerts.scadenze_domani.length > 0 && (
 <div className="bg-white rounded-lg p-3 border-l-4 border-yellow-500">
 <h4 className="font-semibold text-yellow-700 text-sm mb-2">
 📆 Riconsegna Domani ({alerts.scadenze_domani.length})
 </h4>
 {alerts.scadenze_domani.map(prestito => (
 <div key={prestito.id} className="text-sm">
 <span className="font-medium text-gray-900 ">{prestito.oggetto_nome}</span>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 )}

 <div className="p-6">
 {/* Inventory Tab */}
 {activeTab === 'inventory' && (
 <div className="space-y-4">
 <div className="flex justify-between items-center">
 <h2 className="text-lg font-semibold text-gray-900">Attrezzature Disponibili</h2>
 <button
 onClick={() => setShowReportModal(true)}
 className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
 >
 <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
 </svg>
 Segnala Problema
 </button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {inventory.map((item) => (
 <div key={item.id} className="bg-gray-50 rounded-lg border p-4">
 <div className="flex items-start justify-between mb-3">
 <div className="flex-1">
 <h3 className="font-semibold text-gray-900">{item.nome}</h3>
 {item.seriale && (
 <p className="text-sm text-gray-500">Seriale: {item.seriale}</p>
 )}
 </div>
 {getStatusBadge(item.stato_effettivo)}
 </div>
 
 {item.note && (
 <p className="text-sm text-gray-600 mb-3">{item.note}</p>
 )}

 <div className="flex space-x-2">
 <button
 onClick={() => {
 if (item.stato_effettivo === 'disponibile') {
 setSelectedItem(item);
 setShowRequestModal(true);
 }
 }}
 disabled={item.stato_effettivo !== 'disponibile'}
 className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
 item.stato_effettivo === 'disponibile'
 ? 'bg-blue-600 text-white hover:bg-blue-700'
 : 'bg-gray-200 text-gray-500 cursor-not-allowed'
 }`}
 >
 {item.stato_effettivo === 'disponibile' ? 'Richiedi Prestito' : 
 item.stato_effettivo === 'in_riparazione' ? 'In Riparazione' : 'Non Disponibile'}
 </button>
 
 <button
 onClick={() => {
 setSelectedItem(item);
 setShowReportModal(true);
 }}
 className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
 title="Segnala problema"
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
 </svg>
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Requests Tab */}
 {activeTab === 'requests' && (
 <div className="space-y-4">
 <h2 className="text-lg font-semibold text-gray-900">Le Mie Richieste</h2>
 {requests.length === 0 ? (
 <div className="text-center py-8">
 <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
 </svg>
 <h3 className="mt-2 text-sm font-medium text-gray-900">Nessuna richiesta</h3>
 <p className="mt-1 text-sm text-gray-500">Non hai ancora fatto richieste di prestito</p>
 </div>
 ) : (
 <div className="space-y-3">
 {requests.map((request) => (
 <div key={request.id} className="bg-gray-50 rounded-lg border p-4">
 <div className="flex items-center justify-between mb-2">
 <h3 className="font-semibold text-gray-900">{request.oggetto_nome}</h3>
 {getRequestStatusBadge(request.stato)}
 </div>
 <div className="text-sm text-gray-600 space-y-1">
 <p>Dal: {new Date(request.dal).toLocaleDateString('it-IT')}</p>
 <p>Al: {new Date(request.al).toLocaleDateString('it-IT')}</p>
 {request.note && <p>Note: {request.note}</p>}
 <p>Richiesta il: {new Date(request.created_at).toLocaleDateString('it-IT')}</p>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {/* Reports Tab */}
 {activeTab === 'reports' && (
 <div className="space-y-4">
 <h2 className="text-lg font-semibold text-gray-900">Le Mie Segnalazioni</h2>
 {reports.length === 0 ? (
 <div className="text-center py-8">
 <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
 </svg>
 <h3 className="mt-2 text-sm font-medium text-gray-900">Nessuna segnalazione</h3>
 <p className="mt-1 text-sm text-gray-500">Non hai ancora fatto segnalazioni</p>
 </div>
 ) : (
 <div className="space-y-3">
 {reports.map((report) => (
 <div key={report.id} className="bg-gray-50 rounded-lg border p-4">
 <div className="flex items-center justify-between mb-2">
 <h3 className="font-semibold text-gray-900 capitalize">{report.tipo}</h3>
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
 report.stato === 'aperta' 
 ? 'bg-yellow-100 text-yellow-800' 
 : 'bg-green-100 text-green-800'
 }`}>
 {report.stato === 'aperta' ? 'Aperta' : 'Chiusa'}
 </span>
 </div>
 {report.messaggio && (
 <p className="text-sm text-gray-600 mb-2">{report.messaggio}</p>
 )}
 <p className="text-xs text-gray-500">
 Segnalata il: {new Date(report.created_at).toLocaleDateString('it-IT')}
 </p>
 </div>
 ))}
 </div>
 )}
 </div>
 )}
 </div>
 </div>

 {/* Request Modal */}
 {showRequestModal && selectedItem && (
 <RequestModal
 item={selectedItem}
 onClose={() => {
 setShowRequestModal(false);
 setSelectedItem(null);
 }}
 onSuccess={fetchData}
 token={token}
 />
 )}

 {/* Report Modal */}
 {showReportModal && (
 <ReportModal
 item={selectedItem}
 onClose={() => {
 setShowReportModal(false);
 setSelectedItem(null);
 }}
 onSuccess={fetchData}
 token={token}
 />
 )}
 </div>
 );
};

// Modal per richieste di prestito
function RequestModal({ item, onClose, onSuccess, token }) {
 const [formData, setFormData] = useState({
 dal: '',
 al: '',
 note: ''
 });
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState(null);

 const handleSubmit = async (e) => {
 e.preventDefault();
 setLoading(true);
 setError(null);

 try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/richieste`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({
 inventario_id: item.id,
 ...formData
 })
 });

 if (!response.ok) {
 const errorData = await response.json();
 throw new Error(errorData.error || 'Errore nella richiesta');
 }

 // Invia notifica desktop se abilitata
 if (notificationService.isEnabled()) {
 try {
 await notificationService.notifyGeneric(
 'Richiesta Inviata!',
 `La tua richiesta per ${item.nome} è stata inviata e sarà esaminata a breve.`,
 'success'
 );
 } catch (notifError) {
 console.warn('Errore nell\'invio notifica:', notifError);
 }
 }

 onSuccess();
 onClose();
 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="fixed inset-0 z-50 overflow-y-auto">
 <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
 <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
 
 <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-medium text-gray-900">Richiedi Prestito</h3>
 <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>

 <div className="mb-4 p-3 bg-gray-50 rounded-lg">
 <h4 className="font-medium text-gray-900">{item.nome}</h4>
 {item.seriale && <p className="text-sm text-gray-500">Seriale: {item.seriale}</p>}
 </div>

 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Dal *</label>
 <input
 type="date"
 required
 value={formData.dal}
 onChange={(e) => setFormData({...formData, dal: e.target.value})}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Al *</label>
 <input
 type="date"
 required
 value={formData.al}
 onChange={(e) => setFormData({...formData, al: e.target.value})}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
 <textarea
 value={formData.note}
 onChange={(e) => setFormData({...formData, note: e.target.value})}
 rows={3}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
 placeholder="Note aggiuntive per la richiesta"
 />
 </div>

 {error && (
 <div className="bg-red-50 border border-red-200 rounded-lg p-3">
 <p className="text-sm text-red-800">{error}</p>
 </div>
 )}

 <div className="flex justify-end space-x-3 pt-4">
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
 >
 Annulla
 </button>
 <button
 type="submit"
 disabled={loading}
 className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200"
 >
 {loading ? 'Invio...' : 'Invia Richiesta'}
 </button>
 </div>
 </form>
 </div>
 </div>
 </div>
 );
}

// Modal per segnalazioni
function ReportModal({ item, onClose, onSuccess, token }) {
 const [formData, setFormData] = useState({
 tipo: 'guasto',
 messaggio: ''
 });
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState(null);

 const handleSubmit = async (e) => {
 e.preventDefault();
 setLoading(true);
 setError(null);

 try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/segnalazioni`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({
 inventario_id: item?.id || null,
 ...formData
 })
 });

 if (!response.ok) {
 const errorData = await response.json();
 throw new Error(errorData.error || 'Errore nella segnalazione');
 }

 onSuccess();
 onClose();
 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="fixed inset-0 z-50 overflow-y-auto">
 <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
 <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
 
 <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-medium text-gray-900">Segnala Problema</h3>
 <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>

 {item && (
 <div className="mb-4 p-3 bg-gray-50 rounded-lg">
 <h4 className="font-medium text-gray-900">{item.nome}</h4>
 {item.seriale && <p className="text-sm text-gray-500">Seriale: {item.seriale}</p>}
 </div>
 )}

 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Tipo di Problema *</label>
 <select
 value={formData.tipo}
 onChange={(e) => setFormData({...formData, tipo: e.target.value})}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
 >
 <option value="guasto">Guasto</option>
 <option value="assistenza">Assistenza</option>
 <option value="ritardo">Ritardo</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione *</label>
 <textarea
 required
 value={formData.messaggio}
 onChange={(e) => setFormData({...formData, messaggio: e.target.value})}
 rows={4}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
 placeholder="Descrivi il problema in dettaglio"
 />
 </div>

 {error && (
 <div className="bg-red-50 border border-red-200 rounded-lg p-3">
 <p className="text-sm text-red-800">{error}</p>
 </div>
 )}

 <div className="flex justify-end space-x-3 pt-4">
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
 >
 Annulla
 </button>
 <button
 type="submit"
 disabled={loading}
 className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors duration-200"
 >
 {loading ? 'Invio...' : 'Invia Segnalazione'}
 </button>
 </div>
 </form>
 </div>
 </div>
 </div>
 );
}

export default UserArea;