-- Zertifikate/Erfolge (Selbsteinreichung) + Wartungsmodus.
--
-- 053_stream_settings.sql wurde geprueft: es ist ein zweckgebundenes Singleton
-- (is_live/cloudflare_stream_id/title) fuer den Live-Stream, KEIN generisches
-- Key-Value-Settings-Muster. Fuer den Wartungsmodus-Schalter legen wir daher eine
-- schlanke eigene KV-Tabelle `app_settings` an (statt das Stream-Singleton
-- zweckzuentfremden oder ein neues generisches Settings-Framework zu erfinden).

-- ============================================================
-- 1) certificates: von Mitgliedern eingereichte Trading-Nachweise
-- ============================================================
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_key text not null,
  caption text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  is_public boolean not null default false,
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

comment on table public.certificates is
  'Von Mitgliedern selbst eingereichte Trading-Nachweise/Erfolge. Admin reviewed (approve/reject) und schaltet is_public fuer die /erfolge-Showcase frei.';

create index if not exists idx_certificates_user on public.certificates (user_id, submitted_at desc);
create index if not exists idx_certificates_status on public.certificates (status);
create index if not exists idx_certificates_public_showcase on public.certificates (status, is_public) where status = 'approved' and is_public = true;

alter table public.certificates enable row level security;

-- Nutzer sehen nur eigene Einreichungen.
drop policy if exists "certificates_select_own" on public.certificates;
create policy "certificates_select_own"
  on public.certificates for select
  using (auth.uid() = user_id);

-- Nutzer erstellen nur eigene Einreichungen.
drop policy if exists "certificates_insert_own" on public.certificates;
create policy "certificates_insert_own"
  on public.certificates for insert
  with check (auth.uid() = user_id);

-- Oeffentliche Showcase-Sicht: freigegebene + oeffentliche Eintraege, auch ohne Login lesbar.
-- (Die /erfolge-Seite nutzt server-seitig createServiceClient() statt dieser Policy — robuster
-- gegen anon-RLS-Fehlkonfiguration. Die Policy bleibt trotzdem als Defense-in-Depth bestehen.)
drop policy if exists "certificates_select_public_approved" on public.certificates;
create policy "certificates_select_public_approved"
  on public.certificates for select
  using (status = 'approved' and is_public = true);

-- Admins duerfen alles (Review-Queue, Freigabe, is_public-Toggle).
drop policy if exists "certificates_admin_all" on public.certificates;
create policy "certificates_admin_all"
  on public.certificates for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- ============================================================
-- 2) app_settings: schlanke generische Key-Value-Tabelle (aktuell nur Wartungsmodus)
-- ============================================================
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

comment on table public.app_settings is
  'Generische Key-Value-Settings fuer die Plattform (aktuell: maintenance_mode). Lesend oeffentlich, Schreiben nur Admin.';

alter table public.app_settings enable row level security;

-- Oeffentlich lesbar (Middleware/Wartungsseite brauchen Zugriff ohne Admin-Session).
drop policy if exists "app_settings_public_select" on public.app_settings;
create policy "app_settings_public_select"
  on public.app_settings for select
  using (true);

-- Nur Admins duerfen schreiben.
drop policy if exists "app_settings_admin_write" on public.app_settings;
create policy "app_settings_admin_write"
  on public.app_settings for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

create or replace function public.app_settings_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_app_settings_touch on public.app_settings;
create trigger trg_app_settings_touch
  before update on public.app_settings
  for each row execute function public.app_settings_touch_updated_at();

-- Seed: Wartungsmodus startet deaktiviert.
insert into public.app_settings (key, value)
values ('maintenance_mode', jsonb_build_object('enabled', false, 'message', ''))
on conflict (key) do nothing;
