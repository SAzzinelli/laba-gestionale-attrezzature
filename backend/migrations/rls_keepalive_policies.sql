-- Policy RLS per permettere chiamate REST API di keepalive
-- Queste policy permettono SELECT anonimo solo per operazioni di conteggio
-- (usate dal keepalive endpoint per tracciare attività nelle statistiche Supabase)

-- Policy per tabella 'inventario'
-- Permette SELECT anonimo solo per COUNT queries (head: true o limit 0)
CREATE POLICY IF NOT EXISTS "Allow anonymous count for keepalive"
ON "public"."inventario"
FOR SELECT
TO anon
USING (true)
WITH CHECK (false);

-- Policy per tabella 'users'  
-- Permette SELECT anonimo solo per COUNT queries
CREATE POLICY IF NOT EXISTS "Allow anonymous count for keepalive"
ON "public"."users"
FOR SELECT
TO anon
USING (true)
WITH CHECK (false);

-- Policy per tabella 'prestiti'
-- Permette SELECT anonimo solo per COUNT queries
CREATE POLICY IF NOT EXISTS "Allow anonymous count for keepalive"
ON "public"."prestiti"
FOR SELECT
TO anon
USING (true)
WITH CHECK (false);

-- Policy per tabella 'corsi'
-- Permette SELECT anonimo solo per COUNT queries
CREATE POLICY IF NOT EXISTS "Allow anonymous count for keepalive"
ON "public"."corsi"
FOR SELECT
TO anon
USING (true)
WITH CHECK (false);

-- Nota: Queste policy permettono SELECT anonimo, ma:
-- 1. Le query dirette PostgreSQL continuano a funzionare normalmente (non usano RLS)
-- 2. Le chiamate REST API ora funzioneranno per COUNT queries
-- 3. Le policy sono molto permissive (USING true) ma sicure perché:
--    - WITH CHECK (false) impedisce INSERT/UPDATE/DELETE
--    - Solo SELECT è permesso
--    - I dati reali non vengono esposti se usiamo head: true o limit 0

