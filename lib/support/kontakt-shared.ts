import { anbieter } from "@/config/legal";

/**
 * Gemeinsame Bausteine des Kontaktformulars ohne Anmeldung (`/kontakt`) — ohne
 * Server-Abhängigkeiten, damit auch das Formular im Browser sie importieren kann.
 * Alles mit Datenbank oder Geheimnissen steht in `lib/support/kontakt.ts`.
 *
 * Die Tickets landen in denselben Tabellen wie die der Mitglieder
 * (`support_tickets`, Migration 063), nur ohne `user_id`. Absender ist dann
 * `contact_email`; wer den Verlauf sehen will, braucht den Link mit
 * `zugangs_token` (Migration 102).
 */

export const KONTAKT_EMAIL = anbieter.email;

/** Name des Honeypot-Felds. Muss mit dem Formular übereinstimmen. */
export const KONTAKT_HONIGTOPF = "cc_feld_url";

export const KONTAKT_GRENZEN = {
  nameMin: 2,
  nameMax: 120,
  emailMax: 254,
  betreffMin: 3,
  betreffMax: 140,
  nachrichtMin: 10,
  /** Die Tabelle erlaubt 8000 Zeichen je Nachricht; das Formular bleibt darunter. */
  nachrichtMax: 5000,
} as const;

/**
 * Kategorien wie im Mitgliederbereich (`TicketCategory`), aber mit Worten für
 * jemanden, der nicht weiß, wie wir intern sortieren. „Anmeldung" ist der
 * häufigste Grund, warum jemand ohne Konto schreibt, und steht deshalb oben.
 */
export const KONTAKT_KATEGORIEN = [
  { wert: "account", label: "Anmeldung und Zugang" },
  { wert: "billing", label: "Zahlung und Abrechnung" },
  { wert: "technical", label: "Technisches Problem" },
  { wert: "other", label: "Etwas anderes" },
] as const;

export type KontaktKategorie = (typeof KONTAKT_KATEGORIEN)[number]["wert"];

export function istKontaktKategorie(wert: unknown): wert is KontaktKategorie {
  return KONTAKT_KATEGORIEN.some((k) => k.wert === wert);
}

const EMAIL_MUSTER = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

export function istGueltigeEmail(wert: string): boolean {
  return wert.length <= KONTAKT_GRENZEN.emailMax && EMAIL_MUSTER.test(wert);
}

const UUID_MUSTER = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function istUuid(wert: unknown): wert is string {
  return typeof wert === "string" && UUID_MUSTER.test(wert);
}

/** Adresse des Verlaufs, der nur mit dem Token aufgeht. */
export function kontaktVerlaufUrl(basisUrl: string, ticketId: string, token: string): string {
  return `${basisUrl}/kontakt/${ticketId}?t=${token}`;
}
