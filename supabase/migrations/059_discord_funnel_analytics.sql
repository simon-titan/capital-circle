-- Discord-Funnel: Analytics-Overhaul.
-- Neue Tracking-Dimensionen am Lead (Closer Kevin/Simon, Close-Typ 1:1 vs. Mitgliedschaft
-- mit 1/2/4 Raten, Closed-Datum, Herkunfts-Trennung discord_funnel vs. termin_direct,
-- Video-Rewatch-Denormalisierung) sowie eine Event-Tabelle discord_video_views für die
-- echte Mehrfach-Ansicht-Zählung (auch für /termin & /video, die VOR der Lead-Anlage
-- nur eine session_id haben — Verknüpfung erfolgt beim Lead-Anlegen per session_id).

-- ── Neue Spalten auf discord_leads ──────────────────────────────────────────────
alter table public.discord_leads
  add column if not exists closer text
    check (closer is null or closer in ('kevin', 'simon')),
  add column if not exists close_type text
    check (close_type is null or close_type in ('one_to_one', 'membership')),
  add column if not exists membership_installments smallint
    check (membership_installments is null or membership_installments in (1, 2, 4)),
  add column if not exists closed_at timestamptz,
  add column if not exists source_origin text
    check (source_origin is null or source_origin in ('discord_funnel', 'termin_direct')),
  add column if not exists video_view_count int default 0,
  add column if not exists video_last_watched_at timestamptz;

create index if not exists discord_leads_closer_idx        on public.discord_leads (closer);
create index if not exists discord_leads_source_origin_idx on public.discord_leads (source_origin);
create index if not exists discord_leads_closed_at_idx     on public.discord_leads (closed_at);

-- ── Video-View-Events (eine Session pro session_id + source) ─────────────────────
create table if not exists public.discord_video_views (
  id              uuid        primary key default gen_random_uuid(),
  session_id      text,
  token           text,                                  -- nullable: anonyme /video-Views
  lead_id         uuid        references public.discord_leads(id) on delete set null,
  source          text        not null default 'unknown'
    check (source in ('discord_funnel', 'termin_direct', 'video_only', 'unknown')),
  watched_seconds int         not null default 0,
  max_percent     int         not null default 0,
  completed       boolean     not null default false,
  session_start   timestamptz,
  session_end     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists discord_video_views_session_id_idx on public.discord_video_views (session_id);
create index if not exists discord_video_views_token_idx      on public.discord_video_views (token);
create index if not exists discord_video_views_lead_id_idx    on public.discord_video_views (lead_id);
create index if not exists discord_video_views_created_at_idx on public.discord_video_views (created_at);
create index if not exists discord_video_views_source_idx     on public.discord_video_views (source);

alter table public.discord_video_views enable row level security;

-- Nur Admins dürfen lesen; Schreibzugriff der API läuft über service-role (umgeht RLS).
create policy "admin_read_discord_video_views"
  on public.discord_video_views
  for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- ── Backfill source_origin für bestehende Leads (idempotent) ─────────────────────
update public.discord_leads
   set source_origin = case
     when utm_source = 'termin-direkt' then 'termin_direct'
     else 'discord_funnel'
   end
 where source_origin is null;
