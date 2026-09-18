/** Auswahl im "Trade hinzufügen"-Dialog. */

export interface Provider {
  id: string;
  label: string;
  hint?: string;
  /** Gesperrte Anbieter werden sichtbar, aber nicht klickbar gerendert. */
  locked: boolean;
}

export const PROVIDERS: Provider[] = [
  { id: "tradovate", label: "Tradovate", hint: "CSV-Import", locked: false },
  { id: "manual", label: "Manuell", hint: "Trade selbst eintragen", locked: false },
  { id: "rithmic", label: "Rithmic", locked: true },
  { id: "ninjatrader", label: "NinjaTrader", locked: true },
  { id: "interactive-brokers", label: "Interactive Brokers", locked: true },
  { id: "tradestation", label: "TradeStation", locked: true },
  { id: "metatrader-5", label: "MetaTrader 5", locked: true },
  { id: "thinkorswim", label: "Thinkorswim", locked: true },
];

export interface ImportMethod {
  id: "auto-sync" | "file" | "manual";
  label: string;
  description: string;
  locked: boolean;
}

export const IMPORT_METHODS: ImportMethod[] = [
  {
    id: "auto-sync",
    label: "Auto-Sync",
    description: "Verbinde dein Konto und synchronisiere Trades automatisch.",
    locked: true,
  },
  {
    id: "file",
    label: "Datei hochladen",
    description: "Lade deinen Orders-Export als CSV hoch.",
    locked: false,
  },
  {
    id: "manual",
    label: "Manuell eintragen",
    description: "Trag einen einzelnen Trade von Hand ein.",
    locked: false,
  },
];

/** Anleitung im Upload-Schritt (rechte Spalte). */
export const TRADOVATE_EXPORT_STEPS = [
  "Öffne TradingView und wechsle unten in das Panel „Handel“ (Trading Panel).",
  "Verbinde dich mit deinem Tradovate- bzw. Prop-Firm-Konto.",
  "Wechsle auf den Reiter „Orders“ (Aufträge) — nicht „Positions“ oder „History“.",
  "Stelle den Zeitraum ein, den du auswerten möchtest.",
  "Klicke rechts auf das Zahnrad und wähle „Export data“ bzw. „Daten exportieren“.",
  "Wähle als Format CSV und speichere die Datei.",
  "Zieh die Datei hier hinein — wir bauen daraus automatisch deine Trades.",
];

/** Instrumente, die im manuellen Formular vorgeschlagen werden. */
export const MANUAL_SYMBOLS = ["MNQ", "NQ", "MES", "ES", "MGC", "GC", "MCL", "CL"] as const;

/**
 * Monatsnamen für den P&L-Kalender. Lagen bis zur Abschaltung des klassischen
 * Journals in `components/trading-journal/constants.ts`; dort steht jetzt nur
 * noch der Positionsrechner.
 */
export const MONTHS_DE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];
