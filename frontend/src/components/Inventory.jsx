import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { 
 exportInventoryToExcel, 
 generateInventoryTemplate, 
 parseInventoryExcel 
} from '../utils/excelUtils';
import StepInventoryModal from './StepInventoryModal';
import OperationsDropdown from './OperationsDropdown';
import QRCodeGenerator from './QRCodeGenerator';
import AdvancedFilters from './AdvancedFilters';

const Inventory = () => {
 const [inventory, setInventory] = useState([]);
 const [categories, setCategories] = useState([]);
 const [courses, setCourses] = useState([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [showAddModal, setShowAddModal] = useState(false);
 const [editingItem, setEditingItem] = useState(null);
 const [searchTerm, setSearchTerm] = useState('');
 const [qrCodeItem, setQrCodeItem] = useState(null);
 const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
 const [savedFilters, setSavedFilters] = useState([]);
 const [currentFilters, setCurrentFilters] = useState({});
 const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategory, setNewCategory] = useState({ nome: '' });
 const [expandedItems, setExpandedItems] = useState(new Set());
 const [selectedCourse, setSelectedCourse] = useState('');
 const [viewMode, setViewMode] = useState('list'); // only list view
 const [loans, setLoans] = useState([]);
 
 // New item form state
 const [newItem, setNewItem] = useState({
 nome: '',
 categoria_id: '',
 note: '',
 quantita_totale: 1,
 scaffale: '',
 unita: []
 });
 
 const { isAdmin, token } = useAuth();

 // Fetch inventory data
 const fetchInventory = async () => {
 try {
 setLoading(true);
 const [inventoryRes, loansRes] = await Promise.all([
 fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventario`, {
 headers: { 'Authorization': `Bearer ${token}` }
 }),
 fetch(`${import.meta.env.VITE_API_BASE_URL}/api/prestiti?all=1`, {
 headers: { 'Authorization': `Bearer ${token}` }
 })
 ]);

 if (!inventoryRes.ok) throw new Error('Errore nel caricamento inventario');
 if (!loansRes.ok) throw new Error('Errore nel caricamento prestiti');

 const [inventoryData, loansData] = await Promise.all([
 inventoryRes.json(),
 loansRes.json()
 ]);

 setInventory(inventoryData);
 setLoans(loansData);
 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };

 // Fetch categories
 const fetchCategories = async () => {
 try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/categorie-semplici`, {
 headers: {
 'Authorization': `Bearer ${token}`
 }
 });

 if (!response.ok) throw new Error('Errore nel caricamento categorie');

 const data = await response.json();
 setCategories(data);
 } catch (err) {
 console.error('Errore categorie:', err);
 }
 };

 // Fetch courses
 const fetchCourses = async () => {
 try {
 const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/corsi`, {
 headers: {
 'Authorization': `Bearer ${token}`
 }
 });

 if (!response.ok) throw new Error('Errore nel caricamento corsi');

 const data = await response.json();
 setCourses(data);
 } catch (err) {
 console.error('Errore corsi:', err);
 }
 };

 useEffect(() => {
 fetchInventory();
 if (isAdmin) {
 fetchCategories();
 fetchCourses();
 }
 loadSavedFilters();
 }, [isAdmin]);

 // Carica filtri salvati da localStorage
 const loadSavedFilters = () => {
 const saved = localStorage.getItem('inventory-saved-filters');
 if (saved) {
 setSavedFilters(JSON.parse(saved));
 }
 };

 // Salva filtro
 const handleSaveFilter = (name, filters) => {
 const newFilter = { name, filters, timestamp: new Date().toISOString() };
 const updated = [...savedFilters, newFilter];
 setSavedFilters(updated);
 localStorage.setItem('inventory-saved-filters', JSON.stringify(updated));
 };

 // Carica filtro
 const handleLoadFilter = (savedFilter) => {
 setCurrentFilters(savedFilter.filters);
 applyFilters(savedFilter.filters);
 };

 // Elimina filtro
 const handleDeleteFilter = (index) => {
 const updated = savedFilters.filter((_, i) => i !== index);
 setSavedFilters(updated);
 localStorage.setItem('inventory-saved-filters', JSON.stringify(updated));
 };

 // Applica filtri
 const applyFilters = (filters) => {
 setCurrentFilters(filters);
 // Qui implementeremo la logica di filtraggio
 };

 // Calculate low stock items based on ACTIVE LOANS, not total quantity
 const lowStockItems = (() => {
 const items = [];
 
 inventory.forEach(item => {
 const totalQuantity = item.quantita_totale || 0;
 const availableQuantity = item.unita_disponibili || 0;
 
 // Only if there's at least 1 item in inventory
 if (totalQuantity > 0) {
 // If available = 0, means ALL are on loan
 if (availableQuantity === 0) {
 // Find first return date for this item
 const itemLoans = loans.filter(p => 
 p.inventario_id === item.id && 
 p.stato === 'attivo' && 
 p.data_fine
 );
 
 let firstReturnDate = null;
 if (itemLoans.length > 0) {
 const returnDates = itemLoans
 .map(p => new Date(p.data_fine))
 .filter(date => !isNaN(date.getTime()))
 .sort((a, b) => a - b);
 
 firstReturnDate = returnDates.length > 0 ? returnDates[0] : null;
 }
 
 items.push({
 ...item,
 reason: 'Tutti gli oggetti sono in prestito',
 firstReturnDate: firstReturnDate
 });
 }
 // If available = 1 and total > 1, means only 1 remains
 else if (availableQuantity === 1 && totalQuantity > 1) {
 // Find first return date for this item
 const itemLoans = loans.filter(p => 
 p.inventario_id === item.id && 
 p.stato === 'attivo' && 
 p.data_fine
 );
 
 let firstReturnDate = null;
 if (itemLoans.length > 0) {
 const returnDates = itemLoans
 .map(p => new Date(p.data_fine))
 .filter(date => !isNaN(date.getTime()))
 .sort((a, b) => a - b);
 
 firstReturnDate = returnDates.length > 0 ? returnDates[0] : null;
 }
 
 items.push({
 ...item,
 reason: 'Solo 1 oggetto disponibile',
 firstReturnDate: firstReturnDate
 });
 }
 }
 });
 
 return items;
 })();

 // Filter inventory based on search only
 const filteredInventory = inventory.filter(item => {
 const matchesSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
 item.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
 item.scaffale?.toLowerCase().includes(searchTerm.toLowerCase());
 
 return matchesSearch;
 });

 // Group inventory items and create expandable structure
 const groupedInventory = filteredInventory.map(item => {
 const quantity = item.quantita_totale || 1;
 const units = [];
 
 for (let i = 1; i <= quantity; i++) {
 units.push({
 ...item,
 unitNumber: i,
 totalUnits: quantity,
 unitId: `${item.id}_${i}` // Unique ID for each unit
 });
 }
 
 return {
 ...item,
 units: units,
 isExpanded: false,
 hasMultipleUnits: quantity > 1
 };
 });

 // Handle Excel import
 const handleImportExcel = async (file) => {
 try {
 const data = await parseInventoryExcel(file);
 // Qui implementeremo l'importazione nel database
 } catch (err) {
 console.error('Errore importazione:', err);
 }
 };

 // Handle export
 const handleExport = () => {
 exportInventoryToExcel(inventory);
 };

 // Handle template download
 const handleTemplate = () => {
 generateInventoryTemplate();
 };

 // Handle delete item
 const handleDeleteItem = async (itemId) => {
 if (!window.confirm('Sei sicuro di voler eliminare questo articolo?')) {
 return;
 }

 try {
 const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventario/${itemId}`, {
 method: 'DELETE',
 headers: {
 'Authorization': `Bearer ${token}`
 }
 });

 if (!response.ok) throw new Error('Errore nell\'eliminazione');

 // Refresh inventory
 fetchInventory();
 } catch (err) {
 setError(err.message);
 }
 };

 // Handle edit item
 const handleEditItem = (item) => {
 setEditingItem(item);
 setShowAddModal(true);
 };

  // Handle add category
  const handleAddCategory = async () => {
    if (!newCategory.nome || newCategory.nome.trim() === '') {
      alert('Nome categoria è obbligatorio');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/categorie-semplici`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nome: newCategory.nome.trim() })
      });

      if (!response.ok) throw new Error('Errore nell\'aggiunta categoria');

      // Refresh categories
      fetchCategories();
      setNewCategory({ nome: '' });
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle delete category
  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa categoria?')) {
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/categorie-semplici/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Errore nell\'eliminazione categoria');

      // Refresh categories
      fetchCategories();
    } catch (err) {
      setError(err.message);
    }
  };

 // Handle expand/collapse item
 const toggleExpanded = (itemId) => {
 setExpandedItems(prev => {
 const newSet = new Set(prev);
 if (newSet.has(itemId)) {
 newSet.delete(itemId);
 } else {
 newSet.add(itemId);
 }
 return newSet;
 });
 };

 // Get status color
 const getStatusColor = (status) => {
 switch (status) {
 case 'disponibile': return 'bg-green-100 text-green-800 border-green-200';
 case 'in_prestito': return 'bg-blue-100 text-blue-800 border-blue-200';
 case 'in_riparazione': return 'bg-orange-100 text-orange-800 border-orange-200';
 case 'non_disponibile': return 'bg-red-100 text-red-800 border-red-200';
 default: return 'bg-gray-100 text-gray-800 border-gray-200';
 }
 };

 // Get status text
 const getStatusText = (status) => {
 switch (status) {
 case 'disponibile': return 'Disponibile';
 case 'in_prestito': return 'In Prestito';
 case 'in_riparazione': return 'In Riparazione';
 case 'non_disponibile': return 'Non Disponibile';
 default: return 'Sconosciuto';
 }
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
 <span className="ml-2 text-gray-600">Caricamento inventario...</span>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-gray-50">
 {/* Header Moderno */}
 <div className="bg-white shadow-sm border-b border-gray-200 rounded-t-xl">
 <div className="px-4 sm:px-6 lg:px-8">
 <div className="py-6">
 <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
 <div className="flex-1">
                <h1 className="text-2xl font-semibold text-gray-900">Gestione Inventario</h1>
 </div>
 
    {/* Stats Cards */}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
 <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
 <div className="flex items-center">
 <div className="p-3 bg-blue-500 rounded-xl shadow-lg">
 <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
 </svg>
 </div>
 <div className="ml-4">
 <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Totale Articoli</p>
 <p className="text-3xl font-bold text-blue-900 mt-1">{inventory.length}</p>
 </div>
 </div>
 </div>

 <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
 <div className="flex items-center">
 <div className="p-3 bg-green-500 rounded-xl shadow-lg">
 <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 </div>
 <div className="ml-4">
 <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">Oggetti Totali</p>
 <p className="text-3xl font-bold text-green-900 mt-1">
 {inventory.reduce((total, item) => total + (item.quantita_totale || 0), 0)}
 </p>
 </div>
 </div>
 </div>
 
 <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
 <div className="flex items-center">
 <div className="p-3 bg-orange-500 rounded-xl shadow-lg">
 <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
 </svg>
 </div>
 <div className="ml-4">
 <p className="text-sm font-bold text-orange-800 uppercase tracking-wide">In Riparazione</p>
 <p className="text-3xl font-bold text-orange-900 mt-1">
 {inventory.filter(item => item.stato_effettivo === 'in_riparazione').length}
 </p>
 </div>
 </div>
 </div>

 <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
 <div className="flex items-center">
 <div className="p-3 bg-red-500 rounded-xl shadow-lg">
 <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 </div>
 <div className="ml-4">
 <p className="text-sm font-bold text-red-800 uppercase tracking-wide">Scorte Basse</p>
 <p className="text-3xl font-bold text-red-900 mt-1">{lowStockItems.length}</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Main Content */}
 <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
 {/* Action Bar */}
 <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
 <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
 <div className="flex-1">
 <h2 className="text-xl font-semibold text-gray-900 mb-2">Articoli in Inventario</h2>
 <p className="text-gray-600">Gestisci e monitora tutti gli articoli del laboratorio</p>
 </div>
 
 <div className="flex flex-wrap gap-3 items-center">
 <button
 onClick={() => setShowAddModal(true)}
 className="btn-primary"
 >
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
 </svg>
 <span>Nuovo Articolo</span>
 </button>
 
 <button
 onClick={() => setShowCategoryManager(true)}
 className="btn-secondary"
 >
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
 </svg>
 <span>Gestisci Categorie</span>
 </button>
 
 <OperationsDropdown 
 onExport={handleExport}
 onImport={handleImportExcel}
 onTemplate={handleTemplate}
 />
 </div>
 </div>
 </div>

 {/* Filters and Search */}
 <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
 <div className="flex flex-col lg:flex-row lg:items-end gap-4">
 {/* Search */}
 <div className="flex-1">
 <label className="block text-sm font-medium text-gray-700 mb-2">Cerca elementi</label>
 <div className="relative">
 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
 <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
 </svg>
 </div>
 <input
 type="text"
 placeholder="Cerca per nome, seriale o note..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
 />
 </div>
 </div>

 </div>
 </div>

    {/* Inventory List */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Articolo</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Corso Accademico</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stato</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantità</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scaffale</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {groupedInventory.map((item) => (
 <React.Fragment key={item.id}>
 {/* Main Item Row */}
 <tr className="hover:bg-gray-50">
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="flex items-center">
 {item.hasMultipleUnits && (
 <button
 onClick={() => toggleExpanded(item.id)}
 className="mr-3 p-1 hover:bg-gray-200 rounded transition-colors"
 title={expandedItems.has(item.id) ? "Chiudi dettagli" : "Mostra dettagli"}
 >
 <svg 
 className={`w-4 h-4 text-gray-500 transition-transform ${expandedItems.has(item.id) ? 'rotate-90' : ''}`} 
 fill="none" 
 stroke="currentColor" 
 viewBox="0 0 24 24"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
 </svg>
 </button>
 )}
 <div>
 <div className="text-sm font-medium text-gray-900">
 {item.nome}
 {item.hasMultipleUnits && (
 <span className="ml-2 text-xs text-gray-500 bg-blue-100 px-2 py-1 rounded">
 {item.quantita_totale} unità
 </span>
 )}
 </div>
 {item.note && (
 <div className="text-sm text-gray-500">{item.note}</div>
 )}
 </div>
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
 {item.categoria_nome || `${item.categoria_madre} - ${item.categoria_figlia}`}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
 {item.corsi_assegnati ? item.corsi_assegnati.join(', ') : '-'}
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.stato_effettivo)}`}>
 {getStatusText(item.stato_effettivo)}
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
 {item.quantita_totale}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
 {item.scaffale || 'N/A'}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
 <div className="flex space-x-2">
 <button
 onClick={() => setQrCodeItem(item)}
 className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
 title="Genera QR Code"
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
 </svg>
 </button>
 <button
 onClick={() => handleEditItem(item)}
 className="text-yellow-600 hover:text-yellow-900 p-1 rounded hover:bg-yellow-50 transition-colors"
 title="Modifica articolo"
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
 </svg>
 </button>
 <button
 onClick={() => handleDeleteItem(item.id)}
 className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
 title="Elimina articolo"
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
 </svg>
 </button>
 </div>
 </td>
 </tr>
 
 {/* Expanded Units Rows */}
 {expandedItems.has(item.id) && item.units.map((unit) => (
 <tr key={unit.unitId} className="bg-gray-50 hover:bg-gray-100">
 <td className="px-6 py-3 whitespace-nowrap pl-16">
 <div className="flex items-center">
 <div className="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
 <div>
 <div className="text-sm font-medium text-gray-700">
 {unit.nome} - Unità {unit.unitNumber}
 </div>
 <div className="text-xs text-gray-500">
 ID: {unit.unitId}
 </div>
 </div>
 </div>
 </td>
 <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
 {unit.categoria_nome || `${unit.categoria_madre} - ${unit.categoria_figlia}`}
 </td>
 <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
 {unit.corsi_assegnati ? unit.corsi_assegnati.join(', ') : '-'}
 </td>
 <td className="px-6 py-3 whitespace-nowrap">
 <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(unit.stato_effettivo)}`}>
 {getStatusText(unit.stato_effettivo)}
 </span>
 </td>
 <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
 1
 </td>
 <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
 {unit.scaffale || 'N/A'}
 </td>
 <td className="px-6 py-3 whitespace-nowrap text-sm font-medium">
 <div className="flex space-x-2">
 <button
 onClick={() => setQrCodeItem(unit)}
 className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition-colors"
 title="Genera QR Code per questa unità"
 >
 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
 </svg>
 </button>
 </div>
 </td>
 </tr>
 ))}
 </React.Fragment>
 ))}
 </tbody>
        </table>
      </div>
      
      {/* Mobile Card View */}
      <div className="lg:hidden">
        {groupedInventory.map((item) => (
          <div key={item.id} className="border-b border-gray-200 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">{item.nome}</h3>
                <div className="mt-1 space-y-1">
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Categoria:</span> {item.categoria_nome || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Corso:</span> {item.categoria_madre || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Stato:</span> 
                    <span className={`ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.stato_effettivo === 'disponibile' 
                        ? 'bg-green-100 text-green-800' 
                        : item.stato_effettivo === 'in_prestito' 
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {item.stato_effettivo === 'disponibile' ? 'Disponibile' : 
                       item.stato_effettivo === 'in_prestito' ? 'In Prestito' : 'In Riparazione'}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Quantità:</span> {item.quantita_totale}
                  </p>
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Scaffale:</span> {item.scaffale || 'N/A'}
                  </p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex flex-col space-y-2 ml-4">
                <button
                  onClick={() => setQrCodeItem(item)}
                  className="text-blue-600 hover:text-blue-900 p-2 rounded hover:bg-blue-50 transition-colors"
                  title="Genera QR Code"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleEditItem(item)}
                  className="text-yellow-600 hover:text-yellow-900 p-2 rounded hover:bg-yellow-50 transition-colors"
                  title="Modifica articolo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50 transition-colors"
                  title="Elimina articolo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Expandable Units for Mobile */}
            {item.hasMultipleUnits && (
              <div className="mt-3">
                <button
                  onClick={() => toggleExpanded(item.id)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {expandedItems.has(item.id) ? 'Nascondi' : 'Mostra'} unità ({item.units.length})
                </button>
                {expandedItems.has(item.id) && (
                  <div className="mt-2 space-y-2">
                    {item.units.map((unit) => (
                      <div key={unit.unitId} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              {unit.nome} - Unità {unit.unitNumber}
                            </p>
                            <p className="text-xs text-gray-500">
                              ID: {unit.codice_univoco || `Unit_${unit.unitNumber}`}
                            </p>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            unit.stato === 'disponibile' 
                              ? 'bg-green-100 text-green-800' 
                              : unit.stato === 'in_prestito' 
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {unit.stato === 'disponibile' ? 'Disponibile' : 
                             unit.stato === 'in_prestito' ? 'In Prestito' : 'In Riparazione'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>

 {/* Empty State */}
 {filteredInventory.length === 0 && (
 <div className="text-center py-12">
 <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
 </svg>
 <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun articolo trovato</h3>
 <p className="mt-1 text-sm text-gray-500">
 {searchTerm ? 'Prova a modificare i filtri di ricerca.' : 'Inizia aggiungendo un nuovo articolo.'}
 </p>
 <div className="mt-6">
 <button
 onClick={() => setShowAddModal(true)}
 className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
 >
 Aggiungi Articolo
 </button>
 </div>
 </div>
 )}
 </div>

 {/* Modals */}
 {showAddModal && (
 <StepInventoryModal
 isOpen={showAddModal}
 onClose={() => {
 setShowAddModal(false);
 setEditingItem(null);
 }}
 onSuccess={() => {
 fetchInventory();
 setEditingItem(null);
 }}
 editingItem={editingItem}
 categories={categories}
 courses={courses}
 />
 )}

 {qrCodeItem && (
 <QRCodeGenerator
 item={qrCodeItem}
 onClose={() => setQrCodeItem(null)}
 />
 )}


 {showAdvancedFilters && (
 <AdvancedFilters
 isOpen={showAdvancedFilters}
 onClose={() => setShowAdvancedFilters(false)}
 onApply={applyFilters}
 onSave={handleSaveFilter}
 onLoad={handleLoadFilter}
 onDelete={handleDeleteFilter}
 savedFilters={savedFilters}
 currentFilters={currentFilters}
 categories={categories}
 courses={courses}
 />
 )}

 {/* Category Manager Modal */}
 {showCategoryManager && (
 <div 
 className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
 onClick={(e) => e.target === e.currentTarget && setShowCategoryManager(false)}
 >
 <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
 <div className="flex items-center justify-between p-6 border-b border-gray-200">
 <h3 className="text-xl font-semibold text-gray-900">Gestisci Categorie</h3>
 <button
 onClick={() => setShowCategoryManager(false)}
 className="text-gray-400 hover:text-gray-600 transition-colors"
 >
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>
 
 <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {/* Add New Category */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Aggiungi Nuova Categoria</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nome Categoria</label>
                      <input
                        type="text"
                        value={newCategory.nome}
                        onChange={(e) => setNewCategory({nome: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                        placeholder="es. Telecamere, Cavalletti, Obiettivi, Lenti, etc."
                      />
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>💡 <strong>Suggerimento:</strong> Le categorie sono indipendenti dai corsi. Puoi assegnare la stessa categoria a oggetti di corsi diversi durante la creazione.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleAddCategory}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Aggiungi Categoria
                  </button>
                </div>

                {/* Categories List */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Categorie Esistenti</h4>
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <div key={category.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">Categoria:</span>
                            <span className="font-medium text-blue-600">{category.nome}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Elimina categoria"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {categories.length === 0 && (
                      <p className="text-gray-500 text-center py-4">Nessuna categoria disponibile</p>
                    )}
                  </div>
                </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
};

export default Inventory;