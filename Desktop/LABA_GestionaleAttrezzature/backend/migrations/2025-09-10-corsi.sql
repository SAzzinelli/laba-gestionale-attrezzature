-- backend/migrations/2025-09-10-corsi.sql
-- Aggiunge colonna corso_accademico a users (se non esiste)
ALTER TABLE users ADD COLUMN IF NOT EXISTS corso_accademico TEXT;

-- Tabella corsi (semplice elenco di valori unici)
CREATE TABLE IF NOT EXISTS corsi (
  corso TEXT PRIMARY KEY
);

-- Tabella ponte per assegnare più corsi ad un inventario
CREATE TABLE IF NOT EXISTS inventario_corsi (
  inventario_id INTEGER NOT NULL,
  corso TEXT NOT NULL,
  PRIMARY KEY (inventario_id, corso),
  FOREIGN KEY (inventario_id) REFERENCES inventario(id) ON DELETE CASCADE
);
