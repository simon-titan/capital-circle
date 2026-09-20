-- 103_live_session_cloudflare.sql
--
-- Live-Session-Videos auf Cloudflare Stream umstellen.
--
-- Die Kursvideos liegen seit Migration 067 in Cloudflare Stream
-- (`videos.cloudflare_uid`); die Live-Sessions hingen noch an `storage_key`
-- (früher Hetzner, jetzt R2). Im Admin ließ sich deshalb kein Video aus
-- Cloudflare auswählen oder hochladen. Dieselbe Umstellung wie damals:
--
-- - `cloudflare_uid` nimmt die Stream-ID auf. Nicht eindeutig, denn dasselbe
--   Video darf in mehreren Sessions vorkommen (Ausschnitt, Wiederholung).
-- - `storage_key` darf leer sein. Er bleibt für Altbestand und für externe
--   Adressen (Schnell-Recap mit URL) erhalten und wird nicht angefasst.
-- - Eine Prüfbedingung stellt sicher, dass jede Zeile eine Quelle hat.
--
-- RLS bleibt unverändert: Lesen für Angemeldete, Schreiben nur für Admins
-- (Migration 021). Die Zugangsregel (Zahlung oder freie Kategorie) sitzt in
-- `app/api/live-session-video-url`, nicht in der Datenbank.

alter table public.live_session_videos
  add column if not exists cloudflare_uid text;

alter table public.live_session_videos
  alter column storage_key drop not null;

alter table public.live_session_videos
  drop constraint if exists live_session_videos_source_present_check;
alter table public.live_session_videos
  add constraint live_session_videos_source_present_check
  check (storage_key is not null or cloudflare_uid is not null);

create index if not exists idx_live_session_videos_cloudflare_uid
  on public.live_session_videos (cloudflare_uid)
  where cloudflare_uid is not null;
