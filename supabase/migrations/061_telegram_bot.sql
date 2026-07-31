-- 061_telegram_bot.sql
-- Telegram-Bot-Einstiegspunkt für Cold Traffic (Instagram/TikTok/YouTube).
-- Leads sind STANDALONE — kein Auth-Account, kein profiles-Eintrag.
-- Inserts/Updates erfolgen ausschließlich über service-role im Webhook
-- (app/api/telegram/webhook), daher sind KEINE public-Policies nötig.
-- Admins dürfen lesen (SELECT).

-- ── Tabelle ─────────────────────────────────────────────────────────────────

CREATE TABLE public.telegram_leads (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  -- bigint: Telegram-IDs sprengen 32 Bit (JS-number trägt sicher bis 2^53).
  telegram_id   bigint      NOT NULL UNIQUE,
  chat_id       bigint      NOT NULL,
  username      text,
  first_name    text,
  last_name     text,
  language_code text,
  -- Deep-Link-Payload aus "/start <payload>", z. B. https://t.me/bot?start=ig_bio
  -- First-Touch: wird nach dem ersten Kontakt nicht mehr überschrieben.
  source        text,
  start_count   int         DEFAULT 1     NOT NULL,
  -- true, sobald die Bot-API 403 meldet (Nutzer hat den Bot blockiert).
  blocked       boolean     DEFAULT false NOT NULL,
  last_start_at timestamptz DEFAULT now() NOT NULL,
  created_at    timestamptz DEFAULT now() NOT NULL,
  updated_at    timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX telegram_leads_created_at_idx
  ON public.telegram_leads (created_at);
CREATE INDEX telegram_leads_source_idx
  ON public.telegram_leads (source);

-- ── Row Level Security ───────────────────────────────────────────────────────
-- Inserts/Updates laufen über service-role (umgeht RLS), daher keine public-Policies.
-- Nur Admins dürfen lesen.

ALTER TABLE public.telegram_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_telegram_leads"
  ON public.telegram_leads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
