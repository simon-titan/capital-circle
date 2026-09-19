-- 072_kuendigungen.sql
--
-- Kündigungen über den gesetzlichen Kündigungsbutton (§ 312k BGB).
--
-- Die Seite `/kuendigen` ist ohne Anmeldung erreichbar und schreibt jede
-- abgeschickte Kündigungserklärung hierher — auch dann, wenn sich kein Konto
-- und kein Abo zuordnen lassen. Die Zeile ist der Beleg für den Eingang:
-- `eingegangen_am` ist der Zeitpunkt, der dem Kunden auf der Bestätigungsseite
-- und in der Bestätigungsmail genannt wird.
--
-- Nicht verwechseln mit `cancellations` (044): Das ist die Statistiktabelle
-- für Kündigungsgründe aus dem Komfortweg in `/einstellungen/abonnement`.
-- Wird eine Kündigung von hier aus bei Stripe ausgeführt, landet dort
-- zusätzlich eine Zeile — hier steht dagegen die Erklärung selbst.
--
-- Zugriff: RLS an, bewusst **keine** Policies. Geschrieben und gelesen wird
-- ausschließlich mit dem Service-Client (`/api/kuendigung`,
-- `/api/admin/kuendigungen`). Ohne Policy sieht weder `anon` noch
-- `authenticated` eine Zeile — die Tabelle enthält Namen und E-Mail-Adressen
-- von Personen, die nicht eingeloggt waren.
--
-- Datensparsamkeit: keine Klar-IP, nur ein HMAC-Hash (für die Drosselung
-- „höchstens N Einreichungen je Stunde"), der User-Agent gekürzt.
--
-- Idempotent: mehrfach ausführbar.

create table if not exists public.kuendigungen (
  id uuid primary key default gen_random_uuid(),

  -- Zeitpunkt des Zugangs der Erklärung (serverseitig gesetzt, nicht vom Client).
  eingegangen_am timestamptz not null default now(),

  -- Identifizierung des Kündigenden
  name text not null,
  -- E-Mail-Adresse des Kontos, so wie sie eingegeben wurde (kleingeschrieben).
  email text not null,
  -- Wohin die Eingangsbestätigung ging (Standard: dieselbe Adresse).
  bestaetigung_email text not null,
  -- Zugeordnetes Konto, falls die E-Mail eindeutig einem Konto gehört.
  user_id uuid references public.profiles(id) on delete set null,
  -- War der Absender beim Absenden mit genau diesem Konto eingeloggt?
  eingeloggt boolean not null default false,

  -- Inhalt der Erklärung
  art text not null check (art in ('ordentlich', 'ausserordentlich')),
  -- Pflicht bei außerordentlicher Kündigung, sonst leer.
  grund text,
  -- Gewünschter Beendigungszeitpunkt; NULL = zum nächstmöglichen Zeitpunkt.
  zeitpunkt_wunsch date,
  -- Freie Angabe des Kunden zur Vertragsidentifizierung (Kunden-/Rechnungsnummer o. Ä.).
  vertrag_angabe text,

  -- Zugeordneter Vertrag, falls gefunden
  vertrag_plan text,
  stripe_subscription_id text,
  -- Zeitpunkt, zu dem der Vertrag durch die Kündigung endet (bei Ausführung: Periodenende).
  wirksam_zum timestamptz,

  -- Bearbeitungsstand
  --   eingegangen      gespeichert, Verarbeitung noch nicht abgeschlossen
  --   ausgefuehrt      bei Stripe gesetzt (cancel_at_period_end) oder war schon gekündigt
  --   manuell_pruefen  braucht einen Menschen (außerordentlich, Wunschtermin, Fehler …)
  --   kein_vertrag     kein Konto bzw. kein laufendes Abo zur E-Mail gefunden
  --   erledigt         im Admin von Hand als erledigt markiert
  status text not null default 'eingegangen'
    check (status in ('eingegangen', 'ausgefuehrt', 'manuell_pruefen', 'kein_vertrag', 'erledigt')),
  -- Warum eine Zeile geprüft werden muss (für den Admin, nicht für den Kunden).
  pruef_hinweis text,
  ausgefuehrt_am timestamptz,
  erledigt_am timestamptz,
  erledigt_von uuid references public.profiles(id) on delete set null,
  bestaetigung_gesendet_am timestamptz,

  -- Technische Angaben (Missbrauchsschutz)
  ip_hash text,
  user_agent text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.kuendigungen is
  'Kündigungserklärungen über den Kündigungsbutton /kuendigen (§ 312k BGB). Nur Service-Role, keine Policies.';
comment on column public.kuendigungen.eingegangen_am is
  'Zeitpunkt des Zugangs der Kündigungserklärung — steht so in Bestätigungsseite und -mail.';
comment on column public.kuendigungen.zeitpunkt_wunsch is
  'Gewünschter Beendigungszeitpunkt; NULL heißt: zum nächstmöglichen Zeitpunkt.';
comment on column public.kuendigungen.ip_hash is
  'HMAC-SHA256 der IP-Adresse (keine Klar-IP), nur für die Drosselung.';

-- Drosselung: „wie viele Einreichungen hatte diese Adresse / dieser Hash in der letzten Stunde?"
create index if not exists kuendigungen_email_idx
  on public.kuendigungen (email, eingegangen_am desc);
create index if not exists kuendigungen_bestaetigung_email_idx
  on public.kuendigungen (bestaetigung_email, eingegangen_am desc);
create index if not exists kuendigungen_ip_hash_idx
  on public.kuendigungen (ip_hash, eingegangen_am desc)
  where ip_hash is not null;

-- Admin-Liste: neueste zuerst, Filter nach Status.
create index if not exists kuendigungen_status_idx
  on public.kuendigungen (status, eingegangen_am desc);

-- `set_updated_at()` stammt aus 043 (generischer Trigger).
drop trigger if exists kuendigungen_updated_at on public.kuendigungen;
create trigger kuendigungen_updated_at
  before update on public.kuendigungen
  for each row execute function public.set_updated_at();

-- RLS an, keine Policies: deny-by-default für anon und authenticated.
alter table public.kuendigungen enable row level security;
