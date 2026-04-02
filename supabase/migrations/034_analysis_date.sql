-- Dediziertes Analyse-Datum (das Datum, auf das sich die Analyse inhaltlich bezieht)
-- Unabhängig von published_at (Veröffentlichungszeitpunkt) und created_at (DB-Erstellung)
alter table analysis_posts add column if not exists analysis_date date;

-- Index für effiziente Sortierung
create index if not exists idx_analysis_posts_analysis_date on analysis_posts (analysis_date desc nulls last);

-- Bestehende Posts: analysis_date aus published_at ableiten (nur Datum, keine Uhrzeit)
update analysis_posts
set analysis_date = published_at::date
where analysis_date is null;
