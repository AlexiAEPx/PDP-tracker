-- ============================================
-- PDP Tracker — Supabase Schema
-- Ejecuta esto en: Supabase → SQL Editor → New Query
-- ============================================

-- 1. Tabla de registros (meses y subperiodos)
CREATE TABLE registros (
  id TEXT PRIMARY KEY,
  mes TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('mes', 'sub')),
  periodo TEXT DEFAULT '',
  fechas TEXT DEFAULT '',
  lecturas JSONB NOT NULL DEFAULT '{}',
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabla de configuración (pendientes, etc.)
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'
);

-- 3. Tabla histórica anual (2025, etc.)
CREATE TABLE historico (
  id TEXT PRIMARY KEY,
  anio INTEGER NOT NULL,
  radiologist_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  apodo TEXT NOT NULL,
  color TEXT NOT NULL,
  lecturas INTEGER NOT NULL DEFAULT 0
);

-- ============================================
-- Datos iniciales
-- ============================================

-- Config inicial
INSERT INTO config (key, value) VALUES ('app_state', '{"pendientes": 0}');

-- Registros 2026
INSERT INTO registros (id, mes, tipo, periodo, fechas, lecturas, ts) VALUES
  ('ene-2026', 'Enero 2026', 'mes', '', '01/01–31/01', '{"espinosa": 267, "fernandez": 50, "vazquez": 36}', '2026-01-31T00:00:00Z'),
  ('feb-2026', 'Febrero 2026', 'mes', '', '01/02–28/02', '{"espinosa": 445, "fernandez": 362, "vazquez": 236, "aguilar": 15}', '2026-02-28T00:00:00Z'),
  ('feb-02-08', 'Febrero 2026', 'sub', '2–8 Feb', '02/02–08/02', '{"espinosa": 62, "fernandez": 3, "vazquez": 0}', '2026-02-08T00:00:00Z'),
  ('feb-09-15', 'Febrero 2026', 'sub', '9–15 Feb', '09/02–15/02', '{"espinosa": 96, "fernandez": 114, "vazquez": 0}', '2026-02-15T00:00:00Z'),
  ('feb-16-20', 'Febrero 2026', 'sub', '16–20 Feb', '16/02–20/02', '{"espinosa": 224, "fernandez": 61, "vazquez": 172}', '2026-02-20T00:00:00Z'),
  ('feb-23-01mar', 'Febrero 2026', 'sub', '23 Feb–1 Mar', '23/02–01/03', '{"espinosa": 63, "fernandez": 67, "vazquez": 64, "aguilar": 15}', '2026-03-01T00:00:00Z');

-- Histórico 2023
INSERT INTO historico (id, anio, radiologist_id, nombre, apodo, color, lecturas) VALUES
  ('2023-espinosa', 2023, 'espinosa', 'Alexis Espinosa Pizarro', 'Alexis', '#c4956a', 5765),
  ('2023-fernandez', 2023, 'fernandez', 'José Mª Fernández Peña', 'Chema', '#6a9ec4', 3329),
  ('2023-aguilar', 2023, 'aguilar', 'Natalia Aguilar Pérez', 'Natalia', '#c47a9e', 2372),
  ('2023-vazquez', 2023, 'vazquez', 'Jorge Vázquez Alfageme', 'Jorge', '#8bc49a', 1571);

-- Histórico 2024
INSERT INTO historico (id, anio, radiologist_id, nombre, apodo, color, lecturas) VALUES
  ('2024-espinosa', 2024, 'espinosa', 'Alexis Espinosa Pizarro', 'Alexis', '#c4956a', 7186),
  ('2024-fernandez', 2024, 'fernandez', 'José Mª Fernández Peña', 'Chema', '#6a9ec4', 1892),
  ('2024-aguilar', 2024, 'aguilar', 'Natalia Aguilar Pérez', 'Natalia', '#c47a9e', 2189),
  ('2024-cartier', 2024, 'cartier', 'Germaine Cartier Velázquez', 'Germaine', '#9a7ec4', 1),
  ('2024-vazquez', 2024, 'vazquez', 'Jorge Vázquez Alfageme', 'Jorge', '#8bc49a', 1554);

-- Histórico 2025
INSERT INTO historico (id, anio, radiologist_id, nombre, apodo, color, lecturas) VALUES
  ('2025-espinosa', 2025, 'espinosa', 'Alexis Espinosa Pizarro', 'Alexis', '#c4956a', 5152),
  ('2025-fernandez', 2025, 'fernandez', 'José Mª Fernández Peña', 'Chema', '#6a9ec4', 2895),
  ('2025-aguilar', 2025, 'aguilar', 'Natalia Aguilar Pérez', 'Natalia', '#c47a9e', 1532),
  ('2025-cartier', 2025, 'cartier', 'Germaine Cartier Velázquez', 'Germaine', '#9a7ec4', 576),
  ('2025-vazquez', 2025, 'vazquez', 'Jorge Vázquez Alfageme', 'Jorge', '#8bc49a', 369);

-- ============================================
-- Row Level Security (RLS) — acceso público lectura/escritura
-- (para app personal sin auth)
-- ============================================
ALTER TABLE registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on registros" ON registros FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on config" ON config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on historico" ON historico FOR ALL USING (true) WITH CHECK (true);
