-- Admin-Sperre: Modul in der Akademie sichtbar, aber nicht öffnbar (unabhängig von sequenzieller Freischaltung).
ALTER TABLE modules ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;
