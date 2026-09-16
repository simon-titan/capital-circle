/**
 * Email-Design-Tokens — v3.2 „Champagner auf Graphit“ (DESIGN.md), hartcodiert,
 * weil Mail-Clients keine CSS-Variablen kennen. Werte = `--cc-*` aus `app/globals.css`.
 *
 * Diese Werte sind die Single-Source-of-Truth für ALLE Templates.
 * Niemals direkt in Templates `#XXXXXX` schreiben — immer über `EMAIL_TOKENS`.
 *
 * Linien sind als Volltöne auf der Kartenfläche vorgerechnet (kein rgba), weil
 * Outlook & Co. Alpha-Rahmen nicht zuverlässig darstellen.
 *
 * Schrift: Inter für alles. Per `<link>` geladen (Apple/iOS Mail u. a.), sonst
 * greift der System-Sans-Fallback im Stack.
 */
const INTER_STACK =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const EMAIL_TOKENS = {
  /** Seitengrund (= --cc-bg) */
  bgPage: "#12171C",
  /** Panel, z. B. Hinweis-Boxen (= --cc-panel-solid) */
  bg: "#151A1E",
  /** Karte (= --cc-surface) */
  bgCard: "#191E23",
  /** Haarlinie ≈ 7 % Weiß auf der Karte (= --cc-line) */
  border: "#292E32",
  /** Kräftige Haarlinie ≈ 15 % Weiß (= --cc-line-strong) */
  borderStrong: "#3C4044",
  /** Champagner-Haarlinie ≈ 35 % Gold auf der Karte */
  borderGold: "#5B5144",
  text: "#F2F3F5",
  textSoft: "#D4D7DB",
  textMuted: "#A3A9B0",
  textFooter: "#80868D",
  /** Champagner-Gold (= --cc-gold) — einziger Akzent */
  gold: "#D4B080",
  goldLight: "#E8C094",
  goldDark: "#B8935F",
  /** Schrift auf Gold (= --cc-on-gold) */
  onGold: "#1A140C",
  /** Gold-Verlauf (= --cc-gold-grad); immer mit `gold` als Vollton-Fallback setzen */
  goldGrad: "linear-gradient(135deg, #ECC99C 0%, #D4B080 50%, #B8935F 100%)",
  red: "#F87171",
  fontHeading: INTER_STACK,
  fontBody: INTER_STACK,
  /** Nur für Zugangsdaten (Passwort/E-Mail zum Abtippen): System-Monospace, keine Webfont. */
  fontMono: "ui-monospace, 'SF Mono', Menlo, Consolas, 'Courier New', monospace",
  fontLinkHref: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
} as const;

export type EmailTokens = typeof EMAIL_TOKENS;
