-- 101_kaufweg_analytics.sql
--
-- Auswertung des gesamten Kaufwegs: Besuch → Klick → Kasse → Zahlung.
--
-- ── Warum drei Tabellen und nicht eine ──────────────────────────────────────
--
-- `funnel_ereignisse` ist das Protokoll: eine Zeile je Ereignis, schlank
-- gehalten (Art, Sitzung, Zeit, Pfad, Bauteil, Wert). Sie beantwortet Fragen,
-- die beim Bauen noch niemand gestellt hat — und genau dafuer ist sie da.
--
-- `funnel_sitzungen` ist der Stand je Sitzung: Verweildauer, Scrolltiefe,
-- weitester Abschnitt, Zahl der Klicks. Er liesse sich aus dem Protokoll
-- errechnen, aber jede Auswertung muesste dafuer ueber alle Ereignisse laufen.
-- Der Endpunkt schreibt ihn deshalb gleich mit fort.
--
-- `funnel_tage` ist die Tagesrechnung. Protokoll und Sitzungen werden nach 90
-- Tagen aufgeraeumt (Nachtlauf `app/api/cron/taeglich`); die Tagesrechnung
-- bleibt. Ohne sie waere jede Auswertung ein voller Durchlauf ueber Millionen
-- Zeilen, und nach dem Aufraeumen waere die Geschichte weg.
--
-- ── Was hier ausdruecklich NICHT steht ──────────────────────────────────────
--
-- Keine IP-Adresse, kein Fingerabdruck, kein Cookie, keine Nutzer-ID. Die
-- Sitzungskennung ist eine Zufallszahl aus dem `sessionStorage` des Browsers
-- und endet mit dem Tab. Vom Verweis speichern wir nur den Host, nie die volle
-- Adresse. Damit bleibt die Messung nach § 25 TDDDG einwilligungsfrei — siehe
-- Abschnitt 13 der Datenschutzerklaerung (`app/datenschutz/page.tsx`).
--
-- ── RLS ─────────────────────────────────────────────────────────────────────
--
-- Alle drei Tabellen: RLS an, keine Policy. Das heisst deny-by-default —
-- geschrieben wird ausschliesslich ueber den Service-Client
-- (`app/api/tracking/funnel`, Nachtlauf), gelesen ueber den Admin-Endpunkt
-- (`app/api/admin/analytics/kaufweg`). Dieselbe Politik wie bei
-- `checkout_sessions` (Migration 069).
--
-- Additiv und idempotent. Von Hand im Supabase-SQL-Editor einspielen.

-- ── 1. Das Protokoll ────────────────────────────────────────────────────────

create table if not exists public.funnel_ereignisse (
  id bigserial primary key,
  -- Zufallskennung aus dem sessionStorage des Besuchers. Kein Personenbezug,
  -- keine Wiedererkennung ueber den Tab hinaus.
  sitzung text not null,
  art text not null check (art in (
    'seite',      -- Seitenaufruf (einmal je Sitzung und Pfad)
    'scroll',     -- Schwelle erreicht, `wert` = 25 | 50 | 75 | 100
    'abschnitt',  -- Abschnitt erstmals im Bild, `bauteil` = Name des Abschnitts
    'modal_auf',  -- Beitritts-Dialog geoeffnet, `bauteil` = ausloesender Knopf
    'laufzeit',   -- Laufzeit gewaehlt, `text_wert` = monthly | quarterly | yearly
    'klick',      -- Klick auf einen Kauf-/Beitritts-Knopf
    'kasse',      -- Der Klick, der tatsaechlich nach /go/<plan> fuehrt
    'ende'        -- Abschlussmeldung beim Verlassen, `wert` = sichtbare ms
  )),
  pfad text,
  -- Herkunft innerhalb der Seite: hero, nav, angebot, modal, mobil, abschluss …
  bauteil text,
  -- Zahlenwert je nach Art (Prozent, Millisekunden). Absichtlich `integer`:
  -- Wir messen keine Bruchteile.
  wert integer,
  -- Textwert je nach Art (Plan-Kuerzel, Abschnittsname).
  text_wert text,
  erzeugt_am timestamptz not null default now()
);

create index if not exists funnel_ereignisse_zeit_idx on public.funnel_ereignisse(erzeugt_am desc);
create index if not exists funnel_ereignisse_sitzung_idx on public.funnel_ereignisse(sitzung);
create index if not exists funnel_ereignisse_art_zeit_idx on public.funnel_ereignisse(art, erzeugt_am desc);

alter table public.funnel_ereignisse enable row level security;

-- ── 2. Der Stand je Sitzung ─────────────────────────────────────────────────
--
-- Eine Zeile je Besucher-Tab. Der Endpunkt schreibt sie fort: Zahlen wachsen
-- nur (Verweildauer, Scrolltiefe, Klicks), damit eine verspaetet eintreffende
-- Meldung keinen hoeheren Stand ueberschreibt.

create table if not exists public.funnel_sitzungen (
  sitzung text primary key,
  erste_seite text,
  letzte_seite text,
  -- Nur der Host des Verweises ('google.com'), nie die volle Adresse: Die
  -- traegt bei Suchmaschinen den Suchbegriff und bei Foren den Thread.
  verweis_host text,
  utm_quelle text,
  utm_medium text,
  utm_kampagne text,
  -- `src`-Parameter der eigenen Links (?src=hero), damit sich der Kaufweg
  -- ohne UTM-Parameter denselben Herkunftsbegriff teilt.
  src text,
  -- 'mobil' | 'tablet' | 'desktop' — aus der Fensterbreite, nicht aus dem
  -- User-Agent. Kein Geraetemodell, keine Aufloesung.
  geraet text,
  begonnen_am timestamptz not null default now(),
  zuletzt_am timestamptz not null default now(),
  -- Sichtbare Zeit in Millisekunden. Ein Tab im Hintergrund zaehlt nicht mit —
  -- sonst misst man offene Tabs statt gelesener Seiten.
  sichtbare_ms integer not null default 0,
  max_scroll smallint not null default 0,
  max_abschnitt text,
  -- Wie weit der Abschnitt in der Reihenfolge der Seite steht (0 = Hero).
  -- Ohne den Rang liesse sich „am weitesten gekommen" nicht ohne Kenntnis der
  -- Seitenreihenfolge auswerten.
  max_abschnitt_rang smallint not null default 0,
  klicks integer not null default 0,
  modal_geoeffnet integer not null default 0,
  laufzeit_gewaehlt text,
  -- Wurde aus dieser Sitzung heraus eine Kasse geoeffnet? Die Verknuepfung
  -- zum Kauf steht in `checkout_sessions.funnel_sitzung` (unten).
  kasse_gestartet boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists funnel_sitzungen_begonnen_idx on public.funnel_sitzungen(begonnen_am desc);
create index if not exists funnel_sitzungen_erste_seite_idx on public.funnel_sitzungen(erste_seite);

alter table public.funnel_sitzungen enable row level security;

-- ── 3. Die Tagesrechnung ────────────────────────────────────────────────────
--
-- Schluessel ist (Tag, Pfad, Herkunft). Die Herkunft ist ein einziger
-- normalisierter Begriff: `src` wenn vorhanden, sonst `utm_quelle`, sonst der
-- Verweis-Host, sonst 'direkt'. Drei Spalten fuer dasselbe Konzept haetten drei
-- Trichter erzeugt, die sich nicht addieren lassen.
--
-- Verweildauer und Scrolltiefe stehen als Faecher, nicht als Mittelwert: Ein
-- Mittelwert aus „30 Sekunden ueberflogen" und „acht Minuten gelesen" ist eine
-- Zahl, die keinen einzigen Besucher beschreibt.

create table if not exists public.funnel_tage (
  tag date not null,
  pfad text not null,
  herkunft text not null,

  sitzungen integer not null default 0,
  sitzungen_mit_klick integer not null default 0,
  klicks integer not null default 0,
  modal_geoeffnet integer not null default 0,
  laufzeit_gewaehlt integer not null default 0,
  kassen integer not null default 0,

  scroll_25 integer not null default 0,
  scroll_50 integer not null default 0,
  scroll_75 integer not null default 0,
  scroll_100 integer not null default 0,

  -- Faecher der sichtbaren Verweildauer, in Sekunden: <10, 10–30, 30–60,
  -- 60–180, >=180.
  dauer_0_10 integer not null default 0,
  dauer_10_30 integer not null default 0,
  dauer_30_60 integer not null default 0,
  dauer_60_180 integer not null default 0,
  dauer_180_plus integer not null default 0,
  -- Summe der sichtbaren Zeit, damit sich Tage zu einem ehrlichen
  -- Durchschnitt addieren lassen (Mittel aus Mitteln waere falsch gewichtet).
  sichtbare_ms_summe bigint not null default 0,

  berechnet_am timestamptz not null default now(),
  primary key (tag, pfad, herkunft)
);

create index if not exists funnel_tage_tag_idx on public.funnel_tage(tag desc);

alter table public.funnel_tage enable row level security;

-- ── 4. Klicks je Knopf, als Tagesrechnung ───────────────────────────────────
--
-- Eigene Tabelle statt weiterer Spalten in `funnel_tage`: Die Zahl der Knoepfe
-- aendert sich mit der Seite, die Zahl der Spalten einer Tabelle sollte das
-- nicht. Sonst braeuchte jeder neue CTA eine Migration.

create table if not exists public.funnel_tage_bauteile (
  tag date not null,
  pfad text not null,
  bauteil text not null,
  klicks integer not null default 0,
  kassen integer not null default 0,
  modal_geoeffnet integer not null default 0,
  berechnet_am timestamptz not null default now(),
  primary key (tag, pfad, bauteil)
);

create index if not exists funnel_tage_bauteile_tag_idx on public.funnel_tage_bauteile(tag desc);

alter table public.funnel_tage_bauteile enable row level security;

-- ── 5. Wie weit gelesen wurde, als Tagesrechnung ────────────────────────────
--
-- `erreicht` zaehlt jede Sitzung, die bis zu diesem Abschnitt kam (kumulativ,
-- ein Trichter). `gestoppt` zaehlt die, bei denen es genau hier endete — das
-- ist die Zahl, die sagt, wo die Seite Leute verliert.
--
-- Wieder eine eigene Tabelle statt Spalten: Die Verkaufsseite hat heute zehn
-- Abschnitte und morgen elf, und das darf keine Migration kosten.

create table if not exists public.funnel_tage_abschnitte (
  tag date not null,
  pfad text not null,
  abschnitt text not null,
  rang smallint not null default 0,
  erreicht integer not null default 0,
  gestoppt integer not null default 0,
  berechnet_am timestamptz not null default now(),
  primary key (tag, pfad, abschnitt)
);

create index if not exists funnel_tage_abschnitte_tag_idx on public.funnel_tage_abschnitte(tag desc);

alter table public.funnel_tage_abschnitte enable row level security;

-- ── 6. Die Kette zum Kauf ───────────────────────────────────────────────────
--
-- Ohne diese Spalte endet die Auswertung beim Klick. `/go/<plan>` nimmt die
-- Sitzungskennung als `?sid=` entgegen (die Kauf-Knoepfe haengen sie im Client
-- an), schreibt sie hierher und in die Stripe-Metadaten. Damit laesst sich
-- „dieser Besuch hat gekauft" als eine Kette lesen: Sitzung → Kasse → Zahlung.
--
-- Bewusst ohne Fremdschluessel auf `funnel_sitzungen`: Die Sitzungen werden
-- nach 90 Tagen aufgeraeumt, die Kaeufe bleiben. Ein Fremdschluessel wuerde das
-- Aufraeumen entweder blockieren oder die Kaufzeile mitnehmen.
alter table public.checkout_sessions
  add column if not exists funnel_sitzung text;

create index if not exists checkout_sessions_funnel_sitzung_idx
  on public.checkout_sessions(funnel_sitzung);

comment on column public.checkout_sessions.funnel_sitzung is
  'Zufaellige Sitzungskennung der Verkaufsseite (sessionStorage, kein Personenbezug). Verbindet den Kauf mit Besuch, Verweildauer und Klick.';
