# 🎯 LABA Gestionale Attrezzature – Versione 1.0

**LABA Gestionale Attrezzature** è un’applicazione web completa per la gestione centralizzata dell’inventario, dei prestiti e delle riparazioni delle attrezzature LABA Firenze.  
È pensata per essere veloce, intuitiva e ottimizzata sia per desktop che per dispositivi mobili.

---

## 📑 Sommario
1. [🚀 Funzionalità principali](#-funzionalità-principali)
2. [🖥 Tecnologie utilizzate](#-tecnologie-utilizzate)
3. [⚙️ Installazione](#%EF%B8%8F-installazione)
4. [🔧 Configurazione](#-configurazione)
5. [▶️ Avvio del progetto](#%EF%B8%8F-avvio-del-progetto)
6. [📸 Screenshot](#-screenshot)
7. [📜 Licenza](#-licenza)

---

## 🚀 Funzionalità principali

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

## 🖥 Tecnologie utilizzate

### **Frontend**
- **React 18** – Libreria per la UI.
- **Vite** – Bundler rapido e moderno.
- **FullCalendar** – Gestione avanzata degli eventi.
- **TailwindCSS** – Stile rapido e modulare.
- **Axios** – Comunicazione con il backend.

### **Backend**
- **Node.js** – Runtime JavaScript lato server.
- **Express.js** – Framework API REST.
- **MongoDB** – Database NoSQL.
- **Mongoose** – ODM per MongoDB.

---

## ⚙️ Installazione

### 1️⃣ Clona il repository
```bash
git clone https://github.com/SAzzinelli/laba-gestionale-attrezzature.git
cd laba-gestionale-attrezzature
```

### 2️⃣ Installa le dipendenze

**Backend**
```bash
cd backend
npm install
```

**Frontend**
```bash
cd ../frontend
npm install
```

---

## 🔧 Configurazione

### 1. Database MongoDB
Modifica il file `backend/models/db.js` inserendo l’URL del tuo database:
```javascript
mongoose.connect("mongodb://localhost:27017/laba_gestionale", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
```

### 2. Porte
- Backend: `3001`
- Frontend: `5173`

Se le modifichi, aggiorna anche il **proxy** in `frontend/vite.config.js`.

---

## ▶️ Avvio del progetto

**Avvia il backend**
```bash
cd backend
npm start
```

**Avvia il frontend**
```bash
cd ../frontend
npm run dev
```

Apri il browser su **[http://localhost:5173](http://localhost:5173)**

---

## 📸 Screenshot
*(In arrivo…)*

---

## 📜 Licenza
Progetto sviluppato per uso interno **LABA Firenze** da *Simone Azzinelli*.  
Tutti i diritti riservati – Distribuzione e utilizzo esterno non autorizzati.
