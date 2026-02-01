import React, { useEffect } from 'react';

const InstructionsModal = ({ isOpen, onClose, title = 'Istruzioni' }) => {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
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

  const Section = ({ icon, title: sectionTitle, children, color = 'blue' }) => {
    const colors = {
      blue: 'bg-blue-50 border-blue-200 text-blue-800',
      amber: 'bg-amber-50 border-amber-200 text-amber-800',
      green: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      purple: 'bg-purple-50 border-purple-200 text-purple-800',
      red: 'bg-red-50 border-red-200 text-red-800'
    };
    return (
      <div className={`rounded-xl border-2 p-5 mb-5 ${colors[color]}`}>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-white/70 shadow-sm">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-lg mb-2">{sectionTitle}</h4>
            <div className="text-sm leading-relaxed space-y-2">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const Step = ({ num, text }) => (
    <div className="flex gap-3 items-start">
      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center font-bold text-sm shadow">
        {num}
      </span>
      <span>{text}</span>
    </div>
  );

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">📖</span>
            {title}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            aria-label="Chiudi"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-1">
          <Section icon="🏛️" title="Cos'è questo gestionale?" color="blue">
            <p>
              Il <strong>Service Attrezzatura LABA</strong> è il sistema per prenotare e noleggiare attrezzature 
              (fotocamere, luci, reflex, ecc.) messe a disposizione dall'accademia per studenti e docenti.
            </p>
          </Section>

          <Section icon="⚠️" title="Account separato dall'app LABA Firenze" color="amber">
            <p>
              <strong>Importante:</strong> L'account di questo gestionale <strong>NON</strong> è lo stesso che usi 
              per l'applicazione LABA Firenze. Sono due sistemi diversi.
            </p>
            <p>
              Devi <strong>creare un nuovo account</strong> qui: usa il pulsante &quot;Registrati&quot; sulla pagina di login 
              e compila con i tuoi dati (nome, cognome, email, matricola, corso accademico).
            </p>
          </Section>

          <Section icon="🎯" title="A cosa serve?" color="green">
            <ul className="list-disc list-inside space-y-1">
              <li>Richiedere in prestito attrezzature per progetti e lavori</li>
              <li>Consultare i tuoi prestiti attivi e lo storico</li>
              <li>Segnalare guasti o malfunzionamenti</li>
              <li>Ricevere notifiche su approvazioni, scadenze e ritardi</li>
            </ul>
          </Section>

          <Section icon="📅" title="Come fare un noleggio?" color="purple">
            <div className="space-y-4">
              <Step num={1} text="Vai in &quot;Articoli Disponibili&quot; e scegli l'attrezzatura che ti serve" />
              <Step num={2} text="Seleziona l'unità specifica (es. Fotocamera #3) se richiesto" />
              <Step num={3} text="Scegli il tipo: <strong>Uso interno</strong> (solo in accademia) o <strong>Prestito esterno</strong> (portare fuori)" />
              <Step num={4} text="Seleziona le date: il noleggio può iniziare <strong>dal giorno successivo</strong> (non oggi). Per l'esterno: massimo 3 giorni (o 4 se include domenica)" />
              <Step num={5} text="Invia la richiesta e attendi l'approvazione da parte del Service" />
              <Step num={6} text="Ritira l'attrezzatura nel giorno e orario concordato e restituiscila in orario!" />
            </div>
          </Section>

          <Section icon="⚠️" title="Strike, ritardi e penalità" color="red">
            <ul className="space-y-2">
              <li><strong>Ritardi nella restituzione</strong> → accumuli 1 strike per ogni giorno di ritardo</li>
              <li><strong>3 o più strike</strong> → l'account viene bloccato e non puoi più fare richieste</li>
              <li><strong>Sblocco</strong> → devi recarti di persona al Service Attrezzatura per sbloccare l'account</li>
              <li><strong>Consiglio:</strong> restituisci sempre in orario e in buone condizioni per evitare penalità</li>
            </ul>
          </Section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Ho capito
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstructionsModal;
