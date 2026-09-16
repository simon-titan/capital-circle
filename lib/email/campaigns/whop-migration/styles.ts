import { EMAIL_TOKENS } from "../../layout/styles";

/**
 * Kampagnen-Tokens der Migrations-Mails (Whop → Plattform). Seit v3.2 identisch
 * mit dem Plattform-Look „Champagner auf Graphit“: Graphit-Flächen, Champagner
 * als einziger Akzent (CTA, Haarlinie, Label, FAQ-Ziffern), Inter für alles.
 * Die Basiswerte kommen aus `EMAIL_TOKENS`; hier stehen nur die Rollen-Namen
 * der Kampagnen-Bausteine.
 */
export const CAMPAIGN_TOKENS = {
  ...EMAIL_TOKENS,
  /** CTA-Fläche (Vollton-Fallback zum Verlauf `goldGrad`). */
  accent: EMAIL_TOKENS.gold,
  /** Schrift auf dem CTA. */
  accentOn: EMAIL_TOKENS.onGold,
  /** Markenton für Label, FAQ-Ziffern und Hinweis-Haarlinie. */
  brand: EMAIL_TOKENS.goldLight,
  /** Champagner-Haarlinie auf der Karte. */
  brandSoft: EMAIL_TOKENS.borderGold,
} as const;
