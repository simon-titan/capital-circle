-- 104_lifetime_popup.sql
--
-- Lifetime-Popup im Mitgliederbereich (23.09.2026).
--
-- Ab dem 30. Tag nach Kontoanlage erscheint einmal ein Popup mit dem
-- Lifetime-Angebot, für alle, denen `pruefeLifetimeAngebot()` den Kauf erlaubt
-- (also nicht für Lifetime, 1:1-Mentoring und Konten, die nie gezahlt haben).
-- Die Spalte merkt sich, wann es geschlossen wurde, damit es geräteübergreifend
-- nur einmal kommt. Geschrieben wird sie nur von `app/api/lifetime/popup`
-- mit dem Service-Schlüssel; RLS bleibt unverändert.

alter table public.profiles
  add column if not exists lifetime_popup_gesehen_am timestamptz;
