import type { Metadata } from "next";
import { MembershipLanding } from "@/components/landing/membership/MembershipLanding";

export const metadata: Metadata = {
  title: "Capital Circle — Trading-Community & Plattform",
  description:
    "Werde endlich konstant profitabel — nicht nur an guten Tagen. System, Live-Sessions und eine Community, die dich auf Kurs hält. Ab 99 € im Monat, monatlich kündbar.",
};

/**
 * Startseite — die Verkaufsseite der Mitgliedschaft.
 *
 * Bis zum 16.09.2026 stand hier der Anmeldebildschirm; der wohnt jetzt auf
 * `/einsteig`, wohin ohnehin schon jeder `redirect()` im Projekt zeigte.
 *
 * Für eingeloggte Nutzer leitet `proxy.ts` von hier nach `/dashboard` weiter —
 * wer bereits zahlt, soll keine Verkaufsseite sehen. Deshalb steht hier auch
 * kein `getUser()`: Die Weiche liegt an genau einer Stelle.
 */
export default function Home() {
  return <MembershipLanding />;
}
