# Umsetzungsplan: Kunden-Onboarding nach dem Kauf

Quelle: `ONBOARDING.svg` (25.09.2026). Stand des Repos: 25.09.2026, letzte Migration `104`.

## Ziel (aus der Vorgabe)

Ein neuer Käufer landet nicht einfach auf dem Dashboard, sondern:

**Willkommen → 5 ICP-Fragen → „Du bist startklar.“ → Dashboard mit Checkliste**
(Discord verbinden → In Community vorstellen → Lernpfad starten) **→ „Alles eingerichtet.“ →
Checkliste verschwindet.**

Nebenbei sollen ICP-Daten gesammelt, Onboarding-Events gemessen und im Admin ausgewertet werden,
später auch gegen Plan, Umsatz, Churn und Nutzung. Das Dashboard selbst bleibt, wie es ist.

## Ist-Stand (relevant)

| Thema | Stelle |
|---|---|
| Heutiges Onboarding | `/einsteig` → `components/onboarding/OnboardingFlow.tsx`, Phasen `loading\|login\|agreement`. Einzige Pflicht: `usage_agreement_accepted` (`UsageAgreementStep.tsx`). `CodexStep`/`IntroVideoStep` liegen tot herum |
| Weiche | `proxy.ts` Z. 302–310: `onboardingDone = isFreeMember \|\| usage_agreement_accepted`, sonst → `/einsteig` |
| Nach dem Kauf | `app/checkout/success/page.tsx` → Passwort wählen (`/api/checkout/zugang`) → Buttons „Discord verbinden“ / „Zum Dashboard“ → Weiche → Vereinbarung → `/dashboard` |
| Passwort gesetzt? | **Kein Flag.** Konto entsteht ohne Passwort (`lib/stripe/webhooks/_helpers.ts` Z. 88), `last_sign_in_at` ist unzuverlässig |
| Discord verbinden | `/api/discord/connect` → `app/api/discord/callback/route.ts`, schreibt `discord_connections` + `profiles.discord_id`, Rücksprung fest `/dashboard?discord=connected` |
| Discord-Bot | Nur REST (`lib/discord/api.ts`), `listChannelMessages()` liefert `authorId`, damit ist ein Cron-Abgleich möglich. **Keine** Kanal-ID für den Vorstellungskanal |
| Dashboard | `components/platform/dashboard/DashboardView.tsx`: Header → UmzugCard → DiscordCard → ApplyPrompt → Grid mit `ContinueCard` („Als Nächstes“). Checkliste passt **vor Z. 96**. Läuft unter `.cc-neutral` (kein Gold-Glow) |
| Lernpfad-Link | `getRecommendedAcademyModuleFromOverview` (`lib/server-data.ts` Z. 421) + `lessonHref()` (`lib/module-route.ts`) |
| Einmal-Overlay-Vorbild | `LifetimePopup` + `app/api/lifetime/popup` + Migration 104 |
| Analytics | Nur eigenes, **anonymes** Kaufweg-Tracking (101, ohne `user_id`), also ungeeignet. Neue Tabelle nötig |
| UTM | In `funnel_sitzungen` über `checkout_sessions.funnel_sitzung`, **wird nach 90 Tagen gelöscht** |
| Admin | `/admin/mitglieder` ist nur eine Tabelle ohne Detailseite. Vorlage für jsonb-Antworten: `Step2ApplicationsManager` |
| Schreibschutz | Trigger `profiles_schreibschutz` (073). Neue Flags deshalb **nur per Service-Client** schreiben |

## Datenmodell (eine Migration `NNN_onboarding.sql`)

**Flags in `profiles`**, weil `proxy.ts` das Profil ohnehin liest und keine zweite Abfrage pro
Request kosten soll:
- `onboarding_gestartet_am`, `onboarding_fragen_am`, `onboarding_abgeschlossen_am` (timestamptz)
- `passwort_gesetzt_am` (timestamptz)

**Antworten und Schritte in eigener Tabelle `onboarding_antworten`** (1 Zeile pro Nutzer):
- `user_id` (pk, FK profiles, cascade)
- `trading_experience`, `trading_stage`, `main_problem`, `trading_goal`, `discovery_source`:
  jeweils `text` mit CHECK auf feste Schlüssel
- `discovery_source_other text`
- `attribution jsonb`: Schnappschuss der technischen UTM-Daten (`utm_quelle/medium/kampagne`,
  `src`, `verweis_host`) aus `checkout_sessions` → `funnel_sitzungen` zum Zeitpunkt des Onboardings.
  Bleibt damit dauerhaft und **getrennt** von `discovery_source`, wie in der Vorgabe verlangt.
- `discord_verbunden_am`, `community_link_geoeffnet_am`, `community_vorgestellt_am`,
  `kurs_gestartet_am`
- `created_at`, `updated_at`
- RLS: Nutzer liest die eigene Zeile, geschrieben wird nur über die API.

**Events in `onboarding_ereignisse`**:
- Spalten: `id`, `user_id`, `art` (CHECK auf die 12 Events aus der Vorgabe), `meta jsonb`,
  `created_at`
- Unique `(user_id, art)`, denn jedes Event zählt einmal (`on conflict do nothing`)
- RLS deny-by-default, Insert nur serverseitig

Die Antwort-Schlüssel und deutschen Beschriftungen stehen in **`config/onboarding.ts`** (eine Quelle
für Fragebogen, Admin-Auswertung und CHECK). Beispiel `trading_experience`:
`anfang | unter_6m | 6_12m | 1_2j | 2_4j | 4j_plus`.

Wer das Gate sieht: nur **Neukäufer ab Stichtag**. Die Weiche prüft
`is_paid && onboarding_fragen_am is null && created_at >= ONBOARDING_START`. Bestandsmitglieder und
Whop-Umzügler werden nicht in einen Fragebogen gezwungen (siehe offene Fragen).

## Umsetzung

### 1. Weiche und Ablauf `/einsteig`
- `proxy.ts`: Die Bedingung für `onboardingDone` wird um die Stichtags-Regel oben ergänzt. Dazu die
  Spalten in den Profil-Select der Weiche aufnehmen.
- `OnboardingFlow.tsx` bekommt neue Phasen:
  `willkommen → frage_1…5 → vereinbarung → startklar`.
  - Die Nutzungsvereinbarung bleibt Pflicht und rückt hinter die Fragen. So kommt die Frage nach
    dem „Warum“ vor dem Rechtstext.
  - Tote Schritte `CodexStep`/`IntroVideoStep` und `app/(onboarding)/intro-video` löschen.
- **Willkommen** (Fullscreen): „Willkommen bei Capital Circle.“ / Subheadline aus der Vorgabe /
  Button „Weiter“. Kein Video, keine Tour. Beim ersten Aufruf `onboarding_gestartet_am` setzen,
  Event `onboarding_started`.
- **Fragen:**
  - Eine pro Screen, oben „1 von 5“ plus schmaler Fortschrittsbalken.
  - Antworten als große Auswahlkarten: Tippen wählt und geht nach 250 ms weiter.
  - „Zurück“ ist immer da, Antworten lassen sich ändern.
  - Bei „Sonstiges“ (Frage 5) erscheint ein optionales Textfeld mit „Weiter“-Button.
- **Fortschritt geht nicht verloren:** Jede Antwort wird sofort über
  `PATCH /api/onboarding/antwort` gespeichert, Event `onboarding_question_N_completed`. Beim erneuten
  Öffnen springt der Flow zur ersten offenen Frage.
- Nach Frage 5 `onboarding_fragen_am` setzen, den Attributions-Schnappschuss schreiben, Event
  `onboarding_questions_completed`.
- **Startklar:** „Du bist startklar.“ + Text aus der Vorgabe + Button „Zum Dashboard“. Kein
  Konfetti.
- Dauer insgesamt unter 2 Minuten, keine Pflicht-Freitexte, mobil als Vollbild mit Daumenzone
  unten.
- Design: v3.2, Gold und Glow sind hier erlaubt (nur `/dashboard` ist neutral).

### 2. Checkliste im Dashboard
- `app/(platform)/dashboard/page.tsx` liefert ein neues Feld `onboarding` in `DashboardViewData`:
  Schritte mit Status, Link für den Lernpfad, `passwortOffen`.
- Neue Komponente `components/platform/dashboard/OnboardingCheckliste.tsx`:
  - Sitzt in `DashboardView.tsx` vor dem ersten Grid (vor Z. 96), also **über „Als Nächstes“**.
  - **Neutral** gerahmt wie alles unter `.cc-neutral`: kein Gold-Schein, Gold nur an den Buttons.
  - Headline „Dein Start bei Capital Circle“, Subheadline, „1 von 3 abgeschlossen“ + Progress Bar.
  - Drei Zeilen mit Haken, Titel, Text und Button.
- Solange die Checkliste steht, wird die bestehende `DiscordCard` ausgeblendet, damit Discord nicht
  doppelt erscheint.
- Beim ersten Rendern das Event `onboarding_dashboard_shown` senden.

**Schritt 1 – Discord verbinden**
- Bereits verbunden (`discord_connections`) heißt automatisch erledigt.
- Sonst führt der Button über `/api/discord/connect`.
- Im Callback `discord_verbunden_am` setzen und das Event `onboarding_discord_connected` schreiben.

**Schritt 2 – In der Community vorstellen**
- Neue Env-Variable `DISCORD_VORSTELLUNG_CHANNEL_ID`. Der Button öffnet
  `https://discord.com/channels/<GUILD>/<CHANNEL>` im neuen Tab und setzt vorher per API
  `community_link_geoeffnet_am`.
- Erst danach erscheint „Als erledigt markieren“, so wie in der Vorgabe.
- Automatisch erkennen: Ein Schritt im Cron `taeglich` liest die letzten 100 Nachrichten des Kanals
  (`listChannelMessages`) und hakt alle ab, deren `authorId` einer offenen `profiles.discord_id`
  entspricht. Der Bot braucht dafür Leserecht im Kanal. Event
  `onboarding_community_intro_completed`.

**Schritt 3 – Lernpfad starten**
- Der Button verlinkt direkt auf die erste Lektion des empfohlenen Moduls (`lessonHref`).
- Erledigt beim **ersten** Fortschritts-Ping: In `app/api/progress/route.ts` wird
  `kurs_gestartet_am` gesetzt, wenn es leer ist. Das ist eine Zeile, ein Update mit
  `is null`-Filter, und es gibt keine Extra-Abfrage bei allen anderen Pings. Event
  `onboarding_course_started`.

**Zusatzzeile – Zugang absichern** (nur wenn `passwort_gesetzt_am` leer ist)
- „Passwort festlegen“ → `/einstellungen` bzw. `/set-password`.
- `passwort_gesetzt_am` wird in `/api/checkout/zugang` und nach erfolgreichem `SetPasswordForm`
  gesetzt, dort über eine kleine Server-Route.
- Zählt **nicht** zu den 3 Schritten und blockiert den Abschluss nicht.

**Abschluss**
- Alle drei erledigt: Die Box wechselt auf „Alles eingerichtet.“ + Text + Button „Weiterlernen“.
- Klick oder nächster Dashboard-Aufruf setzt `onboarding_abgeschlossen_am`, Event
  `onboarding_completed`. Danach ist die Box weg.

### 3. Seite nach dem Kauf
`app/checkout/success/page.tsx`: Nach dem Passwort ist der Hauptbutton „Los geht's“ (→ `/einsteig`).
„Discord verbinden“ fällt dort weg, weil es jetzt Schritt 1 der Checkliste ist. So gibt es einen
klaren Weg statt zwei Knöpfen.

### 4. Admin: ICP-Auswertung
- Neue Seite `app/(admin)/admin/icp/page.tsx` (Gruppe „Auswertung“) mit Zeitraumfilter:
  - Verteilungen je Frage als Balken (Experience, Stage, Problem, Ziel, Discovery).
  - Kreuztabellen, z. B. Stage × gekaufter Plan, Problem × Ziel, Discovery × Plan.
  - **Aktivierungs-Funnel** aus `onboarding_ereignisse`: Käufer → Fragen beantwortet → Discord →
    Vorstellung → Kursstart → vollständig aktiviert, jeweils mit Anteil und Median-Dauer.
  - Retention je ICP-Gruppe: noch zahlend / gekündigt (`is_paid`, `access_until`), Lernzeit
    (`total_learning_seconds`), Plan (`membership_tier`, Abo).
  - CSV-Export der Rohdaten (user_id, Antworten, Attribution, Plan, Status, Umsatz) für eigene
    Auswertungen.
- Pro Mitglied: In `AdminMembersManager` öffnet ein Klick auf die Zeile ein Drawer mit den
  Antworten, der Attribution und den Onboarding-Zeitstempeln. Eine eigene Detailseite gibt es heute
  nicht, der Drawer reicht vorerst.
- Die veraltete Spalte `codexAccepted` dort durch „Onboarding“ (Status) ersetzen.

### 5. Kleinkram
- `lib/supabase/types.ts` nachziehen.
- `scripts/check-rls.mjs` um die zwei Tabellen ergänzen.
- `npm run db:check` nach dem Einspielen ausführen.

## Reihenfolge und Aufwand

1. Migration + `config/onboarding.ts` + API-Routen, ca. 0,5 Tage.
2. `/einsteig`: Willkommen, 5 Fragen, Startklar + Weiche, ca. 1,5 Tage.
3. Dashboard-Checkliste + Discord-Callback + Progress-Hook + Passwort-Flag, ca. 1,5 Tage.
4. Vorstellungskanal: Link, Bestätigen, Cron-Erkennung, ca. 0,5 Tage.
5. Admin ICP-Seite + Mitglieder-Drawer + CSV, ca. 1,5 Tage.

Test:
- Stripe-Testkauf als Gast → Passwort → Fragen (mittendrin Tab schließen und neu öffnen, der
  Fortschritt muss bleiben) → Startklar → Checkliste → Discord → Vorstellung → erste Lektion →
  „Alles eingerichtet“ → Box weg.
- Bestandskonto einloggen: kein Fragebogen.
- Mobil (375 px) komplett durchklicken.

## Offene Fragen

1. **Bestandsmitglieder:** gar nicht fragen, oder einmalig eine kleine Dashboard-Karte „5 kurze
   Fragen“ (freiwillig)? Die Karte bringt sofort ICP-Daten aus der heutigen Basis.
2. Dürfen Neukäufer die Fragen **überspringen**? Die UX-Regel „Dashboard nicht dauerhaft sperren“
   spricht für einen kleinen Link „Später“, die ICP-Qualität dagegen. Empfehlung: kein
   Überspringen, weil die Fragen nur 1 bis 2 Minuten dauern.
3. ID des Discord-Vorstellungskanals, und darf der Bot dort mitlesen?
4. Reihenfolge Fragen vor oder nach der Nutzungsvereinbarung? Empfehlung: vorher.
5. Sollen Lifetime- und 1:1-Käufer denselben Ablauf bekommen?
