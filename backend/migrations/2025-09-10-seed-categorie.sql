-- backend/migrations/2025-09-10-seed-categorie.sql
-- Seed categorie_semplici se vuote (PostgreSQL)
INSERT INTO categorie_semplici (nome)
SELECT 'Regia e Videomaking' WHERE NOT EXISTS (SELECT 1 FROM categorie_semplici WHERE nome = 'Regia e Videomaking');
INSERT INTO categorie_semplici (nome)
SELECT 'Graphic Design & Multimedia' WHERE NOT EXISTS (SELECT 1 FROM categorie_semplici WHERE nome = 'Graphic Design & Multimedia');
INSERT INTO categorie_semplici (nome)
SELECT 'Fashion Design' WHERE NOT EXISTS (SELECT 1 FROM categorie_semplici WHERE nome = 'Fashion Design');
INSERT INTO categorie_semplici (nome)
SELECT 'Pittura' WHERE NOT EXISTS (SELECT 1 FROM categorie_semplici WHERE nome = 'Pittura');
INSERT INTO categorie_semplici (nome)
SELECT 'Fotografia' WHERE NOT EXISTS (SELECT 1 FROM categorie_semplici WHERE nome = 'Fotografia');

-- Seed corsi
INSERT INTO corsi (corso) VALUES ('Regia e Videomaking') ON CONFLICT DO NOTHING;
INSERT INTO corsi (corso) VALUES ('Graphic Design & Multimedia') ON CONFLICT DO NOTHING;
INSERT INTO corsi (corso) VALUES ('Fashion Design') ON CONFLICT DO NOTHING;
INSERT INTO corsi (corso) VALUES ('Pittura') ON CONFLICT DO NOTHING;
INSERT INTO corsi (corso) VALUES ('Fotografia') ON CONFLICT DO NOTHING;
