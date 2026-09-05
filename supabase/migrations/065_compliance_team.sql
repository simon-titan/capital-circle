-- 065_compliance_team.sql
-- Compliance-Module: Admin-Rollen (Team-Verwaltung) + DSGVO-Art.15-Selbstauskunft

-- ============================================================
-- 1) Admin-Rollen (owner > admin > support > editor)
-- ============================================================
alter table public.profiles
  add column if not exists admin_role text
    check (admin_role in ('owner', 'admin', 'support', 'editor'));

-- Bestehende Admins bekommen automatisch die Rolle 'admin', damit die neue
-- Rollenhierarchie niemandem bestehenden Zugriff entzieht.
update public.profiles
  set admin_role = 'admin'
  where is_admin = true and admin_role is null;

-- WICHTIG — manueller Folgeschritt, absichtlich KEIN automatisches UPDATE:
-- Da unbekannt ist, wer der Haupt-Admin ist, würde ein automatisches Setzen von
-- admin_role='owner' raten (Sicherheitsrisiko). Bitte für genau einen bestehenden
-- Haupt-Admin manuell ausführen, z.B.:
--
--   update public.profiles set admin_role = 'owner' where id = '<uuid-des-haupt-admins>';
--
-- Bis das erledigt ist, greift ein Owner-Fallback in lib/supabase/admin-auth.ts
-- (requireAdminRole): Solange NIEMAND admin_role='owner' hat, wird jeder bestehende
-- is_admin=true-Nutzer auf der Team-Seite wie ein Owner behandelt, damit sich niemand
-- aussperrt. Siehe Kommentar dort für Details.

create index if not exists profiles_admin_role_idx on public.profiles(admin_role);

-- ============================================================
-- 2) DSGVO-Art.15-Selbstauskunft: Nachweis-Log der erzeugten Exporte
-- ============================================================
create table if not exists public.gdpr_export_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  requested_by uuid references public.profiles(id) not null,
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  export_summary jsonb,
  requested_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists gdpr_export_requests_user_idx on public.gdpr_export_requests(user_id);
create index if not exists gdpr_export_requests_requested_at_idx on public.gdpr_export_requests(requested_at desc);

alter table public.gdpr_export_requests enable row level security;

drop policy if exists "Admin full access gdpr_export_requests" on public.gdpr_export_requests;
create policy "Admin full access gdpr_export_requests" on public.gdpr_export_requests
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
