-- Lernzeit: bisher wurde pro /api/progress nur floor(deltaSeconds/60) addiert — bei 5s-Takt fast immer 0.
-- Sekunden-Akkumulation + Tages-Map in Sekunden (Legacy: learning_minutes_by_day = Minuten).

alter table public.profiles
  add column if not exists total_learning_seconds integer not null default 0;

comment on column public.profiles.total_learning_seconds is
  'Kumulierte Lernzeit in Sekunden; total_learning_minutes wird daraus abgeleitet (Anzeige/Legacy).';

update public.profiles
set total_learning_seconds = coalesce(total_learning_minutes, 0) * 60;

alter table public.profiles
  add column if not exists learning_seconds_by_day jsonb not null default '{}'::jsonb;

comment on column public.profiles.learning_seconds_by_day is
  'Map YYYY-MM-DD -> Sekunden (Europe/Berlin). learning_minutes_by_day bleibt Legacy (Minuten).';

update public.profiles
set learning_seconds_by_day = (
  select coalesce(
    jsonb_object_agg(
      e.key,
      least(2147483647, greatest(0, round((e.value #>> '{}')::numeric * 60))::integer
    ),
    '{}'::jsonb
  )
  from jsonb_each(learning_minutes_by_day) as e
)
where jsonb_typeof(learning_minutes_by_day) = 'object'
  and learning_minutes_by_day <> '{}'::jsonb;
