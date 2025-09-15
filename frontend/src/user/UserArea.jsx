import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import UserDashboard from '../components/UserDashboard';
import MyLoans from '../components/MyLoans';
import AvailableItems from '../components/AvailableItems';
import ReportFault from '../components/ReportFault';
import SystemStatus from '../components/SystemStatus.jsx';
import Footer from '../components/Footer';

// UserBadge Component (simplified to avoid overlap)
function UserBadge() {
  const { user, logout, isAdmin } = useAuth();
  if (!user) return null;
  
  const initials = (user.name?.[0] || "?") + (user.surname?.[0] || "");
  
  return (
    <div className="p-4 border-t border-gray-200 user-badge">
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
          <span className="text-white font-semibold text-sm">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">
            {user.name} {user.surname}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {isAdmin ? "Amministratore" : "Utente"}
          </p>
        </div>
      </div>
      <button 
        onClick={logout}
        className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200 ease border border-gray-200"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Esci
      </button>
    </div>
  );
}

const UserArea = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const { user, logout } = useAuth();


  const sidebarItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 'my-loans',
      label: 'I Miei Prestiti',
      icon: (
        <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'available-items',
      label: 'Articoli Disponibili',
      icon: (
        <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      id: 'report-fault',
      label: 'Segnala Guasto',
      icon: (
        <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      )
    }
  ];

  // Listener per navigazione dal footer
  useEffect(() => {
    const handleNavigateToSystem = () => {
      console.log('User: Received navigateToSystem event');
      setActiveView('sistema');
    };
    
    window.addEventListener('navigateToSystem', handleNavigateToSystem);
    
    return () => {
      window.removeEventListener('navigateToSystem', handleNavigateToSystem);
    };
  }, []);

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <UserDashboard />;
      case 'my-loans':
        return <MyLoans />;
      case 'available-items':
        return <AvailableItems />;
      case 'report-fault':
        return <ReportFault />;
      case 'sistema':
        return <SystemStatus />;
      default:
        return <UserDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <div className="hidden lg:flex lg:flex-col lg:w-64 bg-white sidebar border-r border-gray-200">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <img src="/logoSito.svg" alt="LABA Logo" className="h-12 w-auto" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Gestione Attrezzature</p>
              </div>
            </div>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`nav-button ${activeView === item.id ? 'active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          
          <UserBadge />
        </div>

        {/* Main Content Area with Footer */}
        <div className="flex-1 lg:ml-64 flex flex-col">
          <main className="flex-1">
            {renderActiveView()}
          </main>
          
          <Footer onSystemClick={() => setActiveView('sistema')} />
        </div>
    </div>
  );
};

export default UserArea;