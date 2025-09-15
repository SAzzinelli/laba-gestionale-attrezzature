import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

const SystemStatus = () => {
  const [systemData, setSystemData] = useState({
    overall: 'healthy',
    services: {
      database: { status: 'healthy', responseTime: 45, uptime: '99.9%' },
      api: { status: 'healthy', responseTime: 23, uptime: '99.8%' },
      auth: { status: 'healthy', responseTime: 12, uptime: '99.9%' },
      storage: { status: 'warning', responseTime: 156, uptime: '98.5%' },
      notifications: { status: 'error', responseTime: 0, uptime: '95.2%' }
    },
    metrics: {
      totalRequests: 15420,
      activeUsers: 23,
      memoryUsage: 68,
      cpuUsage: 45,
      diskUsage: 34
    },
    recentIncidents: [
      { id: 1, service: 'Storage', message: 'High latency detected', time: '2 min ago', severity: 'warning' },
      { id: 2, service: 'Notifications', message: 'Service temporarily unavailable', time: '15 min ago', severity: 'error' }
    ]
  });

  const [expandedSections, setExpandedSections] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { token } = useAuth();

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemData(prev => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          totalRequests: prev.metrics.totalRequests + Math.floor(Math.random() * 5),
          activeUsers: Math.max(1, prev.metrics.activeUsers + Math.floor(Math.random() * 3) - 1),
          memoryUsage: Math.max(20, Math.min(90, prev.metrics.memoryUsage + (Math.random() - 0.5) * 10)),
          cpuUsage: Math.max(10, Math.min(80, prev.metrics.cpuUsage + (Math.random() - 0.5) * 15))
        }
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setIsRefreshing(false);
    }, 2000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'healthy': return 'bg-green-100';
      case 'warning': return 'bg-yellow-100';
      case 'error': return 'bg-red-100';
      default: return 'bg-gray-100';
    }
  };

  const getPulseAnimation = (status) => {
    if (status === 'error') return 'animate-pulse';
    if (status === 'warning') return 'animate-ping';
    return '';
  };

  const getSonarEffect = (status) => {
    if (status === 'error') {
      return (
        <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-75"></div>
      );
    }
    if (status === 'warning') {
      return (
        <div className="absolute inset-0 rounded-full border-2 border-yellow-500 animate-pulse opacity-50"></div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Sistema Online</h1>
              <p className="text-lg text-gray-600">Monitoraggio in tempo reale dello stato del sistema</p>
              <div className="mt-2 flex items-center space-x-4">
                <span className="text-sm text-gray-500">Build: 500</span>
                <span className="text-sm text-gray-500">•</span>
                <span className="text-sm text-gray-500">Versione: 2.1.0</span>
                <span className="text-sm text-gray-500">•</span>
                <span className="text-sm text-gray-500">Ultimo aggiornamento: 15/09/2025</span>
              </div>
            </div>
            <button
              onClick={refreshData}
              disabled={isRefreshing}
              className="btn-primary hover-lift flex items-center space-x-2 disabled:opacity-50"
            >
              <svg className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{isRefreshing ? 'Aggiornamento...' : 'Aggiorna'}</span>
            </button>
          </div>
        </div>

        {/* Overall Status */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Stato Generale</h2>
            <div className="flex items-center space-x-3">
              <div className={`relative w-4 h-4 rounded-full ${getStatusBg(systemData.overall)} ${getPulseAnimation(systemData.overall)}`}>
                <div className={`w-full h-full rounded-full ${systemData.overall === 'healthy' ? 'bg-green-500' : systemData.overall === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                {getSonarEffect(systemData.overall)}
              </div>
              <span className={`text-lg font-semibold ${getStatusColor(systemData.overall)}`}>
                {systemData.overall === 'healthy' ? 'Tutto Operativo' : 
                 systemData.overall === 'warning' ? 'Attenzione' : 'Problemi Rilevati'}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">{systemData.metrics.totalRequests.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Richieste Totali</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">{systemData.metrics.activeUsers}</div>
              <div className="text-sm text-gray-600">Utenti Attivi</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-1">{Math.round(systemData.metrics.memoryUsage)}%</div>
              <div className="text-sm text-gray-600">Utilizzo Memoria</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-1">{Math.round(systemData.metrics.cpuUsage)}%</div>
              <div className="text-sm text-gray-600">Utilizzo CPU</div>
            </div>
          </div>
        </div>

        {/* Services Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Services List */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Servizi</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {Object.entries(systemData.services).map(([service, data]) => (
                <div key={service} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`relative w-3 h-3 rounded-full ${getStatusBg(data.status)} ${getPulseAnimation(data.status)}`}>
                        <div className={`w-full h-full rounded-full ${data.status === 'healthy' ? 'bg-green-500' : data.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                        {getSonarEffect(data.status)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 capitalize">{service}</h4>
                        <p className="text-sm text-gray-600">Uptime: {data.uptime}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getStatusColor(data.status)}`}>
                        {data.responseTime}ms
                      </div>
                      <div className="text-xs text-gray-500">Response Time</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Incidents */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Incidenti Recenti</h3>
            </div>
            <div className="p-6">
              {systemData.recentIncidents.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-600">Nessun incidente rilevato</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {systemData.recentIncidents.map((incident) => (
                    <div key={incident.id} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                      <div className={`w-2 h-2 rounded-full mt-2 ${incident.severity === 'error' ? 'bg-red-500' : 'bg-yellow-500'} ${getPulseAnimation(incident.severity)}`}></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">{incident.service}</h4>
                          <span className="text-xs text-gray-500">{incident.time}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{incident.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <button
              onClick={() => toggleSection('metrics')}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="text-xl font-bold text-gray-900">Metriche Dettagliate</h3>
              <svg className={`w-6 h-6 text-gray-500 transition-transform ${expandedSections.metrics ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {expandedSections.metrics && (
            <div className="p-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Memory Usage */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900">Memoria</h4>
                    <span className="text-2xl font-bold text-blue-600">{Math.round(systemData.metrics.memoryUsage)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${systemData.metrics.memoryUsage}%` }}
                    ></div>
                  </div>
                </div>

                {/* CPU Usage */}
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900">CPU</h4>
                    <span className="text-2xl font-bold text-purple-600">{Math.round(systemData.metrics.cpuUsage)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${systemData.metrics.cpuUsage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Disk Usage */}
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900">Disco</h4>
                    <span className="text-2xl font-bold text-green-600">{Math.round(systemData.metrics.diskUsage)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${systemData.metrics.diskUsage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* API Endpoints Status */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 mt-8">
          <div className="p-6 border-b border-gray-200">
            <button
              onClick={() => toggleSection('api')}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="text-xl font-bold text-gray-900">Stato API Endpoints</h3>
              <svg className={`w-6 h-6 text-gray-500 transition-transform ${expandedSections.api ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {expandedSections.api && (
            <div className="p-6 border-t border-gray-200">
              <div className="space-y-4">
                {[
                  { endpoint: '/api/auth/login', method: 'POST', status: 'healthy', responseTime: 45 },
                  { endpoint: '/api/inventario', method: 'GET', status: 'healthy', responseTime: 23 },
                  { endpoint: '/api/prestiti', method: 'GET', status: 'healthy', responseTime: 34 },
                  { endpoint: '/api/richieste', method: 'POST', status: 'warning', responseTime: 156 },
                  { endpoint: '/api/segnalazioni', method: 'POST', status: 'error', responseTime: 0 },
                  { endpoint: '/api/stats', method: 'GET', status: 'healthy', responseTime: 67 }
                ].map((api, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`relative w-3 h-3 rounded-full ${getStatusBg(api.status)} ${getPulseAnimation(api.status)}`}>
                        <div className={`w-full h-full rounded-full ${api.status === 'healthy' ? 'bg-green-500' : api.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                        {getSonarEffect(api.status)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${api.method === 'GET' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                            {api.method}
                          </span>
                          <span className="font-mono text-sm text-gray-900">{api.endpoint}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getStatusColor(api.status)}`}>
                        {api.responseTime}ms
                      </div>
                      <div className="text-xs text-gray-500">Response Time</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemStatus;
