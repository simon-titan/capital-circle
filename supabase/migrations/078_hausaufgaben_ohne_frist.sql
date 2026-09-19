-- Hausaufgaben ohne Frist und Loeschen abgelaufener Hausaufgaben (19.09.2026).
--
-- Anlass (Emre): "vergangene hausaufgaben kann man nicht loeschen und ich kann
-- nicht hausaufgaben machen ohne faelligkeits datum".
--
-- Beides lag nicht an der Datenbank, sondern am Code (Details in
-- lib/hausaufgaben.ts und app/api/admin/homework/route.ts): Es gab keine
-- Loesch-Route, und die Mitgliederansicht zeigte nur die eine aktive Aufgabe
-- mit der fruehesten Frist, fristlose zuletzt, also nie. `homework.due_date` ist
-- seit 001 nullable. Diese Migration raeumt nur drei Dinge fest:
--
-- 1. due_date ausdruecklich nullable. In der Produktion schon so (per
--    PostgREST-Schema am 19.09.2026 geprueft), hier nur als Absicherung.
--
-- 2. Neue Spalte homework.created_at. Fristlose Aufgaben haben kein Datum, nach
--    dem sie sich ordnen liessen. Bestandszeilen bekommen den Zeitpunkt des
--    Einspielens. Der Code liest die Spalte optional und laeuft auch vorher.
--    An ihr erkennt `npm run db:check`, ob 078 eingespielt ist.
--
-- 3. Fremdschluessel auf homework so, wie 014 sie anlegt:
--    homework_user_official_done  -> on delete cascade  (Erledigt-Haken gehen mit)
--    homework_user_custom_tasks   -> on delete set null (eigene Aufgaben bleiben)
--    Die Loesch-Route verlaesst sich darauf. Welche Aktion in der Produktion
--    wirklich hinterlegt ist, laesst sich ueber PostgREST nicht lesen. Der Block
--    ersetzt deshalb nur Fremdschluessel mit anderer Aktion und ist ein No-op,
--    wenn schon alles stimmt.
--
-- Wiederholbar: if not exists, drop not null und die Pruefung im do-Block.
-- Loescht keine Daten.

alter table public.homework alter column due_date drop not null;

alter table public.homework add column if not exists created_at timestamptz not null default now();

do $$
declare
  r record;
begin
  -- Erledigt-Haken: cascade (confdeltype 'c')
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.homework_user_official_done'::regclass
      and confrelid = 'public.homework'::regclass
      and contype = 'f'
      and confdeltype <> 'c'
  loop
    execute format('alter table public.homework_user_official_done drop constraint %I', r.conname);
  end loop;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.homework_user_official_done'::regclass
      and confrelid = 'public.homework'::regclass
      and contype = 'f'
  ) then
    alter table public.homework_user_official_done
      add constraint homework_user_official_done_homework_id_fkey
      foreign key (homework_id) references public.homework (id) on delete cascade;
  end if;

  -- Eigene Aufgaben: set null (confdeltype 'n')
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.homework_user_custom_tasks'::regclass
      and confrelid = 'public.homework'::regclass
      and contype = 'f'
      and confdeltype <> 'n'
  loop
    execute format('alter table public.homework_user_custom_tasks drop constraint %I', r.conname);
  end loop;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.homework_user_custom_tasks'::regclass
      and confrelid = 'public.homework'::regclass
      and contype = 'f'
  ) then
    alter table public.homework_user_custom_tasks
      add constraint homework_user_custom_tasks_homework_id_fkey
      foreign key (homework_id) references public.homework (id) on delete set null;
  end if;
end $$;
