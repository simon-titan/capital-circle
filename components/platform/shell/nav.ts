import {
  BookMarked,
  Building2,
  CalendarCheck,
  CirclePlay,
  FileText,
  GraduationCap,
  Landmark,
  Layers,
  LayoutGrid,
  LayoutTemplate,
  LineChart,
  Package,
  Radio,
  Repeat,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { BLUEPRINT_PFAD, VITRINE_PFAD } from "@/config/free-bereich";
import { FREE_PROGRAMME_PFAD, TRAINING_VIDEOS_PFAD } from "@/config/training";

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
  /** Kleines Label neben dem Namen, z. B. „Neu". */
  badge?: string;
  /** Zeile in Smaragd hervorheben (statt Badge), z. B. „Ausbildung & Mentoring" (14.11.2026). */
  akzent?: "smaragd";
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
  /*
   * „Ausbildung & Mentoring" steht seit 17.11.2026 **nicht** mehr in der Navigation
   * der Zahlenden (Wunsch Simon) — nur Free-Mitglieder sehen den Punkt
   * (`PREMIUM_OFFEN`, führt auf /call). Die Seite /programme bleibt per Link erreichbar.
   */
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
  /** Sichtbar, aber gesperrt mit Badge „Demnächst“; ein Klick meldet nur „Erscheint bald“. */
  demnaechst?: boolean;
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
 * „TradingView“ (Indikator-Zugang) steht seit 25.09.2026 mit Schloss und Badge
 * „Demnächst“ in der Liste — für alle, auch zahlende Mitglieder. Ein Klick führt
 * nirgendwohin, sondern meldet „Erscheint bald“. Seite `/tools/tradingview`, API
 * und Admin-Liste bleiben bestehen; zum Freischalten `demnaechst` entfernen.
 */
export const TOOLS_ITEMS: ToolItem[] = [
  { key: "tradingview", label: "TradingView", icon: LineChart, href: "/tools/tradingview", demnaechst: true },
  { key: "tradesyncer", label: "TradeSyncer", icon: Repeat, href: "/tools/tradesyncer" },
  { key: "propfirms", label: "Propfirms", icon: Building2, href: "/tools/propfirms" },
];

/* ─── Free-Mitglieder (Emres Mockup, 08.11.2026) ─────────────────────────── */

export type FreeNavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: string;
  akzent?: "smaragd";
};

/**
 * Seitenleiste für Konten ohne Inhaltszugang (`hatInhaltsZugang` false):
 * Gruppe „Free“ mit allem, was offen ist. Zahlende sehen weiter `NAV_GROUPS`.
 * Die Vitrine ist die öffentliche Nachweis-Seite `/ergebnisse` — sie öffnet
 * außerhalb des Plattform-Rahmens, das ist so gewollt.
 */
export const FREE_NAV: FreeNavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid, href: "/dashboard" },
  { key: "kurs", label: "Kostenloser Kurs", icon: CirclePlay, href: TRAINING_VIDEOS_PFAD },
  { key: "blueprint", label: "Trading Blueprint", icon: FileText, href: BLUEPRINT_PFAD },
  { key: "vitrine", label: "Capital Circle Vitrine", icon: Trophy, href: VITRINE_PFAD },
];

/**
 * Gruppe „Premium“: der offene Weg nach oben, darunter die gesperrten Bereiche.
 * Free geht seit 14.11.2026 direkt in den Call-Funnel (`FREE_PROGRAMME_PFAD`).
 */
export const PREMIUM_OFFEN: FreeNavItem = {
  key: "programme",
  label: "Ausbildung & Mentoring",
  icon: GraduationCap,
  href: FREE_PROGRAMME_PFAD,
  // Statt Badge „Neu" in Smaragd hervorgehoben (Feedback 14.11.2026).
  akzent: "smaragd",
};

/** Gesperrt wie ein `paid`-Unterpunkt: sichtbar, mit Schloss, ohne Ziel. */
export const PREMIUM_GESPERRT: FreeNavItem[] = [
  { key: "live", label: "Live-Trading", icon: Radio, href: "/live-session" },
  { key: "analysen", label: "Analysen", icon: LineChart, href: "/analysis" },
  { key: "wochenaufgabe", label: "Wochenaufgabe", icon: CalendarCheck, href: "/hausaufgabe" },
  { key: "tools", label: "Tools & Software", icon: Layers, href: "/arsenal/tools" },
  { key: "fremdkapital", label: "Fremdkapital", icon: Landmark, href: "/arsenal/fremdkapital" },
  { key: "templates", label: "Templates", icon: LayoutTemplate, href: "/arsenal/templates" },
  { key: "pdfs", label: "PDFs", icon: FileText, href: "/arsenal/pdfs" },
];
