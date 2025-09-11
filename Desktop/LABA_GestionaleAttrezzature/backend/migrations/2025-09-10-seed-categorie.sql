-- backend/migrations/2025-09-10-seed-categorie.sql
-- Seed categorie se vuote
INSERT INTO categorie (nome)
SELECT 'Regia e Videomaking' WHERE NOT EXISTS (SELECT 1 FROM categorie WHERE nome = 'Regia e Videomaking');
INSERT INTO categorie (nome)
SELECT 'Graphic Design & Multimedia' WHERE NOT EXISTS (SELECT 1 FROM categorie WHERE nome = 'Graphic Design & Multimedia');
INSERT INTO categorie (nome)
SELECT 'Fashion Design' WHERE NOT EXISTS (SELECT 1 FROM categorie WHERE nome = 'Fashion Design');
INSERT INTO categorie (nome)
SELECT 'Pittura' WHERE NOT EXISTS (SELECT 1 FROM categorie WHERE nome = 'Pittura');
INSERT INTO categorie (nome)
SELECT 'Fotografia' WHERE NOT EXISTS (SELECT 1 FROM categorie WHERE nome = 'Fotografia');

-- Seed corsi
INSERT INTO corsi (corso) VALUES ('Regia e Videomaking') ON CONFLICT DO NOTHING;
INSERT INTO corsi (corso) VALUES ('Graphic Design & Multimedia') ON CONFLICT DO NOTHING;
INSERT INTO corsi (corso) VALUES ('Fashion Design') ON CONFLICT DO NOTHING;
INSERT INTO corsi (corso) VALUES ('Pittura') ON CONFLICT DO NOTHING;
INSERT INTO corsi (corso) VALUES ('Fotografia') ON CONFLICT DO NOTHING;
INSERT INTO corsi (corso) VALUES ('Interior Design') ON CONFLICT DO NOTHING;
INSERT INTO corsi (corso) VALUES ('Cinema e Audiovisivi') ON CONFLICT DO NOTHING;
INSERT INTO corsi (corso) VALUES ('Design') ON CONFLICT DO NOTHING;
