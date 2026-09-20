import { HStack } from "@chakra-ui/react";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Gemeinsame Bausteine der Live-Session-Ansichten (Kategoriekarten und
 * Session-Kacheln). Bewusst ohne `"use client"`: Pill und Aktionszeile haben
 * keinen Zustand, so lassen sie sich aus Server- wie Client-Komponenten
 * verwenden, und die Textfunktionen laufen auch auf dem Server.
 *
 * Form und Maße stammen aus dem Institut (`InstitutAccordion.tsx`) — beide
 * Bereiche sollen sich gleich anfühlen (Nutzerwunsch 17.09.2026).
 */

/** Gestaffelter Einstieg (80ms + 70ms je Schritt), gedeckelt wie im Institut. */
export function riseDelay(i: number) {
  return { animationDelay: `${80 + Math.min(i, 10) * 70}ms` };
}

/** Gesamtdauer kurz: „2h 15m“ bzw. „45 Min.“; ohne Dauerangaben ein Gedankenstrich. */
export function formatSessionDuration(totalSeconds: number) {
  if (totalSeconds <= 0) return "—";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} Min.`;
}

/**
 * Datum im Vokabular aus DESIGN.md („Fr, 19. Sep“), immer in Berliner Zeit —
 * sonst stünde auf dem Server ein anderer Tag als im Browser (Hydration).
 */
export function formatSessionDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Berlin",
  });
}

/**
 * Was in einer Kategorie stehen wird, solange nichts veröffentlicht ist.
 *
 * Der Bestand ist seit dem 17.09.2026 leer, der Leerzustand ist also der
 * Normalfall — er bekommt einen Satz statt eines Platzhalters. Abgeglichen
 * wird über den Titel, weil die Kategorien in der Datenbank liegen und beim
 * nächsten Neuaufsetzen andere IDs bekämen.
 */
const KATEGORIE_HINWEISE: Array<[string, string]> = [
  ["live", "Hier erscheinen die Mitschnitte der Live-Calls: Einstieg, Ausführung und Nachbesprechung am Chart."],
  ["backtest", "Hier erscheinen die Backtesting-Sessions: Setups am historischen Chart durchgespielt und ausgewertet."],
  ["recap", "Hier erscheint der Wochenrecap: was die Woche gebracht hat und worauf es nächste Woche ankommt."],
];

export function kategorieHinweis(title: string) {
  const t = title.toLowerCase();
  for (const [schluessel, satz] of KATEGORIE_HINWEISE) {
    if (t.includes(schluessel)) return satz;
  }
  return "Hier erscheinen die Aufzeichnungen dieser Kategorie, sobald sie veröffentlicht sind.";
}

export type PillTone = "gold" | "neutral" | "muted";

const PILL_TONES: Record<PillTone, { color: string; borderColor: string; bg: string }> = {
  gold: { color: "var(--cc-gold-light)", borderColor: "rgba(212, 176, 128, 0.3)", bg: "rgba(212, 176, 128, 0.07)" },
  neutral: { color: "var(--cc-text-2)", borderColor: "var(--cc-line)", bg: "rgba(255, 255, 255, 0.03)" },
  muted: { color: "var(--cc-text-3)", borderColor: "var(--cc-line)", bg: "transparent" },
};

/** Kleine Pille für Meta (Aufzeichnungen, Videos, Dauer) und Status — wie im Institut. */
export function Pill({
  tone,
  icon,
  upper = false,
  className,
  children,
}: {
  tone: PillTone;
  icon?: ReactNode;
  upper?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <HStack
      as="span"
      display="inline-flex"
      spacing={1.5}
      px={2.5}
      py={1}
      borderRadius="full"
      borderWidth="1px"
      borderStyle="solid"
      fontSize="12px"
      lineHeight="16px"
      fontWeight={500}
      whiteSpace="nowrap"
      className={className}
      {...PILL_TONES[tone]}
      {...(upper ? { letterSpacing: "0.12em", textTransform: "uppercase" as const } : null)}
    >
      {icon}
      <span>{children}</span>
    </HStack>
  );
}

/**
 * Sieht aus wie ein Gold-Button, ist aber nur Beschriftung: Die ganze Karte ist
 * der Link. Ein echter Knopf darin wäre ein zweites klickbares Element im
 * selben `<a>` — ungültiges Markup und für die Tastatur verwirrend.
 */
export function KartenAktion({ children }: { children: ReactNode }) {
  return (
    <HStack
      as="span"
      flexShrink={0}
      h="32px"
      px={3}
      spacing={1.5}
      justify="center"
      borderRadius="8px"
      bg="var(--cc-gold)"
      bgImage="var(--cc-gold-grad)"
      color="var(--cc-on-gold)"
      fontSize="14px"
      fontWeight={600}
    >
      <span>{children}</span>
      <ArrowRight size={14} aria-hidden />
    </HStack>
  );
}
