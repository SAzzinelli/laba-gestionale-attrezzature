import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import NewRequestModal from './NewRequestModal';

const UserDashboard = () => {
  const [stats, setStats] = useState({
    availableItems: 0,
    myRequests: 0,
    myReports: 0,
    myLoans: 0
  });
  const [recentData, setRecentData] = useState({
    activeLoans: [],
    recentRequests: [],
    recentReports: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showQuickRequestModal, setShowQuickRequestModal] = useState(false);
  const { token, user } = useAuth();

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [inventoryRes, requestsRes, reportsRes, loansRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventario/disponibili`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/richieste/mie`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/segnalazioni/mie`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/prestiti/mie`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      // Process inventory data
      if (inventoryRes.ok) {
        const inventoryData = await inventoryRes.json();
        setStats(prev => ({ ...prev, availableItems: inventoryData.length }));
      }

      // Process requests data
      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setStats(prev => ({ ...prev, myRequests: requestsData.length }));
        setRecentData(prev => ({ ...prev, recentRequests: requestsData.slice(0, 3) }));
      }

      // Process reports data
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        setStats(prev => ({ ...prev, myReports: reportsData.length }));
        setRecentData(prev => ({ ...prev, recentReports: reportsData.slice(0, 3) }));
      }

      // Process loans data
      if (loansRes.ok) {
        const loansData = await loansRes.json();
        setStats(prev => ({ ...prev, myLoans: loansData.length }));
        setRecentData(prev => ({ ...prev, activeLoans: loansData.slice(0, 3) }));
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper function to safely format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'Data non specificata';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Data non valida';
      return date.toLocaleDateString('it-IT');
    } catch (error) {
      return 'Data non valida';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Benvenuto, {user?.name} {user?.surname}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Articoli Disponibili" value={stats.availableItems} />
        <StatCard title="Le Mie Richieste" value={stats.myRequests} />
        <StatCard title="Le Mie Segnalazioni" value={stats.myReports} />
        <StatCard title="I Miei Prestiti" value={stats.myLoans} />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Azioni Rapide</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setShowQuickRequestModal(true)}
            className="btn-primary hover-lift flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nuova Richiesta
          </button>
          <button
            onClick={() => {/* Navigate to report fault */}}
            className="btn-secondary hover-lift flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Segnala Guasto
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Loans */}
        {recentData.activeLoans.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Prestiti Attivi
            </h3>
            <div className="space-y-3">
              {recentData.activeLoans.map((loan, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{loan.articolo_nome || loan.oggetto_nome || 'Oggetto'}</p>
                    <p className="text-sm text-gray-600">Scadenza: {formatDate(loan.data_rientro || loan.data_fine)}</p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                    Attivo
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Requests */}
        {recentData.recentRequests.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Richieste Recenti
            </h3>
            <div className="space-y-3">
              {recentData.recentRequests.map((request, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{request.oggetto_nome || request.articolo_nome || 'Oggetto'}</p>
                    <p className="text-sm text-gray-600">
                      Richiesta: {formatDate(request.created_at)}
                      {request.stato === 'approvata' && request.dal && request.al && (
                        <span> - Noleggiato dal: {formatDate(request.dal)} al: {formatDate(request.al)}</span>
                      )}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    request.stato === 'approvata' ? 'bg-green-100 text-green-800' :
                    request.stato === 'in_attesa' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {request.stato === 'approvata' ? 'Approvata' :
                     request.stato === 'in_attesa' ? 'In Attesa' : 'Rifiutata'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showQuickRequestModal && (
        <NewRequestModal
          isOpen={showQuickRequestModal}
          onClose={() => setShowQuickRequestModal(false)}
          onSuccess={() => {
            setShowQuickRequestModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

// Stat Card Component (same as admin dashboard)
function StatCard({ title, value }) {
  const iconMap = {
    'Articoli Disponibili': (
      <svg className="icon-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    'Le Mie Richieste': (
      <svg className="icon-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    'Le Mie Segnalazioni': (
      <svg className="icon-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    'I Miei Prestiti': (
      <svg className="icon-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };

  const colorMap = {
    'Articoli Disponibili': 'bg-blue-100',
    'Le Mie Richieste': 'bg-green-100',
    'Le Mie Segnalazioni': 'bg-red-100',
    'I Miei Prestiti': 'bg-yellow-100'
  };

  return (
    <div className="kpi-card bg-white rounded-lg shadow-sm border border-gray-200 hover:scale-105 transition-transform">
      <div className="flex items-center w-full">
        <div className={`w-12 h-12 ${colorMap[title]} rounded-lg flex items-center justify-center ${
          title === 'Articoli Disponibili' ? 'text-blue-600' :
          title === 'Le Mie Richieste' ? 'text-green-600' :
          title === 'Le Mie Segnalazioni' ? 'text-red-600' :
          title === 'I Miei Prestiti' ? 'text-yellow-600' : 'text-gray-600'
        }`}>
          {iconMap[title]}
        </div>
        <div className="ml-4 flex-1 min-w-0">
          <p className="kpi-label text-gray-600 font-semibold">{title}</p>
          <p className="kpi-value text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;