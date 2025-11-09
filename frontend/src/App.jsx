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
import SystemStatus from "./components/SystemStatus.jsx";
import UserManagement from "./components/UserManagement.jsx";
import NotificationsPanel from "./components/NotificationsPanel.jsx";
import Footer from "./components/Footer.jsx";
import UserArea from "./user/UserArea.jsx";
import MobileMenu from "./components/MobileMenu.jsx";

// App principale con design moderno
function AppInner() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedRequestFromNotification, setSelectedRequestFromNotification] = useState(null);
  
  // Admin sidebar items for mobile menu
  const adminSidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
    { id: 'inventario', label: 'Inventario', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
    { id: 'prestiti', label: 'Prestiti', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg> },
    { id: 'riparazioni', label: 'Riparazioni', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { id: 'utenti', label: 'Utenti', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg> },
    { id: 'statistiche', label: 'Statistiche', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
    { id: 'sistema', label: 'Stato del Sistema', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> }
  ];
  
  const [notifications, setNotifications] = useState([]);
  const { isAdmin, user, logout, token } = useAuth();
 // const { isDark, toggleTheme } = useTheme();
 
 // Hook per notifiche in tempo reale
 useRealtimeNotifications();

 // Fetch real notifications
 const fetchNotifications = async () => {
   if (!token) return;
   
   try {
     // Load recent requests and alerts
     const [requestsRes, alertsRes] = await Promise.all([
       fetch(`${import.meta.env.VITE_API_BASE_URL}/api/richieste?all=1`, {
         headers: { 'Authorization': `Bearer ${token}` }
       }),
       fetch(`${import.meta.env.VITE_API_BASE_URL}/api/avvisi`, {
         headers: { 'Authorization': `Bearer ${token}` }
       })
     ]);

     if (requestsRes.ok && alertsRes.ok) {
       const [requestsData, alertsData] = await Promise.all([
         requestsRes.json(),
         alertsRes.json()
       ]);

       // Generate real notifications
       const realNotifications = [];
       let notificationId = 1;

       // New pending requests (last 24 hours)
       const pendingRequests = requestsData.filter(req => 
         req.stato === 'in_attesa' && 
         new Date(req.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
       );

       pendingRequests.forEach(request => {
         realNotifications.push({
           id: notificationId++,
           title: 'Nuova Richiesta',
           message: `${request.utente_nome} ${request.utente_cognome} ha richiesto ${request.oggetto_nome}`,
           time: getTimeAgo(request.created_at),
           isRead: false,
           type: 'info',
           data: { type: 'request', id: request.id, requestData: request }
         });
       });

       // Overdue loans
       if (alertsData.prestiti_scaduti) {
         alertsData.prestiti_scaduti.forEach(loan => {
           realNotifications.push({
             id: notificationId++,
             title: 'Prestito Scaduto',
             message: `${loan.oggetto_nome} di ${loan.utente_nome} è scaduto`,
             time: getTimeAgo(loan.data_rientro),
             isRead: false,
             type: 'warning',
             data: { type: 'loan', id: loan.id, loanData: loan }
           });
         });
       }

       // Low stock alerts
       if (alertsData.scorte_basse) {
         alertsData.scorte_basse.forEach(item => {
           realNotifications.push({
             id: notificationId++,
             title: 'Scorte Basse',
             message: `${item.nome}: solo ${item.unita_disponibili} disponibili`,
             time: 'Ora',
             isRead: false,
             type: 'warning',
             data: { type: 'inventory', id: item.id, itemData: item }
           });
         });
       }

       setNotifications(realNotifications);
     }
   } catch (error) {
     console.error('Errore nel caricamento notifiche:', error);
   }
 };

 // Helper function for time ago
 const getTimeAgo = (dateString) => {
   if (!dateString) return 'Ora';
   const now = new Date();
   const date = new Date(dateString);
   const diffInMinutes = Math.floor((now - date) / (1000 * 60));
   
   if (diffInMinutes < 1) return 'Ora';
   if (diffInMinutes < 60) return `${diffInMinutes} min fa`;
   
   const diffInHours = Math.floor(diffInMinutes / 60);
   if (diffInHours < 24) return `${diffInHours} ore fa`;
   
   const diffInDays = Math.floor(diffInHours / 24);
   return `${diffInDays} giorni fa`;
 };

 // Load notifications on component mount and token change
 useEffect(() => {
   if (token && isAdmin) {
     fetchNotifications();
     // Refresh every 5 minutes
     const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
     return () => clearInterval(interval);
   }
 }, [token, isAdmin]);

 // Listener per navigazione dal footer
 useEffect(() => {
   const handleNavigateToSystem = () => {
     console.log('Admin: Received navigateToSystemAdmin event');
     setTab('sistema');
   };
   
   window.addEventListener('navigateToSystemAdmin', handleNavigateToSystem);
   
   return () => {
     window.removeEventListener('navigateToSystemAdmin', handleNavigateToSystem);
   };
 }, []);

 // Funzioni per gestire le notifiche
 const unreadCount = notifications.filter(n => !n.isRead).length;

 const handleMarkAsRead = (id) => {
   setNotifications(prev => 
     prev.map(notif => 
       notif.id === id ? { ...notif, isRead: true } : notif
     )
   );
 };

 const handleDeleteNotification = (id) => {
   setNotifications(prev => prev.filter(notif => notif.id !== id));
 };

  const handleNotificationClick = (notification) => {
    if (notification.data) {
      switch (notification.data.type) {
        case 'request':
          // Navigate to loans page and show request details
          setTab('prestiti');
          setSelectedRequestFromNotification(notification.data);
          setNotificationsOpen(false);
          break;
        case 'loan':
          // Navigate to loans page and show loan details
          setTab('prestiti');
          setNotificationsOpen(false);
          break;
        case 'inventory':
          // Navigate to inventory page
          setTab('inventario');
          setNotificationsOpen(false);
          break;
        default:
          break;
      }
    }
    // Mark as read
    handleMarkAsRead(notification.id);
  };

 // Gestione URL per la navigazione
 const getCurrentTab = () => {
   const path = window.location.pathname;
   if (path === '/' || path === '/dashboard') return 'dashboard';
   if (path === '/inventario') return 'inventario';
   if (path === '/prestiti') return 'prestiti';
   if (path === '/riparazioni') return 'riparazioni';
   if (path === '/utenti') return 'utenti';
   if (path === '/statistiche') return 'statistiche';
   if (path === '/sistema') return 'sistema';
   if (path === '/utente') return 'utente';
   return 'dashboard';
 };

 const [tab, setTab] = useState(getCurrentTab());

 // Funzione per cambiare tab e aggiornare URL
 const handleTabChange = (newTab) => {
   setTab(newTab);
   const path = newTab === 'dashboard' ? '/' : `/${newTab}`;
   window.history.pushState({}, '', path);
 };

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

 // Gestione popstate per il back/forward del browser
 useEffect(() => {
   const handlePopState = () => {
     setTab(getCurrentTab());
   };
   window.addEventListener('popstate', handlePopState);
   return () => window.removeEventListener('popstate', handlePopState);
 }, []);


 return (
 <div className="min-h-screen bg-gray-50 flex">
 {/* Sidebar Mobile */}
 <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
 <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)}></div>
 <div className="relative flex flex-col w-64 h-full bg-white shadow-xl border-r border-gray-200">
 <div className="flex items-center justify-between p-4 border-b">
 <div 
   className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
   onClick={() => handleTabChange('dashboard')}
 >
 <img src="/logoSito.svg" alt="LABA Logo" className="h-8 w-auto" />
 </div>
 <button 
 onClick={() => setSidebarOpen(false)}
 className="p-2 rounded-lg hover:bg-gray-100"
 >
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>
 <nav className="flex-1 p-4 space-y-2">
 {isAdmin ? (
 <>
 <NavButton icon="📊" label="Dashboard" tab="dashboard" currentTab={tab} onClick={handleTabChange} />
 <NavButton icon="📦" label="Inventario" tab="inventario" currentTab={tab} onClick={handleTabChange} />
 <NavButton icon="📝" label="Prestiti" tab="prestiti" currentTab={tab} onClick={handleTabChange} />
 <NavButton icon="🛠️" label="Riparazioni" tab="riparazioni" currentTab={tab} onClick={handleTabChange} />
 <NavButton 
 icon={
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
 </svg>
 } 
 label="Gestione Utenti" 
 tab="utenti" 
 currentTab={tab} 
 onClick={handleTabChange} 
 />
 <NavButton icon="📈" label="Statistiche" tab="statistiche" currentTab={tab} onClick={handleTabChange} />
 <NavButton 
   icon={
     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
     </svg>
   } 
   label="Stato del Sistema" 
   tab="sistema" 
   currentTab={tab} 
   onClick={handleTabChange} 
 />
 </>
 ) : (
 <NavButton icon="👤" label="Area Utente" tab="utente" currentTab={tab} onClick={setTab} />
 )}
 </nav>
 <UserBadge />
 </div>
 </div>

        {/* Sidebar Desktop - Only for Admin, Completely hidden on mobile */}
        {isAdmin && (
          <div className="sidebar-desktop hidden lg:flex lg:flex-col lg:w-64 bg-white sidebar border-r border-gray-200">
 <div className="flex items-center justify-between p-6 border-b border-gray-200">
 <div 
   className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
   onClick={() => handleTabChange('dashboard')}
 >
 <img src="/logoSito.svg" alt="LABA Logo" className="h-12 w-auto" />
 </div>
 {/* Theme toggle removed */}
            </div>
            
            <nav className="flex-1 p-4 space-y-2">
 <NavButton 
 icon={<svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} 
 label="Dashboard" 
 tab="dashboard" 
 currentTab={tab} 
 onClick={handleTabChange} 
 />
 <NavButton 
 icon={<svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>} 
 label="Inventario" 
 tab="inventario" 
 currentTab={tab} 
 onClick={handleTabChange} 
 />
 <NavButton 
 icon={<svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>} 
 label="Prestiti" 
 tab="prestiti" 
 currentTab={tab} 
 onClick={handleTabChange} 
 />
 <NavButton 
 icon={<svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} 
 label="Riparazioni" 
 tab="riparazioni" 
 currentTab={tab} 
 onClick={handleTabChange} 
 />
 <NavButton 
 icon={<svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} 
 label="Gestione Utenti" 
 tab="utenti" 
 currentTab={tab} 
 onClick={handleTabChange} 
 />
 <NavButton 
 icon={<svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} 
 label="Statistiche" 
 tab="statistiche" 
 currentTab={tab} 
 onClick={handleTabChange} 
 />
</nav>
 <UserBadge />
 </div>
 )}

    {/* Main Content */}
    <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
      {/* Top Bar Mobile */}
      <div className="lg:hidden header px-4 py-3 flex items-center justify-between">
        <div 
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => handleTabChange('dashboard')}
        >
          <img src="/logoSito.svg" alt="LABA Logo" className="h-8 w-auto" />
        </div>
        <div className="flex items-center space-x-2">
          {/* Notification Bell */}
          <button 
            onClick={() => setNotificationsOpen(true)}
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {notifications.filter(n => !n.isRead).length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {notifications.filter(n => !n.isRead).length}
              </span>
            )}
          </button>
          {/* Hamburger Menu */}
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 ease-in-out hover:scale-105"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Top Bar Desktop - For Users */}
      {!isAdmin && (
        <div className="hidden lg:block bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
            </div>
            <div className="flex items-center space-x-4">
              {/* Notifications Bell */}
              <button 
                onClick={() => setNotificationsOpen(true)}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {/* Notification Badge */}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

 {/* Content Area */}
 {isAdmin ? (
   <div className="flex-1 flex flex-col">
     {/* Top Bar Desktop - For Admin */}
     <div className="hidden lg:block bg-white border-b border-gray-200 px-6 py-4">
       <div className="flex items-center justify-between">
         <div className="flex items-center space-x-4">
         </div>
         <div className="flex items-center space-x-4">
           {/* Notifications Bell */}
           <button 
             onClick={() => setNotificationsOpen(true)}
             className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
           >
             <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
             </svg>
             {/* Notification Badge */}
             {unreadCount > 0 && (
               <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium animate-pulse">
                 {unreadCount}
               </span>
             )}
           </button>
         </div>
       </div>
     </div>
     
     <main className="flex-1 p-4 lg:p-6 main-content">
       <div className="max-w-7xl mx-auto">
         {tab === 'dashboard' && <Dashboard onNavigate={handleTabChange} />}
         {tab === 'inventario' && <Inventory />}
         {tab === 'prestiti' && <Loans selectedRequestFromNotification={selectedRequestFromNotification} onRequestHandled={() => setSelectedRequestFromNotification(null)} />}
         {tab === 'riparazioni' && <Repairs />}
         {tab === 'utenti' && <UserManagement />}
         {tab === 'statistiche' && <Statistics />}
         {tab === 'sistema' && <SystemStatus />}
       </div>
     </main>
     
           {/* Footer - Hidden when mobile menu is open */}
           {!mobileMenuOpen && <Footer onSystemClick={() => setTab('sistema')} />}
   </div>
 ) : (
   <UserArea />
 )}
 
 {/* Notifications Panel */}
 <NotificationsPanel
   isOpen={notificationsOpen}
   onClose={() => setNotificationsOpen(false)}
   notifications={notifications}
   onMarkAsRead={handleMarkAsRead}
   onDelete={handleDeleteNotification}
   onClick={handleNotificationClick}
 />
 
 {/* Mobile Menu for Admin */}
 {isAdmin && (
   <MobileMenu
     isOpen={mobileMenuOpen}
     onClose={() => setMobileMenuOpen(false)}
     sidebarItems={adminSidebarItems}
     activeView={tab}
     onNavigate={handleTabChange}
     user={user}
     logout={logout}
   />
 )}
 
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
 const { user, logout, roleLabel } = useAuth();
 if (!user) return null;
 
 const initials = (user.name?.[0] || "?") + (user.surname?.[0] || "");
 
 return (
 <div className="p-4 border-t border-gray-200 user-badge">
 <div className="flex items-center space-x-3 mb-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{backgroundColor: '#033157'}}>
          <span className="text-white font-semibold text-sm">{initials}</span>
        </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-gray-800 truncate">
 {user.name} {user.surname}
 </p>
 <p className="text-xs text-gray-500 truncate">
 {roleLabel} • {user.email}
 </p>
 </div>
 </div>
 <button 
 onClick={logout}
        className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200 ease border border-gray-200 "
 >
 <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
 </svg>
 Esci
 </button>
 </div>
 );
}

function Gate() {
 const { isAuthenticated } = useAuth();
 if (!isAuthenticated) return <Login branding="LABA – Service" />;
 return <AppInner />;
}

export default function App() {
 return (
 <AuthProvider>
 <Gate />
 </AuthProvider>
 );
}