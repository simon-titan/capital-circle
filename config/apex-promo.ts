/**
 * APEX-Trader-Funding-Promo auf dem Journal-Home.
 *
 * Die Affiliate-URL steht bewusst hier und nirgends sonst — sobald der echte
 * Partnerlink vorliegt, ist es genau eine Zeile.
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
  ctaUrl: "https://apextraderfunding.com",
  footnote: "Bei dem Erwerb über Emres Code unterstützt ihr Emre & seine Arbeit.",
  logoSrc: "/apex/apex-trader-funding.png",
  logoAlt: "Apex Trader Funding: Infinite Possibilities",
} as const;
