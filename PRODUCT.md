# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Deutschsprachige Trader (überwiegend Futures/Indizes wie NQ, dazu Prop-Firm-Challenges) in drei Stufen:

- **Anfänger** — wollen einen klaren Start, ohne von Strategie zu Strategie zu springen.
- **Fortgeschrittene** — sind phasenweise profitabel und suchen Konstanz.
- **Funded-Trader** — wollen ihre Regeln halten, ihr Kapital schützen und Payout um Payout sichern.

Situation: am Trading-Platz, oft vor oder rund um die US-Session, Charts parallel offen. Das Dashboard ist der tägliche Einstieg und beantwortet eine Frage: „Was ist jetzt dran?“

## Product Purpose

Capital Circle ist Trading-Community und Lernplattform in einem. Mitglieder lernen ein festes System im **Institut** (Videomodule mit Fortschritt), halten es im **Trading-Journal** nach, arbeiten **Wochenaufgaben/Hausaufgaben** ab, verfolgen **Analysen** (Daily/Weekly), nehmen an **Live-Sessions/Events** teil und tauschen sich in der **Discord-Community** aus. Erfolg heißt: Mitglieder werden konstant profitabel — nicht nur an guten Tagen.

## Positioning

Du tradest selbst, mit einem festen System, festen Regeln und einer Community, die dich auf Kurs hält — statt fremden Plänen (Guru-Programme) oder blindem Kopieren (Signalgruppen). Klarer Lernpfad vom Fundament bis zur Konstanz; Proof über verifizierte Auszahlungen (Emres und die von Mitgliedern). Mitgliedschaft 99 €/Monat, monatlich kündbar.

## Operating Context

- **Free vs. Paid:** Free-Nutzer sehen Teile der Plattform gesperrt (Lock-Overlay mit Weg zur Mitgliedschaft). Zugang über Bewerbung (`/bewerbung`), erweiterte Bewerbung (Step 2) und ein persönliches Gespräch (Calendly-Termin).
- **Rituale:** tägliche Streak (Login/Lernaktivität), Wochenaufgabe, Daily-Analyse, Live-Session.
- **Emre** ist Gesicht und Mentor der Community (Live-Sessions, Analysen, Partnerempfehlungen).
- **Partner:** Apex Trader Funding, Affiliate-Rabattcode `EMRCAP` (`config/apex-promo.ts`).

## Capabilities and Constraints

- Stack: Next.js (App Router), Supabase, Chakra UI v2, Cloudflare Stream (Kursvideos, signiertes HLS) und Cloudflare R2 (übrige Datei-Uploads). Hetzner Object Storage ist seit 16.09.2026 abgelöst — der Bucket existiert nicht mehr.
- Bereiche: Dashboard, Institut (`/ausbildung`), Codex, Trading-Journal (+ klassisches Journal, Positionsrechner), Live (`/stream`, `/live-session`, `/events`), Ressourcen/Arsenal (Analyse, Hausaufgabe, Tools, Fremdkapital, Templates, PDFs), News, Einstellungen.
- Terminologie: „Institut“ (nicht „Kurs“), „Wochenaufgabe“, „Streak“, „Mitglied“, „Capital Circle Member“.

## Brand Commitments

- Name „Capital Circle“, Wortmarke gesperrt gesetzt („CAPITAL CIRCLE“).
- Brand-Gold `#D4AF37` bleibt der Akzent (vom Nutzer bestätigt, 2026-09-13).
- Eine Schrift für alles: Inter (vom Nutzer festgelegt, 2026-09-13).
- Schlicht, minimalistisch, so wenig Farbspielerei wie möglich (Kundenvorgabe, 2026-09-13).
- Kein Hype-Versprechen: Die Seite „Für wen das nichts ist“ schließt Schnell-reich-Erwartungen explizit aus.

## Evidence on Hand

- Kunden-Mockups (Dashboard, Hero, Vergleich, Für wen) vom 2026-09-13 als Stilvorgabe.
- „5,0 ★ · 21 Bewertungen“ steht im Kunden-Hero-Mockup — Quelle nicht verifiziert, nicht ohne Bestätigung verwenden.
- Case-/Founder-Material unter `public/cases/`, `public/founder/`.
- Keine erfundenen Kennzahlen, Testimonials oder Auszahlungsbeträge verwenden.

## Product Principles

1. **Die nächste Handlung zuerst.** Jede Fläche beantwortet „Was ist jetzt dran?“, bevor sie Statistik zeigt.
2. **Prozess vor Ergebnis.** Konstanz (Streak, Wochenaufgabe, Journal) wird sichtbar belohnt, nicht der schnelle Gewinn.
3. **Ruhe statt Reiz.** Die Plattform steht neben offenen Charts; nichts darf mit dem Markt um Aufmerksamkeit konkurrieren.
4. **Ehrlich bleiben.** Keine Gewinnversprechen, Proof nur mit echten, verifizierten Belegen.
