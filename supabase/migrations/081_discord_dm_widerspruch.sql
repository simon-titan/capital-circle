-- ────────────────────────────────────────────────────────────────────────────
-- 081: Widerspruch gegen Discord-Direktnachrichten
-- ────────────────────────────────────────────────────────────────────────────
--
-- Übernommen aus MoonTrading (dort 0021), Entscheidung Simon vom 19.09.2026.
--
-- Mahnungen, Antworten aus der Fallakte und die (vorbereitete)
-- Rückgewinnungskampagne gehen zusätzlich als Direktnachricht des Discord-Bots
-- raus, wenn ein Discord-Konto verknüpft ist. Wer das nicht möchte, schaltet
-- es in /einstellungen/profil ab.
--
-- ── Warum ein Widerspruch und keine Zustimmung ─────────────────────────────
--
-- `false` ist der Zustand von heute. Eine Zustimmungsspalte müsste für alle
-- bestehenden Konten nachträglich gefüllt werden, und bis dahin bekäme
-- niemand eine Direktnachricht, obwohl sich niemand dagegen ausgesprochen hat.
--
-- ── Was der Schalter NICHT abstellt ────────────────────────────────────────
--
-- **Die Mail.** Die Direktnachricht ist die Zugabe, die Mail der verlässliche
-- Weg. Eine Zahlungserinnerung kommt auch mit Widerspruch per Mail, sonst
-- würde jemand ohne ein Wort gesperrt. Auch die Rollen und der Warteraum
-- bleiben davon unberührt: Wer keine Direktnachrichten will, soll trotzdem im
-- Warteraum die Erklärung sehen.
--
-- ── Wer die Spalte schreibt ────────────────────────────────────────────────
--
-- Der Nutzer selbst, über `/api/profile/discord-benachrichtigung` (Service-
-- Client nach Sitzungsprüfung). Der Schreibschutz-Trigger aus Migration 073
-- listet die Spalte bewusst nicht: Sie ist eine persönliche Einstellung, kein
-- Recht und kein Zahlstatus.
--
-- Idempotent. Ausführen im Supabase SQL-Editor.

alter table public.profiles
  add column if not exists discord_dm_widerspruch boolean not null default false;

comment on column public.profiles.discord_dm_widerspruch is
  'true = keine Direktnachrichten des Discord-Bots (Mahnungen, Antworten, Kampagnen). '
  'Die E-Mail bleibt davon unberührt, sie ist der verlässliche Weg.';
