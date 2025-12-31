-- Tabella dedicata per keepalive (sicura, senza dati sensibili)
-- Questa tabella viene usata solo per tracciare attività REST API in Supabase
CREATE TABLE IF NOT EXISTS "public"."keepalive_log" (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'ok'
);

-- Abilita RLS sulla tabella
ALTER TABLE "public"."keepalive_log" ENABLE ROW LEVEL SECURITY;

-- Crea policy permissiva per accesso anonimo (SELECT, INSERT, UPDATE, DELETE)
-- Questa tabella non contiene dati sensibili, quindi possiamo permettere tutto
-- Prima elimina la policy se esiste già, poi la ricrea
DROP POLICY IF EXISTS "Allow anonymous access for keepalive" ON "public"."keepalive_log";
CREATE POLICY "Allow anonymous access for keepalive"
ON "public"."keepalive_log"
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Inserisci un record iniziale
INSERT INTO "public"."keepalive_log" (status) 
VALUES ('initialized')
ON CONFLICT DO NOTHING;

-- Nota: Questa tabella è molto più sicura perché:
-- 1. Non contiene dati sensibili (solo timestamp e status)
-- 2. RLS è abilitato ma con policy permissiva per anon
-- 3. Non interferisce con altre tabelle del sistema
-- 4. Le chiamate REST API funzioneranno correttamente
-- 5. RLS è attivo ma permissivo (buona pratica per sicurezza)

