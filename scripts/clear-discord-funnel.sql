-- ============================================================================
-- Discord-Funnel komplett leeren  (Supabase → SQL Editor ausführen)
-- ----------------------------------------------------------------------------
-- Entfernt ALLE Daten des Funnels: Leads, Seitenaufrufe und Video-View-Events.
--
-- discord_channels (Kanal-/UTM-Konfiguration, also deine Tracking-Links) bleibt
-- standardmäßig ERHALTEN. Willst du auch die Kanäle löschen, kommentiere die
-- letzte TRUNCATE-Zeile ein.
--
-- TRUNCATE setzt die Tabellen schlagartig auf 0 Zeilen zurück. discord_video_views
-- referenziert discord_leads per Foreign Key — beide stehen daher zusammen in
-- einem TRUNCATE-Befehl (sonst FK-Fehler).
-- ============================================================================

begin;

truncate table
  public.discord_video_views,
  public.discord_leads,
  public.discord_page_visits;

-- Optional: auch die Kanal-Konfiguration (Tracking-Links) zurücksetzen:
-- truncate table public.discord_channels;

commit;

-- ----------------------------------------------------------------------------
-- Kontrolle (nach dem Leeren ausführen — sollte überall 0 ergeben):
-- ----------------------------------------------------------------------------
-- select
--   (select count(*) from public.discord_leads)        as leads,
--   (select count(*) from public.discord_page_visits)  as visits,
--   (select count(*) from public.discord_video_views)  as video_views,
--   (select count(*) from public.discord_channels)     as channels;
