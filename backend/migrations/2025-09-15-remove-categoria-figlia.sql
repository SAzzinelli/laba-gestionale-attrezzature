-- Remove categoria_figlia column from inventario table
-- This column is no longer needed as we now use categoria_id (foreign key to categorie_semplici)

ALTER TABLE inventario DROP COLUMN IF EXISTS categoria_figlia;
