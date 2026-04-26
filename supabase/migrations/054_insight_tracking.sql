-- 054_insight_tracking.sql
-- Custom Tracking-Links für die /insight Landing Page.
-- Admins erstellen benannte Links; Visits und Bewerbungen werden getrennt gezählt.

-- ── Tabellen ────────────────────────────────────────────────────────────────

CREATE TABLE public.insight_tracking_links (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  label       text        NOT NULL,
  slug        text        NOT NULL UNIQUE,
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.insight_tracking_events (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  link_slug   text        NOT NULL REFERENCES public.insight_tracking_links(slug) ON DELETE CASCADE,
  event_type  text        NOT NULL CHECK (event_type IN ('visit', 'application')),
  session_id  text,
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- Index für schnelle Counts per slug
CREATE INDEX insight_tracking_events_slug_type_idx
  ON public.insight_tracking_events (link_slug, event_type);

-- Index für Dedup-Check (visit + session_id)
CREATE INDEX insight_tracking_events_session_idx
  ON public.insight_tracking_events (link_slug, event_type, session_id)
  WHERE session_id IS NOT NULL;

-- ── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.insight_tracking_links  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insight_tracking_events ENABLE ROW LEVEL SECURITY;

-- Links: nur Admins dürfen lesen / schreiben
CREATE POLICY "admin_all_tracking_links"
  ON public.insight_tracking_links
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Events: nur Admins dürfen lesen
CREATE POLICY "admin_read_tracking_events"
  ON public.insight_tracking_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Events: INSERT ist anonym erlaubt (API-Route validiert den Slug vorab per service-role)
-- Wir erlauben public INSERT damit die API-Route keinen Auth-Header braucht.
CREATE POLICY "public_insert_tracking_events"
  ON public.insight_tracking_events
  FOR INSERT
  WITH CHECK (true);
