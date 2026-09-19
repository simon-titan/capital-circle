-- 090_widerrufe.sql
--
-- Widerrufe über die elektronische Widerrufsfunktion (§ 356a BGB, seit
-- 19.06.2026; Art. 11a RL 2011/83/EU in der Fassung der RL (EU) 2023/2673).
--
-- Die Seite `/widerrufen` ist ohne Anmeldung erreichbar und schreibt jede
-- abgeschickte Widerrufserklärung hierher — auch dann, wenn sich kein Konto
-- und kein Vertrag zuordnen lassen. Die Zeile ist der Beleg für den Eingang:
-- `eingegangen_am` ist der Zeitpunkt, der dem Verbraucher auf der
-- Bestätigungsseite und in der Eingangsbestätigung genannt wird (§ 356a
-- Abs. 4 BGB) und nach dem sich die Fristwahrung richtet (§ 356a Abs. 5 BGB).
--
-- Anders als beim Kündigungsbutton (072 `kuendigungen`) wird hier **nichts
-- automatisch ausgeführt**: kein Abo-Ende, keine Erstattung. Ob und in welcher
-- Höhe erstattet wird (Wertersatz bei begonnener Leistung, erloschenes
-- Widerrufsrecht bei digitalen Inhalten), entscheidet der Betreiber. Jede Zeile
-- landet deshalb als `manuell_pruefen` in `/admin/widerrufe`. Die Spalten zur
-- Zuordnung (Konto, Vertrag, Vertragsschluss, Frist) sind nur Arbeitshilfe für
-- diese Entscheidung, keine rechtliche Bewertung.
--
-- Zugriff: RLS an, bewusst **keine** Policies, zusätzlich alle Rechte für
-- `anon` und `authenticated` entzogen. Geschrieben und gelesen wird
-- ausschließlich mit dem Service-Client (`/api/widerruf`,
-- `/api/admin/widerrufe`). Die Tabelle enthält Namen und E-Mail-Adressen von
-- Personen, die nicht eingeloggt waren.
--
-- Datensparsamkeit: keine Klar-IP, nur ein HMAC-Hash (für die Drosselung
-- „höchstens N Einreichungen je Stunde"), der User-Agent gekürzt.
--
-- Idempotent: mehrfach ausführbar.

create table if not exists public.widerrufe (
  id uuid primary key default gen_random_uuid(),

  -- Zeitpunkt des Eingangs der Erklärung (serverseitig gesetzt, nicht vom Client).
  eingegangen_am timestamptz not null default now(),

  -- ── Inhalt der Widerrufserklärung (§ 356a Abs. 2 BGB) ──────────────────
  -- Der Erklärungssatz im Wortlaut, wie er auf Seite und in der Mail steht.
  erklaerung text not null,
  -- Nr. 1: Name des Verbrauchers.
  name text not null,
  -- Nr. 2: Angaben zur Identifizierung des Vertrags — die E-Mail-Adresse des
  -- Kontos bzw. des Kaufs (kleingeschrieben) …
  email text not null,
  -- … die Vertragsbezeichnung, die ein eingeloggter Verbraucher auf der Seite
  -- gesehen und mit dem Absenden bestätigt hat (sonst leer) …
  vertrag_bezeichnung text,
  -- … und eine freie Angabe (Tarif, Kaufdatum, Rechnungsnummer o. Ä.).
  vertrag_angabe text,
  -- Nr. 3: elektronisches Kommunikationsmittel für die Eingangsbestätigung.
  bestaetigung_email text not null,

  -- ── Zuordnung (Arbeitshilfe für den Betreiber) ─────────────────────────
  user_id uuid references public.profiles(id) on delete set null,
  -- War der Absender beim Absenden mit genau diesem Konto eingeloggt?
  eingeloggt boolean not null default false,
  vertrag_plan text,
  stripe_subscription_id text,
  -- Vermutlicher Vertragsschluss des zugeordneten Vertrags (Abo angelegt bzw.
  -- Lifetime gekauft). Beginn der Widerrufsfrist bei Dienstleistungen und
  -- digitalen Inhalten, § 356 Abs. 2 Nr. 2 BGB.
  vertragsschluss_am timestamptz,
  -- Letzter Tag der regulären 14-Tage-Frist ab `vertragsschluss_am`
  -- (Kalendertag in Deutschland, §§ 187 Abs. 1, 188 Abs. 1 BGB). Rein
  -- informativ: Bei fehlerhafter Belehrung läuft die Frist länger
  -- (§ 356 Abs. 3 BGB).
  frist_ende date,
  -- Eingang innerhalb der regulären Frist? NULL = nicht bestimmbar.
  fristgerecht boolean,

  -- ── Bearbeitungsstand ──────────────────────────────────────────────────
  --   eingegangen      gespeichert, Zuordnung noch nicht abgeschlossen
  --   manuell_pruefen  wartet auf den Betreiber (Regelfall)
  --   erledigt         im Admin von Hand als erledigt markiert
  status text not null default 'eingegangen'
    check (status in ('eingegangen', 'manuell_pruefen', 'erledigt')),
  -- Was die Zuordnung gefunden hat (für den Admin, nicht für den Verbraucher).
  pruef_hinweis text,
  bestaetigung_gesendet_am timestamptz,
  erledigt_am timestamptz,
  erledigt_von uuid references public.profiles(id) on delete set null,
  -- Was der Betreiber entschieden hat (z. B. „voll erstattet am …").
  erledigt_notiz text,

  -- ── Technische Angaben (Missbrauchsschutz) ─────────────────────────────
  ip_hash text,
  user_agent text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.widerrufe is
  'Widerrufserklärungen über die Widerrufsfunktion /widerrufen (§ 356a BGB). Nur Service-Role, keine Policies.';
comment on column public.widerrufe.eingegangen_am is
  'Zeitpunkt des Eingangs der Widerrufserklärung — steht so in Bestätigungsseite und Eingangsbestätigung.';
comment on column public.widerrufe.frist_ende is
  'Letzter Tag der regulären 14-Tage-Frist ab Vertragsschluss (informativ, keine rechtliche Bewertung).';
comment on column public.widerrufe.ip_hash is
  'HMAC-SHA256 der IP-Adresse (keine Klar-IP), nur für die Drosselung.';

-- Drosselung: „wie viele Einreichungen hatte diese Adresse / dieser Hash in der letzten Stunde?"
create index if not exists widerrufe_email_idx
  on public.widerrufe (email, eingegangen_am desc);
create index if not exists widerrufe_bestaetigung_email_idx
  on public.widerrufe (bestaetigung_email, eingegangen_am desc);
create index if not exists widerrufe_ip_hash_idx
  on public.widerrufe (ip_hash, eingegangen_am desc)
  where ip_hash is not null;

-- Admin-Liste: neueste zuerst, Filter nach Status.
create index if not exists widerrufe_status_idx
  on public.widerrufe (status, eingegangen_am desc);

-- `set_updated_at()` stammt aus 043 (generischer Trigger).
drop trigger if exists widerrufe_updated_at on public.widerrufe;
create trigger widerrufe_updated_at
  before update on public.widerrufe
  for each row execute function public.set_updated_at();

-- RLS an, keine Policies: deny-by-default für anon und authenticated.
alter table public.widerrufe enable row level security;

-- Zusätzlich die Tabellenrechte entziehen, die Supabase neuen Tabellen im
-- Schema `public` standardmäßig gibt. Doppelt hält besser: Legt später jemand
-- versehentlich eine Policy an, bleibt die Tabelle trotzdem zu.
revoke all on table public.widerrufe from anon, authenticated;
