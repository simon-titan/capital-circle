/**
 * Partner-Zugänge der Sektion „Tools“ (seit 25.09.2026).
 *
 * Codes und Affiliate-Links stehen hier und nirgends sonst. Apex hat seine
 * eigene Datei (`config/apex-promo.ts`), weil die Leiste über der Plattform
 * dieselben Werte liest.
 */

export const TRADESYNCER = {
  eyebrow: "Capital Circle × TradeSyncer",
  headline: "Mehrere Accounts. Eine Ausführung.",
  lead:
    "TradeSyncer verbindet deine Futures-Accounts und kann Trades von einem Lead-Account auf deine verbundenen Accounts übertragen.",
  benefits: [
    { titel: "Einmal ausführen", text: "Trades über verbundene Accounts synchronisieren." },
    { titel: "Accounts zentral verwalten", text: "Prop- und Broker-Accounts an einem Ort." },
  ],
  rabatt: "30 %",
  code: "EMRCAP",
  /** Affiliate-Link: die Zuordnung hängt am `ref`-Parameter. */
  url: "https://app.tradesyncer.com/?ref=TS309149A6",
  ctaLabel: "TradeSyncer öffnen",
  /** Zwei echte Auswertungen aus Emres Copy-Trading, als WebP, inhaltlich unverändert (siehe public/partner/tradesyncer). */
  bilder: [
    {
      src: "/partner/tradesyncer/copytrading-15-accounts.webp",
      alt: "TradeSyncer-Auswertung: 10.924,06 $ Gesamtgewinn über 15 kopierte Accounts an einem Tag",
      width: 1152,
      height: 768,
    },
    {
      src: "/partner/tradesyncer/copytrading-14-accounts.webp",
      alt: "TradeSyncer-Auswertung: 6.670,62 $ Gesamtgewinn über 14 kopierte Accounts an einem Tag",
      width: 1152,
      height: 768,
    },
  ],
} as const;

/** Kurzanleitung nach der Freischaltung des TradingView-Indikators. */
export const TRADINGVIEW = {
  indikatorName: "Capital Circle Indicator",
  schritte: [
    "TradingView öffnen",
    "„Indicators“ auswählen",
    "„Invite-only Scripts“ öffnen",
    "Capital Circle Indicator auswählen",
  ],
} as const;
