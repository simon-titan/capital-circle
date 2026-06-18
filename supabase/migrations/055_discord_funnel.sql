-- 055_discord_funnel.sql
-- Öffentlicher Cold-Traffic-Funnel "Discord Funnel" (Instagram/TikTok/YouTube).
-- Leads sind STANDALONE — kein Auth-Account, kein profiles-Eintrag.
-- Inserts/Updates erfolgen ausschließlich über service-role in den API-Routes,
-- daher sind KEINE public-Policies nötig. Admins dürfen lesen (SELECT).

-- ── Tabellen ────────────────────────────────────────────────────────────────

CREATE TABLE public.discord_leads (
  id                       uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  token                    text        NOT NULL UNIQUE,
  name                     text        NOT NULL,
  email                    text        NOT NULL,
  phone                    text        NOT NULL,
  utm_source               text,
  utm_medium               text,
  utm_campaign             text,
  utm_content              text,
  utm_term                 text,
  referrer                 text,
  session_id               text,
  ip_address               text,
  user_agent               text,
  discord_invite_code      text,
  discord_invite_url       text,
  discord_invite_sent_at   timestamptz,
  discord_joined_at        timestamptz,
  answers                  jsonb,
  questions_completed_at   timestamptz,
  video_watch_seconds      int         DEFAULT 0,
  video_max_percent        int         DEFAULT 0,
  video_completed_at       timestamptz,
  calendly_event_uri       text,
  calendly_invitee_uri     text,
  calendly_booked_at       timestamptz,
  qualified                boolean,
  no_show                  boolean     DEFAULT false,
  closed                   text        DEFAULT 'pending'
    CHECK (closed IN ('pending', 'closed_won', 'closed_lost')),
  product                  text,
  revenue_cents            int,
  internal_notes           text,
  created_at               timestamptz DEFAULT now() NOT NULL,
  updated_at               timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX discord_leads_email_idx
  ON public.discord_leads (email);
CREATE INDEX discord_leads_created_at_idx
  ON public.discord_leads (created_at);
CREATE INDEX discord_leads_token_idx
  ON public.discord_leads (token);
CREATE INDEX discord_leads_utm_source_idx
  ON public.discord_leads (utm_source);
CREATE INDEX discord_leads_discord_invite_code_idx
  ON public.discord_leads (discord_invite_code);

CREATE TABLE public.discord_page_visits (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id   text,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  utm_content  text,
  utm_term     text,
  referrer     text,
  created_at   timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX discord_page_visits_created_at_idx
  ON public.discord_page_visits (created_at);
CREATE INDEX discord_page_visits_session_id_idx
  ON public.discord_page_visits (session_id);

-- ── Row Level Security ───────────────────────────────────────────────────────
-- Inserts/Updates laufen über service-role (umgeht RLS), daher keine public-Policies.
-- Nur Admins dürfen lesen.

ALTER TABLE public.discord_leads       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_page_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_discord_leads"
  ON public.discord_leads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "admin_read_discord_page_visits"
  ON public.discord_page_visits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
