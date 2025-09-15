-- Migrazione: Aggiungere corso_accademico alla tabella inventario
-- e ristrutturare il sistema categorie

-- 1. Aggiungi colonna corso_accademico alla tabella inventario
ALTER TABLE inventario ADD COLUMN IF NOT EXISTS corso_accademico VARCHAR(255);

-- 2. Migra i dati esistenti: sposta categoria_madre in corso_accademico
UPDATE inventario 
SET corso_accademico = categoria_madre 
WHERE corso_accademico IS NULL AND categoria_madre IS NOT NULL;

-- 3. Crea nuova tabella categorie_semplici (solo nome categoria)
CREATE TABLE IF NOT EXISTS categorie_semplici (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Migra le categorie esistenti (categoria_figlia) nella nuova tabella
INSERT INTO categorie_semplici (nome)
SELECT DISTINCT categoria_figlia 
FROM inventario 
WHERE categoria_figlia IS NOT NULL
ON CONFLICT (nome) DO NOTHING;

-- 5. Aggiungi colonna categoria_id alla tabella inventario
ALTER TABLE inventario ADD COLUMN IF NOT EXISTS categoria_id INTEGER;

-- 6. Collega le categorie esistenti
UPDATE inventario 
SET categoria_id = cs.id
FROM categorie_semplici cs
WHERE inventario.categoria_figlia = cs.nome;

-- 7. Aggiungi foreign key constraint
ALTER TABLE inventario 
ADD CONSTRAINT fk_inventario_categoria 
FOREIGN KEY (categoria_id) REFERENCES categorie_semplici(id);

-- 8. Aggiungi indice per performance
CREATE INDEX IF NOT EXISTS idx_inventario_corso_accademico ON inventario(corso_accademico);
CREATE INDEX IF NOT EXISTS idx_inventario_categoria_id ON inventario(categoria_id);
