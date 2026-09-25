/**
 * APEX-Trader-Funding-Promo: Leiste über der Plattform und Karte auf der
 * Seite `/tools/propfirms` (bis 25.09.2026 stand die Karte im Journal-Home).
 *
 * Die Affiliate-URL steht bewusst hier und nirgends sonst. Seit 25.09.2026 ist
 * es Emres echter Partnerlink — vorher zeigte sie auf die nackte Startseite,
 * die Leiste lief also ohne Zuordnung.
 *
 * Das Logo ist die offizielle „light"-Variante (weiße Wortmarke, blauer Chevron,
 * transparenter Hintergrund) — für dunkle Flächen gemacht und deshalb ohne
 * CSS-Filter eingebunden. Die frühere Datei war dunkelblau auf weißem Grund und
 * stanzte ein weißes Rechteck in die Karte.
 */
export const APEX_PROMO = {
  eyebrow: "Emres Lieblings-Propfirm",
  headline: "APEXTRADERFUNDING 90% SALE!",
  bullets: ["Führender Funded-Challenge-Anbieter", "Bestes Pricing", "Zuverlässige Payouts"],
  discountCode: "EMRCAP",
  discountLabel: "90% OFF",
  /** Kurzfassung für die Leiste über der Plattform. */
  stripText: "90 % Rabatt auf Apex Trader Funding",
  stripCta: "Jetzt Konto sichern",
  body: 'Spare jetzt 90 % bei deiner nächsten Challenge mit dem Rabattcode „EMRCAP".',
  ctaLabel: "Rabatt sichern",
  ctaUrl: "https://apextraderfunding.com/member/aff/go/emrezz01",
  footnote: "Bei dem Erwerb über Emres Code unterstützt ihr Emre & seine Arbeit.",
  logoSrc: "/apex/apex-trader-funding.png",
  logoAlt: "Apex Trader Funding: Infinite Possibilities",
} as const;
