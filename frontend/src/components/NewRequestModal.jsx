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
  const [tipoUtilizzo, setTipoUtilizzo] = useState('');
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
      setTipoUtilizzo('');
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
    let dataFine;
    
    if (selectedObject.tipo_prestito === 'solo_interno') {
      dataFine = new Date(dateRange.dal); // Stesso giorno per uso interno
    } else if (selectedObject.tipo_prestito === 'entrambi' && tipoUtilizzo === 'interno') {
      dataFine = new Date(dateRange.dal); // Stesso giorno se scelto interno
    } else {
      dataFine = new Date(dateRange.al); // Data normale per esterno
    }
    
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

    // Validazione speciale per uso interno
    if (selectedObject.tipo_prestito === 'solo_interno' || 
        (selectedObject.tipo_prestito === 'entrambi' && tipoUtilizzo === 'interno')) {
      const dataInizioDay = dataInizio.toDateString();
      const dataFineDay = dataFine.toDateString();
      
      if (dataInizioDay !== dataFineDay) {
        setError('Per utilizzo interno, la data di fine deve essere lo stesso giorno della data di inizio');
        setLoading(false);
        return;
      }
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
          al: dataFine.toISOString().split('T')[0],
          note: note,
          tipo_utilizzo: selectedObject.tipo_prestito === 'entrambi' ? tipoUtilizzo : null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle user blocked error specially
        if (errorData.blocked) {
          setError(
            <div className="space-y-2">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold text-red-800">Account Bloccato</span>
              </div>
              <p className="text-red-700">{errorData.message}</p>
              <div className="bg-red-50 border border-red-200 rounded p-3 mt-2">
                <p className="text-sm text-red-800">
                  <strong>Motivo:</strong> {errorData.reason}
                </p>
                <p className="text-sm text-red-800 mt-1">
                  <strong>Penalità accumulate:</strong> {errorData.strikes} strike
                </p>
                <p className="text-sm text-red-700 mt-2 font-medium">
                  {errorData.helpMessage}
                </p>
              </div>
            </div>
          );
        } else {
          throw new Error(errorData.error || 'Errore nella creazione della richiesta');
        }
        return;
      }

      // Show success notification
      window.dispatchEvent(new CustomEvent('showNotification', {
        detail: {
          type: 'success',
          data: { 
            title: 'Richiesta inviata con successo!', 
            body: 'La tua richiesta è stata inviata e sarà valutata dagli amministratori.',
            icon: '/favicon.ico'
          }
        }
      }));

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
      setDateRange(prev => {
        const newRange = { ...prev, [name]: value };
        
        // Per uso interno, imposta automaticamente la data di fine = data di inizio
        if ((selectedObject?.tipo_prestito === 'solo_interno' || 
             (selectedObject?.tipo_prestito === 'entrambi' && tipoUtilizzo === 'interno')) && 
            name === 'dal') {
          newRange.al = value;
        }
        
        return newRange;
      });
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
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.tipo_prestito === 'solo_interno' 
                            ? 'bg-orange-100 text-orange-800' 
                            : item.tipo_prestito === 'solo_esterno'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {item.tipo_prestito === 'solo_interno' ? '🏠 Solo per uso interno' : 
                           item.tipo_prestito === 'solo_esterno' ? '📅 Solo prestito esterno' : 
                           '🔄 Entrambi (tu scegli)'}
                        </span>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          {item.unita_disponibili} disponibili
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{item.categoria_nome}</p>
                    {item.tipo_prestito === 'solo_interno' && (
                      <p className="text-xs text-orange-600 mt-1">
                        ⚠️ Solo per uso interno all'accademia (stesso giorno)
                      </p>
                    )}
                    {item.tipo_prestito === 'entrambi' && (
                      <p className="text-xs text-purple-600 mt-1">
                        🔄 Potrai scegliere se utilizzarlo internamente o esternamente
                      </p>
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

              {/* Tipo Prestito Info */}
              {selectedObject.tipo_prestito === 'solo_interno' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-orange-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-orange-800">Solo per uso interno</h4>
                      <p className="text-xs text-orange-700 mt-1">
                        Solo per uso interno all'accademia. La data di fine sarà automaticamente impostata alla stessa data di inizio.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Scelta Tipo Utilizzo per oggetti "entrambi" */}
              {selectedObject.tipo_prestito === 'entrambi' && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center mb-3">
                    <svg className="w-5 h-5 text-purple-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-purple-800">Scegli il tipo di utilizzo</h4>
                      <p className="text-xs text-purple-700 mt-1">
                        Questo oggetto può essere utilizzato sia internamente che esternamente. Scegli come intendi utilizzarlo.
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-purple-200 cursor-pointer hover:bg-purple-50">
                      <input
                        type="radio"
                        name="tipo_utilizzo"
                        value="interno"
                        checked={tipoUtilizzo === 'interno'}
                        onChange={(e) => {
                          setTipoUtilizzo(e.target.value);
                          // Imposta automaticamente la data di fine = data di inizio
                          setDateRange(prev => ({ ...prev, al: prev.dal }));
                        }}
                        className="w-4 h-4 text-purple-600 border-purple-300 focus:ring-purple-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-purple-900">🏠 Uso Interno</span>
                        <p className="text-xs text-purple-700">Utilizzo all'interno dell'accademia (stesso giorno)</p>
                      </div>
                    </label>
                    
                    <label className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-purple-200 cursor-pointer hover:bg-purple-50">
                      <input
                        type="radio"
                        name="tipo_utilizzo"
                        value="esterno"
                        checked={tipoUtilizzo === 'esterno'}
                        onChange={(e) => setTipoUtilizzo(e.target.value)}
                        className="w-4 h-4 text-purple-600 border-purple-300 focus:ring-purple-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-purple-900">📅 Prestito Esterno</span>
                        <p className="text-xs text-purple-700">Prestito per più giorni, puoi portarlo fuori dall'accademia</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

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
                    {(selectedObject.tipo_prestito === 'solo_interno' || 
                      (selectedObject.tipo_prestito === 'entrambi' && tipoUtilizzo === 'interno')) && (
                      <span className="text-xs text-orange-600 ml-2">(Automatica per uso interno)</span>
                    )}
                  </label>
                  <input
                    type="date"
                    name="al"
                    value={(selectedObject.tipo_prestito === 'solo_interno' || 
                           (selectedObject.tipo_prestito === 'entrambi' && tipoUtilizzo === 'interno')) 
                          ? dateRange.dal : dateRange.al}
                    onChange={handleInputChange}
                    required
                    disabled={selectedObject.tipo_prestito === 'solo_interno' || 
                             (selectedObject.tipo_prestito === 'entrambi' && tipoUtilizzo === 'interno')}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      (selectedObject.tipo_prestito === 'solo_interno' || 
                       (selectedObject.tipo_prestito === 'entrambi' && tipoUtilizzo === 'interno')) 
                      ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
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
                  disabled={loading || (selectedObject.tipo_prestito === 'entrambi' && !tipoUtilizzo)}
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
};

export default NewRequestModal;