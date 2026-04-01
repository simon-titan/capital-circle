-- Tage mit Streak-relevanter Aktivität (Fortschritt), für 7-Tage-Haken unabhängig von Lernminuten.
alter table public.profiles
  add column if not exists streak_activity_by_day jsonb not null default '{}'::jsonb;

comment on column public.profiles.streak_activity_by_day is 'Map YYYY-MM-DD (Europe/Berlin) -> true wenn an dem Tag /api/progress gelaufen ist (Streak).';
