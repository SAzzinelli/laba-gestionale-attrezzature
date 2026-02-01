import React, { useEffect } from 'react';

const InstructionsModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    if (isOpen) {
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Istruzioni</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 transition-colors" aria-label="Chiudi">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 text-sm text-gray-700 space-y-4">
          <p><strong>Cos'è:</strong> Sistema per prenotare attrezzature LABA (fotocamere, luci, ecc.).</p>
          <p><strong>Account:</strong> Non è quello dell'app LABA Firenze. Crea un nuovo account con &quot;Registrati&quot;.</p>
          <p><strong>Come noleggiare:</strong> Articoli Disponibili → scegli unità → date (dal giorno dopo) → invia richiesta.</p>
          <p><strong>Strike:</strong> Ritardi = 1 strike/giorno. 3 strike = blocco account.</p>
        </div>
        <div className="p-4 border-t bg-gray-50">
          <button onClick={onClose} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">Ho capito</button>
        </div>
      </div>
    </div>
  );
};

export default InstructionsModal;
