import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import NewRequestModal from './NewRequestModal';
import NotificationsPanel from './NotificationsPanel';
import UserProfile from './UserProfile';
import ReportBugModal from './ReportBugModal';
import MyLoansModal from './MyLoansModal';

const UserDashboard = ({ onNavigate }) => {
 const [stats, setStats] = useState({
 availableItems: 0,
 myRequests: 0,
 myReports: 0,
 myLoans: 0
 });
 const [availableItems, setAvailableItems] = useState([]);
 const [myRequests, setMyRequests] = useState([]);
 const [myReports, setMyReports] = useState([]);
 const [myLoans, setMyLoans] = useState([]);
 const [categories, setCategories] = useState([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [showQuickRequestModal, setShowQuickRequestModal] = useState(false);
 const [selectedRequest, setSelectedRequest] = useState(null);
 const [showNotifications, setShowNotifications] = useState(false);
 const [notifications, setNotifications] = useState([]);
 const [showUserProfile, setShowUserProfile] = useState(false);
 const [showReportBug, setShowReportBug] = useState(false);
 const [showMyLoans, setShowMyLoans] = useState(false);
 const [activeSection, setActiveSection] = useState('overview');
 const { token, user } = useAuth();

 // Calculate unread notifications
 const unreadNotifications = notifications.filter(n => !n.isRead).length;

 // Load notifications from localStorage
 const loadNotifications = () => {
 const savedNotifications = localStorage.getItem('user-notifications');
 if (savedNotifications) {
 setNotifications(JSON.parse(savedNotifications));
 } else {
 setNotifications([]);
 }
 };

 useEffect(() => {
 loadNotifications();
 fetchData();
 }, []);

 const fetchData = async () => {
 try {
 setLoading(true);
 setError(null);

 // Fetch all data in parallel
 const [inventoryRes, requestsRes, reportsRes, loansRes, categoriesRes] = await Promise.all([
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
 }),
 fetch(`${import.meta.env.VITE_API_BASE_URL}/api/categorie`, {
 headers: { 'Authorization': `Bearer ${token}` }
 })
 ]);

 // Process inventory data
 if (inventoryRes.ok) {
 const inventoryData = await inventoryRes.json();
 setAvailableItems(inventoryData);
 setStats(prev => ({ ...prev, availableItems: inventoryData.length }));
 }

 // Process requests data
 if (requestsRes.ok) {
 const requestsData = await requestsRes.json();
 setMyRequests(requestsData);
 setStats(prev => ({ ...prev, myRequests: requestsData.length }));
 }

 // Process reports data
 if (reportsRes.ok) {
 const reportsData = await reportsRes.json();
 setMyReports(reportsData);
 setStats(prev => ({ ...prev, myReports: reportsData.length }));
 }

 // Process loans data
 if (loansRes.ok) {
 const loansData = await loansRes.json();
 setMyLoans(loansData);
 setStats(prev => ({ ...prev, myLoans: loansData.length }));
 }

// Process categories data - filter by user's course
if (categoriesRes.ok) {
  const categoriesData = await categoriesRes.json();
  const userCourse = user?.corso_accademico;
  const filteredCategories = userCourse
    ? categoriesData.filter(cat =>
      cat.madre && cat.figlia &&
      cat.madre.toLowerCase().includes(userCourse.toLowerCase())
    )
    : [];
  setCategories(filteredCategories);
}

 } catch (err) {
 console.error('Error fetching data:', err);
 setError('Errore nel caricamento dei dati');
 } finally {
 setLoading(false);
 }
 };

 const handleMarkNotificationAsRead = (notificationId) => {
 const updatedNotifications = notifications.map(n => 
 n.id === notificationId ? { ...n, isRead: true } : n
 );
 setNotifications(updatedNotifications);
 localStorage.setItem('user-notifications', JSON.stringify(updatedNotifications));
 };

 const handleDeleteNotification = (notificationId) => {
 const updatedNotifications = notifications.filter(n => n.id !== notificationId);
 setNotifications(updatedNotifications);
 localStorage.setItem('user-notifications', JSON.stringify(updatedNotifications));
 };

 const StatCard = ({ title, value, icon, color, onClick }) => (
 <div 
 className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow ${onClick ? 'hover:border-blue-300' : ''}`}
 onClick={onClick}
 >
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-600">{title}</p>
 <p className={`text-xl font-bold ${color}`}>{value}</p>
 </div>
 <div className={`p-2 rounded-full ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
 {icon}
 </div>
 </div>
 </div>
 );

 const CategoryCard = ({ category, count, availableCount }) => (
 <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 hover:bg-gray-100 transition-colors cursor-pointer">
 <div className="flex items-center justify-between">
 <div className="flex-1">
 <h3 className="text-sm font-medium text-gray-900">{category.madre}</h3>
 <p className="text-xs text-gray-600">{category.figlia}</p>
 <div className="flex items-center mt-1 space-x-2">
 <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
 {availableCount} disp.
 </span>
 <span className="text-xs text-gray-500">
 {count} tot.
 </span>
 </div>
 </div>
 <div className="text-right">
 <span className="text-sm font-bold text-blue-600">{availableCount}</span>
 </div>
 </div>
 </div>
 );

 const ItemCard = ({ item }) => (
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
 <div className="flex items-start justify-between mb-2">
 <h3 className="font-semibold text-gray-900 text-sm">{item.nome}</h3>
 <span className={`text-xs px-2 py-1 rounded-full ${
 item.stato_effettivo === 'disponibile' 
 ? 'bg-green-100 text-green-800' 
 : 'bg-red-100 text-red-800'
 }`}>
 {item.stato_effettivo === 'disponibile' ? 'Disponibile' : 'Non disponibile'}
 </span>
 </div>
 {item.note && (
 <p className="text-xs text-gray-600 mb-2">{item.note}</p>
 )}
 <div className="flex items-center justify-between text-xs text-gray-500">
 <span>Scaffale: {item.scaffale || 'N/A'}</span>
 <span>Qty: {item.quantita_disponibile || 0}</span>
 </div>
 </div>
 );

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-gray-50">
 {/* Header */}
 <div className="bg-white shadow-sm border-b border-gray-200">
 <div className="px-4 sm:px-6 lg:px-8">
 <div className="flex justify-between items-center py-6">
 <div className="flex-1">
 <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard Studente</h1>
 <p className="text-lg text-gray-600">Benvenuto, {user?.name} {user?.surname}</p>
 </div>
 <div className="flex items-center space-x-3">
 {/* Notifications */}
 <div className="relative">
 <button
 onClick={() => setShowNotifications(!showNotifications)}
 className="relative p-2 text-gray-400 hover:text-gray-600 transition-all duration-300"
 aria-label="Apri menu notifiche"
 aria-expanded={showNotifications}
 aria-haspopup="true"
 >
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
 </svg>
 {unreadNotifications > 0 && (
 <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center notification-badge-pulse">
 {unreadNotifications}
 </span>
 )}
 </button>
 <NotificationsPanel
 isOpen={showNotifications}
 onClose={() => setShowNotifications(false)}
 notifications={notifications}
 onMarkAsRead={handleMarkNotificationAsRead}
 onDelete={handleDeleteNotification}
 />
 </div>

 {/* User Profile */}
 <button
 onClick={() => setShowUserProfile(true)}
 className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
 >
 <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
 {user?.name?.[0]}{user?.surname?.[0]}
 </div>
 <span className="hidden sm:block text-sm">{user?.name} {user?.surname}</span>
 </button>
 </div>
 </div>
 </div>
 </div>

 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
 <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
 {/* Main Content */}
 <div className="lg:col-span-3">
 {/* Navigation Tabs */}
 <div className="mb-4">
 <nav className="flex space-x-6">
 <button
 onClick={() => setActiveSection('overview')}
 className={`py-2 px-1 border-b-2 font-medium text-sm ${
 activeSection === 'overview'
 ? 'border-blue-500 text-blue-600'
 : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
 }`}
 >
 Overview
 </button>
 <button
 onClick={() => setActiveSection('available')}
 className={`py-2 px-1 border-b-2 font-medium text-sm ${
 activeSection === 'available'
 ? 'border-blue-500 text-blue-600'
 : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
 }`}
 >
 Articoli Disponibili
 </button>
 </nav>
 </div>

 {/* Overview Section */}
 {activeSection === 'overview' && (
 <div className="space-y-4">
 {/* Stats Cards */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 <StatCard
 title="Articoli Disponibili"
 value={stats.availableItems}
 icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
 color="text-blue-600"
 onClick={() => setActiveSection('available')}
 />
 <StatCard
 title="Le Mie Richieste"
 value={stats.myRequests}
 icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
 color="text-green-600"
 />
 <StatCard
 title="Le Mie Segnalazioni"
 value={stats.myReports}
 icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>}
 color="text-orange-600"
 />
 <StatCard
 title="I Miei Prestiti"
 value={stats.myLoans}
 icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>}
 color="text-purple-600"
 onClick={() => setShowMyLoans(true)}
 />
 </div>

 {/* Recent Activity */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
 <h3 className="text-base font-medium text-gray-900 mb-3">Attività Recenti</h3>
 <div className="space-y-2">
 {myRequests.slice(0, 3).map((request) => (
 <div key={request.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
 <div className="flex items-center space-x-2">
 <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
 <span className="text-sm text-gray-900">Richiesta per {request.articolo_nome}</span>
 </div>
 <span className="text-xs text-gray-500">{request.data_richiesta}</span>
 </div>
 ))}
 {myRequests.length === 0 && (
 <p className="text-gray-500 text-sm">Nessuna attività recente</p>
 )}
 </div>
 </div>
 </div>
 )}

 {/* Available Items Section */}
 {activeSection === 'available' && (
 <div className="space-y-4">
 <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
 <h2 className="text-lg font-semibold text-gray-900">Articoli Disponibili</h2>
 <div className="flex flex-col sm:flex-row gap-2">
 <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
 <option>Tutte le categorie</option>
 {categories.map((cat) => (
 <option key={cat.id} value={cat.id}>{cat.madre} - {cat.figlia}</option>
 ))}
 </select>
 <input
 type="text"
 placeholder="Cerca articoli..."
 className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-64"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
 {availableItems.map((item) => (
 <ItemCard key={item.id} item={item} />
 ))}
 </div>

 {availableItems.length === 0 && (
 <div className="text-center py-8">
 <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
 </svg>
 <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun articolo disponibile</h3>
 <p className="mt-1 text-sm text-gray-500">Non ci sono articoli disponibili al momento.</p>
 </div>
 )}
 </div>
 )}
 </div>

 {/* Sidebar */}
 <div className="space-y-4">
 {/* Categorie */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
 <h3 className="text-sm font-medium text-gray-900 mb-2">Categorie</h3>
 <div className="space-y-1">
{categories.map((category) => {
  // Usa i conteggi che arrivano dal backend
  const totalCount = category.count || 0;
  const availableCount = category.available_count || 0;
 return (
 <CategoryCard 
 key={category.id} 
 category={category} 
 count={totalCount}
 availableCount={availableCount}
 />
 );
 })}
 {categories.length === 0 && (
 <p className="text-gray-500 text-xs text-center py-2">
 Nessuna categoria disponibile per il tuo corso
 </p>
 )}
 </div>
 </div>

 {/* Prenota */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
 <h3 className="text-sm font-medium text-gray-900 mb-2">Prenota</h3>
 <div className="space-y-2">
 <button
 onClick={() => setShowQuickRequestModal(true)}
 className="w-full btn-primary btn-small flex items-center justify-center space-x-2 text-xs"
 >
 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
 </svg>
 <span>Nuova Richiesta</span>
 </button>
 <button
 onClick={() => setActiveSection('available')}
 className="w-full btn-success btn-small flex items-center justify-center space-x-2 text-xs"
 >
 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
 </svg>
 <span>Articoli Disponibili</span>
 </button>
 </div>
 </div>

 {/* Segnalazioni */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
 <h3 className="text-sm font-medium text-gray-900 mb-2">Segnalazioni</h3>
 <div className="space-y-2">
 <button
 onClick={() => setShowReportBug(true)}
 className="w-full btn-danger btn-small flex items-center justify-center space-x-2 text-xs"
 >
 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
 </svg>
 <span>Segnala Guasto</span>
 </button>
 <button
 onClick={() => setShowMyLoans(true)}
 className="w-full btn-secondary btn-small flex items-center justify-center space-x-2 text-xs"
 >
 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
 </svg>
 <span>I Miei Prestiti</span>
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Modals */}
 {showQuickRequestModal && (
 <NewRequestModal
 isOpen={showQuickRequestModal}
 selectedItem={selectedRequest}
 onClose={() => {
 setShowQuickRequestModal(false);
 setSelectedRequest(null);
 }}
 onSuccess={() => {
 fetchData();
 setShowQuickRequestModal(false);
 setSelectedRequest(null);
 }}
 />
 )}

 {showUserProfile && (
 <UserProfile
 onClose={() => setShowUserProfile(false)}
 />
 )}

 {showReportBug && (
 <ReportBugModal
 isOpen={showReportBug}
 onClose={() => setShowReportBug(false)}
 onSuccess={() => {
 setShowReportBug(false);
 fetchData();
 }}
 />
 )}

 {showMyLoans && (
 <MyLoansModal
 isOpen={showMyLoans}
 onClose={() => setShowMyLoans(false)}
 />
 )}
 </div>
 );
};

export default UserDashboard;