# Umsetzungsplan: Tools-Bereich (TradingView · TradeSyncer · Propfirms)

Quelle: `DASHBOARD + TRADING JOURNAL.svg` (25.09.2026). Stand des Repos: 25.09.2026, letzte Migration `104`.

## Was gewünscht ist

- Neue Sidebar-Sektion **TOOLS** zwischen Hauptnavigation (Dashboard, Institut, Journal, Live,
  Ressourcen) und Kontoblock (News, Discord, Profil, Einstellungen).
- **TradingView:** Mitglied trägt seinen TradingView-Benutzernamen ein und fordert Zugang zum
  Invite-only-Indikator an (wie früher bei Whop). Nach Freischaltung: „✓ Zugang aktiv“ plus
  Kurzanleitung. **Wer kündigt, verliert den Zugang.**
- **TradeSyncer:** Partnerseite mit zwei Bildern, zwei Benefits, 30 % Rabatt mit Code `EMRCAP`,
  „Code kopieren“, „TradeSyncer öffnen →“ über den Affiliate-Link.
- **Propfirms:** Affiliate-Seite für Apex Trader Funding (wie früher auf SNTTRADES), Link
  `https://apextraderfunding.com/member/aff/go/emrezz01`, Code `EMRCAP`.

## Ist-Stand (relevant)

| Thema | Stelle |
|---|---|
| Hauptnavigation | `components/platform/shell/nav.ts` (`NAV_GROUPS`, flach, kein Sektionskonzept) |
| Sidebar-Rendering | `components/platform/shell/PlatformSidebar.tsx`: `NavList` Z. 292, Kontoblock `AccountList` Z. 398 (hartcodiert), einzige Trennlinie Z. 543, Mobile nutzt dieselbe `panel()` |
| Apex-Konfig | `config/apex-promo.ts`: `ctaUrl` ist **noch kein Affiliate-Link** (`https://apextraderfunding.com`) |
| Apex-Ticker | `components/platform/shell/PlatformTopStrip.tsx`, auf **allen** Plattformseiten (`PlatformFrame.tsx` Z. 24) |
| Apex-Karte mit Code kopieren | `components/journal/home/ApexPromoCard.tsx`, fliegt laut Journal-Plan aus dem Journal und kann hier wiederverwendet werden |
| „Aktives Mitglied“ | `lib/membership.ts:35` `hatInhaltsZugang()` = `is_paid \|\| is_admin` |
| Zugangsende | Webhook `lib/stripe/webhooks/subscription-deleted.ts`, Whop-Ende im Cron `app/api/cron/taeglich/route.ts` (`beendeAbgelaufeneWhopZugaenge`) |
| Admin-Queue-Vorlage | Kündigungen: `app/(admin)/admin/kuendigungen`, `components/admin/AdminKuendigungenManager.tsx`, `app/api/admin/kuendigungen/[id]/route.ts` |
| Betreiber-Mail | `TEAM_POSTFACH` (`config/team.ts`), Templates `lib/email/templates/*-betreiber.ts`, dazu `sendSlackNotification` |
| Statische Seite (Vorlage) | `app/(platform)/position-rechner/page.tsx` |

Kollision: unter **Ressourcen** gibt es schon „Tools & Software“ (`/arsenal/tools`). Der Name
sollte eindeutig werden, siehe offene Fragen.

## Umsetzung

### 1. Sidebar-Sektion TOOLS
- `nav.ts`: zweite Liste `TOOLS_ITEMS` (TradingView `/tools/tradingview`, TradeSyncer
  `/tools/tradesyncer`, Propfirms `/tools/propfirms`), Zugriff `paid`.
- `PlatformSidebar.tsx`: zwischen Haupt-Nav und Kontoblock eine Trennlinie plus Sektionslabel
  „TOOLS“ (Stil wie `sectionLabel`: 12 px, Versalien, `--cc-text-2`), darunter `NavList` für die
  Tools. Die Sperrlogik (`childLocked`) greift genauso wie bei den übrigen Einträgen.
- TradingView-Zeile optional mit Statuspunkt wie `DiscordRow` („Aktiv“ grün / nichts).
- Icons: lucide `LineChart` (TradingView), `RefreshCw` oder `Copy` (TradeSyncer), `Building2` (Propfirms).

### 2. TradingView-Zugang

**Migration `NNN_tradingview_zugang.sql`** (nächste freie Nummer) (idempotent, RLS an):

```sql
create table if not exists public.tradingview_zugaenge (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  tv_benutzername text not null,
  status text not null default 'angefragt'
    check (status in ('angefragt','aktiv','entzug_offen','entzogen')),
  angefragt_am timestamptz not null default now(),
  freigegeben_am timestamptz,
  entzug_angefordert_am timestamptz,
  entzogen_am timestamptz,
  bearbeitet_von uuid references public.profiles(id)
);
-- Mitglied darf die eigene Zeile lesen; schreiben nur über die API (Service-Client).
```

Warum eine eigene Tabelle und keine Spalten in `profiles`: Die Zustände `entzug_offen`/`entzogen`
brauchen eigene Zeitstempel, und die Admin-Queue fragt genau diese Tabelle ab.

**Mitgliederseite** `app/(platform)/tools/tradingview/page.tsx`:
- Zustand „nicht verbunden“: Text aus dem Mockup, Feld „TradingView Benutzername“, Button
  „Zugang anfordern“, Hinweis „Bitte exakt deinen TradingView-Benutzernamen eingeben.“
- Zustand `angefragt`: „Anfrage läuft, wir schalten dich in der Regel innerhalb von 24 h frei“,
  Benutzername korrigierbar.
- Zustand `aktiv`: Karte „✓ ZUGANG AKTIV“, TradingView-Account, „Capital Circle Indicator – Zugang
  aktiv“, darunter die Anleitung in 4 Schritten.
- `entzug_offen`/`entzogen` bei wieder zahlendem Mitglied: neue Anfrage möglich (Status zurück auf
  `angefragt`).

**API** `app/api/tradingview/route.ts`:
- GET liefert den Status, POST legt die Anfrage an oder aktualisiert sie. Beide nur mit
  `hatInhaltsZugang()`.
- Validierung des Benutzernamens: trimmen, `^[A-Za-z0-9_.-]{2,40}$`.
- Nach dem POST: Betreiber-Mail `tradingview-anfrage-betreiber` plus Slack, nach dem Muster
  „wirft nie“ aus `lib/zahlung/fall.ts`.

**Admin-Queue** `app/(admin)/admin/tradingview/page.tsx` (Gruppe „Community“ in `AdminSidebar`):
- Tabs „Freischalten“ (`angefragt`), „Entziehen“ (`entzug_offen`), „Aktiv“, „Archiv“.
- Pro Zeile: Mitglied, TV-Name mit Kopieren-Knopf, Datum, Button „Freigeschaltet“ bzw. „Entzogen“.
- PATCH `app/api/admin/tradingview/[userId]/route.ts`, Übergänge nur
  `angefragt→aktiv` und `entzug_offen→entzogen`.
- Protokoll in `user_audit_log`.

**Entzug bei Kündigung**, zentral im Cron und nicht in jedem Webhook (gleiche Begründung wie im
Kopf von `lib/whop-umzug/ablauf.ts`: nur eine Stelle entzieht):
- Neuer Schritt in `app/api/cron/taeglich/route.ts` nach dem Rollenabgleich.
- Er erfasst alle Zeilen mit `status in ('aktiv','angefragt')`, deren Profil
  `hatInhaltsZugang() == false` liefert: `aktiv` wird zu `entzug_offen`, `angefragt` wird direkt zu
  `entzogen`.
- Ergebnis: eine Sammel-Mail „N TradingView-Zugänge entziehen“. `?probe=1` zählt nur.
- Damit ist Zahlungsausfall, Kündigung, Whop-Ende und Widerruf automatisch abgedeckt, weil alle
  über `is_paid` laufen.

**TradingView selbst bleibt Handarbeit.** TradingView hat keine offizielle API für
Invite-only-Zugänge. Inoffizielle Wege mit Session-Cookies des Autorenkontos gibt es, sie brechen
aber bei jeder Änderung und gefährden das Konto. Für die erwartete Menge reicht die Queue.

### 3. TradeSyncer-Seite `app/(platform)/tools/tradesyncer/page.tsx`
- Neue Konfig `config/partner.ts`: `TRADESYNCER = { code: "EMRCAP", rabatt: "30 %",
  url: "https://app.tradesyncer.com/?ref=TS309149A6" }` (Ref aus dem SVG, dort umbrochen als
  „TS30914 / 9A6“, bitte bestätigen).
- Aufbau: Eyebrow „CAPITAL CIRCLE × TRADESYNCER“, H1 „Mehrere Accounts. Eine Ausführung.“,
  Lead-Text, 2 Bilder nebeneinander (mobil untereinander), 2 Benefits, Vorteilskarte „Spare 30 %
  mit dem Code EMRCAP“ mit „Code kopieren“ (`useClipboard`) und „TradeSyncer öffnen →“
  (Gold-Button, `rel="noopener noreferrer sponsored"`, `target="_blank"`). Darunter der Hinweis
  „Affiliate-Link wird automatisch verwendet.“
- Bilder: die zwei Tradesyncer-Karten aus dem SVG nach `public/tools/tradesyncer/` legen (als
  WebP/`next/image`). **Den Ordner in den Matcher-Ausnahmen von `proxy.ts` eintragen**, sonst
  liefert der Proxy Login-HTML statt Bild (bekannte Falle, siehe `public/prozess/`).

### 4. Propfirms-Seite `app/(platform)/tools/propfirms/page.tsx`
- `config/apex-promo.ts`: `ctaUrl` auf `https://apextraderfunding.com/member/aff/go/emrezz01`
  setzen. Damit verdient auch der Ticker oben endlich mit.
- `ApexPromoCard` aus `components/journal/home/` nach `components/platform/tools/` verschieben und
  hier einsetzen. Aufbau: Logo, Rabatt aus `APEX_PROMO`, Code kopieren, Button „Zu Apex Trader
  Funding →“, Kurzabsatz, warum wir Apex empfehlen.
- Seite so bauen, dass später weitere Firmen als Liste dazukommen (Array in `config/partner.ts`).

### 5. Design
- Plattform-Schema v3.2, `cc-card`, Gold-Buttons und Glow sind hier erlaubt (die Ausnahme ohne
  Glow gilt nur für `/dashboard`).
- Die blauen Tradesyncer-Bilder stehen als Bild in einer Karte mit Gold-Kante. Die Fläche selbst
  bleibt Graphit, es kommt keine blaue Akzentfarbe dazu.

## Reihenfolge und Aufwand

1. Konfig + Propfirms-Seite + Apex-Affiliate-Link, ca. 0,5 Tage, sofort Umsatzwirkung.
2. TradeSyncer-Seite + Bilder + `proxy.ts`, ca. 0,5 Tage.
3. Sidebar-Sektion TOOLS, ca. 0,5 Tage.
4. TradingView: Migration, Mitgliederseite, API, Admin-Queue, Mail, ca. 1,5 Tage.
5. Cron-Entzug + Probe-Lauf, ca. 0,5 Tage.

Test: `npm run db:check` nach Einspielen der Migration; Kündigung im Stripe-Testmodus durchspielen
und prüfen, ob der Cron (`?probe=1`) den Zugang als „entziehen“ meldet.

## Offene Fragen

1. **Propfirms in die Sidebar?** Die rote Notiz nennt drei Tools, die Textversion der Sidebar
   nur TradingView und TradeSyncer.
2. TradeSyncer-Ref exakt `TS309149A6`?
3. „Tools & Software“ unter Ressourcen umbenennen oder in die neue Sektion ziehen?
4. Wer schaltet TradingView frei, und wohin soll die Meldung gehen: Mail an `TEAM_POSTFACH`, Slack oder beides?
5. Bleibt der Apex-Ticker oben auf allen Seiten, wenn es jetzt eine eigene Propfirms-Seite gibt?
6. Übernahme der Whop-Bestandsliste: Hast du eine Liste der TradingView-Namen, die bei Whop schon
   freigeschaltet sind? Dann importieren wir sie direkt als `aktiv`.
