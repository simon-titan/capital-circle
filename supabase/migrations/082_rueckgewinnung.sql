-- ────────────────────────────────────────────────────────────────────────────
-- 082: Rückgewinnung vorbereiten — Schalter und Versandprotokoll
-- ────────────────────────────────────────────────────────────────────────────
--
-- Entscheidung Simon, 19.09.2026: Ehemalige werden **vorerst nicht** per Mail
-- oder Direktnachricht beworben, aber alles dafür wird vorbereitet.
--
-- ── 1. Der Schalter für die automatische Rückgewinnungs-Mail ───────────────
--
-- `app/api/cron/reactivation-offers` schickte bisher 14 Tage nach jeder
-- Kündigung eine Mail — und versprach darin einen Gratismonat, den es
-- technisch nicht gab. Die Mail ist neu geschrieben (ohne Rabatt, mit
-- Lifetime-Hinweis) und läuft nur noch, wenn dieser Schalter an ist.
-- **Standard: aus.** Fehlt die Zeile, gilt ebenfalls „aus".
--
-- `do nothing` bei Konflikt, damit ein zweiter Durchlauf einen von Hand
-- eingeschalteten Schalter nicht wieder ausknipst.
--
-- ── 2. Das Versandprotokoll für Kampagnen ──────────────────────────────────
--
-- Nach dem Vorbild von MoonTrading (0004 `kampagne_versand`): Bricht ein
-- Kampagnenlauf mittendrin ab (Resend-Limit, Vercel-Zeitlimit), bekäme beim
-- zweiten Anlauf die erste Hälfte alles ein zweites Mal. Diese Tabelle ist die
-- Merkliste, die das verhindert. `email_sequence_log` taugt dafür nicht: Es
-- kennt keine Direktnachrichten, und seine Eindeutigkeit über
-- (Adresse, Sequenz, Schritt) ist für Transaktionsmails gebaut.
--
-- Was hier NICHT hineingehört: der Werbewiderspruch. Der steht auf
-- `profiles.unsubscribed_at` und gilt unabhängig von einer Kampagne.
--
-- ── Zugriff ────────────────────────────────────────────────────────────────
--
-- RLS an, keine Policy, `revoke`: Hier stehen E-Mail-Adressen von Menschen,
-- die überwiegend keine Kunden mehr sind. Zugriff nur über den Service-Client
-- hinter der Adminprüfung.
--
-- Idempotent. Ausführen im Supabase SQL-Editor.

insert into public.app_settings (key, value)
values ('rueckgewinnung_mail', jsonb_build_object('enabled', false))
on conflict (key) do nothing;

create table if not exists public.kampagne_versand (
  id uuid primary key default gen_random_uuid(),

  -- Freier Bezeichner, etwa "rueckgewinnung-lifetime". Bewusst kein Enum: Eine
  -- neue Kampagne darf keine Migration erfordern.
  kampagne text not null,

  -- Welche Stufe der Kampagne, etwa "erste".
  stufe text not null,

  email text not null,
  user_id uuid references public.profiles(id) on delete set null,

  -- Was tatsächlich rausging. Die Mail ist der verlässliche Weg, die
  -- Direktnachricht die Zugabe; beides steht hier, damit eine Rückfrage
  -- („ich habe nichts bekommen") ohne Raten beantwortet werden kann.
  mail_gesendet boolean not null default false,
  dm_gesendet boolean not null default false,
  resend_message_id text,

  gesendet_am timestamptz not null default now()
);

-- Der eigentliche Schutz. `lower(email)`, damit „Max@…" und „max@…" nicht als
-- zwei Menschen gelten.
create unique index if not exists kampagne_versand_eindeutig_idx
  on public.kampagne_versand (kampagne, stufe, lower(email));

create index if not exists kampagne_versand_zeit_idx
  on public.kampagne_versand (gesendet_am desc);

alter table public.kampagne_versand enable row level security;
revoke all on public.kampagne_versand from anon, authenticated;

comment on table public.kampagne_versand is
  'Merkliste für Werbe-Kampagnen (Mail + Discord-DM): wer welche Stufe bekommen hat. '
  'Verhindert Doppelversand, wenn ein abgebrochener Lauf neu gestartet wird.';
