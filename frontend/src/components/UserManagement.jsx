import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

const UserManagement = () => {
 const [users, setUsers] = useState([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [showAddModal, setShowAddModal] = useState(false);
 const [showEditModal, setShowEditModal] = useState(false);
 const [editingUser, setEditingUser] = useState(null);
 const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
 const [resetUser, setResetUser] = useState(null);
 const { token } = useAuth();

 const [formData, setFormData] = useState({
 name: '',
 surname: '',
 email: '',
 matricola: '',
 corso_accademico: '',
 phone: '',
 password: ''
 });

 const [resetData, setResetData] = useState({
 newPassword: '',
 confirmPassword: ''
 });

 const corsiAccademici = [
 'Cinema e Audiovisivi',
 'Design', 
 'Fashion Design',
 'Fotografia',
 'Graphic Design & Multimedia',
 'Interior Design',
 'Pittura',
 'Regia e Videomaking'
 ];

 useEffect(() => {
 fetchUsers();
 }, []);

 const fetchUsers = async () => {
 try {
 setLoading(true);
 const response = await fetch('/api/auth/users', {
 headers: {
 'Authorization': `Bearer ${token}`
 }
 });
 
 if (!response.ok) {
 throw new Error('Errore nel caricamento utenti');
 }
 
 const data = await response.json();
 setUsers(data);
 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };

 const handleInputChange = (e) => {
 const { name, value } = e.target;
 setFormData(prev => ({
 ...prev,
 [name]: value
 }));
 };

 const handleResetInputChange = (e) => {
 const { name, value } = e.target;
 setResetData(prev => ({
 ...prev,
 [name]: value
 }));
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 try {
 setError(null);
 
 const response = await fetch('/api/auth/register', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify(formData)
 });

 if (!response.ok) {
 const errorData = await response.json();
 throw new Error(errorData.error || 'Errore nella creazione utente');
 }

 await fetchUsers();
 setShowAddModal(false);
 setFormData({
 name: '',
 surname: '',
 email: '',
 matricola: '',
 corso_accademico: '',
 phone: '',
 password: ''
 });
 } catch (err) {
 setError(err.message);
 }
 };

 const handlePasswordReset = async (e) => {
 e.preventDefault();
 if (resetData.newPassword !== resetData.confirmPassword) {
 setError('Le password non coincidono');
 return;
 }

 try {
 setError(null);
 
 const response = await fetch(`/api/auth/users/${resetUser.id}/reset-password`, {
 method: 'PUT',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({ newPassword: resetData.newPassword })
 });

 if (!response.ok) {
 const errorData = await response.json();
 throw new Error(errorData.error || 'Errore nel reset password');
 }

 setShowPasswordResetModal(false);
 setResetUser(null);
 setResetData({ newPassword: '', confirmPassword: '' });
 
 // Mostra notifica di successo
 if ('Notification' in window && Notification.permission === 'granted') {
 new Notification('Password Reset', {
 body: `Password resettata per ${resetUser.name} ${resetUser.surname}`,
 icon: '/favicon.ico'
 });
 }
 } catch (err) {
 setError(err.message);
 }
 };

 const openPasswordReset = (user) => {
 setResetUser(user);
 setShowPasswordResetModal(true);
 };

 const openEditModal = (user) => {
 setEditingUser(user);
 setFormData({
 name: user.name,
 surname: user.surname,
 email: user.email,
 matricola: user.matricola,
 corso_accademico: user.corso_accademico || '',
 phone: user.phone || ''
 });
 setShowEditModal(true);
 };

 const handleEditSubmit = async (e) => {
 e.preventDefault();
 try {
 setError(null);
 
 const response = await fetch(`/api/auth/users/${editingUser.id}`, {
 method: 'PUT',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify(formData)
 });

 if (!response.ok) {
 const errorData = await response.json();
 throw new Error(errorData.error || 'Errore nell\'aggiornamento utente');
 }

 await fetchUsers();
 setShowEditModal(false);
 setEditingUser(null);
 } catch (err) {
 setError(err.message);
 }
 };

 const handleDeleteUser = async (userId) => {
 if (!confirm('Sei sicuro di voler eliminare questo utente?')) {
 return;
 }

 try {
 const response = await fetch(`/api/auth/users/${userId}`, {
 method: 'DELETE',
 headers: {
 'Authorization': `Bearer ${token}`
 }
 });

 if (!response.ok) {
 const errorData = await response.json();
 throw new Error(errorData.error || 'Errore nell\'eliminazione utente');
 }

 await fetchUsers();
 } catch (err) {
 setError(err.message);
 }
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
 <span className="ml-2 text-gray-600">Caricamento utenti...</span>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex justify-between items-center">
 <div>
 <h1 className="text-2xl font-bold text-gray-900">Gestione Utenti</h1>
 <p className="text-gray-600 ">Gestisci gli utenti del sistema</p>
 </div>
 <button
 onClick={() => setShowAddModal(true)}
 className="btn-primary"
 >
 <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
 </svg>
 Nuovo Utente
 </button>
 </div>

 {/* Error Message */}
 {error && (
 <div className="bg-red-50 /20 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
 {error}
 </div>
 )}

 {/* Users Table */}
 <div className="bg-white rounded-lg shadow-lg overflow-hidden">
 <div className="overflow-x-auto shadow-sm ring-1 ring-black ring-opacity-5 rounded-lg">
 <table className="min-w-full divide-y divide-gray-200 ">
 <thead className="bg-gradient-to-r from-gray-50 to-gray-100 ">
 <tr>
 <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
 Nome
 </th>
 <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
 Email
 </th>
 <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
 Matricola
 </th>
 <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
 Corso
 </th>
 <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
 Ruolo
 </th>
 <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
 Azioni
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200 ">
 {users.map((user, index) => (
 <tr key={user.id} className={`hover:bg-gray-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white ' : 'bg-gray-50 '}`}>
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="flex items-center">
 <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
 {user.name.charAt(0)}{user.surname.charAt(0)}
 </div>
 <div className="ml-3">
 <div className="text-sm font-medium text-gray-900 ">
 {user.name} {user.surname}
 </div>
 </div>
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 ">
 {user.email}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 ">
 {user.matricola}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 ">
 {user.corso_accademico || '-'}
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
 user.ruolo === 'admin' 
 ? 'bg-red-100 text-red-800 '
 : 'bg-green-100 text-green-800 '
 }`}>
 {user.ruolo === 'admin' ? 'Amministratore' : 'Utente'}
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
 <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
 <button
 onClick={() => openEditModal(user)}
 className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors duration-200"
 >
 <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
 </svg>
 Modifica
 </button>
 <button
 onClick={() => openPasswordReset(user)}
 className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-100 rounded-md hover:bg-orange-200 transition-colors duration-200"
 >
 <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
 </svg>
 Reset
 </button>
 {user.ruolo !== 'admin' && (
 <button
 onClick={() => handleDeleteUser(user.id)}
 className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors duration-200"
 >
 <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
 </svg>
 Elimina
 </button>
 )}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* Add User Modal */}
 {showAddModal && (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
 <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
 <div className="p-6">
 <div className="flex justify-between items-center mb-4">
 <h3 className="text-lg font-semibold text-gray-900 ">Nuovo Utente</h3>
 <button
 onClick={() => setShowAddModal(false)}
 className="text-gray-400 hover:text-gray-600 "
 >
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>

 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Nome *
 </label>
 <input
 type="text"
 name="name"
 required
 value={formData.name}
 onChange={handleInputChange}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 "
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Cognome *
 </label>
 <input
 type="text"
 name="surname"
 required
 value={formData.surname}
 onChange={handleInputChange}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 "
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Email *
 </label>
 <input
 type="email"
 name="email"
 required
 value={formData.email}
 onChange={handleInputChange}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 "
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Matricola *
 </label>
 <input
 type="text"
 name="matricola"
 required
 value={formData.matricola}
 onChange={handleInputChange}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 "
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Telefono
 </label>
 <input
 type="tel"
 name="phone"
 value={formData.phone}
 onChange={handleInputChange}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 "
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Corso Accademico
 </label>
 <select
 name="corso_accademico"
 value={formData.corso_accademico}
 onChange={handleInputChange}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 "
 >
 <option value="">Seleziona corso</option>
 {corsiAccademici.map(corso => (
 <option key={corso} value={corso}>{corso}</option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Password *
 </label>
 <input
 type="password"
 name="password"
 required
 value={formData.password}
 onChange={handleInputChange}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 "
 />
 </div>

 <div className="flex justify-end space-x-3 pt-4">
 <button
 type="button"
 onClick={() => setShowAddModal(false)}
 className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
 >
 Annulla
 </button>
 <button
 type="submit"
 className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
 >
 Crea Utente
 </button>
 </div>
 </form>
 </div>
 </div>
 </div>
 )}

 {/* Edit User Modal */}
 {showEditModal && editingUser && (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
 <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
 <div className="p-6">
 <div className="flex justify-between items-center mb-4">
 <h3 className="text-lg font-semibold text-gray-900 ">
 Modifica Utente - {editingUser.name} {editingUser.surname}
 </h3>
 <button
 onClick={() => setShowEditModal(false)}
 className="text-gray-400 hover:text-gray-600 "
 >
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>

 <form onSubmit={handleEditSubmit} className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Nome *
 </label>
 <input
 type="text"
 name="name"
 required
 value={formData.name}
 onChange={handleInputChange}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 "
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Cognome *
 </label>
 <input
 type="text"
 name="surname"
 required
 value={formData.surname}
 onChange={handleInputChange}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 "
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Email *
 </label>
 <input
 type="email"
 name="email"
 required
 value={formData.email}
 onChange={handleInputChange}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 "
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Matricola *
 </label>
 <input
 type="text"
 name="matricola"
 required
 value={formData.matricola}
 onChange={handleInputChange}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 "
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Telefono
 </label>
 <input
 type="tel"
 name="phone"
 value={formData.phone}
 onChange={handleInputChange}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 "
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Corso Accademico
 </label>
 <select
 name="corso_accademico"
 value={formData.corso_accademico}
 onChange={handleInputChange}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 "
 >
 <option value="">Seleziona corso</option>
 {corsiAccademici.map(corso => (
 <option key={corso} value={corso}>{corso}</option>
 ))}
 </select>
 </div>


 <div className="flex justify-end space-x-3 pt-4">
 <button
 type="button"
 onClick={() => setShowEditModal(false)}
 className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
 >
 Annulla
 </button>
 <button
 type="submit"
 className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
 >
 Salva Modifiche
 </button>
 </div>
 </form>
 </div>
 </div>
 </div>
 )}

 {/* Password Reset Modal */}
 {showPasswordResetModal && resetUser && (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
 <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
 <div className="p-6">
 <div className="flex justify-between items-center mb-4">
 <h3 className="text-lg font-semibold text-gray-900 ">
 Reset Password - {resetUser.name} {resetUser.surname}
 </h3>
 <button
 onClick={() => setShowPasswordResetModal(false)}
 className="text-gray-400 hover:text-gray-600 "
 >
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>

 <form onSubmit={handlePasswordReset} className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Nuova Password *
 </label>
 <input
 type="password"
 name="newPassword"
 required
 value={resetData.newPassword}
 onChange={handleResetInputChange}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 "
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Conferma Password *
 </label>
 <input
 type="password"
 name="confirmPassword"
 required
 value={resetData.confirmPassword}
 onChange={handleResetInputChange}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 "
 />
 </div>

 <div className="flex justify-end space-x-3 pt-4">
 <button
 type="button"
 onClick={() => setShowPasswordResetModal(false)}
 className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
 >
 Annulla
 </button>
 <button
 type="submit"
 className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-200"
 >
 Reset Password
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

export default UserManagement;



