import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

const AdvancedStats = () => {
 const [stats, setStats] = useState({
 topUsers: [],
 topItems: [],
 topDepartments: [],
 monthlyData: []
 });
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [selectedPeriod, setSelectedPeriod] = useState('30'); // 30, 90, 365 giorni
 const { token } = useAuth();

 useEffect(() => {
 fetchStats();
 }, [selectedPeriod]);

 const fetchStats = async () => {
 try {
 setLoading(true);
 const headers = {
 'Authorization': `Bearer ${token}`
 };

 // Fetch all statistics in parallel
 const [usersRes, itemsRes, departmentsRes, monthlyRes] = await Promise.all([
 fetch(`/api/stats/top-users?period=${selectedPeriod}`, { headers }),
 fetch(`/api/stats/top-items?period=${selectedPeriod}`, { headers }),
 fetch(`/api/stats/top-departments?period=${selectedPeriod}`, { headers }),
 fetch(`/api/stats/monthly-requests?period=${selectedPeriod}`, { headers })
 ]);

 const statsData = {
 topUsers: usersRes.ok ? await usersRes.json() : [],
 topItems: itemsRes.ok ? await itemsRes.json() : [],
 topDepartments: departmentsRes.ok ? await departmentsRes.json() : [],
 monthlyData: monthlyRes.ok ? await monthlyRes.json() : []
 };

 setStats(statsData);
 } catch (err) {
 setError('Errore nel caricamento delle statistiche');
 console.error('Error fetching stats:', err);
 } finally {
 setLoading(false);
 }
 };

 const StatCard = ({ title, children, className = "" }) => (
 <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
 <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
 {children}
 </div>
 );

 const TopUserItem = ({ user, rank, count }) => (
 <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
 <div className="flex items-center space-x-3">
 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
 rank === 1 ? 'bg-yellow-500' : 
 rank === 2 ? 'bg-gray-400' : 
 rank === 3 ? 'bg-orange-500' : 
 'bg-blue-500'
 }`}>
 {rank}
 </div>
 <div>
 <p className="font-medium text-gray-900">{user.name} {user.surname}</p>
 <p className="text-sm text-gray-500">{user.corso_accademico}</p>
 </div>
 </div>
 <div className="text-right">
 <p className="font-bold text-blue-600">{count}</p>
 <p className="text-xs text-gray-500">richieste</p>
 </div>
 </div>
 );

 const TopItemCard = ({ item, rank, count }) => (
 <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
 <div className="flex items-center space-x-3">
 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
 rank === 1 ? 'bg-yellow-500' : 
 rank === 2 ? 'bg-gray-400' : 
 rank === 3 ? 'bg-orange-500' : 
 'bg-blue-500'
 }`}>
 {rank}
 </div>
 <div>
 <p className="font-medium text-gray-900">{item.nome}</p>
 <p className="text-sm text-gray-500">{item.categoria_madre} - {item.categoria_figlia}</p>
 </div>
 </div>
 <div className="text-right">
 <p className="font-bold text-green-600">{count}</p>
 <p className="text-xs text-gray-500">richieste</p>
 </div>
 </div>
 );

 const DepartmentItem = ({ department, rank, count }) => (
 <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
 <div className="flex items-center space-x-3">
 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
 rank === 1 ? 'bg-yellow-500' : 
 rank === 2 ? 'bg-gray-400' : 
 rank === 3 ? 'bg-orange-500' : 
 'bg-blue-500'
 }`}>
 {rank}
 </div>
 <div>
 <p className="font-medium text-gray-900">{department.corso_accademico}</p>
 <p className="text-sm text-gray-500">{department.count} studenti</p>
 </div>
 </div>
 <div className="text-right">
 <p className="font-bold text-purple-600">{count}</p>
 <p className="text-xs text-gray-500">richieste</p>
 </div>
 </div>
 );

 const SimpleChart = ({ data, title }) => {
 const maxValue = Math.max(...data.map(d => d.count));
 
 return (
 <div className="space-y-3">
 <h4 className="text-sm font-medium text-gray-700">{title}</h4>
 <div className="space-y-2">
 {data.map((item, index) => (
 <div key={index} className="flex items-center space-x-3">
 <div className="w-20 text-xs text-gray-600 truncate">
 {item.month || item.week || item.day}
 </div>
 <div className="flex-1 bg-gray-200 rounded-full h-2">
 <div 
 className="bg-blue-500 h-2 rounded-full transition-all duration-300"
 style={{ width: `${(item.count / maxValue) * 100}%` }}
 />
 </div>
 <div className="w-8 text-xs text-gray-600 text-right">
 {item.count}
 </div>
 </div>
 ))}
 </div>
 </div>
 );
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
 <span className="ml-2 text-gray-600">Caricamento statistiche...</span>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex justify-between items-center">
 <div>
 <h1 className="text-2xl font-bold text-gray-900">Statistiche Avanzate</h1>
 <p className="text-gray-600">Analisi dettagliate del sistema di gestione attrezzature</p>
 </div>
 <div className="flex space-x-2">
 <select
 value={selectedPeriod}
 onChange={(e) => setSelectedPeriod(e.target.value)}
 className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
 >
 <option value="30">Ultimi 30 giorni</option>
 <option value="90">Ultimi 90 giorni</option>
 <option value="365">Ultimo anno</option>
 </select>
 </div>
 </div>

 {/* Error */}
 {error && (
 <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
 {error}
 </div>
 )}

 {/* Charts Row */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <StatCard title="Andamento Richieste">
 <SimpleChart 
 data={stats.monthlyData} 
 title="Richieste per periodo"
 />
 </StatCard>
 
 <StatCard title="Distribuzione per Categoria">
 <div className="space-y-2">
 {stats.topItems.slice(0, 5).map((item, index) => (
 <div key={index} className="flex items-center justify-between">
 <span className="text-sm text-gray-600">{item.categoria_madre}</span>
 <span className="text-sm font-medium text-blue-600">{item.count}</span>
 </div>
 ))}
 </div>
 </StatCard>
 </div>

 {/* Top Lists Row */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Top Users */}
 <StatCard title="Top 5 Utenti" className="fade-in-up">
 <div className="space-y-1">
 {stats.topUsers.length > 0 ? (
 stats.topUsers.map((user, index) => (
 <TopUserItem
 key={user.id}
 user={user}
 rank={index + 1}
 count={user.count}
 />
 ))
 ) : (
 <div className="text-center py-8 text-gray-500">
 <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
 </svg>
 <p className="mt-2">Nessun dato disponibile</p>
 </div>
 )}
 </div>
 </StatCard>

 {/* Top Items */}
 <StatCard title="Top 5 Oggetti" className="fade-in-up">
 <div className="space-y-1">
 {stats.topItems.length > 0 ? (
 stats.topItems.map((item, index) => (
 <TopItemCard
 key={item.id}
 item={item}
 rank={index + 1}
 count={item.count}
 />
 ))
 ) : (
 <div className="text-center py-8 text-gray-500">
 <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
 </svg>
 <p className="mt-2">Nessun dato disponibile</p>
 </div>
 )}
 </div>
 </StatCard>

 {/* Top Departments */}
 <StatCard title="Top 5 Dipartimenti" className="fade-in-up">
 <div className="space-y-1">
 {stats.topDepartments.length > 0 ? (
 stats.topDepartments.map((department, index) => (
 <DepartmentItem
 key={department.corso_accademico}
 department={department}
 rank={index + 1}
 count={department.count}
 />
 ))
 ) : (
 <div className="text-center py-8 text-gray-500">
 <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
 </svg>
 <p className="mt-2">Nessun dato disponibile</p>
 </div>
 )}
 </div>
 </StatCard>
 </div>
 </div>
 );
};

export default AdvancedStats;