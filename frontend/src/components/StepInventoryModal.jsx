import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

const StepInventoryModal = ({ isOpen, onClose, onSuccess, editingItem = null }) => {
 const [step, setStep] = useState(1); // 1: Basic Info, 2: Description & Image, 3: Course & Category, 4: Unit Codes
 const [courses, setCourses] = useState([]);
 const [categories, setCategories] = useState([]);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState(null);
 
  const [formData, setFormData] = useState({
    nome: '',
    quantita_totale: 1,
    scaffale: '',
    fornitore: '',
    note: '',
    immagine_url: '',
    tipo_prestito: 'solo_esterno',
    corsi_assegnati: [],
    categoria_madre: '',
    categoria_id: '',
    unita: []
  });
 
 const { token } = useAuth();

 // Fetch data when modal opens
 useEffect(() => {
 if (isOpen) {
 fetchCourses();
 fetchCategories();
 if (editingItem) {
 // Carica dati per la modifica
        setFormData({
          nome: editingItem.nome || '',
          quantita_totale: editingItem.quantita_totale || 1,
          scaffale: editingItem.posizione || '',
          fornitore: editingItem.fornitore || '',
          note: editingItem.note || '',
          immagine_url: editingItem.immagine_url || '',
          tipo_prestito: editingItem.tipo_prestito || 'prestito',
          corsi_assegnati: editingItem.corsi_assegnati || [],
          categoria_madre: '', // Non serve, viene derivato automaticamente
          categoria_id: editingItem.categoria_id || '',
          unita: []
        });
 // Carica le unità esistenti per la modifica
 fetchExistingUnits(editingItem.id);
 } else {
 // Solo per nuovo oggetto, resetta il form
      setFormData({
        nome: '',
        quantita_totale: 1,
        scaffale: '',
        fornitore: '',
        note: '',
        immagine_url: '',
        tipo_prestito: 'solo_esterno',
        corsi_assegnati: [],
        categoria_madre: '', // Non serve, viene derivato automaticamente
        categoria_id: '',
        unita: []
      });
 setStep(1);
 setError(null);
 }
 } else if (!isOpen) {
 // Solo reset step e error quando si chiude
 setStep(1);
 setError(null);
 }
 }, [isOpen, editingItem]);

 // Fetch existing units for editing
 const fetchExistingUnits = async (itemId) => {
 try {
 const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventario/${itemId}/units`, {
 headers: { 'Authorization': `Bearer ${token}` }
 });
 if (response.ok) {
 const units = await response.json();
 setFormData(prev => ({
 ...prev,
 unita: units.map(unit => ({
 codice_univoco: unit.codice_univoco,
 stato: unit.stato,
 prestito_corrente_id: unit.prestito_corrente_id
 }))
 }));
 }
 } catch (err) {
 console.error('Errore caricamento unità:', err);
 }
 };

 const fetchCourses = async () => {
 try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/corsi`, {
 headers: { 'Authorization': `Bearer ${token}` }
 });
 if (response.ok) {
 const data = await response.json();
 setCourses(data);
 }
 } catch (err) {
 console.error('Errore caricamento corsi:', err);
 }
 };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/categorie-semplici`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Errore caricamento categorie:', err);
    }
  };

 // Generate unit codes automatically
 const generateUnitCodes = (quantity, baseName) => {
 const units = [];
 for (let i = 1; i <= quantity; i++) {
 const code = `${baseName.toUpperCase().replace(/\s+/g, '')}_${String(i).padStart(3, '0')}`;
 units.push({
 codice_univoco: code,
 note: ''
 });
 }
 return units;
 };

// Handle quantity change
const handleQuantityChange = (quantity) => {
  // Permetti al campo di essere vuoto temporaneamente
  if (quantity === '' || quantity === null || quantity === undefined) {
    setFormData(prev => ({
      ...prev,
      quantita_totale: ''
    }));
    return;
  }
  
  const parsedQuantity = parseInt(quantity);
  if (isNaN(parsedQuantity) || parsedQuantity < 1) {
    return; // Non aggiornare se non è un numero valido
  }
  
  const newQuantity = Math.max(1, parsedQuantity);
  
  // Se stiamo modificando un articolo esistente, non rigenerare i codici
  if (editingItem) {
    setFormData(prev => ({
      ...prev,
      quantita_totale: newQuantity
    }));
  } else {
    // Solo per nuovi articoli, genera i codici
    const units = generateUnitCodes(newQuantity, formData.nome || 'ITEM');
    setFormData(prev => ({
      ...prev,
      quantita_totale: newQuantity,
      unita: units
    }));
  }
};

 // Handle unit code change
 const handleUnitCodeChange = (index, newCode) => {
 const updatedUnits = [...formData.unita];
 updatedUnits[index].codice_univoco = newCode;
 setFormData(prev => ({
 ...prev,
 unita: updatedUnits
 }));
 };

const handleSubmit = async () => {
  if (!formData.nome || !formData.quantita_totale || formData.quantita_totale <= 0 || formData.unita.length === 0) {
    setError('Compila tutti i campi obbligatori');
    return;
  }

 try {
 setLoading(true);
 const method = editingItem ? 'PUT' : 'POST';
 const url = editingItem ? `${import.meta.env.VITE_API_BASE_URL}/api/inventario/${editingItem.id}` : `${import.meta.env.VITE_API_BASE_URL}/api/inventario`;
 
  // Prepara i dati per l'invio
  const submitData = {
    ...formData,
    posizione: formData.scaffale, // Mappa scaffale a posizione per il backend
    categoria_madre: formData.corsi_assegnati[0] || '', // Usa il primo corso selezionato come categoria_madre
    categoria_id: formData.categoria_id
  };

  // Rimuovi i campi che non servono al backend
  delete submitData.scaffale;

 const response = await fetch(url, {
 method,
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify(submitData)
 });

 if (!response.ok) {
 const errorData = await response.json();
 throw new Error(errorData.error || 'Errore nel salvataggio');
 }

 onSuccess && onSuccess();
 handleClose();
 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };

 const handleClose = () => {
 setStep(1);
 setError(null);
 onClose();
 };

 const getStepTitle = () => {
   switch (step) {
     case 1: return 'Informazioni Base';
     case 2: return 'Descrizione e Immagine';
     case 3: return 'Corso e Categoria';
     case 4: return 'Codici Univoci';
     default: return 'Nuovo Elemento';
   }
 };

const canProceed = () => {
  switch (step) {
    case 1: return formData.nome && formData.quantita_totale && formData.quantita_totale > 0;
    case 2: return true; // Descrizione e immagine sono opzionali
    case 3: return formData.corsi_assegnati.length > 0; // Categoria non obbligatoria
    case 4: return formData.unita.length > 0;
    default: return false;
  }
};

 if (!isOpen) return null;

 return (
 <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
 <div className="modal-content h-[90vh] flex flex-col" style={{ maxWidth: '56rem', width: '95vw' }} onClick={(e) => e.stopPropagation()}>
 <div className="modal-header">
 <div>
 <h2 className="text-lg font-semibold text-primary">
 {editingItem ? 'Modifica Elemento' : 'Nuovo Elemento'}
 </h2>
 <p className="text-xs text-secondary mt-1">
   {getStepTitle()} (Passo {step} di 4)
 </p>
 </div>
 <button
 onClick={handleClose}
 className="text-muted hover:text-primary"
 >
 <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>
 
 {/* Progress Bar */}
 <div className="px-6 py-4 border-b border-gray-200">
 <div className="flex items-center justify-center">
 <div className="flex items-center space-x-4">
 {[
   { num: 1, label: 'Info Base', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
   { num: 2, label: 'Descrizione', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
   { num: 3, label: 'Corsi & Categoria', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
   { num: 4, label: 'Codici Unità', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg> }
 ].map((stepData, index) => (
 <React.Fragment key={stepData.num}>
 <div className="flex flex-col items-center">
 <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
 stepData.num <= step 
 ? 'bg-blue-600 text-white shadow-lg scale-110' 
 : 'bg-gray-200 text-gray-500'
 }`}>
 {stepData.num <= step ? stepData.icon : stepData.num}
 </div>
 <span className={`text-xs mt-2 font-medium ${
 stepData.num <= step ? 'text-blue-600' : 'text-gray-500'
 }`}>
 {stepData.label}
 </span>
 </div>
 {index < 3 && (
 <div className={`w-16 h-1 mx-2 rounded transition-all duration-300 ${
 stepData.num < step 
 ? 'bg-blue-600' 
 : 'bg-gray-200'
 }`} />
 )}
 </React.Fragment>
 ))}
 </div>
 </div>
 </div>

 <div className="modal-body flex-1 overflow-y-auto">
 {/* Step 1: Basic Info */}
 {step === 1 && (
 <div className="space-y-4">
 <h3 className="text-lg font-semibold text-primary mb-4">
 Informazioni Base dell'Elemento
 </h3>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="form-group">
 <label className="form-label">Nome Elemento *</label>
 <input
 type="text"
 required
 value={formData.nome}
onChange={(e) => {
const newName = e.target.value;
setFormData(prev => ({ ...prev, nome: newName }));
if (newName && formData.quantita_totale && formData.quantita_totale > 0) {
const units = generateUnitCodes(formData.quantita_totale, newName);
setFormData(prev => ({ ...prev, unita: units }));
}
}}
 className="input-field"
 placeholder="Nome dell'elemento"
 />
 </div>

 <div className="form-group">
 <label className="form-label">Quantità *</label>
 <input
 type="number"
 min="1"
 required
 value={formData.quantita_totale}
 onChange={(e) => handleQuantityChange(e.target.value)}
 className="input-field"
 />
 </div>

                <div className="form-group">
                  <label className="form-label">Scaffale</label>
                  <input
                    type="text"
                    value={formData.scaffale}
                    onChange={(e) => setFormData(prev => ({ ...prev, scaffale: e.target.value }))}
                    className="input-field"
                    placeholder="Es. A1, B2, C3"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Fornitore</label>
                  <input
                    type="text"
                    value={formData.fornitore}
                    onChange={(e) => setFormData(prev => ({ ...prev, fornitore: e.target.value }))}
                    className="input-field"
                    placeholder="Es. Canon, Nikon, Sony"
                  />
                </div>


 </div>
 </div>
 )}

 {/* Step 2: Description & Image */}
 {step === 2 && (
 <div className="space-y-4">
 <h3 className="text-lg font-semibold text-primary mb-4">
   Descrizione e Immagine
 </h3>
 
 <div className="space-y-4">
   <div className="form-group">
     <label className="form-label">Descrizione</label>
     <textarea
       value={formData.note}
       onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
       rows={3}
       className="input-field"
       placeholder="Descrizione dell'oggetto"
     />
   </div>

   <div className="form-group">
     <label className="form-label">Link Immagine</label>
     <input
       type="url"
       value={formData.immagine_url}
       onChange={(e) => setFormData(prev => ({ ...prev, immagine_url: e.target.value }))}
       className="input-field"
       placeholder="https://drive.google.com/... (link diretto immagine)"
     />
     <p className="text-xs text-gray-500 mt-1">
       Inserisci un link diretto a un'immagine (es. Google Drive).
     </p>
   </div>

   <div className="form-group">
     <label className="form-label">Tipo di Utilizzo</label>
     <select
       value={formData.tipo_prestito}
       onChange={(e) => setFormData(prev => ({ ...prev, tipo_prestito: e.target.value }))}
       className="input-field"
     >
       <option value="solo_esterno">Solo Prestito Esterno</option>
       <option value="solo_interno">Solo Uso Interno</option>
       <option value="entrambi">Entrambi (Utente Sceglie)</option>
     </select>
     <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
       <p className="text-xs text-blue-700">
         {formData.tipo_prestito === 'solo_esterno' && (
           <>📅 <strong>Solo Prestito Esterno:</strong> Gli studenti possono richiedere prestiti per più giorni e portare l'oggetto fuori dall'accademia</>
         )}
         {formData.tipo_prestito === 'solo_interno' && (
           <>🏠 <strong>Solo Uso Interno:</strong> Gli studenti sono autorizzati all'uso interno all'accademia (stesso giorno)</>
         )}
         {formData.tipo_prestito === 'entrambi' && (
           <>🔄 <strong>Entrambi:</strong> Gli studenti possono scegliere se utilizzare l'oggetto internamente (stesso giorno) o esternamente (multi-giorno)</>
         )}
       </p>
     </div>
   </div>
 </div>
 </div>
 )}

 {/* Step 3: Course & Category */}
 {step === 3 && (
 <div className="space-y-6">
 <h3 className="text-lg font-semibold text-primary mb-4">
 Assegnazione Corsi e Categoria
 </h3>
 
 {/* Multiple Course Selection */}
 <div className="form-group">
 <label className="form-label">Corsi Accademici *</label>
 <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
 {courses.map(course => (
 <label key={course.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 cursor-pointer rounded">
 <input
 type="checkbox"
 checked={formData.corsi_assegnati.includes(course.nome)}
 onChange={(e) => {
 if (e.target.checked) {
 setFormData(prev => ({
 ...prev,
 corsi_assegnati: [...prev.corsi_assegnati, course.nome]
 }));
 } else {
 setFormData(prev => ({
 ...prev,
 corsi_assegnati: prev.corsi_assegnati.filter(c => c !== course.nome)
 }));
 }
 }}
 className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-gray-400"
 />
 <span className="text-sm text-gray-700">{course.nome}</span>
 </label>
 ))}
 </div>
 {formData.corsi_assegnati.length > 0 && (
 <div className="mt-3">
 <p className="text-xs text-gray-500 mb-2">Corsi Selezionati ({formData.corsi_assegnati.length}):</p>
 <div className="flex flex-wrap gap-2">
 {formData.corsi_assegnati.map(courseName => (
 <span key={courseName} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
 {courseName}
 <button
 type="button"
 onClick={() => {
 setFormData(prev => ({
 ...prev,
 corsi_assegnati: prev.corsi_assegnati.filter(c => c !== courseName)
 }));
 }}
 className="ml-1 text-blue-600 hover:text-blue-800"
 >
 ×
 </button>
 </span>
 ))}
 </div>
 </div>
 )}
 </div>


        {/* Categoria */}
        <div className="form-group">
          <label className="form-label">Categoria</label>
          <select
            value={formData.categoria_id}
            onChange={(e) => setFormData(prev => ({ ...prev, categoria_id: e.target.value }))}
            className="select-field"
          >
            <option value="">Seleziona categoria</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.nome}
              </option>
            ))}
          </select>
        </div>

 </div>
 )}

 {/* Step 4: Unit Codes */}
 {step === 4 && (
 <div className="space-y-4">
 <h3 className="text-lg font-semibold text-primary mb-4">
 Codici Univoci per: <span className="text-brand-primary">{formData.nome}</span>
 </h3>
 
 <div className="card bg-tertiary mb-4">
 <h4 className="font-medium text-primary mb-2">Riepilogo</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Nome:</strong> {formData.nome}</div>
                  <div><strong>Quantità:</strong> {formData.quantita_totale}</div>
                  <div><strong>Corsi:</strong> {formData.corsi_assegnati.join(', ')}</div>
                  <div><strong>Scaffale:</strong> {formData.scaffale || 'Non specificato'}</div>
                  <div className="col-span-2"><strong>Immagine:</strong> {formData.immagine_url || 'Nessuna immagine'}</div>
                </div>
 </div>

 <div className="form-group">
 <label className="form-label">Codici Univoci ({formData.unita.length})</label>
 <div className="bg-gray-50 rounded-lg p-3 max-h-60 overflow-y-auto border border-gray-200">
 <div className="space-y-2">
 {formData.unita.map((unit, index) => (
 <div key={index} className="flex items-center space-x-2 p-2 bg-white rounded border border-gray-200 hover:border-blue-300 transition-colors">
 <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
 {index + 1}
 </div>
 <div className="flex-1">
 <input
 type="text"
 value={unit.codice_univoco}
 onChange={(e) => handleUnitCodeChange(index, e.target.value)}
 className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
 placeholder={`Codice ${index + 1}`}
 />
 </div>
 <div className="flex-shrink-0 flex items-center space-x-2">
 {editingItem && unit.stato && (
 <span className={`text-xs px-2 py-1 rounded ${
 unit.stato === 'disponibile' ? 'bg-green-100 text-green-800' :
 unit.stato === 'in_prestito' ? 'bg-blue-100 text-blue-800' :
 unit.stato === 'in_riparazione' ? 'bg-orange-100 text-orange-800' :
 'bg-gray-100 text-gray-800'
 }`}>
 {unit.stato}
 </span>
 )}
 <span className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded">
 {unit.codice_univoco.length}
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 )}

 {error && (
 <div className="alert-card alert-danger mt-4">
 <div className="flex items-center">
 <svg className="icon text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 <p className="text-red-800 ">{error}</p>
 </div>
 </div>
 )}
 </div>

 <div className="modal-footer flex-shrink-0 border-t border-gray-200 bg-white">
 <button
 onClick={() => step > 1 ? setStep(step - 1) : handleClose()}
 className="btn-secondary"
 >
 {step > 1 ? 'Indietro' : 'Annulla'}
 </button>
 
 <div className="flex space-x-3">
 {step < 4 ? (
 <button
onClick={() => {
if (canProceed()) {
if (step === 1 && formData.nome && formData.quantita_totale && formData.quantita_totale > 0) {
const units = generateUnitCodes(formData.quantita_totale, formData.nome);
setFormData(prev => ({ ...prev, unita: units }));
}
setStep(step + 1);
}
}}
 disabled={!canProceed()}
 className="btn-primary"
 >
 Avanti
 </button>
 ) : (
 <button
 onClick={handleSubmit}
 disabled={loading || !canProceed()}
 className="btn-success"
 >
 {loading ? 'Creazione...' : (editingItem ? 'Aggiorna Elemento' : 'Crea Elemento')}
 </button>
 )}
 </div>
 </div>
 </div>
 </div>
 );
};

export default StepInventoryModal;
