-- Stream Settings (Singleton): Steuerung des Free-Live-Streams via Cloudflare Stream.
-- Eine einzige Zeile (id = 1) haelt den aktuellen Live-Status, die Cloudflare Video-UID,
-- Titel, Startzeit und Audit-Metadaten. Admin toggelt im Panel, Free-User pollt /api/stream/status.

create table if not exists public.stream_settings (
  id int primary key default 1 check (id = 1),
  is_live boolean not null default false,
  cloudflare_stream_id text,
  title text not null default 'Live Analyse',
  started_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

comment on table public.stream_settings is
  'Singleton (id=1): Steuerung des Free-Live-Streams. is_live + cloudflare_stream_id werden vom Admin gesetzt.';
comment on column public.stream_settings.cloudflare_stream_id is
  'Video-UID des Cloudflare Live-Outputs (NICHT der Stream-Key). Wird in den Player-iframe eingebettet.';
comment on column public.stream_settings.started_at is
  'Zeitpunkt des letzten Uebergangs is_live=false -> true; NULL wenn offline.';

-- RLS aktivieren
alter table public.stream_settings enable row level security;

-- SELECT: jeder authentifizierte User (Free-User pollt, Admin liest).
drop policy if exists "auth can read stream_settings" on public.stream_settings;
create policy "auth can read stream_settings"
  on public.stream_settings for select
  to authenticated
  using (true);

-- UPDATE: nur Admins. (Write-Pfade laufen ohnehin ueber Service-Role-API.)
drop policy if exists "admins can update stream_settings" on public.stream_settings;
create policy "admins can update stream_settings"
  on public.stream_settings for update
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- INSERT: nur Admins (normalerweise nicht noetig, da Seed + Singleton).
drop policy if exists "admins can insert stream_settings" on public.stream_settings;
create policy "admins can insert stream_settings"
  on public.stream_settings for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- updated_at automatisch bei jedem UPDATE pflegen.
create or replace function public.stream_settings_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_stream_settings_touch on public.stream_settings;
create trigger trg_stream_settings_touch
  before update on public.stream_settings
  for each row execute function public.stream_settings_touch_updated_at();

-- Singleton-Seed (idempotent).
insert into public.stream_settings (id, is_live, title)
values (1, false, 'Live Analyse')
on conflict (id) do nothing;
