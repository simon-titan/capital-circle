# Komponenten (v3.2 „Champagner auf Graphit“)

← zurück zum [Index](./README.md) · Werte: [`DESIGN.json`](../../DESIGN.json) `components`

> Wiederverwenden statt neu bauen. Primitives:
> [`components/platform/dashboard/primitives.tsx`](../../components/platform/dashboard/primitives.tsx).
> Für Funnel, Landing, Onboarding und Admin: [Geteilte Bausteine](#geteilte-bausteine-aus-der-migration).

## Button (`theme/index.ts`)

| Variante | Aussehen | Einsatz |
|----------|----------|---------|
| `variant="gold"` | Champagner-Verlauf, Text `#1a140c`, Glow, Hover-Lift | Hauptaktionen (Weiterlernen, Beitreten, Jetzt bewerben) |
| `variant="line"` | Haarlinie auf leichtem Glas, Hover mit Gold-Kante | alles Sekundäre |

Fokus: Chakra-`outline` ist gold; Links/Buttons unter `[data-platform]` bekommen `:focus-visible` in Gold.

## Karte — `DashCard`

Klasse `.cc-card`: graphitgraues Glas (94 %) mit Blur, Rahmen 7 % Weiß, Radius 12px, Gold-Kante oben, Schatten, Hover hebt an und glüht leicht gold.
`hero` → `.cc-card--hero` (Gold-Rahmen, Gold-Schein, atmender Glow, Titel in Gold). Pflicht-Props `label`
(wird zur 13px-Versal-h2) und `labelId`; optional `action`.

> **Sticky-Falle:** `.cc-card` setzt `position: relative` und überschreibt damit Chakras `position="sticky"` am
> selben Element. Klebende Karten in eine äußere `Box` mit `position="sticky"` (plus `top`) legen, die `.cc-card` liegt darin.

## Inhalte

- **`CardValue` / `Meta` / `TitleWithMeta`** — Wert 17/18px, Meta 14px; Titel · Meta in einer Zeile ohne verwaisten Punkt.
- **`IconTile`** — 56px, neutral wie im Kunden-Mockup: Haarlinie `--cc-line-strong`, helles Icon, Radius 12px.
- **`ProgressBar`** — 8px, füllt sich einmal. `tone="gold"` (Standard, z. B. Lernseite): Gold-Balken mit Glow; `tone="ink"` (Dashboard, `ContinueCard`): Datentinte `--cc-ink` ohne Glow.
- **Segmentbalken** (`ProgressCard`) — 10 Segmente à 10 %, gefüllt in Datentinte `--cc-ink`, offen = 1px-Kontur 14 % Weiß; Prozent in `--cc-text`.
- **Streak** (`StreakCard`) — warme Flammen-Kachel (pulsiert), erledigte Tage als Kreise in Datentinte mit dunklem Haken, offen = 1.5px-Kreis; heute in Text 600, offen mit Gold-Haarlinie.
- **Play-Button** (`ContinueCard`) — 64px Gold-Verlauf mit Glow.
- **Live-Punkt** (`LiveCard`) — Gold mit Glow, Ring solange live.
- **`LockedNote`** — Gold-Schloss + „Nur für Mitglieder“, ein Satz, `line`-Button.
- **`StatusLine`** — `dl` über einer Haarlinie.
- Zeilen klammern mit `clampLines(n)` (nicht Chakras `noOfLines`).

## Navigation (`components/platform/shell/`)

- **Sidebar** (ab lg, 264px, Glas mit Blur): Wortmarke, fünf Bereiche aus `nav.ts` (52px-Zeilen, Icons 24px).
  Aktiv: Gold-Verlauf-Wash, Gold-Linie, Glow, Gold-Text. Unterpunkte mit leuchtendem Gold-Segment.
  An der Kante: Lichtlinie mit wanderndem Funken.
- **Mobil**: 56px-Kopfzeile → Drawer von links.
- **Leiste** (48px, sticky ab lg): Apex-Promo mit Gold-Punkt und Code in Gold als Laufband über die volle Breite (kein TradingView-Ticker mehr).
- **Wortmarke** (`components/brand/Logo.tsx`): Text „CAPITAL CIRCLE“ in Inter 400, versal, 0.32em; `compact` = Monogramm „CC“. Ersetzt das frühere Serif-Logo-Bild (`height`/`priority` sind ohne Wirkung).

## Seitenmuster

- **Seitenkopf:** `components/journal/PageHeader.tsx` — Titel 28/36px, Untertitel, auslaufende Gold-Linie. Für alle Unterseiten wiederverwenden (Journal, Institut, Positionsrechner).
- **Trading Journal** (`components/journal/*`): `Panel` = `.cc-card cc-card--still` (Diagramme/Tabellen heben sich beim Hover nicht an), `raised` = Hero-Karte. `SectionCard` mit Versaltitel. Journal-Navigation als Glas-Karte mit Gold-Aktivzustand. Diagramme: neutrale Reihen (Equity, Radar) in Gold, Tages-P&L und Drawdown grün/rot; Legenden explizit aus. Die `--j-*`-Tokens in `globals.css` sind nur eine Brücke auf `--cc-*`.
- **Lernseite** (`ModuleLearningClient`): links Kursleiste 340px (sticky, eigene Scrollfläche) mit „Zurück zur Übersicht“, Modultitel, Modulinhalt (Lektionen-Badge, Prozent, Goldbalken) und Lektionsliste (`VideoPlaylist`: Thumbnail, Titel, Minuten; aktiv = Gold-Wash + Gold-Kante, erledigt = Gold-Haken, gesperrt = Schloss). Rechts Player (`GlassVideoPlayer`, Rahmen in Gold) und eine Tab-Karte: Notizen (`ModuleNotes` mit Zeitstempel-Button), Anhänge, Beschreibung. Mobil: Titel → Player → Tabs → Lektionen. Breite über `data-learning-wide` (max. 1600px).
- **Videoplayer** (`components/ui/GlassVideoPlayer.tsx`, seit 19.09.2026): ein Player für Lernseite, Live-Aufzeichnungen, Onboarding-Intro und die Funnel-Videos (`/video`, `/termin`, `VideoStage`). Bühne und Letterbox schwarz. Die Bedienleiste ist zweizeilig wie bei YouTube (Zeitstrahl über die volle Breite, darunter die Knöpfe) und liegt auf einem Scrim mit mindestens 80 % Schwarz, so bleiben Symbole und Zeit auch auf weißen Folien über WCAG AA. Gold tragen nur Zeitstrahl, Play-Button, Fokus und das offene Zahnrad. Das Zahnrad öffnet `video-player/PlayerSettingsMenu.tsx` mit Geschwindigkeit (0,25–2, pro Browser gemerkt unter `cc-player-speed`) und Qualität (HLS-Stufen aus hls.js, Standard „Automatisch“, nicht gemerkt). Unter 480px Player-Höhe zeigt das Menü seine Auswahl als Kachelraster (Container-Query auf `cc-player`). Natives HLS gibt es nur auf Apple-WebKit, dort fehlt der Qualitätseintrag. Pflichtvideos (`disableSeeking`) haben keinen Geschwindigkeitseintrag. Die Klasse `.cc-video-shell` nicht umbenennen, `lib/discord-funnel/video-tracking.ts` liest darüber die Dauer.
- **Institut-Übersicht** (`InstitutAccordion`): jeder Kurs eine Glas-Karte mit Gold-Icon-Kachel, geöffnet mit Gold-Kante; Module als Innenzeilen mit Status-Pills (Neu / In Arbeit / Abgeschlossen / Gesperrt) und Goldbalken. Keine Kursfarben mehr — alles Gold.

## Geteilte Bausteine aus der Migration

| Datei | Inhalt | Einsatz |
|-------|--------|---------|
| `components/marketing/funnel-ui.tsx` | Typo: `FunnelEyebrow`, `FunnelHeadline`, `GoldWord`, `FunnelLead`, `FunnelFinePrint`, `CardLabel`. Formular: `OptionCard`, `CharCounterPill`, `FieldError`, `FunnelAlert`, `FunnelNotice`, Presets `funnelFieldProps`, `funnelSelectSx`, `funnelLabelProps`, `funnelHelperProps`, `funnelErrorProps`. Ablauf: `FunnelProgress`, `FunnelStepIndicator`, `FunnelWarningOverlay`, `FunnelThanks`, `SuccessMark`. Modal: `funnelOverlayProps`, `funnelModalContentProps`, `FunnelModalTopBar`, `funnelBackButtonProps`. Video: `FunnelVideoFrame`, `VideoPlaceholder`. Motion: `rise`, `noMotion` | Funnels, Bewerbung (`/apply`, `/free`, `/survey`, `/bewerbung/danke`) |
| `components/landing/landing-ui.tsx` | `Reveal`, `heroRise`, `Eyebrow`, `DisplayHeading`, `Accent`, `GoldIconTile`, `OfferCard`, `CardRail`, `VideoStage`, `LandingSplash`, `LandingChromeStyles`, `LandingFooter` | Landing `/` und `/insight` |
| `components/landing/DiscordFunnelChrome.tsx` | `FunnelPageStyles`, `FunnelGround`, `FunnelHeroGlow`, `FunnelSplash`, `FunnelEyebrow`, `FunnelVideoHeadline`, `FunnelVideoPlaceholder`, `GoldWord`, `GoldIconTile`, `FunnelFooter`, `funnelLabelProps` | Discord-Funnel und Einzelseiten (`/discord`, `/termin`, `/video`) |
| `components/onboarding/OnboardingParts.tsx` | `OnboardingHeading`, `AcceptanceCheck` | Onboarding-Schritte (Codex, Intro-Video, Nutzungsvereinbarung) |
| `components/admin/adminUi.tsx` | `AdminPageHeader`, `AdminCardTitle`, `AdminLabel`, `AdminCount`, `StatusPill`, `StatusDot`, `ADMIN_TONES`, `ADMIN_CARD_CLASS`, Presets `adminInputProps`, `adminFormLabelProps`, `adminSwitchSx`, `adminTableSx`, `adminRowProps`, `adminModalProps`, `adminAlertProps`, `ADMIN_CHART` … | Admin (`/admin/**`) |
| `components/admin/AdminSidebar.tsx` → `AdminFrame` | Admin-Shell (Sidebar + Inhalt), eingebunden in `app/(admin)/layout.tsx` | Admin |
| `components/support/TicketStatusDot.tsx` | Statuspunkt für Support-Tickets (Farben aus `lib/support/shared.ts`) | `SupportTicketsList`, `TicketThread` |

Achtung: `GoldWord`, `FunnelEyebrow`, `GoldIconTile` und `funnelLabelProps` gibt es namensgleich in mehreren Dateien —
den Import-Pfad passend zur Seite wählen, nicht mischen.

## Statusfarben

- **Support-Tickets** (`lib/support/shared.ts` → `STATUS_COLORS`, dargestellt mit `TicketStatusDot`): offen `#e8c094`
  (Gold hell), wartet auf Antwort `#b8935f` (Gold dunkel), in Bearbeitung `#d1d0d4` (Datentinte), gelöst `#4ade80`
  (Grün), geschlossen `rgba(255,255,255,0.45)` (Grau).
- **Events** (`config/event-colors.ts`): Farbwähler im `AdminEventsManager` mit fünf Markentönen — Champagner
  (Standard), Champagner hell, Bronze, Silber, Graphit. Der Mitglieder-Kalender färbt die Chips über `ev-tone-<key>`
  (`eventsCalendar.theme.css`); Alt-Farben werden per `resolveEventColor()` auf den nächsten Markenton abgebildet.

## E-Mails

`lib/email/layout/` — `styles.ts` (Tokens als Hex), `components.tsx` (`EmailEyebrow`, `EmailHeading`, `EmailSubheading`,
`EmailText`, `EmailSmall`, `EmailButton`, `EmailCard`, `EmailHighlight`, `EmailDivider`, `EmailLink`), `BaseEmail.tsx`
(Graphit-Rahmen, Text-Wortmarke, Champagner-Lichtkante, optionaler Footer). Templates schreiben keine eigenen Farben,
sondern nutzen diese Bausteine; die Migrations-Kampagne hat eigene Bausteine im selben Look.

## Entfernt

`components/ui/GlassCard.tsx`, `GlowButton.tsx`, `CardLockOverlay.tsx`, `PageTransition.tsx` und die
`.glass-card*`-Klassen sind gelöscht. Karten sind `.cc-card` (`DashCard`, `Panel`, `ADMIN_CARD_CLASS`), gesperrte
Inhalte `LockedNote`, Hauptaktionen `variant="gold"`.
