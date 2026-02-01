import React from 'react';

const InstructionsPage = () => {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Come si usa</h1>
        <p className="text-gray-600">Guida all'utilizzo del Service Attrezzatura LABA</p>
      </div>

      <div className="space-y-10">
        {/* Cos'è */}
        <section>
          <h2 className="text-lg font-medium text-gray-900 mb-3">Cos'è questo sistema</h2>
          <p className="text-gray-700 leading-relaxed">
            Il Service Attrezzatura LABA è il sistema per prenotare e noleggiare attrezzature 
            (fotocamere, luci, reflex, ecc.) messe a disposizione dall'accademia per studenti e docenti.
          </p>
        </section>

        <hr className="border-gray-200" />

        {/* Account */}
        <section>
          <h2 className="text-lg font-medium text-gray-900 mb-3">Account</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            L'account di questo gestionale <strong>non</strong> è lo stesso dell'applicazione LABA Firenze. 
            Sono due sistemi separati.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Se non hai ancora un account, registrati dalla pagina di login con i tuoi dati 
            (nome, cognome, email, matricola, corso accademico).
          </p>
        </section>

        <hr className="border-gray-200" />

        {/* A cosa serve */}
        <section>
          <h2 className="text-lg font-medium text-gray-900 mb-3">A cosa serve</h2>
          <ul className="text-gray-700 leading-relaxed space-y-2 list-disc list-inside">
            <li>Richiedere in prestito attrezzature per progetti e lavori</li>
            <li>Consultare i tuoi prestiti attivi e lo storico</li>
            <li>Segnalare guasti o malfunzionamenti</li>
            <li>Ricevere notifiche su approvazioni, scadenze e ritardi</li>
          </ul>
        </section>

        <hr className="border-gray-200" />

        {/* Come fare un noleggio */}
        <section>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Come fare un noleggio</h2>
          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-sm font-medium flex items-center justify-center">1</span>
              <div>
                <span className="font-medium text-gray-900">Sfoglia gli articoli</span>
                <p className="text-gray-700 text-sm mt-0.5">Vai in &quot;Articoli Disponibili&quot; e scegli l'attrezzatura che ti serve</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-sm font-medium flex items-center justify-center">2</span>
              <div>
                <span className="font-medium text-gray-900">Seleziona l'unità</span>
                <p className="text-gray-700 text-sm mt-0.5">Scegli l'unità specifica (es. Fotocamera #3) se richiesto</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-sm font-medium flex items-center justify-center">3</span>
              <div>
                <span className="font-medium text-gray-900">Tipo di utilizzo</span>
                <p className="text-gray-700 text-sm mt-0.5"><strong>Uso interno</strong> solo in accademia, oppure <strong>Prestito esterno</strong> per portarlo fuori</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-sm font-medium flex items-center justify-center">4</span>
              <div>
                <span className="font-medium text-gray-900">Date</span>
                <p className="text-gray-700 text-sm mt-0.5">Il noleggio può iniziare dal giorno successivo (non oggi). Esterno: massimo 3 giorni (o 4 se include domenica)</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-sm font-medium flex items-center justify-center">5</span>
              <div>
                <span className="font-medium text-gray-900">Attendi l'approvazione</span>
                <p className="text-gray-700 text-sm mt-0.5">Invia la richiesta e attendi conferma dal Service</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-sm font-medium flex items-center justify-center">6</span>
              <div>
                <span className="font-medium text-gray-900">Ritira e restituisci</span>
                <p className="text-gray-700 text-sm mt-0.5">Ritira l'attrezzatura nel giorno concordato e restituiscila in orario</p>
              </div>
            </li>
          </ol>
        </section>

        <hr className="border-gray-200" />

        {/* Strike e penalità */}
        <section>
          <h2 className="text-lg font-medium text-gray-900 mb-3">Strike, ritardi e penalità</h2>
          <ul className="text-gray-700 leading-relaxed space-y-2">
            <li><strong>Ritardi nella restituzione</strong> — accumuli 1 strike per ogni giorno di ritardo</li>
            <li><strong>3 o più strike</strong> — l'account viene bloccato, non puoi più fare richieste</li>
            <li><strong>Sblocco</strong> — devi recarti di persona al Service Attrezzatura</li>
            <li>Restituisci sempre in orario e in buone condizioni per evitare penalità</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default InstructionsPage;
