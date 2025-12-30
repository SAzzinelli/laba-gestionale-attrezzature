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
import supabase from './utils/supabaseStorage.js';

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
    // 1. Query dirette PostgreSQL (mantengono attivo il database)
    const [usersCount, inventarioCount, prestitiCount] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM inventario'),
      query('SELECT COUNT(*) as count FROM prestiti WHERE stato = $1', ['attivo'])
    ]);
    
    // 2. Chiamata API REST Supabase (appare nelle statistiche "REST Requests")
    // Facciamo una chiamata HTTP diretta all'API REST per bypassare eventuali problemi RLS
    // Anche se fallisce, la chiamata HTTP viene comunque tracciata da Supabase
    let restActivity = null;
    const supabaseUrl = process.env.SUPABASE_URL || 'https://kzqabwmtpmlhaueqiuoc.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6cWFid210cG1saGF1ZXFpdW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzMjQ4NzEsImV4cCI6MjA1MDkwMDg3MX0.8Qj6bFqMXLt_RqGu0MmqN1gb436H1vYcKLCB8cmTLIQ';
    
    if (supabaseUrl && supabaseKey) {
      try {
        console.log('🔄 Chiamata HTTP diretta all\'API REST Supabase...');
        // Chiamata HTTP diretta all'API REST - anche se fallisce per RLS, viene tracciata
        const response = await fetch(`${supabaseUrl}/rest/v1/inventario?select=id&limit=1`, {
          method: 'GET',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'count=exact'
          }
        });
        
        const contentType = response.headers.get('content-type');
        const countHeader = response.headers.get('content-range');
        
        console.log('📊 Risposta Supabase REST:', {
          status: response.status,
          statusText: response.statusText,
          contentType,
          countHeader
        });
        
        // Anche se la risposta è 401/403 (RLS), la chiamata è stata tracciata
        if (response.ok || response.status === 401 || response.status === 403) {
          restActivity = { 
            rest_request: true,
            http_status: response.status,
            tracked: true // La chiamata è stata tracciata anche con errore RLS
          };
          console.log('✅ Chiamata REST Supabase tracciata (status:', response.status, ')');
        } else {
          restActivity = { 
            rest_request: true,
            http_status: response.status,
            tracked: true
          };
          console.log('⚠️ Chiamata REST Supabase tracciata ma con status:', response.status);
        }
      } catch (fetchError) {
        console.error('❌ Errore chiamata HTTP REST Supabase:', fetchError.message);
        // Anche in caso di errore di rete, proviamo comunque
        restActivity = { 
          error: fetchError.message, 
          rest_request: false 
        };
      }
    } else {
      console.warn('⚠️ Configurazione Supabase non disponibile');
      restActivity = { error: 'Configurazione Supabase mancante', rest_request: false };
    }
    
    res.json({ 
      ok: true, 
      message: 'Database keepalive successful', 
      timestamp: new Date().toISOString(),
      stats: {
        users: usersCount[0]?.count || 0,
        inventario: inventarioCount[0]?.count || 0,
        prestiti_attivi: prestitiCount[0]?.count || 0,
        rest_api: restActivity
      }
    });
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
