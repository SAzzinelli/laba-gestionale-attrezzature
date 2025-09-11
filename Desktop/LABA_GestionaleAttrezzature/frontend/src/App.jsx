import React, { useState, useEffect } from "react";
import AuthProvider, { useAuth } from "./auth/AuthContext";
import { NotificationProvider } from "./components/NotificationSystem.jsx";
import DesktopNotificationManager from "./components/DesktopNotificationManager.jsx";
import NotificationManager from "./components/NotificationManager.jsx";
// import { ThemeProvider, useTheme } from "./contexts/ThemeContext.jsx";
import { useRealtimeNotifications } from "./hooks/useRealtimeNotifications.js";
import Login from "./auth/Login";

import Dashboard from "./components/Dashboard.jsx";
import UserDashboard from "./components/UserDashboard.jsx";
import Inventory from "./components/Inventory.jsx";
import Loans from "./components/Loans.jsx";
import Repairs from "./components/Repairs.jsx";
import Statistics from "./components/Statistics.jsx";
import AdvancedStats from "./components/AdvancedStats.jsx";
import UserManagement from "./components/UserManagement.jsx";
import Footer from "./components/Footer.jsx";
import UserArea from "./user/UserArea.jsx";

// App principale con design moderno
function AppInner() {
 const [tab, setTab] = useState("dashboard");
 const [sidebarOpen, setSidebarOpen] = useState(false);
 const [searchQuery, setSearchQuery] = useState("");
 const [searchResults, setSearchResults] = useState([]);
 const [showSearchResults, setShowSearchResults] = useState(false);
 const { isAdmin, user } = useAuth();
 // const { isDark, toggleTheme } = useTheme();
 
 // Hook per notifiche in tempo reale
 useRealtimeNotifications();

 // Chiudi sidebar su resize
 useEffect(() => {
 const handleResize = () => {
 if (window.innerWidth >= 1024) {
 setSidebarOpen(false);
 }
 };
 window.addEventListener('resize', handleResize);
 return () => window.removeEventListener('resize', handleResize);
 }, []);

 // Global search function
 const handleGlobalSearch = async (query) => {
 setSearchQuery(query);
 if (query.length < 2) {
 setSearchResults([]);
 setShowSearchResults(false);
 return;
 }

 try {
 const { token } = useAuth();
 const searchPromises = [
 fetch(`/api/inventario?search=${encodeURIComponent(query)}`, {
 headers: { 'Authorization': `Bearer ${token}` }
 }),
 fetch(`/api/richieste?search=${encodeURIComponent(query)}`, {
 headers: { 'Authorization': `Bearer ${token}` }
 }),
 fetch(`/api/riparazioni?search=${encodeURIComponent(query)}`, {
 headers: { 'Authorization': `Bearer ${token}` }
 })
 ];

 const responses = await Promise.all(searchPromises);
 const results = [];

 // Process inventory results
 if (responses[0].ok) {
 const inventory = await responses[0].json();
 inventory.forEach(item => {
 results.push({
 type: 'inventario',
 title: item.nome,
 subtitle: `Seriale: ${item.seriale || 'N/A'}`,
 description: item.descrizione || 'Nessuna descrizione',
 id: item.id,
 category: 'Inventario'
 });
 });
 }

 // Process requests results
 if (responses[1].ok) {
 const requests = await responses[1].json();
 requests.forEach(request => {
 results.push({
 type: 'richieste',
 title: `Richiesta per ${request.oggetto_nome}`,
 subtitle: `Utente: ${request.utente_nome} ${request.utente_cognome}`,
 description: `Stato: ${request.stato}`,
 id: request.id,
 category: 'Richieste'
 });
 });
 }

 // Process repairs results
 if (responses[2].ok) {
 const repairs = await responses[2].json();
 repairs.forEach(repair => {
 results.push({
 type: 'riparazioni',
 title: `Riparazione ${repair.oggetto_nome}`,
 subtitle: `Stato: ${repair.stato}`,
 description: repair.descrizione || 'Nessuna descrizione',
 id: repair.id,
 category: 'Riparazioni'
 });
 });
 }

 setSearchResults(results);
 setShowSearchResults(true);
 } catch (error) {
 console.error('Errore nella ricerca:', error);
 setSearchResults([]);
 }
 };

 return (
 <div className="min-h-screen bg-gray-50 flex" onClick={() => setShowSearchResults(false)}>
 {/* Sidebar Mobile */}
 <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
 <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)}></div>
 <div className="relative flex flex-col w-64 h-full bg-white shadow-xl border-r border-gray-200">
 <div className="flex items-center justify-between p-4 border-b">
 <div className="flex items-center">
 <img src="/logoSito.svg" alt="LABA Logo" className="h-8 w-auto" />
 <span className="ml-2 text-xl font-bold text-gray-800">Gestione</span>
 </div>
 <button 
 onClick={() => setSidebarOpen(false)}
 className="p-2 rounded-lg hover:bg-gray-100"
 >
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>
 <nav className="flex-1 p-4 space-y-2">
 {isAdmin ? (
 <>
 <NavButton icon="📊" label="Dashboard" tab="dashboard" currentTab={tab} onClick={setTab} />
 <NavButton icon="📦" label="Inventario" tab="inventario" currentTab={tab} onClick={setTab} />
 <NavButton icon="📝" label="Prestiti" tab="prestiti" currentTab={tab} onClick={setTab} />
 <NavButton icon="🛠️" label="Riparazioni" tab="riparazioni" currentTab={tab} onClick={setTab} />
 <NavButton 
 icon={
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
 </svg>
 } 
 label="Gestione Utenti" 
 tab="utenti" 
 currentTab={tab} 
 onClick={setTab} 
 />
 <NavButton icon="📈" label="Statistiche" tab="statistiche" currentTab={tab} onClick={setTab} />
 </>
 ) : (
 <NavButton icon="👤" label="Area Utente" tab="utente" currentTab={tab} onClick={setTab} />
 )}
 </nav>
 <UserBadge />
 </div>
 </div>

 {/* Sidebar Desktop */}
 <div className="hidden lg:flex lg:flex-col lg:w-64 bg-white sidebar border-r border-gray-200">
 <div className="flex items-center justify-between p-6 border-b border-gray-200">
 <div className="flex items-center">
 <img src="/logoSito.svg" alt="LABA Logo" className="h-12 w-auto" />
 <div className="ml-3">
 <p className="text-sm text-gray-600">Gestione Attrezzature</p>
 </div>
 </div>
 {/* Theme toggle removed */}
 </div>
 
 {/* Global Search in Sidebar */}
 <div className="p-4 border-b border-gray-200">
 <div className="relative">
 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
 <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
 </svg>
 </div>
 <input
 type="text"
 placeholder="Cerca..."
 className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
 onChange={(e) => handleGlobalSearch(e.target.value)}
 />
 </div>
 </div>
 <nav className="flex-1 p-4 space-y-2">
 {isAdmin ? (
 <>
 <NavButton 
 icon={<svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} 
 label="Dashboard" 
 tab="dashboard" 
 currentTab={tab} 
 onClick={setTab} 
 />
 <NavButton 
 icon={<svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>} 
 label="Inventario" 
 tab="inventario" 
 currentTab={tab} 
 onClick={setTab} 
 />
 <NavButton 
 icon={<svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>} 
 label="Prestiti" 
 tab="prestiti" 
 currentTab={tab} 
 onClick={setTab} 
 />
 <NavButton 
 icon={<svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} 
 label="Riparazioni" 
 tab="riparazioni" 
 currentTab={tab} 
 onClick={setTab} 
 />
 <NavButton 
 icon={<svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} 
 label="Gestione Utenti" 
 tab="utenti" 
 currentTab={tab} 
 onClick={setTab} 
 />
 <NavButton 
 icon={<svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} 
 label="Statistiche" 
 tab="statistiche" 
 currentTab={tab} 
 onClick={setTab} 
 />
 </>
 ) : (
 <NavButton 
 icon={<svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} 
 label="Area Utente" 
 tab="utente" 
 currentTab={tab} 
 onClick={setTab} 
 />
 )}
</nav>
 <UserBadge />
 </div>

 {/* Main Content */}
 <div className="flex-1 flex flex-col min-h-screen">
 {/* Top Bar Mobile */}
 <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center space-x-3">
 <button 
 onClick={() => setSidebarOpen(true)}
 className="p-2 rounded-lg hover:bg-gray-100"
 >
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
 </svg>
 </button>
 <img src="/logoSito.svg" alt="LABA Logo" className="h-8 w-auto" />
 <h1 className="text-lg font-semibold text-gray-800">LABA</h1>
 </div>
 <div className="flex items-center space-x-2">
 {/* Global Search Mobile */}
 <div className="relative">
 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
 <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
 </svg>
 </div>
 <input
 type="text"
 placeholder="Cerca..."
 className="block w-48 pl-9 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
 onChange={(e) => handleGlobalSearch(e.target.value)}
 />
 </div>
 </div>
 </div>
 </div>

 {/* Search Results Dropdown */}
 {showSearchResults && searchResults.length > 0 && (
 <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
 <div className="p-4 border-b border-gray-200">
 <h3 className="text-sm font-medium text-gray-900">
 Risultati per "{searchQuery}" ({searchResults.length})
 </h3>
 </div>
 <div className="divide-y divide-gray-200">
 {searchResults.map((result, index) => (
 <div
 key={`${result.type}-${result.id}-${index}`}
 className="p-4 hover:bg-gray-50 cursor-pointer"
 onClick={() => {
 setTab(result.type);
 setShowSearchResults(false);
 setSearchQuery("");
 }}
 >
 <div className="flex items-start">
 <div className="flex-shrink-0">
 <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
 result.type === 'inventario' ? 'bg-blue-100 text-blue-600' :
 result.type === 'richieste' ? 'bg-green-100 text-green-600' :
 'bg-orange-100 text-orange-600'
 }`}>
 {result.type === 'inventario' ? '📦' : 
 result.type === 'richieste' ? '📝' : '🔧'}
 </div>
 </div>
 <div className="ml-3 flex-1">
 <p className="text-sm font-medium text-gray-900">{result.title}</p>
 <p className="text-sm text-gray-500">{result.subtitle}</p>
 <p className="text-xs text-gray-400 mt-1">{result.description}</p>
 <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mt-1">
 {result.category}
 </span>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Content */}
 <main className="flex-1 p-4 lg:p-6 main-content">
 <div className="max-w-7xl mx-auto">
 {isAdmin ? (
 <>
 {tab === 'dashboard' && <Dashboard onNavigate={setTab} />}
 {tab === 'inventario' && <Inventory />}
 {tab === 'prestiti' && <Loans />}
 {tab === 'riparazioni' && <Repairs />}
 {tab === 'utenti' && <UserManagement />}
 {tab === 'statistiche' && <Statistics />}
 </>
 ) : (
 <UserDashboard onNavigate={setTab} />
 )}
 </div>
 </main>

 <Footer />
 {/* <NotificationManager /> */}
 </div>
 </div>
 );
}

// Componente per i pulsanti di navigazione
function NavButton({ icon, label, tab, currentTab, onClick }) {
 const isActive = currentTab === tab;
 return (
 <button
 onClick={() => {
 onClick(tab);
 // Chiudi sidebar mobile dopo la selezione
 if (window.innerWidth < 1024) {
 setTimeout(() => {
 const event = new Event('resize');
 window.dispatchEvent(event);
 }, 100);
 }
 }}
 className={`nav-button ${isActive ? 'active' : ''}`}
 >
 {icon}
 <span>{label}</span>
 </button>
 );
}

// Badge utente
function UserBadge() {
 const { user, logout, isAdmin } = useAuth();
 if (!user) return null;
 
 const initials = (user.name?.[0] || "?") + (user.surname?.[0] || "");
 
 return (
 <div className="p-4 border-t border-gray-200">
 <div className="flex items-center space-x-3 mb-3">
 <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
 <span className="text-white font-semibold text-sm">{initials}</span>
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-gray-800 truncate">
 {user.name} {user.surname}
 </p>
 <p className="text-xs text-gray-500 truncate">
 {isAdmin ? "Amministratore" : "Utente"} • {user.email}
 </p>
 </div>
 </div>
 <button 
 onClick={logout}
 className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200 border border-gray-200 "
 >
 <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
 </svg>
 Esci
 </button>
 </div>
 );
}

function Gate() {
 const { isAuthenticated } = useAuth();
 if (!isAuthenticated) return <Login branding="LABA – Gestione Attrezzature" />;
 return <AppInner />;
}

export default function App() {
 return (
 <AuthProvider>
 <Gate />
 </AuthProvider>
 );
}