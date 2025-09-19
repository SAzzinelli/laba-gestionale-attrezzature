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
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [itemsUsingCategory, setItemsUsingCategory] = useState([]);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
 const [selectedCourse, setSelectedCourse] = useState('');
 const [viewMode, setViewMode] = useState('list'); // only list view
 const [showUnitDetailModal, setShowUnitDetailModal] = useState(false);
 const [selectedUnit, setSelectedUnit] = useState(null);
 const [unitLoanDetails, setUnitLoanDetails] = useState(null);
 const [loans, setLoans] = useState([]);
  const [itemUnits, setItemUnits] = useState({}); // Cache per le unità degli oggetti
 
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

 // Handle unit click to show loan details
 const handleUnitClick = async (unit) => {
   if (unit.stato !== 'prestato') return; // Only show details for loaned units
   
   try {
     const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/prestiti/unit/${unit.id}`, {
       headers: { 'Authorization': `Bearer ${token}` }
     });
     
     if (response.ok) {
       const loanDetails = await response.json();
       setSelectedUnit(unit);
       setUnitLoanDetails(loanDetails);
       setShowUnitDetailModal(true);
     }
   } catch (error) {
     console.error('Error fetching unit loan details:', error);
   }
 };

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

  // Fetch units for a specific item
  const fetchItemUnits = async (itemId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventario/${itemId}/units`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Errore nel caricamento unità');

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Errore unità:', err);
      return [];
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
      // Aggiungi la quantità dell'oggetto corrente alla quantità totale
      existingItem.quantita_totale += (item.quantita_totale || 1);
      existingItem.unita.push({
        id: item.id,
        stato: item.stato_effettivo,
        note: item.note,
        quantita: item.quantita_totale || 1
      });
    } else {
      acc.push({
 ...item,
        quantita_totale: item.quantita_totale || 1,
        hasMultipleUnits: false,
        unita: [{
          id: item.id,
          stato: item.stato_effettivo,
          note: item.note,
          quantita: item.quantita_totale || 1
        }]
      });
    }
    
    return acc;
  }, []).map(item => ({
 ...item,
    hasMultipleUnits: item.quantita_totale > 1
  }));

  // Filter inventory based on search term and category
  const filteredInventory = groupedInventory.filter(item => {
    // Debug: mostra la struttura dei dati categoria per il primo item
    if (groupedInventory.indexOf(item) === 0) {
      console.log('Debug categoria item:', {
        nome: item.nome,
        categoria_nome: item.categoria_nome,
        categoria_figlia: item.categoria_figlia,
        categoria_madre: item.categoria_madre,
        categoria_id: item.categoria_id
      });
    }
    // Search term filter
    const matchesSearch = !searchTerm || (
      item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.note && item.note.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.categoria_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.categoria_madre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.categoria_figlia?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Category filter (only for admin) - usa il nome della categoria semplice
    const matchesCategory = !selectedCategoryFilter || !isAdmin || (
      selectedCategoryFilter === (item.categoria_figlia || item.categoria_nome?.split(' - ')[1])
    );

    return matchesSearch && matchesCategory;
  });

  // Calculate low stock items
  const lowStockItems = inventory.filter(item => item.quantita_totale <= 2);

  // Toggle expanded state for items with multiple units
  const toggleExpanded = async (itemId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
      // Carica le unità se non sono già in cache
      if (!itemUnits[itemId]) {
        const units = await fetchItemUnits(itemId);
        setItemUnits(prev => ({
          ...prev,
          [itemId]: units
        }));
      }
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
  const handleDeleteCategory = (categoryId) => {
    // Trova la categoria da eliminare
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;

    // Controlla se la categoria è in uso
    const itemsUsing = inventory.filter(item => 
      item.categoria_id === categoryId || 
      item.categoria_nome === category.nome
    );

    setCategoryToDelete(category);
    setItemsUsingCategory(itemsUsing);
    setShowDeleteCategoryModal(true);
  };

  // Confirm delete category
  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/categorie-semplici/${categoryToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Errore nell\'eliminazione categoria');

      await fetchCategories();
      await fetchInventory(); // Ricarica l'inventario per aggiornare le categorie
      
      // Chiudi il modal
      setShowDeleteCategoryModal(false);
      setCategoryToDelete(null);
      setItemsUsingCategory([]);
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle edit category
  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setEditCategoryName(category.nome);
  };

  // Cancel edit category
  const cancelEditCategory = () => {
    setEditingCategory(null);
    setEditCategoryName('');
  };

  // Save edited category
  const saveEditCategory = async () => {
    if (!editingCategory || !editCategoryName.trim()) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/categorie-semplici/${editingCategory.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nome: editCategoryName.trim() })
      });

      if (!response.ok) throw new Error('Errore nella modifica categoria');

      await fetchCategories();
      await fetchInventory(); // Ricarica l'inventario per aggiornare le categorie
      
      // Reset editing state
      setEditingCategory(null);
      setEditCategoryName('');
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
 <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 md:p-6 border border-blue-200">
 <div className="flex items-center">
 <div className="p-2 md:p-3 bg-blue-500 rounded-lg md:rounded-xl shadow-lg">
 <svg className="w-5 h-5 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
 </svg>
 </div>
 <div className="ml-2 md:ml-4">
 <p className="text-xs md:text-sm font-semibold text-blue-700 uppercase tracking-wide">Totale Articoli</p>
 <p className="text-xl md:text-3xl font-bold text-blue-900 mt-0.5 md:mt-1">{inventory.length}</p>
 </div>
 </div>
 </div>

 <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 md:p-6 border border-green-200">
 <div className="flex items-center">
 <div className="p-2 md:p-3 bg-green-500 rounded-lg md:rounded-xl shadow-lg">
 <svg className="w-5 h-5 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 </div>
 <div className="ml-2 md:ml-4">
 <p className="text-xs md:text-sm font-semibold text-green-700 uppercase tracking-wide">Oggetti Totali</p>
 <p className="text-xl md:text-3xl font-bold text-green-900 mt-0.5 md:mt-1">
 {inventory.reduce((total, item) => total + (item.quantita_totale || 0), 0)}
 </p>
 </div>
 </div>
 </div>
 
 <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-3 md:p-6 border border-orange-200">
 <div className="flex items-center">
 <div className="p-2 md:p-3 bg-orange-500 rounded-lg md:rounded-xl shadow-lg">
 <svg className="w-5 h-5 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
 </svg>
 </div>
 <div className="ml-2 md:ml-4">
 <p className="text-xs md:text-sm font-bold text-orange-800 uppercase tracking-wide">In Riparazione</p>
 <p className="text-xl md:text-3xl font-bold text-orange-900 mt-0.5 md:mt-1">
 {inventory.filter(item => item.stato_effettivo === 'in_riparazione').length}
 </p>
 </div>
 </div>
 </div>

 <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-3 md:p-6 border border-red-200">
 <div className="flex items-center">
 <div className="p-2 md:p-3 bg-red-500 rounded-lg md:rounded-xl shadow-lg">
 <svg className="w-5 h-5 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 </div>
 <div className="ml-2 md:ml-4">
 <p className="text-xs md:text-sm font-bold text-red-800 uppercase tracking-wide">Scorte Basse</p>
 <p className="text-xl md:text-3xl font-bold text-red-900 mt-0.5 md:mt-1">{lowStockItems.length}</p>
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

 {/* Category Filter - Only for Admin */}
 {isAdmin && (
 <div className="w-full lg:w-64">
 <label className="block text-sm font-medium text-gray-700 mb-2">Filtra per Categoria</label>
 <select
 value={selectedCategoryFilter}
 onChange={(e) => setSelectedCategoryFilter(e.target.value)}
 className="select-field"
 >
 <option value="">Tutte le categorie</option>
 {categories.map(cat => (
 <option key={cat.id} value={cat.nome}>
 {cat.nome}
 </option>
 ))}
 </select>
 </div>
 )}

 {/* Clear Filters Button - Only show if filters are active */}
 {(searchTerm || selectedCategoryFilter) && (
 <div className="flex items-end">
 <button
 onClick={() => {
 setSearchTerm('');
 setSelectedCategoryFilter('');
 }}
 className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
 title="Cancella filtri"
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 <span className="hidden sm:inline">Cancella</span>
 </button>
 </div>
 )}
 </div>
 </div>

        {/* Results Counter */}
        {(searchTerm || selectedCategoryFilter) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                </svg>
                <span className="text-blue-800 font-medium">
                  {filteredInventory.length} {filteredInventory.length === 1 ? 'risultato trovato' : 'risultati trovati'}
                  {selectedCategoryFilter && ` nella categoria "${selectedCategoryFilter}"`}
                </span>
              </div>
              {filteredInventory.length === 0 && (
                <span className="text-blue-600 text-sm">Prova a modificare i filtri</span>
              )}
            </div>
          </div>
        )}

        {/* Inventory Cards */}
        <div className="space-y-4">
          {filteredInventory.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun articolo trovato</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm && selectedCategoryFilter 
                  ? `Nessun articolo corrisponde alla ricerca "${searchTerm}" nella categoria "${selectedCategoryFilter}"`
                  : searchTerm 
                    ? `Nessun articolo corrisponde alla ricerca "${searchTerm}"`
                    : selectedCategoryFilter
                      ? `Nessun articolo nella categoria "${selectedCategoryFilter}"`
                      : "Nessun articolo disponibile"
                }
              </p>
              {(searchTerm || selectedCategoryFilter) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategoryFilter('');
                  }}
                  className="btn-secondary"
                >
                  Cancella filtri
                </button>
              )}
            </div>
          ) : (
            filteredInventory.map((item) => (
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  {/* Category */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Categoria</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {item.categoria_figlia || 
                       (item.categoria_nome ? item.categoria_nome.split(' - ')[1] : null) || 
                       'Nessuna categoria'}
                    </p>
                  </div>

                  {/* Course */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Corso Accademico</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {item.corsi_assegnati ? item.corsi_assegnati.join(', ') : 'Non assegnato'}
                    </p>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quantità</label>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{item.quantita_totale}</p>
                  </div>

                  {/* Shelf */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Scaffale</label>
                    <p className="text-sm text-gray-900 mt-1">{item.posizione || 'N/A'}</p>
                  </div>

                  {/* Image */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Immagine</label>
                    <div className="mt-1">
                      {item.immagine_url ? (
                        <button
                          onClick={() => window.open(item.immagine_url, '_blank')}
                          className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full hover:bg-purple-200 transition-colors"
                          title="Visualizza immagine"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Visualizza
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400">Nessuna</span>
                      )}
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
                  <h4 className="text-sm font-medium text-gray-700 mb-4">
                    Unità individuali ({itemUnits[item.id]?.length || 0}):
                  </h4>
                  {!itemUnits[item.id] ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600">Caricamento unità...</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3 overflow-x-auto pb-2">
{itemUnits[item.id]?.map((unit, index) => {
                      // Determina il colore della pillola in base allo stato
                      const getStatusPillColor = (stato) => {
                        switch (stato) {
                          case 'disponibile':
                            return 'bg-green-100 text-green-800 border-green-200';
                          case 'prestato':
                            return 'bg-blue-100 text-blue-800 border-blue-200';
                          case 'riservato':
                            return 'bg-yellow-100 text-yellow-800 border-yellow-200';
                          case 'in_riparazione':
                            return 'bg-orange-100 text-orange-800 border-orange-200';
                          case 'perso':
                            return 'bg-red-100 text-red-800 border-red-200';
                          default:
                            return 'bg-gray-100 text-gray-800 border-gray-200';
                        }
                      };

                      const getStatusText = (stato) => {
                        switch (stato) {
                          case 'disponibile':
                            return 'Disponibile';
                          case 'prestato':
                            return 'In Prestito';
                          case 'riservato':
                            return 'Riservato';
                          case 'in_riparazione':
                            return 'In Riparazione';
                          case 'perso':
                            return 'Perso';
                          default:
                            return stato || 'Disponibile';
                        }
                      };

                      return (
                        <div 
                          key={unit.id} 
                          className={`bg-white p-3 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow flex-shrink-0 min-w-[120px] ${
                            unit.stato === 'prestato' ? 'cursor-pointer hover:border-blue-500' : ''
                          }`}
                          onClick={() => handleUnitClick(unit)}
                        >
                          <div className="text-center">
                            <div className="text-xs font-medium text-gray-900 mb-2 truncate" title={unit.codice_univoco || unit.id}>
                              {unit.codice_univoco || unit.id}
                              {unit.stato === 'prestato' && (
                                <svg className="w-3 h-3 inline-block ml-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                            </div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusPillColor(unit.stato)}`}>
                              {getStatusText(unit.stato)}
                            </span>
                            {unit.note && (
                              <div className="text-xs text-gray-500 mt-2 truncate" title={unit.note}>
                                {unit.note}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
          )}
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
                <QRCodeGenerator item={qrCodeItem} embedded={true} />
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
                          {editingCategory && editingCategory.id === cat.id ? (
                            <div className="flex-1 flex items-center space-x-2">
                              <input
                                type="text"
                                value={editCategoryName}
                                onChange={(e) => setEditCategoryName(e.target.value)}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Nome categoria..."
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditCategory();
                                  if (e.key === 'Escape') cancelEditCategory();
                                }}
                              />
                              <button
                                onClick={saveEditCategory}
                                className="text-green-600 hover:text-green-800 p-1"
                                title="Salva"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={cancelEditCategory}
                                className="text-gray-600 hover:text-gray-800 p-1"
                                title="Annulla"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="text-sm font-medium">{cat.nome}</span>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleEditCategory(cat)}
                                  className="text-blue-600 hover:text-blue-800 p-1"
                                  title="Modifica categoria"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(cat.id)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                  title="Elimina categoria"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </>
                          )}
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

        {/* Unit Loan Details Modal */}
        {showUnitDetailModal && selectedUnit && unitLoanDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Dettagli Prestito</h2>
                <button
                  onClick={() => {
                    setShowUnitDetailModal(false);
                    setSelectedUnit(null);
                    setUnitLoanDetails(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Unità</label>
                    <p className="text-lg font-semibold text-gray-900">{selectedUnit.codice_univoco}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Chi ha preso</label>
                    <p className="text-gray-900">{unitLoanDetails.chi}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-600">{unitLoanDetails.utente_email}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Data Uscita</label>
                      <p className="text-gray-900">{new Date(unitLoanDetails.data_uscita).toLocaleDateString('it-IT')}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Data Rientro</label>
                      <p className="text-gray-900">{new Date(unitLoanDetails.data_rientro).toLocaleDateString('it-IT')}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Stato</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      unitLoanDetails.stato === 'attivo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {unitLoanDetails.stato === 'attivo' ? 'Attivo' : 'Restituito'}
                    </span>
                  </div>
                  
                  {unitLoanDetails.note && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Note</label>
                      <p className="text-gray-600">{unitLoanDetails.note}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Category Confirmation Modal - Outside of other modals */}
        {showDeleteCategoryModal && categoryToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{zIndex: 999999}}>
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full" style={{zIndex: 1000000}}>
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">Elimina Categoria</h3>
                    <p className="text-sm text-gray-600">Questa azione non può essere annullata</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDeleteCategoryModal(false);
                    setCategoryToDelete(null);
                    setItemsUsingCategory([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6">
                {itemsUsingCategory.length > 0 ? (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-amber-800">Attenzione</h4>
                          <p className="text-sm text-amber-700 mt-1">
                            La categoria "{categoryToDelete.nome}" è utilizzata da {itemsUsingCategory.length} elemento/i dell'inventario.
                            Eliminando questa categoria, tutti gli elementi verranno spostati in "Nessuna categoria".
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Elementi che utilizzano questa categoria:</h5>
                      <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                        <ul className="space-y-1">
                          {itemsUsingCategory.map(item => (
                            <li key={item.id} className="text-sm text-gray-700">
                              • {item.nome}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600">
                    Sei sicuro di voler eliminare la categoria "{categoryToDelete.nome}"?
                  </p>
                )}
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowDeleteCategoryModal(false);
                      setCategoryToDelete(null);
                      setItemsUsingCategory([]);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={confirmDeleteCategory}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    {itemsUsingCategory.length > 0 ? 'Elimina e Sposta' : 'Elimina'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
 </div>
 );
};

export default Inventory;