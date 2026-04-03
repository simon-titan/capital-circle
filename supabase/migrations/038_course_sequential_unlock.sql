-- Sequenzielle Kursfreischaltung: Reihenfolge und Ausnahmen (z. B. Trade Recaps).
ALTER TABLE courses ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_sequential_exempt boolean DEFAULT false;
