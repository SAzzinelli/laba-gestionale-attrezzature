import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

const NewRequestModal = ({ isOpen, onClose, selectedItem, onSuccess }) => {
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState(null);
 const [formData, setFormData] = useState({
  unit_id: '',
  data_inizio: new Date().toISOString().split('T')[0], // Data di oggi predefinita
  data_fine: '',
  note: ''
 });
 const [inventory, setInventory] = useState([]);
 const [availableUnits, setAvailableUnits] = useState([]);
 const { token, user } = useAuth();

 useEffect(() => {
  if (isOpen) {
   fetchInventory();
   // Reset form data when opening
   setFormData({
     unit_id: '',
     data_inizio: new Date().toISOString().split('T')[0],
     data_fine: '',
     note: ''
   });
  }
 }, [isOpen]);

 const fetchInventory = async () => {
   try {
     const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventario/disponibili`, {
       headers: {
         'Authorization': `Bearer ${token}`
       }
     });
     if (response.ok) {
       const data = await response.json();
       setInventory(data);
       
       // Fetch available units for each item
       const unitsPromises = data.map(async (item) => {
         const unitsResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventario/${item.id}/units`, {
           headers: { 'Authorization': `Bearer ${token}` }
         });
         if (unitsResponse.ok) {
           const units = await unitsResponse.json();
           return units.filter(unit => unit.stato === 'disponibile' && !unit.prestito_corrente_id);
         }
         return [];
       });
       
       const allUnits = await Promise.all(unitsPromises);
       const flatUnits = allUnits.flat().map(unit => ({
         ...unit,
         item_name: data.find(item => item.id === unit.inventario_id)?.nome || 'Unknown'
       }));
       
       setAvailableUnits(flatUnits);
     }
   } catch (err) {
     console.error('Error fetching inventory:', err);
   }
 };

 const handleInputChange = (e) => {
 const { name, value } = e.target;
 setFormData(prev => ({
 ...prev,
 [name]: value
 }));
 };

 const handleSubmit = async (e) => {
   e.preventDefault();
   setLoading(true);
   setError(null);

   // Validazione date frontend
   const dataInizio = new Date(formData.data_inizio);
   const dataFine = new Date(formData.data_fine);
   const oggi = new Date();
   oggi.setHours(0, 0, 0, 0);

   if (dataInizio < oggi) {
     setError('La data di inizio non può essere nel passato');
     setLoading(false);
     return;
   }

   if (dataFine < dataInizio) {
     setError('La data di fine deve essere successiva alla data di inizio');
     setLoading(false);
     return;
   }

   try {
     const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/richieste`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${token}`
       },
       body: JSON.stringify({
         unit_id: formData.unit_id,
         dal: formData.data_inizio,
         al: formData.data_fine,
         note: formData.note
       })
     });

     if (!response.ok) {
       const errorData = await response.json();
       throw new Error(errorData.error || 'Errore nella creazione della richiesta');
     }

     onSuccess();
     onClose();
   } catch (err) {
     setError(err.message);
   } finally {
     setLoading(false);
   }
 };

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
 {/* Header */}
 <div className="flex items-center justify-between p-6 border-b border-gray-200">
 <h2 className="text-xl font-semibold text-gray-900">Nuova Richiesta</h2>
 <button
 onClick={onClose}
 className="text-gray-400 hover:text-gray-600 transition-colors"
 >
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>

 {/* Content */}
 <form onSubmit={handleSubmit} className="p-6 space-y-6">
 {/* ID Univoco */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
  ID Univoco *
 </label>
 <select
  name="unit_id"
  value={formData.unit_id}
  onChange={handleInputChange}
  required
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 >
 <option value="">Seleziona un ID univoco</option>
 {availableUnits.map((unit) => (
  <option key={unit.id} value={unit.id}>
   {unit.codice_univoco} - {unit.item_name}
  </option>
 ))}
 </select>
 </div>

 {/* Date */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Data Inizio *
 </label>
 <input
  type="date"
  name="data_inizio"
  value={formData.data_inizio}
  onChange={handleInputChange}
  required
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Data Fine *
 </label>
 <input
  type="date"
  name="data_fine"
  value={formData.data_fine}
  onChange={handleInputChange}
  required
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </div>
 </div>

 {/* Note */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Note Aggiuntive
 </label>
 <textarea
  name="note"
  value={formData.note}
  onChange={handleInputChange}
  rows={2}
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  placeholder="Note aggiuntive (opzionale)"
 />
 </div>

 {error && (
 <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
 {error}
 </div>
 )}

 {/* Actions */}
 <div className="flex justify-end space-x-3">
 <button
  type="button"
  onClick={onClose}
  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
 >
  Annulla
 </button>
 <button
  type="submit"
  disabled={loading}
  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {loading ? (
 <>
 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
 Creazione...
 </>
 ) : (
 'Crea Richiesta'
 )}
 </button>
 </div>
 </form>
 </div>
 </div>
 );
};

export default NewRequestModal;

