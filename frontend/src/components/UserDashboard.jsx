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
      }

      // Process reports data
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        setStats(prev => ({ ...prev, myReports: reportsData.length }));
      }

      // Process loans data
      if (loansRes.ok) {
        const loansData = await loansRes.json();
        setStats(prev => ({ ...prev, myLoans: loansData.length }));
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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