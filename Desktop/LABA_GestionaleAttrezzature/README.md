# LABA Gestionale Attrezzature

Sistema di gestione attrezzature per il laboratorio LABA.

## 🚀 Deploy su Railway

### Prerequisiti
- Account Railway (https://railway.app)
- Repository GitHub

### Passaggi per il Deploy

1. **Push del codice su GitHub**
   ```bash
   git add .
   git commit -m "Preparazione per deploy Railway"
   git push origin main
   ```

2. **Deploy su Railway**
   - Vai su https://railway.app
   - Clicca "New Project"
   - Seleziona "Deploy from GitHub repo"
   - Scegli il tuo repository
   - Railway rileverà automaticamente la configurazione

3. **Variabili d'ambiente**
   - `NODE_ENV=production`
   - `PORT` (automatico)
   - `HOST` (automatico)

### Struttura del Progetto

```
├── backend/          # API Node.js/Express
├── frontend/         # React/Vite
├── package.json      # Scripts principali
├── railway.json      # Configurazione Railway
└── nixpacks.toml    # Build configuration
```

### Scripts Disponibili

- `npm start` - Avvia il backend in produzione
- `npm run dev` - Avvia backend + frontend in sviluppo
- `npm run build` - Build del frontend
- `npm run install-all` - Installa tutte le dipendenze

### Database

Il sistema usa SQLite con database automatico su Railway.

### Accesso

Dopo il deploy, l'app sarà disponibile su:
- URL fornito da Railway
- Admin: `admin@labafirenze.com`
