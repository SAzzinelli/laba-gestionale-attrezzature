import React, { useState } from 'react';

const ForgotPassword = ({ onBack }) => {
 const [email, setEmail] = useState('');
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState(null);
 const [success, setSuccess] = useState(false);

 const handleSubmit = async (e) => {
 e.preventDefault();
 if (!email) {
 setError('Inserisci la tua email');
 return;
 }

 try {
 setLoading(true);
 setError(null);

 const response = await fetch('/api/auth/forgot-password', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({ email })
 });

 if (response.ok) {
 setSuccess(true);
 } else {
 const errorData = await response.json();
 setError(errorData.error || 'Errore nell\'invio della richiesta');
 }
 } catch (err) {
 setError('Errore di connessione. Riprova più tardi.');
 } finally {
 setLoading(false);
 }
 };

 if (success) {
 return (
 <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
 <div className="max-w-md w-full">
 <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
 <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
 <svg className="w-8 h-8 text-green-600 " fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
 </svg>
 </div>
 <h2 className="text-2xl font-bold text-gray-900 mb-4">
 Richiesta Inviata!
 </h2>
 <p className="text-gray-600 mb-6">
 La tua richiesta di reset password è stata inviata all'amministratore. 
 Riceverai una notifica quando la password sarà stata resettata.
 </p>
 <button
 onClick={onBack}
 className="w-full bg-gradient-to-r from-sky-400 to-[#033157] text-white py-3 px-4 rounded-lg hover:from-sky-500 hover:to-[#022a47] transition-all duration-200 font-medium"
 >
 Torna al Login
 </button>
 </div>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
 <div className="max-w-md w-full">
 <div className="bg-white rounded-2xl shadow-xl p-8">
 <div className="text-center mb-8">
 <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
 <svg className="w-8 h-8 text-orange-600 " fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
 </svg>
 </div>
 <h2 className="text-2xl font-bold text-gray-900 mb-2">
 Reset Password
 </h2>
 <p className="text-gray-600 ">
 Inserisci la tua email per richiedere il reset della password
 </p>
 </div>

 {error && (
 <div className="mb-6 p-4 bg-red-50 /20 border border-red-200 rounded-lg">
 <div className="flex items-center">
 <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 <p className="text-red-800 text-sm">{error}</p>
 </div>
 </div>
 )}

 <form onSubmit={handleSubmit} className="space-y-6">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Email *
 </label>
 <input
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 required
 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
 placeholder="Inserisci la tua email"
 />
 </div>

 <button
 type="submit"
 disabled={loading}
 className="w-full bg-gradient-to-r from-sky-400 to-[#033157] text-white py-3 px-4 rounded-lg hover:from-sky-500 hover:to-[#022a47] focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
 >
 {loading ? (
 <div className="flex items-center justify-center">
 <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
 </svg>
 Invio in corso...
 </div>
 ) : (
 'Richiedi Reset Password'
 )}
 </button>
 </form>

 <div className="mt-6 text-center">
 <button
 onClick={onBack}
 className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
 >
 ← Torna al Login
 </button>
 </div>
 </div>
 </div>
 </div>
 );
};

export default ForgotPassword;
