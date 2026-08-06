import { EMAIL_TOKENS } from "../../layout/styles";

/**
 * Kampagnen-lokale Tokens — NICHT `EMAIL_TOKENS` (Gold) verändern, das ist die
 * Plattform-weite Farbe für alle anderen Mails. Diese Kampagne folgt stattdessen
 * dem Look des Trading-Journal v2 (`[data-journal-wide]` in `app/globals.css`):
 * flache dunkle Fläche, Weiß als einziger Akzent, Rot nur in homöopathischer
 * Dosis (Haarlinie, Badge) — niemals als Fließtext oder große Fläche.
 *
 * `bgPage`/Text-Werte sind identisch mit `EMAIL_TOKENS`, weil die Basis dort
 * bereits nahezu schwarz ist (`#07080A`). Nur Gold wird ersetzt.
 */
/**
 * Inter überall, explizit angefragt — überschreibt die Georgia/Helvetica-
 * Systemstacks aus `EMAIL_TOKENS` für Headline UND Fließtext. `fontLinkHref`
 * lädt Inter zusätzlich per `<link>` (siehe `BaseEmail`s `headFontLinkHref`)
 * für Clients, die externe Stylesheets im Mail-`<head>` respektieren (u. a.
 * Apple/iOS Mail); überall sonst greift der System-Sans-Fallback in der Stack.
 */
const INTER_STACK =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const CAMPAIGN_TOKENS = {
  ...EMAIL_TOKENS,
  fontHeading: INTER_STACK,
  fontBody: INTER_STACK,
  fontLinkHref: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  /** Weiß — trägt den CTA-Button, identisch zu `--j-accent` im Journal. */
  accent: "#FFFFFF",
  accentOn: "#0A0A0C",
  /** Markenrot — identisch zu `--j-brand` im Journal. Nur Haarlinie/Badge. */
  brandRed: "#C8102E",
  brandRedSoft: "rgba(200,16,46,0.35)",
  brandRedBg: "rgba(200,16,46,0.08)",
} as const;
