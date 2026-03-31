-- Tagesweise Lernminuten für Dashboard-Wochenansicht (Schlüssel: YYYY-MM-DD, Europe/Berlin beim Schreiben)
alter table public.profiles
  add column if not exists learning_minutes_by_day jsonb not null default '{}'::jsonb;

comment on column public.profiles.learning_minutes_by_day is 'Map YYYY-MM-DD -> Minuten; wird bei /api/progress inkrementell aktualisiert.';
