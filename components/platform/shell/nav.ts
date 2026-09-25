import {
  BookMarked,
  Building2,
  GraduationCap,
  LayoutGrid,
  Package,
  Radio,
  Repeat,
  type LucideIcon,
} from "lucide-react";

/**
 * `paid` = Free-Mitglieder sehen den Punkt, aber gesperrt.
 * `free-only` = nur für Free-Mitglieder (der öffentliche Live-Stream).
 */
export type NavAccess = "paid" | "free-only";

export type NavChild = {
  href: string;
  label: string;
  access?: NavAccess;
};

export type NavGroup = {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
  children?: NavChild[];
};

/**
 * Hauptnavigation der Plattform: fünf Bereiche wie im Kunden-Mockup (2026-09).
 * Die Unterpunkte decken alle Ziele der früheren TopBar ab; ein Bereich klappt
 * seine Unterpunkte auf, sobald man sich darin befindet.
 */
export const NAV_GROUPS: NavGroup[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid, href: "/dashboard" },
  /**
   * „Codex“ am 16.09.2026 auf Wunsch aus der Navigation genommen. Die Seite
   * /codex bleibt bestehen und unverändert, wird aber von keiner Stelle mehr
   * verlinkt — sie ist nur noch über die direkte URL erreichbar. Der alte
   * Codex-Schritt im Onboarding ist seit 26.09.2026 entfernt.
   *
   * Damit blieb nur noch „Module“ übrig, und das zeigte auf dieselbe Seite wie
   * der Bereich selbst. Ein Aufklapp-Pfeil auf einen einzigen Unterpunkt, der
   * nirgendwo anders hinführt, ist Klickarbeit ohne Gegenwert — deshalb steht
   * „Institut“ jetzt als einfache Zeile da, genau wie „Dashboard“.
   */
  { key: "institut", label: "Institut", icon: GraduationCap, href: "/ausbildung" },
  {
    key: "journal",
    label: "Journal",
    icon: BookMarked,
    href: "/trading-journal",
    /**
     * „Klassisches Journal“ am 17.09.2026 aus der Oberfläche genommen. Die
     * Tabellen `trading_journals` / `trading_journal_trades` bleiben mitsamt
     * Daten bestehen — nur die Seite und alle Verweise darauf sind weg.
     */
    children: [
      { href: "/trading-journal", label: "Trading Journal", access: "paid" },
      { href: "/position-rechner", label: "Positionsrechner" },
    ],
  },
  {
    key: "live",
    label: "Live",
    icon: Radio,
    href: "/events",
    children: [
      { href: "/events", label: "Events" },
      { href: "/stream", label: "Live-Stream", access: "free-only" },
      { href: "/live-session", label: "Live-Sessions" },
    ],
  },
  {
    key: "ressourcen",
    label: "Ressourcen",
    icon: Package,
    href: "/analysis",
    children: [
      { href: "/analysis", label: "Analysen", access: "paid" },
      { href: "/hausaufgabe", label: "Wochenaufgabe", access: "paid" },
      { href: "/arsenal/tools", label: "Tools & Software", access: "paid" },
      { href: "/arsenal/fremdkapital", label: "Fremdkapital", access: "paid" },
      { href: "/arsenal/templates", label: "Templates", access: "paid" },
      { href: "/arsenal/pdfs", label: "PDFs", access: "paid" },
    ],
  },
];

export type ToolItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
};

/**
 * Sektion „Tools“ (seit 25.09.2026, Kunden-Mockup „DASHBOARD UPDATE“): steht
 * zwischen Hauptnavigation und Konto-Block. Alle drei Seiten sind nur für
 * zahlende Mitglieder — Free sieht sie mit Schloss, wie die übrigen
 * `paid`-Punkte.
 *
 * Nicht verwechseln mit „Tools & Software“ unter Ressourcen: das ist die
 * Arsenal-Liste aus dem Admin, hier stehen unsere eigenen Partner-Zugänge.
 *
 * „TradingView“ (Indikator-Zugang) am 25.09.2026 auf Wunsch vorerst aus der
 * Navigation genommen. Seite `/tools/tradingview`, API und Admin-Liste bleiben
 * bestehen und sind über die direkte URL erreichbar. Zum Zurückholen:
 *   { key: "tradingview", label: "TradingView", icon: LineChart, href: "/tools/tradingview" },
 */
export const TOOLS_ITEMS: ToolItem[] = [
  { key: "tradesyncer", label: "TradeSyncer", icon: Repeat, href: "/tools/tradesyncer" },
  { key: "propfirms", label: "Propfirms", icon: Building2, href: "/tools/propfirms" },
];
