import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import inventarioRouter from "./routes/inventario.js";
import prestitiRouter from "./routes/prestiti.js";
import categorieRouter from "./routes/categorie.js";
import categorieSempliciRouter from "./routes/categorie_semplici.js";
import corsiRouter from "./routes/corsi.js";
import riparazioniRouter from "./routes/riparazioni.js";
import authRouter from "./routes/auth.js";
import richiesteRouter from "./routes/richieste.js";
import segnalazioniRouter from "./routes/segnalazioni.js";
import avvisiRouter from "./routes/avvisi.js";
import statsRouter from "./routes/stats.js";
import usersRouter from "./routes/users.js";
import migrationRouter from "./routes/migration.js";
import debugRouter from "./routes/debug.js";
import penaltiesRouter from "./routes/penalties.js";
import excelRouter from "./routes/excel.js";
import { initDatabase, query } from './utils/postgres.js';

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "0.0.0.0";

// Inizializza il database PostgreSQL/Supabase
try {
  console.log('🔄 Inizializzazione database PostgreSQL/Supabase...');
  await initDatabase();
  console.log('✅ Database PostgreSQL/Supabase inizializzato con successo!');
} catch (error) {
  console.error('❌ Errore durante l\'inizializzazione del database:', error.message);
  console.error('Verifica la configurazione DATABASE_URL e la connessione a Supabase');
  process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (_, res) => res.json({ ok: true, version: "1.0a", build: "304" }));

// Keepalive endpoint per mantenere attivo il database Supabase
app.get("/api/keepalive", async (_, res) => {
  try {
    // Query semplice per mantenere attiva la connessione al database
    await query('SELECT 1');
    res.json({ ok: true, message: 'Database keepalive successful', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('❌ Errore keepalive database:', error.message);
    res.status(500).json({ ok: false, error: 'Database keepalive failed' });
  }
});

app.use("/api/inventario", inventarioRouter);
app.use("/api/prestiti", prestitiRouter);
app.use("/api/categorie", categorieRouter);
app.use("/api/categorie-semplici", categorieSempliciRouter);
app.use("/api/corsi", corsiRouter);
app.use("/api/riparazioni", riparazioniRouter);
app.use("/api/auth", authRouter);
app.use("/api/richieste", richiesteRouter);
app.use("/api/segnalazioni", segnalazioniRouter);
app.use("/api/avvisi", avvisiRouter);
app.use("/api/stats", statsRouter);
app.use("/api/users", usersRouter);
app.use("/api/penalties", penaltiesRouter);
app.use("/api/migration", migrationRouter);
app.use("/api/excel", excelRouter);

// serve frontend build if built
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticDir = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(staticDir, { maxAge: "1h", index: false }));

app.get("/health", (_, res) => res.type("text").send("ok"));

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/"))
    return res.status(404).json({ error: "Not found" });
  try {
    res.sendFile(path.join(staticDir, "index.html"));
  } catch {
    res.status(404).send("API running. Build frontend to serve UI.");
  }
});

app.listen(PORT, HOST, () =>
  console.log(`API + Web on http://${HOST}:${PORT}`),
);
