/**
 * Email-Design-Tokens — hartcodiert aus DESIGN.json (Kapitel "Email").
 *
 * Diese Werte sind die Single-Source-of-Truth für ALLE Templates.
 * Niemals direkt in Templates `#XXXXXX` schreiben — immer über `EMAIL_TOKENS`.
 *
 * Webfonts sind in vielen Mail-Clients nicht zuverlässig — daher System-Stack.
 */
export const EMAIL_TOKENS = {
  bg: "#0C0D10",
  bgPage: "#07080A",
  bgCard: "#13141A",
  border: "rgba(255,255,255,0.09)",
  borderGold: "rgba(212,175,55,0.35)",
  text: "#F0F0F2",
  textMuted: "#9A9AA4",
  textFooter: "#606068",
  gold: "#D4AF37",
  goldLight: "#E8C547",
  goldDark: "#A67C00",
  red: "#E5484D",
  fontHeading: "'Georgia', 'Times New Roman', serif",
  fontBody:
    "'Helvetica Neue', Helvetica, Arial, 'Segoe UI', Roboto, sans-serif",
  fontMono: "'JetBrains Mono', 'Courier New', monospace",
} as const;

export type EmailTokens = typeof EMAIL_TOKENS;
