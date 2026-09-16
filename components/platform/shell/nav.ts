import { BookMarked, GraduationCap, LayoutGrid, Package, Radio, type LucideIcon } from "lucide-react";

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
   * verlinkt — sie ist nur noch über die direkte URL erreichbar. Die
   * Codex-Inhalte selbst laufen davon unabhängig weiter im Onboarding
   * (components/onboarding/CodexStep.tsx).
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
    children: [
      { href: "/trading-journal", label: "Trading Journal", access: "paid" },
      { href: "/journal-klassisch", label: "Klassisches Journal", access: "paid" },
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
