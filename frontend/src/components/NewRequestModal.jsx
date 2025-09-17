import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

const NewRequestModal = ({ isOpen, onClose, selectedItem, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Oggetto, 2: ID Univoco, 3: Date e Note
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [dateRange, setDateRange] = useState({
    dal: new Date().toISOString().split('T')[0],
    al: ''
  });
  const [note, setNote] = useState('');
  const { token, user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      fetchInventory();
      // Reset all data when opening
      setStep(1);
      setSelectedObject(null);
      setSelectedUnit(null);
      setAvailableUnits([]);
      setDateRange({
        dal: new Date().toISOString().split('T')[0],
        al: ''
      });
      setNote('');
      setError(null);
    }
  }, [isOpen]);

  const fetchInventory = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventario/disponibili`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Group items by name and show only items with available units
        const groupedInventory = data.reduce((acc, item) => {
          const existingItem = acc.find(group => group.nome === item.nome);
          if (existingItem) {
            existingItem.unita_disponibili += item.unita_disponibili || 0;
          } else if (item.unita_disponibili > 0) {
            acc.push({
              ...item,
              unita_disponibili: item.unita_disponibili || 0
            });
          }
          return acc;
        }, []);
        setInventory(groupedInventory);
      }
    } catch (err) {
      console.error('Errore caricamento inventario:', err);
    }
  };

  const fetchAvailableUnits = async (inventoryId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventario/${inventoryId}/disponibili`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableUnits(data);
      } else {
        setAvailableUnits([]);
      }
    } catch (err) {
      console.error('Errore caricamento unità:', err);
      setAvailableUnits([]);
    }
  };

  const handleObjectSelect = (item) => {
    setSelectedObject(item);
    fetchAvailableUnits(item.id);
    setStep(2);
  };

  const handleUnitSelect = (unit) => {
    setSelectedUnit(unit);
    setStep(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validazione date frontend
    const dataInizio = new Date(dateRange.dal);
    const dataFine = new Date(dateRange.al);
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);

    if (dataInizio < oggi) {
      setError('La data di inizio non può essere nel passato');
      setLoading(false);
      return;
    }

    if (dataFine < dataInizio) {
      setError('La data di fine deve essere successiva alla data di inizio');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/richieste`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          unit_id: selectedUnit.id,
          dal: dateRange.dal,
          al: dateRange.al,
          note: note
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nella creazione della richiesta');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'dal' || name === 'al') {
      setDateRange(prev => ({
        ...prev,
        [name]: value
      }));
    } else if (name === 'note') {
      setNote(value);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Seleziona Oggetto';
      case 2: return 'Seleziona ID Univoco';
      case 3: return 'Date e Note';
      default: return 'Nuova Richiesta';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{getStepTitle()}</h2>
            <p className="text-sm text-gray-600 mt-1">Step {step} di 3</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Seleziona Oggetto */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Seleziona l'oggetto da richiedere</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {inventory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleObjectSelect(item)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{item.nome}</h4>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        {item.unita_disponibili} disponibili
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{item.categoria_nome}</p>
                    {item.posizione && (
                      <p className="text-xs text-gray-500 mt-1">📍 {item.posizione}</p>
                    )}
                  </div>
                ))}
              </div>
              {inventory.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p>Nessun oggetto disponibile per il tuo corso</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Seleziona ID Univoco */}
          {step === 2 && selectedObject && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Seleziona ID Univoco</h3>
                  <p className="text-sm text-gray-600">Oggetto: <strong>{selectedObject.nome}</strong></p>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  ← Cambia oggetto
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                {availableUnits.map((unit) => (
                  <div
                    key={unit.id}
                    onClick={() => handleUnitSelect(unit)}
                    className="p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{unit.codice_univoco}</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Disponibile
                      </span>
                    </div>
                    {unit.note && (
                      <p className="text-xs text-gray-500 mt-1">{unit.note}</p>
                    )}
                  </div>
                ))}
              </div>
              
              {availableUnits.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Nessuna unità disponibile per questo oggetto</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Date e Note */}
          {step === 3 && selectedObject && selectedUnit && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Date e Note</h3>
                  <p className="text-sm text-gray-600">
                    Oggetto: <strong>{selectedObject.nome}</strong> - ID: <strong>{selectedUnit.codice_univoco}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  ← Cambia ID
                </button>
              </div>

              {/* Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Inizio *
                  </label>
                  <input
                    type="date"
                    name="dal"
                    value={dateRange.dal}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Fine *
                  </label>
                  <input
                    type="date"
                    name="al"
                    value={dateRange.al}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note Aggiuntive
                </label>
                <textarea
                  name="note"
                  value={note}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Note aggiuntive (opzionale)"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                      Creazione...
                    </>
                  ) : (
                    'Crea Richiesta'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  // Helper functions
  const fetchAvailableUnits = async (inventoryId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventario/${inventoryId}/disponibili`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableUnits(data);
      } else {
        setAvailableUnits([]);
      }
    } catch (err) {
      console.error('Errore caricamento unità:', err);
      setAvailableUnits([]);
    }
  };

  const handleObjectSelect = (item) => {
    setSelectedObject(item);
    fetchAvailableUnits(item.id);
    setStep(2);
  };

  const handleUnitSelect = (unit) => {
    setSelectedUnit(unit);
    setStep(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validazione date frontend
    const dataInizio = new Date(dateRange.dal);
    const dataFine = new Date(dateRange.al);
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);

    if (dataInizio < oggi) {
      setError('La data di inizio non può essere nel passato');
      setLoading(false);
      return;
    }

    if (dataFine < dataInizio) {
      setError('La data di fine deve essere successiva alla data di inizio');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/richieste`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          unit_id: selectedUnit.id,
          dal: dateRange.dal,
          al: dateRange.al,
          note: note
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nella creazione della richiesta');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
};

export default NewRequestModal;