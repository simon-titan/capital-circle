/**
 * Die einzige Quelle für das Aussehen aller Capital-Circle-Mails.
 *
 * Farben, Abstände und Schriftgrößen stehen hier und nirgends sonst. Kein
 * Template schreibt `#XXXXXX`, `16px` oder `1.6` direkt hin — sonst driften
 * zweiunddreißig Vorlagen auseinander, und man merkt es erst im Postfach.
 *
 * ── Warum hartcodierte Hex-Werte ───────────────────────────────────────────
 * Mail-Clients kennen keine CSS-Variablen. Die Werte sind deshalb Kopien der
 * `--cc-*`-Tokens aus `app/globals.css` (Schema v3.2 „Champagner auf Graphit“,
 * siehe DESIGN.md). Wer dort den Grund oder das Gold ändert, ändert es hier
 * mit.
 *
 * Halbtransparente Linien (`--cc-line` ist rgba) stehen als vorgerechneter
 * Vollton auf der Kartenfläche: Outlook stellt Alpha-Rahmen nicht zuverlässig
 * dar.
 *
 * ── Schlicht heißt schlicht (20.09.2026) ───────────────────────────────────
 * Verläufe, Glanzkanten, Champagner-Haarlinien und die zweite Panel-Fläche
 * sind raus. Übrig bleiben: Graphit-Grund, eine Graphit-Karte mit grauer
 * Haarlinie, helle Schrift — und Gold genau dort, wo etwas zu tun ist
 * (Knopf, Link). Grün und Rot nur semantisch.
 *
 * ── Schrift ────────────────────────────────────────────────────────────────
 * Inter, falls auf dem Gerät installiert, sonst die Systemschrift aus dem
 * Stack. Bewusst **ohne** Webfont-`<link>`: Bis 19.09.2026 luden die Mails
 * Inter von fonts.googleapis.com — beim Öffnen ging so die IP-Adresse des
 * Empfängers an Google.
 */
const INTER_STACK =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const EMAIL_TOKENS = {
  /* ── Farben ─────────────────────────────────────────────────────────── */
  /** Seitengrund (= --cc-bg) */
  bgPage: "#0F1317",
  /** Karte (= --cc-surface) */
  bgCard: "#191E23",
  /** Haarlinie ≈ 7 % Weiß auf der Karte (= --cc-line), als Vollton vorgerechnet */
  line: "#292E32",
  /** Fließtext und Überschriften (= --cc-text) */
  text: "#F2F3F5",
  /** Nebensatz, Datenzeilen-Beschriftung, Fußzeile (= --cc-text-2) */
  textMuted: "#A3A9B0",
  /** Champagner-Gold (= --cc-gold) — einziger Akzent, nur für Knopf und Link */
  gold: "#D4B080",
  /** Schrift auf Gold (= --cc-on-gold) */
  onGold: "#1A140C",
  /** Nur semantisch: Fehlerhinweis in den Betriebsmails (= --cc-danger) */
  red: "#F87171",

  /* ── Schrift ────────────────────────────────────────────────────────── */
  font: INTER_STACK,
  /** Nur für Zugangsdaten zum Abtippen. System-Monospace, keine Webfont. */
  fontMono: "ui-monospace, 'SF Mono', Menlo, Consolas, 'Courier New', monospace",
  sizeHeading: "22px",
  sizeSubheading: "16px",
  sizeText: "15px",
  sizeSmall: "13px",
  sizeFooter: "12px",
  lineHeight: 1.6,

  /* ── Maße ───────────────────────────────────────────────────────────── */
  /** Breite der Mail. 560px liest sich auf dem Handy wie am Schreibtisch. */
  maxWidth: "560px",
  /**
   * Wortmarke im Kopf. Feste Breite in Pixeln, damit Outlook das Bild nicht
   * auf seine Originalgröße (1585 px) aufbläst. Die Höhe ist aus dem
   * Seitenverhältnis der Datei gerechnet (1585 × 199) — wer die Datei
   * austauscht, rechnet sie neu.
   */
  logoWidth: 176,
  logoHeight: 22,
  radius: "10px",
  /** Innenabstand der einen Karte. */
  cardPadding: "32px 28px 20px",
  /** Abstand zwischen zwei Absätzen. */
  gap: "16px",
  /** Abstand vor einem neuen Block (Zwischenüberschrift, Datenzeilen, Knopf). */
  gapBlock: "28px",
} as const;

export type EmailTokens = typeof EMAIL_TOKENS;
