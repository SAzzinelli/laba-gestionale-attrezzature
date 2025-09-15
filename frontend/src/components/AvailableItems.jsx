import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import NewRequestModal from './NewRequestModal';

const AvailableItems = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const { token, user } = useAuth();

  // Fetch available items
  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventario/disponibili`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Errore nel caricamento articoli');

      const data = await response.json();
      setItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories - filter by user's course
  const fetchCategories = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/categorie`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        // Filter categories by user's course
        const userCourse = user?.corso_accademico;
        const filteredCategories = userCourse
          ? data.filter(cat => cat.madre && cat.madre.toLowerCase().includes(userCourse.toLowerCase()))
          : [];
        setCategories(filteredCategories);
      }
    } catch (err) {
      console.error('Errore caricamento categorie:', err);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, [user?.corso_accademico]);

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.posizione?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || 
                           item.categoria_nome?.toLowerCase().includes(selectedCategory.toLowerCase());
    
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'disponibile': return 'bg-green-100 text-green-800';
      case 'in_prestito': return 'bg-blue-100 text-blue-800';
      case 'in_riparazione': return 'bg-orange-100 text-orange-800';
      case 'non_disponibile': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'disponibile': return 'Disponibile';
      case 'in_prestito': return 'In Prestito';
      case 'in_riparazione': return 'In Riparazione';
      case 'non_disponibile': return 'Non Disponibile';
      default: return status;
    }
  };

  const handleRequestItem = (item) => {
    setSelectedItem(item);
    setShowNewRequestModal(true);
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Articoli Disponibili</h1>
            <p className="text-gray-600">Sfoglia e richiedi articoli per il tuo corso: {user?.corso_accademico}</p>
          </div>
          <div className="text-sm text-gray-500">
            {filteredItems.length} articoli trovati
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cerca articoli</label>
            <input
              type="text"
              placeholder="Nome, posizione, note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtra per categoria</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="select-field"
            >
              <option value="">Tutte le categorie</option>
              {categories.map(category => (
                <option key={category.id} value={category.nome}>
                  {category.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun articolo trovato</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedCategory 
              ? 'Prova a modificare i filtri di ricerca'
              : 'Non ci sono articoli disponibili per il tuo corso'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{item.nome}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.stato_effettivo)}`}>
                    {getStatusText(item.stato_effettivo)}
                  </span>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span>{item.unita_disponibili || 0} disponibili</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{item.posizione || 'Posizione non specificata'}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span>{item.categoria_nome || 'N/A'}</span>
                  </div>
                </div>

                {item.note && (
                  <p className="text-sm text-gray-600 mb-6">{item.note}</p>
                )}

                <div className="flex justify-center">
                  <button
                    onClick={() => handleRequestItem(item)}
                    disabled={item.stato_effettivo !== 'disponibile'}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      item.stato_effettivo === 'disponibile'
                        ? 'btn-primary hover-lift'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {item.stato_effettivo === 'disponibile' ? 'Richiedi' : 'Non disponibile'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Request Modal */}
      {showNewRequestModal && (
        <NewRequestModal
          isOpen={showNewRequestModal}
          onClose={() => {
            setShowNewRequestModal(false);
            setSelectedItem(null);
          }}
          onSuccess={() => {
            setShowNewRequestModal(false);
            setSelectedItem(null);
          }}
          selectedItem={selectedItem}
        />
      )}
    </div>
  );
};

export default AvailableItems;
