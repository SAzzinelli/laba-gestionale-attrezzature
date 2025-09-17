import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

const Repairs = () => {
 const [repairs, setRepairs] = useState([]);
 const [inventory, setInventory] = useState([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [showAddModal, setShowAddModal] = useState(false);
 const [editingRepair, setEditingRepair] = useState(null);
 const [statusFilter, setStatusFilter] = useState('all');
 const [searchTerm, setSearchTerm] = useState('');
 const [formData, setFormData] = useState({
 oggetto_id: '',
 unit_id: '',
 descrizione: '',
 note_tecniche: '',
 priorita: 'media',
 stato: 'in_corso'
 });
 const [availableUnits, setAvailableUnits] = useState([]);
 const { token } = useAuth();

 // Fetch available units for selected object
 const fetchAvailableUnits = async (objectId) => {
   if (!objectId) {
     setAvailableUnits([]);
     return;
   }
   
   try {
     const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventario/${objectId}/units`, {
       headers: { 'Authorization': `Bearer ${token}` }
     });
     
     if (response.ok) {
       const units = await response.json();
       setAvailableUnits(units);
     }
   } catch (err) {
     console.error('Errore caricamento unità:', err);
   }
 };

 // Handle form submission
 const handleSubmit = async (e) => {
 e.preventDefault();
 try {
 const url = editingRepair ? `/api/riparazioni/${editingRepair.id}` : '/api/riparazioni';
 const method = editingRepair ? 'PUT' : 'POST';
 
 const response = await fetch(url, {
 method,
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({
   ...formData,
   inventario_id: formData.oggetto_id,
   unit_id: formData.unit_id
 })
 });

 if (!response.ok) {
 throw new Error('Errore nel salvataggio');
 }

 setShowAddModal(false);
 setEditingRepair(null);
 setFormData({
 oggetto_id: '',
 unit_id: '',
 descrizione: '',
 note_tecniche: '',
 priorita: 'media',
 stato: 'in_corso'
 });
 setAvailableUnits([]);
 fetchData();
 } catch (err) {
 setError(err.message);
 }
 };

 // Fetch data
 const fetchData = async () => {
 try {
 setLoading(true);
 const [repairsRes, inventoryRes] = await Promise.all([
      fetch(`${import.meta.env.VITE_API_BASE_URL}/api/riparazioni`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventario`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
 ]);

 if (!repairsRes.ok) throw new Error('Errore nel caricamento riparazioni');
 if (!inventoryRes.ok) throw new Error('Errore nel caricamento inventario');

 const [repairsData, inventoryData] = await Promise.all([
 repairsRes.json(),
 inventoryRes.json()
 ]);

 setRepairs(repairsData);
 setInventory(inventoryData);
 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchData();
 }, []);

 // Filter repairs
 const filteredRepairs = repairs.filter(repair => {
 const matchesSearch = repair.inventario_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
 repair.descrizione?.toLowerCase().includes(searchTerm.toLowerCase());
 const matchesStatus = statusFilter === 'all' || repair.stato === statusFilter;
 return matchesSearch && matchesStatus;
 });

 // Get status badge
 const getStatusBadge = (status) => {
 const statusConfig = {
 'in_corso': { 
 className: 'alert-warning', 
 icon: (
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 ), 
 label: 'In Corso' 
 },
 'completata': { 
 className: 'status-available', 
 icon: (
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 ), 
 label: 'Completata' 
 },
 'annullata': { 
 className: 'status-unavailable', 
 icon: (
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 ), 
 label: 'Annullata' 
 }
 };
 
 const config = statusConfig[status] || statusConfig['in_corso'];
 
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
 <span className="ml-2 text-gray-600">Caricamento riparazioni...</span>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="card">
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h1 className="text-2xl font-bold text-primary">Gestione Riparazioni</h1>
 <p className="text-secondary mt-1">Gestisci le riparazioni delle attrezzature</p>
 </div>
 <div className="flex items-center">
 <button
 onClick={() => setShowAddModal(true)}
 className="btn-primary"
 >
 <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
 </svg>
 Nuova Riparazione
 </button>
 </div>
 </div>
 </div>

 {/* Filters */}
 <div className="card">
 <div className="flex flex-col sm:flex-row gap-4 items-center">
 <div className="flex-1 form-group">
 <label className="form-label">Cerca riparazioni</label>
 <div className="relative">
 <input
 type="text"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 placeholder="Cerca per oggetto o descrizione..."
 className="input-field pl-10"
 />
 <svg className="search-icon icon-sm text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
 </svg>
 </div>
 </div>
 <div className="flex gap-2 items-center">
 {['all', 'in_corso', 'completata', 'annullata'].map(status => (
 <button
 key={status}
 onClick={() => setStatusFilter(status)}
 className={`btn-small ${
 statusFilter === status ? 'btn-primary' : 'btn-secondary'
 }`}
 >
 {status === 'all' ? 'Tutte' :
 status === 'in_corso' ? 'In Corso' :
 status === 'completata' ? 'Completate' :
 'Annullate'}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* Repairs Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {filteredRepairs.length === 0 ? (
 <div className="lg:col-span-2">
 <div className="card text-center py-12">
 <svg className="icon-lg mx-auto mb-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
 </svg>
 <p className="text-secondary">
 {searchTerm || statusFilter !== 'all' 
 ? 'Nessuna riparazione trovata con i filtri selezionati' 
 : 'Nessuna riparazione in corso'
 }
 </p>
 </div>
 </div>
 ) : (
 filteredRepairs.map(repair => (
 <div
 key={repair.id}
 className="card card-clickable"
 onClick={() => setEditingRepair(repair)}
 >
 <div className="flex flex-col gap-4">
 <div className="flex items-center justify-between">
 <h3 className="text-lg font-semibold text-primary">{repair.inventario_nome}</h3>
 {getStatusBadge(repair.stato)}
 </div>
 
 <div className="grid grid-cols-2 gap-4 text-sm">
 <div>
 <span className="text-tertiary">Tipo:</span>
 <span className="text-primary ml-1 font-medium">{repair.tipo}</span>
 </div>
 <div>
 <span className="text-tertiary">Creata:</span>
 <span className="text-primary ml-1">{new Date(repair.created_at).toLocaleDateString('it-IT')}</span>
 </div>
 {repair.data_inizio && (
 <div>
 <span className="text-tertiary">Inizio:</span>
 <span className="text-primary ml-1">{new Date(repair.data_inizio).toLocaleDateString('it-IT')}</span>
 </div>
 )}
 {repair.data_fine && (
 <div>
 <span className="text-tertiary">Fine:</span>
 <span className="text-primary ml-1">{new Date(repair.data_fine).toLocaleDateString('it-IT')}</span>
 </div>
 )}
 </div>
 
 {repair.descrizione && (
 <p className="text-sm text-tertiary">{repair.descrizione}</p>
 )}

 <div className="flex justify-between items-center">
 <button
 onClick={(e) => {
 e.stopPropagation();
 setEditingRepair(repair);
 setShowAddModal(true);
 }}
 className="btn-secondary btn-small"
 >
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
 </svg>
 Modifica
 </button>
 {repair.stato === 'in_corso' && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 // Complete repair logic
 }}
 className="btn-success btn-small"
 >
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
 </svg>
 Completa
 </button>
 )}
 </div>
 </div>
 </div>
 ))
 )}
 </div>

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

 {/* Add/Edit Repair Modal */}
 {showAddModal && (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
 <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
 <div className="flex items-center justify-between p-6 border-b border-gray-200">
 <h2 className="text-xl font-semibold text-gray-900">
 {editingRepair ? 'Modifica Riparazione' : 'Nuova Riparazione'}
 </h2>
 <button
 onClick={() => setShowAddModal(false)}
 className="text-gray-400 hover:text-gray-600 transition-colors"
 >
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>

 <div className="p-6">
 <form onSubmit={handleSubmit} className="space-y-6">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Oggetto *
 </label>
 <select
 value={formData.oggetto_id}
 onChange={(e) => {
   const objectId = e.target.value;
   setFormData({...formData, oggetto_id: objectId, unit_id: ''});
   fetchAvailableUnits(objectId);
 }}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 required
 >
 <option value="">Seleziona oggetto</option>
 {inventory.map(item => (
 <option key={item.id} value={item.id}>
 {item.nome} - {item.scaffale}
 </option>
 ))}
 </select>
 </div>

 {/* Unit ID Selection */}
 {formData.oggetto_id && (
   <div>
     <label className="block text-sm font-medium text-gray-700 mb-2">
       ID Univoco *
     </label>
     <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
       {availableUnits.map(unit => (
         <div
           key={unit.id}
           onClick={() => setFormData({...formData, unit_id: unit.id})}
           className={`p-3 border rounded-lg cursor-pointer transition-all ${
             formData.unit_id === unit.id
               ? 'border-blue-500 bg-blue-50'
               : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
           }`}
         >
           <div className="text-center">
             <div className="font-medium text-gray-900 mb-1">{unit.codice_univoco}</div>
             <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
               unit.stato === 'disponibile' ? 'bg-green-100 text-green-800' :
               unit.stato === 'prestato' ? 'bg-blue-100 text-blue-800' :
               unit.stato === 'riservato' ? 'bg-yellow-100 text-yellow-800' :
               unit.stato === 'in_riparazione' ? 'bg-orange-100 text-orange-800' :
               'bg-gray-100 text-gray-800'
             }`}>
               {unit.stato === 'disponibile' ? 'Disponibile' :
                unit.stato === 'prestato' ? 'In Prestito' :
                unit.stato === 'riservato' ? 'Riservato' :
                unit.stato === 'in_riparazione' ? 'In Riparazione' :
                unit.stato}
             </span>
           </div>
         </div>
       ))}
     </div>
     {availableUnits.length === 0 && (
       <p className="text-gray-500 text-sm">Nessuna unità disponibile per questo oggetto</p>
     )}
   </div>
 )}

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Descrizione Problema *
 </label>
 <textarea
 value={formData.descrizione}
 onChange={(e) => setFormData({...formData, descrizione: e.target.value})}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 rows="3"
 placeholder="Descrivi il problema riscontrato"
 required
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Note Tecniche
 </label>
 <textarea
 value={formData.note_tecniche}
 onChange={(e) => setFormData({...formData, note_tecniche: e.target.value})}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 rows="2"
 placeholder="Note aggiuntive per il tecnico"
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Priorità
 </label>
 <select
 value={formData.priorita}
 onChange={(e) => setFormData({...formData, priorita: e.target.value})}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 >
 <option value="bassa">🟢 Bassa</option>
 <option value="media">🟡 Media</option>
 <option value="alta">🟠 Alta</option>
 <option value="critica">🔴 Critica</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Stato
 </label>
 <select
 value={formData.stato}
 onChange={(e) => setFormData({...formData, stato: e.target.value})}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 >
 <option value="in_corso">🔄 In Corso</option>
 <option value="completata">✅ Completata</option>
 <option value="annullata">❌ Annullata</option>
 </select>
 </div>
 </div>

           {/* Error Message */}
           {error && (
             <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
               {error}
             </div>
           )}

           {/* Actions */}
           <div className="flex justify-end space-x-3 pt-4">
             <button
               type="button"
               onClick={() => setShowAddModal(false)}
               className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
             >
               Annulla
             </button>
             <button
               type="submit"
               className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
             >
               {editingRepair ? 'Aggiorna' : 'Crea Riparazione'}
             </button>
           </div>
         </form>
 </div>
 </div>
 </div>
 )}
 </div>
 );
};

export default Repairs;