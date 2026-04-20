-- 046_phase5_audit.sql
-- Phase 5: Admin-Audit-Log (Wer hat wann an welchem User was geändert)

create table if not exists public.user_audit_log (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid references public.profiles(id) on delete cascade,
  admin_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  field text,
  old_value text,
  new_value text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_target_user_idx on public.user_audit_log(target_user_id);
create index if not exists audit_log_admin_user_idx on public.user_audit_log(admin_user_id);
create index if not exists audit_log_created_at_idx on public.user_audit_log(created_at desc);

alter table public.user_audit_log enable row level security;

drop policy if exists "Admin full access audit_log" on public.user_audit_log;
create policy "Admin full access audit_log" on public.user_audit_log
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
