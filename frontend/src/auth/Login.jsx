import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import ForgotPassword from './ForgotPassword';

const Login = ({ branding = "LABA Gestione" }) => {
 const [isLogin, setIsLogin] = useState(true);
 const [formData, setFormData] = useState({
 email: '',
 username: '',
 password: '',
 name: '',
 surname: '',
 matricola: '',
 corso_accademico: ''
 });
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState(null);
 const [showForgotPassword, setShowForgotPassword] = useState(false);
 const { login, register } = useAuth();

 const handleSubmit = async (e) => {
 e.preventDefault();
 setLoading(true);
 setError(null);

 try {
 if (isLogin) {
 // Per admin usa username, per utenti usa email
 const identifier = formData.username || formData.email;
 await login(identifier, formData.password);
 } else {
 await register(formData);
 }
 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };

 const handleForgotPassword = () => {
 setShowForgotPassword(true);
 };

 const handleInputChange = (e) => {
 setFormData({
 ...formData,
 [e.target.name]: e.target.value
 });
 };

 if (showForgotPassword) {
 return <ForgotPassword onBack={() => setShowForgotPassword(false)} />;
 }

 return (
 <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
 <div className="max-w-md w-full space-y-6">
 {/* Header */}
 <div className="text-center">
 <div className="mx-auto h-20 w-48 flex items-center justify-center">
 <img src="/logoSito.svg" alt="LABA Logo" className="h-16 w-auto drop-shadow-sm" />
 </div>
 <h2 className="mt-6 text-2xl font-bold text-gray-900 tracking-tight">
 {isLogin ? 'Accedi' : 'Registrati'}
 </h2>
 <p className="mt-2 text-sm text-gray-600">
 {isLogin 
   ? 'Accedi al tuo account per gestire il Service Attrezzatura'
   : 'Crea un nuovo account per accedere al sistema'
 }
 </p>
 </div>

 {/* Form */}
 <div className="bg-white rounded-2xl shadow-xl border border-gray-100 py-8 px-6 sm:px-10">
 <form className="space-y-6" onSubmit={handleSubmit}>
 {/* Username/Email */}
 <div>
 <label htmlFor={isLogin ? "username" : "email"} className="block text-sm font-medium text-gray-700 ">
 {isLogin ? "Username o Email *" : "Email *"}
 </label>
 <div className="mt-1">
 <input
 id={isLogin ? "username" : "email"}
 name={isLogin ? "username" : "email"}
 type={isLogin ? "text" : "email"}
 autoComplete={isLogin ? "username" : "email"}
 required
 value={isLogin ? formData.username : formData.email}
 onChange={handleInputChange}
 className="appearance-none block w-full px-4 py-2.5 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50/50 text-gray-900 transition-all duration-200"
 placeholder={isLogin ? "Inserisci username o email" : "Inserisci email"}
 />
 </div>
 </div>

 {/* Password */}
 <div>
 <label htmlFor="password" className="block text-sm font-medium text-gray-700 ">
 Password *
 </label>
 <div className="mt-1">
 <input
 id="password"
 name="password"
 type="password"
 autoComplete={isLogin ? "current-password" : "new-password"}
 required
 value={formData.password}
 onChange={handleInputChange}
 className="appearance-none block w-full px-4 py-2.5 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50/50 text-gray-900 transition-all duration-200"
 placeholder="Inserisci la password"
 />
 </div>
 </div>

 {/* Registration Fields */}
 {!isLogin && (
 <>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label htmlFor="name" className="block text-sm font-medium text-gray-700 ">
 Nome *
 </label>
 <div className="mt-1">
 <input
 id="name"
 name="name"
 type="text"
 autoComplete="given-name"
 required
 value={formData.name}
 onChange={handleInputChange}
 className="appearance-none block w-full px-4 py-2.5 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50/50 text-gray-900 transition-all duration-200"
 placeholder="Nome"
 />
 </div>
 </div>
 <div>
 <label htmlFor="surname" className="block text-sm font-medium text-gray-700 ">
 Cognome *
 </label>
 <div className="mt-1">
 <input
 id="surname"
 name="surname"
 type="text"
 autoComplete="family-name"
 required
 value={formData.surname}
 onChange={handleInputChange}
 className="appearance-none block w-full px-4 py-2.5 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50/50 text-gray-900 transition-all duration-200"
 placeholder="Cognome"
 />
 </div>
 </div>
 </div>

 <div>
 <label htmlFor="matricola" className="block text-sm font-medium text-gray-700 ">
 Matricola *
 </label>
 <div className="mt-1">
 <input
 id="matricola"
 name="matricola"
 type="text"
 required
 value={formData.matricola}
 onChange={handleInputChange}
 className="appearance-none block w-full px-4 py-2.5 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50/50 text-gray-900 transition-all duration-200"
 placeholder="Numero di matricola"
 />
 </div>
 </div>

 <div>
 <label htmlFor="corso_accademico" className="block text-sm font-medium text-gray-700 ">
 Corso Accademico *
 </label>
 <div className="mt-1">
 <select
 id="corso_accademico"
 name="corso_accademico"
 required
 value={formData.corso_accademico}
 onChange={handleInputChange}
 className="appearance-none block w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50/50 text-gray-900 transition-all duration-200"
 >
 <option value="">Seleziona corso</option>
 <option value="Cinema e Audiovisivi">Cinema e Audiovisivi</option>
 <option value="Design">Design</option>
 <option value="Fashion Design">Fashion Design</option>
 <option value="Fotografia">Fotografia</option>
 <option value="Graphic Design & Multimedia">Graphic Design & Multimedia</option>
 <option value="Interior Design">Interior Design</option>
 <option value="Pittura">Pittura</option>
 <option value="Regia e Videomaking">Regia e Videomaking</option>
 </select>
 </div>
 </div>
 </>
 )}

 {/* Error Message */}
 {error && (
 <div className="bg-red-50 border border-red-200 rounded-lg p-4">
 <div className="flex">
 <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 <p className="text-red-800 text-sm">{error}</p>
 </div>
 </div>
 )}

 {/* Submit Button */}
 <div>
 <button
 type="submit"
 disabled={loading}
 className="group relative w-full flex justify-center py-4 px-6 border border-transparent text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
 >
 {loading ? (
 <div className="flex items-center">
 <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
 </svg>
 {isLogin ? 'Accesso in corso...' : 'Registrazione in corso...'}
 </div>
 ) : (
 <div className="flex items-center">
 <span className="mr-2">{isLogin ? 'Accedi' : 'Registrati'}</span>
 <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
 </svg>
 </div>
 )}
 </button>
 </div>

 {/* Forgot Password Link */}
 {isLogin && (
 <div className="text-center">
 <button
 type="button"
 onClick={handleForgotPassword}
 className="text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200"
 >
 Password dimenticata?
 </button>
 </div>
 )}

 {/* Toggle Login/Register */}
 <div className="text-center pt-1">
 <button
 type="button"
 onClick={() => {
 setIsLogin(!isLogin);
 setError(null);
 setFormData({
 email: '',
 password: '',
 name: '',
 surname: '',
 matricola: '',
 corso_accademico: ''
 });
 }}
 className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
 >
 {isLogin 
   ? 'Non hai un account? Registrati' 
   : 'Hai già un account? Accedi'
 }
 </button>
 </div>
 </form>
 </div>

 {/* Istruzioni - sotto il registrati */}
 <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100 p-5 shadow-sm">
 <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
 <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 Istruzioni
 </h3>
 <ul className="text-xs text-gray-600 space-y-2">
 <li><strong>Cos'è:</strong> Sistema per prenotare attrezzature LABA (fotocamere, luci, ecc.)</li>
 <li><strong>Account:</strong> Non è quello dell'app LABA Firenze. Crea un nuovo account con &quot;Registrati&quot;</li>
 <li><strong>Come noleggiare:</strong> Articoli Disponibili → scegli unità → date (dal giorno dopo) → invia richiesta</li>
 <li><strong>Strike:</strong> Ritardi = 1 strike/giorno. 3 strike = blocco account</li>
 </ul>
 </div>

 {/* Footer */}
 <div className="text-center">
 <p className="text-xs text-gray-500">
 © 2026 {branding}. Tutti i diritti riservati.
 </p>
 </div>
 </div>
 </div>
 );
};

export default Login;