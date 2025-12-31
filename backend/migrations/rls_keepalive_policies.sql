-- Tabella dedicata per keepalive (sicura, senza dati sensibili)
-- Questa tabella viene usata solo per tracciare attività REST API in Supabase
CREATE TABLE IF NOT EXISTS "public"."keepalive_log" (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'ok'
);

-- Disabilita RLS per questa tabella (è una tabella di sistema, non contiene dati sensibili)
ALTER TABLE "public"."keepalive_log" DISABLE ROW LEVEL SECURITY;

-- Oppure, se preferisci mantenere RLS abilitato, crea una policy permissiva:
-- CREATE POLICY IF NOT EXISTS "Allow anonymous access for keepalive"
-- ON "public"."keepalive_log"
-- FOR ALL
-- TO anon
-- USING (true)
-- WITH CHECK (true);

-- Inserisci un record iniziale
INSERT INTO "public"."keepalive_log" (status) 
VALUES ('initialized')
ON CONFLICT DO NOTHING;

-- Nota: Questa tabella è molto più sicura perché:
-- 1. Non contiene dati sensibili (solo timestamp e status)
-- 2. RLS è disabilitato (o policy molto permissiva)
-- 3. Non interferisce con altre tabelle del sistema
-- 4. Le chiamate REST API funzioneranno correttamente

