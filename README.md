# 🎯 LABA Gestionale Attrezzature – Versione 1.0

**LABA Gestionale Attrezzature** è un’applicazione web completa per la gestione centralizzata
dell’inventario, dei prestiti e delle riparazioni delle attrezzature LABA Firenze.
È pensata per essere veloce, intuitiva e ottimizzata sia per desktop che dispositivi mobili.

---

## Sommario 📖
1. [Funzionalità principali](#funzionalità-principali)
2. [Tecnologie utilizzate](#tecnologie-utilizzate)
3. [Struttura del progetto](#struttura-del-progetto)
4. [Installazione](#installazione)
5. [Configurazione](#configurazione)
6. [Avvio del progetto](#avvio-del-progetto)
7. [Screenshot](#screenshot)
8. [Licenza](#licenza)

---

## Funzionalità principali 🚀

- **📅 Calendario interattivo** (FullCalendar):
  - Vista Giorno, Settimana e Mese.
  - Visualizzazione ottimizzata in base alla modalità.
  - Evidenziazione del giorno odierno.
  - Eventi con dettagli multipli (Titolo, Oggetto, Quantità).

- **📋 Gestione inventario**:
  - Aggiunta di nuove attrezzature con categorie dedicate.
  - Modifica dati esistenti in tempo reale.
  - Eliminazione elementi con conferma di sicurezza.
  - Filtraggio e ricerca rapida.

- **🔄 Prestiti**:
  - Registrazione dei prestiti con data di consegna e restituzione.
  - Calcolo automatico dei giorni di ritardo con indicatori visivi (verde/arancione/rosso).
  - Gestione stato “In prestito” o “Restituito”.
  - Storico prestiti per tracciamento.

- **🛠 Riparazioni**:
  - Segnalazione attrezzature guaste.
  - Stato riparazione aggiornabile (in attesa, in lavorazione, riparato).
  - Note tecniche.

- **🎨 Interfaccia utente**:
  - Design responsive con **TailwindCSS**.
  - Modalità light-only (niente dark mode).
  - Hover e interazioni fluide.
  - Modali con overlay blur, chiusura via ESC e click esterno.

---

## Tecnologie utilizzate 🖥

### **Frontend**
- **React 18** – Libreria per la UI.
- **Vite** – Bundler rapido e moderno.
- **FullCalendar** – Gestione avanzata degli eventi.
- **TailwindCSS** – Stile rapido e modulare.
- **Axios** – Per la comunicazione con il backend.

### **Backend**
- **Node.js** – Runtime JavaScript lato server.
- **Express.js** – Framework API REST.
- **MongoDB** – Database NoSQL.
- **Mongoose** – ODM per MongoDB.

## Installazione ⚙️

**Clona il repository** 1️⃣
```bash
git clone https://github.com/SAzzinelli/laba-gestionale-attrezzature.git
cd laba-gestionale-attrezzature

Installa le dipendenze 2️⃣

Backend:

cd backend
npm install

Frontend:

cd ../frontend
npm install


⸻

Configurazione 🔧
	1.	Database MongoDB
	•	Imposta l’URL di connessione in backend/models/db.js
	•	Esempio:

mongoose.connect("mongodb://localhost:27017/laba_gestionale", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});


	2.	Porte
	•	Backend: 3001
	•	Frontend: 5173
	•	Se modificate, aggiornare il proxy in frontend/vite.config.js.

⸻

Avvio del progetto ▶️

Avvia il backend:

cd backend
npm start

Avvia il frontend:

cd ../frontend
npm run dev

Apri nel browser: http://localhost:5173

⸻

Screenshot 📸+

A breve arriveranno...


⸻

 Licenza 📜

Progetto sviluppato per uso interno LABA Firenze da Simone Azzinelli
Tutti i diritti riservati – Distribuzione e utilizzo esterno non autorizzati.

---
