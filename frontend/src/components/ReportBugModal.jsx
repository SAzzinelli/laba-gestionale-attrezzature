import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

const ReportBugModal = ({ isOpen, onClose, onSuccess, prefillData = {} }) => {
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState(null);
 const [formData, setFormData] = useState({
 tipo: 'guasto',
 messaggio: '',
 inventario_id: null
 });
 const { token, user } = useAuth();

 useEffect(() => {
 if (isOpen) {
 setFormData({
 tipo: 'guasto',
 messaggio: prefillData.messaggio || '',
 inventario_id: prefillData.inventario_id || null
 });
 setError(null);
 }
 }, [isOpen, prefillData]);

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

 try {
 const response = await fetch('/api/segnalazioni', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({
 ...formData,
 user_id: user.id
 })
 });

 if (!response.ok) {
 const errorData = await response.json();
 throw new Error(errorData.error || 'Errore nella creazione della segnalazione');
 }

 onSuccess();
 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
 <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
 {/* Header */}
 <div className="flex items-center justify-between p-6 border-b border-gray-200">
 <h2 className="text-xl font-semibold text-gray-900">Segnala Guasto</h2>
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
 {/* Tipo */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Tipo di Segnalazione *
 </label>
 <select
 name="tipo"
 value={formData.tipo}
 onChange={handleInputChange}
 required
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus-visible transition-all duration-200"
 >
 <option value="guasto">Guasto</option>
 <option value="ritardo">Ritardo</option>
 <option value="assistenza">Assistenza</option>
 </select>
 </div>

 {/* Messaggio */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Descrizione del Problema *
 </label>
 <textarea
 name="messaggio"
 value={formData.messaggio}
 onChange={handleInputChange}
 required
 rows={4}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus-visible transition-all duration-200"
 placeholder="Descrivi il problema in dettaglio..."
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
 className="btn-secondary hover-lift focus-visible"
 >
 Annulla
 </button>
 <button
 type="submit"
 disabled={loading}
 className="btn-danger hover-lift focus-visible disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {loading ? (
 <>
 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
 Invio...
 </>
 ) : (
 'Invia Segnalazione'
 )}
 </button>
 </div>
 </form>
 </div>
 </div>
 );
};

export default ReportBugModal;
