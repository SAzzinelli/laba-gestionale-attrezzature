// backend/server.PATCH-4.1.1.example.js
// Esempio di server.js compatibile con la patch 4.1.1
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

// IMPORTA db per inizializzare la connessione e lo schema base
import './utils/db.js';

// Routes
import auth from './routes/auth.js';
import inventario from './routes/inventario.js';
import corsi from './routes/corsi.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth', auth);
app.use('/api/inventario', inventario);
app.use('/api/corsi', corsi);

// (eventuali altre route esistenti: prestiti, richieste, categorie, riparazioni, ecc.)
app.get('/api/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API on http://0.0.0.0:${PORT}`);
});
