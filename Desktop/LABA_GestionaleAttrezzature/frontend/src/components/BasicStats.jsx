import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

const BasicStats = () => {
 const [stats, setStats] = useState({
 totalItems: 0,
 totalUsers: 0,
 totalRequests: 0,
 totalLoans: 0
 });
 const [loading, setLoading] = useState(true);
 const { token } = useAuth();

 useEffect(() => {
 fetchBasicStats();
 }, []);

 const fetchBasicStats = async () => {
 try {
 setLoading(true);
 
 const [inventoryRes, usersRes, requestsRes, loansRes] = await Promise.all([
      fetch('/api/inventario', {
 headers: { 'Authorization': `Bearer ${token}` }
 }),
 fetch('/api/auth/users', {
 headers: { 'Authorization': `Bearer ${token}` }
 }),
 fetch('/api/richieste?all=1', {
 headers: { 'Authorization': `Bearer ${token}` }
 }),
 fetch('/api/prestiti?all=1', {
 headers: { 'Authorization': `Bearer ${token}` }
 })
 ]);

 const [inventory, users, requests, loans] = await Promise.all([
 inventoryRes.json(),
 usersRes.json(),
 requestsRes.json(),
 loansRes.json()
 ]);

 setStats({
 totalItems: inventory.length,
 totalUsers: users.length,
 totalRequests: requests.length,
 totalLoans: loans.length
 });
 } catch (error) {
 console.error('Error fetching basic stats:', error);
 } finally {
 setLoading(false);
 }
 };

 if (loading) {
 return (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {[...Array(4)].map((_, i) => (
 <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
 <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
 <div className="h-8 bg-gray-200 rounded w-1/2"></div>
 </div>
 ))}
 </div>
 );
 }

 const statCards = [
 {
 title: 'Totale Articoli',
 value: stats.totalItems,
 icon: '📦',
 color: 'blue'
 },
 {
 title: 'Utenti Registrati',
 value: stats.totalUsers,
 icon: '👥',
 color: 'green'
 },
 {
 title: 'Richieste Totali',
 value: stats.totalRequests,
 icon: '📋',
 color: 'yellow'
 },
 {
 title: 'Prestiti Attivi',
 value: stats.totalLoans,
 icon: '🔄',
 color: 'purple'
 }
 ];

 const getColorClasses = (color) => {
 const colors = {
 blue: 'bg-blue-50 text-blue-600 border-blue-200',
 green: 'bg-green-50 text-green-600 border-green-200',
 yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
 purple: 'bg-purple-50 text-purple-600 border-purple-200'
 };
 return colors[color] || colors.blue;
 };

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <h2 className="text-xl font-semibold text-gray-900">Statistiche Base</h2>
 <button
 onClick={fetchBasicStats}
 className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
 >
 Aggiorna
 </button>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {statCards.map((stat, index) => (
 <div
 key={index}
 className={`bg-white rounded-lg shadow-sm border p-6 ${getColorClasses(stat.color)}`}
 >
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium opacity-75">{stat.title}</p>
 <p className="text-2xl font-bold mt-1">{stat.value}</p>
 </div>
 <div className="text-3xl opacity-75">
 {stat.icon}
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
};

export default BasicStats;

