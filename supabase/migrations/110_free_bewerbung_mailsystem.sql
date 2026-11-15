-- 110 · Free-Kurs-Bewerbung, 30-Tage-Zugang und Versandsteuerung (E-Mail-Playbook 1.0, 07.11.2026)
--
-- Emres Board/Playbook: Wer das kostenlose Training sehen will, bewirbt sich
-- (drei Fragen), Emre prüft und nimmt an oder lehnt endgültig ab. Angenommene
-- bekommen 30 Kalendertage Zugang ab Freischaltung, einmalig +7 Tage über das
-- Team (WhatsApp). Das Konto bleibt danach bestehen, gesperrt wird nur der
-- Trainingsbereich.
--
-- Dazu die Versandsteuerung aus dem Playbook: jede Vorlage (A01 … Q02) geht je
-- Kontakt und Anlass höchstens einmal raus, und was nicht rausging, steht mit
-- Grund im Protokoll (`mail_versand`). Persönliche Kontaktpausen
-- (`kontakt_pause`) und Zustellsperren (`mail_sperre`) gelten über alle Wege.
--
-- Alles nur über den Service-Client beschreibbar. Eigene Bewerbung und eigener
-- Zugang sind für das Konto lesbar (Proxy und Seiten).

-- ── 1. Bewerbungen für das Free Training ────────────────────────────────────

create table if not exists public.training_bewerbungen (
  id                    uuid        primary key default gen_random_uuid(),
  -- Eine Bewerbung je Konto: Eine Ablehnung ist endgültig (Vorlage A03).
  user_id               uuid        not null unique references auth.users(id) on delete cascade,
  name                  text        not null,
  email                 text        not null,
  -- { stand, schwierigkeit, warum } — Texte der drei Fragen in config/training.ts.
  antworten             jsonb       not null default '{}'::jsonb,
  -- Frage 3, zweiter Teil: „Möchtest du, dass wir dich kontaktieren …?"
  kontakt_gewuenscht    boolean     not null default false,
  telefon               text,
  status                text        not null default 'offen'
                          check (status in ('offen', 'angenommen', 'abgelehnt')),
  eingereicht_am        timestamptz not null default now(),
  -- Erst mit bestätigter Adresse geht A01 raus und darf Emre entscheiden.
  adresse_bestaetigt_am timestamptz,
  geprueft_von          uuid        references auth.users(id) on delete set null,
  geprueft_am           timestamptz,
  -- Interne Notiz zur Entscheidung — geht nie an den Bewerber.
  notiz                 text,
  -- Herkunft wie bei der Registrierung (profiles.funnel_herkunft).
  kanal                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists training_bewerbungen_status_idx on public.training_bewerbungen (status, eingereicht_am desc);
create index if not exists training_bewerbungen_email_idx on public.training_bewerbungen (lower(email));

alter table public.training_bewerbungen enable row level security;
revoke all on public.training_bewerbungen from anon, authenticated;
-- Nur die Spalten, die Proxy und Statusseite brauchen — Antworten, interne
-- Notiz und Prüfer bleiben für den Bewerber unsichtbar.
grant select (id, user_id, status, eingereicht_am, adresse_bestaetigt_am) on public.training_bewerbungen to authenticated;
drop policy if exists training_bewerbungen_eigene on public.training_bewerbungen;
create policy training_bewerbungen_eigene on public.training_bewerbungen
  for select to authenticated using (user_id = auth.uid());

comment on table public.training_bewerbungen is
  'Bewerbungen für das kostenlose Training (/training). Emre entscheidet unter /admin/training. Abgelehnt ist endgültig. Schreiben nur über den Service-Client (Migration 110).';

-- ── 2. Zugang zum Free Training (30 Tage + einmalig 7) ──────────────────────

create table if not exists public.training_zugang (
  user_id                uuid        primary key references auth.users(id) on delete cascade,
  bewerbung_id           uuid        references public.training_bewerbungen(id) on delete set null,
  -- Tatsächliche Freischaltung; Ende einmal daraus berechnet (gleiche Berliner
  -- Uhrzeit nach 30 Kalendertagen) und nie durch Login oder Klick verschoben.
  freigeschaltet_am      timestamptz not null default now(),
  original_ende_am       timestamptz not null,
  verlaengerung_status   text        not null default 'keine'
                           check (verlaengerung_status in ('keine', 'angefragt', 'aktiv')),
  verlaengert_am         timestamptz,
  verlaengerung_ende_am  timestamptz,
  verlaengert_von        uuid        references auth.users(id) on delete set null,
  -- Erste echte Wiedergabe einer Trainingslektion (nicht der Seitenaufruf).
  gestartet_am           timestamptz,
  -- Übernommen aus der Zeit vor der Bewerbung: keine Start-/Lernfolgen nachspielen.
  aus_bestand            boolean     not null default false,
  created_at             timestamptz not null default now()
);

alter table public.training_zugang enable row level security;
revoke all on public.training_zugang from anon, authenticated;
grant select on public.training_zugang to authenticated;
drop policy if exists training_zugang_eigener on public.training_zugang;
create policy training_zugang_eigener on public.training_zugang
  for select to authenticated using (user_id = auth.uid());

comment on table public.training_zugang is
  'Freischaltung des kostenlosen Trainings: 30 Tage ab Annahme, einmalig +7 Tage (Team, WhatsApp). Ende = coalesce(verlaengerung_ende_am, original_ende_am). Migration 110.';

-- Bestand: Wer sich vor dem Bewerbungsweg registriert und die Adresse
-- bestätigt hat, behält den Zugang — 30 Tage ab Einspielen dieser Migration,
-- ohne Annahme-Mail und ohne Start-/Lernfolgen (Playbook, Test 12).
insert into public.training_zugang (user_id, freigeschaltet_am, original_ende_am, aus_bestand)
select p.id,
       now(),
       ((now() at time zone 'Europe/Berlin') + interval '30 days') at time zone 'Europe/Berlin',
       true
from public.profiles p
join auth.users u on u.id = p.id
where p.training_registriert_am is not null
  and coalesce(p.is_paid, false) = false
  and u.email_confirmed_at is not null
  -- Wer schon über den Bewerbungsweg kam, ist kein Bestand (auch bei erneutem Einspielen).
  and not exists (select 1 from public.training_bewerbungen b where b.user_id = p.id)
on conflict (user_id) do nothing;

-- ── 3. Persönliche Kontaktpause (personal_contact_hold) ─────────────────────

create table if not exists public.kontakt_pause (
  id                uuid        primary key default gen_random_uuid(),
  email             text        not null,
  user_id           uuid        references auth.users(id) on delete set null,
  grund             text        not null,
  gesetzt_von       uuid        references auth.users(id) on delete set null,
  gesetzt_am        timestamptz not null default now(),
  aufgehoben_am     timestamptz,
  aufgehoben_von    uuid        references auth.users(id) on delete set null,
  -- Pflicht beim Aufheben (Playbook Regel 10): was als Nächstes passiert.
  naechster_schritt text
);

create unique index if not exists kontakt_pause_aktiv_idx
  on public.kontakt_pause (lower(email)) where aufgehoben_am is null;

alter table public.kontakt_pause enable row level security;
revoke all on public.kontakt_pause from anon, authenticated;

comment on table public.kontakt_pause is
  'Persönlicher Kontakt hat Vorrang: Solange eine Zeile offen ist, gehen keine automatischen Lern-/Verkaufsmails (M/K) an diese Adresse. Nur das Team hebt auf. Migration 110.';

-- ── 4. Zustellsperre (Hard Bounce, Beschwerde) ──────────────────────────────

create table if not exists public.mail_sperre (
  email      text        primary key,
  grund      text        not null check (grund in ('bounce', 'beschwerde', 'manuell')),
  details    text,
  am         timestamptz not null default now()
);

alter table public.mail_sperre enable row level security;
revoke all on public.mail_sperre from anon, authenticated;

comment on table public.mail_sperre is
  'Adressen, an die nichts mehr automatisch geht (Resend-Webhook: bounced/complained). Migration 110.';

-- ── 4b. Werbe-Abmeldung für Kontakte ohne Konto ─────────────────────────────
-- `/api/unsubscribe/contact` meldet sonst nur den Resend-Kontakt ab; das hält
-- unsere eigenen Sendungen (emails.send) nicht auf. Gilt für M/K-Mails, nicht
-- für Termin-Organisation (Klasse S).
create table if not exists public.mail_abmeldung (
  email text        primary key,
  am    timestamptz not null default now()
);
alter table public.mail_abmeldung enable row level security;
revoke all on public.mail_abmeldung from anon, authenticated;

-- ── 5. Versandprotokoll der Playbook-Vorlagen ───────────────────────────────

create table if not exists public.mail_versand (
  id          uuid        primary key default gen_random_uuid(),
  -- Playbook-ID: A01 … Q02
  vorlage     text        not null,
  -- Anlass (scope_id): Bewerbung, Einschreibung, Terminversion, Bestellung …
  bezug       text        not null,
  email       text        not null,
  user_id     uuid        references auth.users(id) on delete set null,
  klasse      text        not null check (klasse in ('S', 'K', 'M')),
  status      text        not null
                check (status in ('reserviert', 'gesendet', 'uebersprungen', 'gestoppt')),
  grund       text,
  faellig_am  timestamptz,
  gesendet_am timestamptz,
  resend_id   text,
  created_at  timestamptz not null default now(),
  -- Deduplizierung: Kontakt + Vorlage + Anlass (Playbook Kapitel 11).
  unique (email, vorlage, bezug)
);

create index if not exists mail_versand_user_idx on public.mail_versand (user_id, created_at desc);
create index if not exists mail_versand_vorlage_idx on public.mail_versand (vorlage, status, created_at desc);
create index if not exists mail_versand_email_idx on public.mail_versand (lower(email), created_at desc);

alter table public.mail_versand enable row level security;
revoke all on public.mail_versand from anon, authenticated;

comment on table public.mail_versand is
  'Versandprotokoll des E-Mail-Playbooks: je Kontakt, Vorlage und Anlass genau eine Zeile — gesendet, übersprungen oder gestoppt, mit Grund. Migration 110.';

-- ── 6. Analysegespräch: Zeitpunkt der abgeschickten Fragen, neue Stelle ─────

alter table public.training_leads
  add column if not exists fragen_am timestamptz;

update public.training_leads
   set fragen_am = updated_at
 where fragen_am is null
   and answers <> '{}'::jsonb;

alter table public.training_leads drop constraint if exists training_leads_stelle_check;
alter table public.training_leads add constraint training_leads_stelle_check
  check (stelle in ('nach_video_3', 'training', 'programme', 'dashboard', 'bewerbung'));

comment on column public.training_leads.fragen_am is
  'Wann der Fragebogen vollständig abgeschickt wurde — ab hier gilt die Gesprächsanfrage als gestellt (stoppt S/L/I). Migration 110.';
