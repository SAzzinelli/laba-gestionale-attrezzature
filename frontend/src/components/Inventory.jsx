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
 fetchCategories();
 fetchCourses();
  }, []);

  // Group inventory by item name and add unit details
  const groupedInventory = inventory.reduce((acc, item) => {
    const existingItem = acc.find(group => group.nome === item.nome);
    
    if (existingItem) {
      existingItem.quantita_totale += 1;
      existingItem.unita.push({
        id: item.id,
        stato: item.stato_effettivo,
        note: item.note
      });
    } else {
      acc.push({
 ...item,
        quantita_totale: 1,
        hasMultipleUnits: false,
        unita: [{
          id: item.id,
          stato: item.stato_effettivo,
          note: item.note
        }]
      });
    }
    
    return acc;
  }, []).map(item => ({
 ...item,
    hasMultipleUnits: item.quantita_totale > 1
  }));

  // Filter inventory based on search term
  const filteredInventory = groupedInventory.filter(item =>
    item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.note && item.note.toLowerCase().includes(searchTerm.toLowerCase())) ||
    item.categoria_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.categoria_madre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.categoria_figlia?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate low stock items
  const lowStockItems = inventory.filter(item => item.quantita_totale <= 2);

  // Toggle expanded state for items with multiple units
  const toggleExpanded = (itemId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  // Get status color class
  const getStatusColor = (status) => {
    switch (status) {
      case 'disponibile':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_prestito':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_riparazione':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'perso':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'disponibile':
        return 'Disponibile';
      case 'in_prestito':
        return 'In Prestito';
      case 'in_riparazione':
        return 'In Riparazione';
      case 'perso':
        return 'Perso';
      default:
        return status;
    }
  };

  // Handle edit item
  const handleEditItem = (item) => {
    setEditingItem(item);
 };

 // Handle delete item
 const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo articolo?')) return;

 try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventario/${itemId}`, {
 method: 'DELETE',
 headers: {
 'Authorization': `Bearer ${token}`
 }
 });

 if (!response.ok) throw new Error('Errore nell\'eliminazione');

      await fetchInventory();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      await exportInventoryToExcel(inventory);
 } catch (err) {
 setError(err.message);
 }
 };

  // Handle import
  const handleImportExcel = async (file) => {
    try {
      const data = await parseInventoryExcel(file);
      // Process imported data
      console.log('Imported data:', data);
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle template
  const handleTemplate = async () => {
    try {
      await generateInventoryTemplate();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle add category
  const handleAddCategory = async () => {
    if (!newCategory.nome.trim()) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/categorie-semplici`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newCategory)
      });

      if (!response.ok) throw new Error('Errore nella creazione categoria');

      setNewCategory({ nome: '' });
      await fetchCategories();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle delete category
  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa categoria?')) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/categorie-semplici/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Errore nell\'eliminazione categoria');

      await fetchCategories();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle apply filters
  const handleApplyFilters = (filters) => {
    setCurrentFilters(filters);
    // Apply filters logic here
  };

  // Handle save filter
  const handleSaveFilter = (filterName, filters) => {
    const newFilter = { id: Date.now(), name: filterName, filters };
    setSavedFilters([...savedFilters, newFilter]);
  };

  // Handle delete filter
  const handleDeleteFilter = (filterId) => {
    setSavedFilters(savedFilters.filter(f => f.id !== filterId));
  };

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
 <span className="ml-2 text-gray-600">Caricamento inventario...</span>
 </div>
 );
 }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center">
          <svg className="icon text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-800 ">{error}</p>
        </div>
      </div>
    );
  }

 return (
 <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
 </svg>
 <span>Nuovo Articolo</span>
 </button>
              
              <button
                onClick={() => setShowCategoryManager(true)}
                className="btn-secondary"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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

        {/* Inventory Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredInventory.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
              {/* Card Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
 <div className="flex items-center">
 {item.hasMultipleUnits && (
 <button
 onClick={() => toggleExpanded(item.id)}
                          className="mr-3 p-1 hover:bg-gray-100 rounded transition-colors"
 title={expandedItems.has(item.id) ? "Chiudi dettagli" : "Mostra dettagli"}
 >
 <svg 
 className={`w-4 h-4 text-gray-500 transition-transform ${expandedItems.has(item.id) ? 'rotate-90' : ''}`} 
 fill="none" 
 stroke="currentColor" 
 viewBox="0 0 24 24"
 >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
 </svg>
 </button>
 )}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
 {item.nome}
                        </h3>
 {item.hasMultipleUnits && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
 {item.quantita_totale} unità
 </span>
 )}
                      </div>
 </div>
 {item.note && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{item.note}</p>
 )}
 </div>
                  
                  {/* Status Badge */}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.stato_effettivo)}`}>
 {getStatusText(item.stato_effettivo)}
 </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6">
                <div className="space-y-4">
                  {/* Category */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Categoria</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {item.categoria_nome || `${item.categoria_madre} - ${item.categoria_figlia}`}
                    </p>
                  </div>

                  {/* Course */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Corso Accademico</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {item.corsi_assegnati ? item.corsi_assegnati.join(', ') : 'Non assegnato'}
                    </p>
                  </div>

                  {/* Quantity and Shelf */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quantità</label>
                      <p className="text-lg font-semibold text-gray-900 mt-1">{item.quantita_totale}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Scaffale</label>
                      <p className="text-sm text-gray-900 mt-1">{item.scaffale || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer - Actions */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="flex items-center justify-between">
 <div className="flex space-x-2">
 <button
 onClick={() => setQrCodeItem(item)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
 title="Genera QR Code"
 >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
 </svg>
                      QR Code
 </button>
 <button
 onClick={() => handleEditItem(item)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
 title="Modifica articolo"
 >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
 </svg>
                      Modifica
 </button>
                  </div>
 <button
 onClick={() => handleDeleteItem(item.id)}
                    className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50 transition-colors"
 title="Elimina articolo"
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
 </svg>
 </button>
 </div>
              </div>

              {/* Expanded Units Section */}
              {item.hasMultipleUnits && expandedItems.has(item.id) && (
                <div className="border-t border-gray-200 bg-gray-50 p-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-4">Unità individuali:</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {item.unita.map((unit, index) => (
                      <div key={unit.id || index} className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              ID: {unit.id || `Unit ${index + 1}`}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Stato: {unit.stato || 'Disponibile'}
                            </div>
                            {unit.note && (
                              <div className="text-xs text-gray-500 mt-1">{unit.note}</div>
                            )}
                          </div>
                          <button
                            onClick={() => setQrCodeItem({...item, unita: [unit]})}
                            className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                            title="QR Code per questa unità"
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                            QR
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* QR Code Modal */}
        {qrCodeItem && (
          <div className="modal-overlay" onClick={() => setQrCodeItem(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="text-xl font-bold text-primary">QR Code - {qrCodeItem.nome}</h2>
                <button
                  onClick={() => setQrCodeItem(null)}
                  className="text-muted hover:text-primary"
                >
                  <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
 </div>
              <div className="modal-body">
                <QRCodeGenerator item={qrCodeItem} />
 </div>
 </div>
 </div>
        )}

        {/* Category Manager Modal */}
        {showCategoryManager && (
          <div className="modal-overlay" onClick={() => setShowCategoryManager(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="text-xl font-bold text-primary">Gestione Categorie</h2>
 <button
                  onClick={() => setShowCategoryManager(false)}
                  className="text-muted hover:text-primary"
 >
                  <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>
              <div className="modal-body">
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Nuova Categoria</label>
                    <input
                      type="text"
                      value={newCategory.nome}
                      onChange={(e) => setNewCategory({...newCategory, nome: e.target.value})}
                      className="input-field"
                      placeholder="Nome categoria..."
                    />
                    <button
                      onClick={handleAddCategory}
                      className="btn-primary mt-2"
                    >
                      Aggiungi Categoria
                    </button>
 </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Categorie Esistenti</h3>
                    <div className="space-y-2">
                      {categories.map(cat => (
                        <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium">{cat.nome}</span>
 <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="text-red-600 hover:text-red-800"
 >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
 </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
 </div>
 </div>
 )}

        {/* Advanced Filters Modal */}
 {showAdvancedFilters && (
 <AdvancedFilters
 isOpen={showAdvancedFilters}
 onClose={() => setShowAdvancedFilters(false)}
            onApply={handleApplyFilters}
 savedFilters={savedFilters}
            onSaveFilter={handleSaveFilter}
            onDeleteFilter={handleDeleteFilter}
 categories={categories}
 courses={courses}
 />
 )}

        {/* Step Inventory Modal */}
        <StepInventoryModal
          isOpen={showAddModal || !!editingItem}
          onClose={() => {
            setShowAddModal(false);
            setEditingItem(null);
          }}
          onSuccess={() => {
            fetchInventory();
            setShowAddModal(false);
            setEditingItem(null);
          }}
          editingItem={editingItem}
          categories={categories}
          courses={courses}
        />
      </div>
 </div>
 );
};

export default Inventory;