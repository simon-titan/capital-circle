import type { Metadata } from "next";
import { MembershipLanding } from "@/components/landing/membership/MembershipLanding";

export const metadata: Metadata = {
  title: "Capital Circle · Trading-Community & Plattform",
  description:
    "Werde endlich konstant profitabel, nicht nur an guten Tagen. System, Live-Sessions und eine Community, die dich auf Kurs hält. 99 € im Monat, monatlich kündbar.",
  /**
   * Nicht indexieren: Die Seite zeigt denselben Inhalt wie `/`. Zwei indexierte
   * Adressen mit gleichem Text wären doppelter Inhalt, und die Vorschau soll
   * nicht in der Suche statt der echten Startseite auftauchen.
   */
  robots: { index: false, follow: false },
  alternates: { canonical: "/" },
};

/**
 * Dieselbe Verkaufsseite wie `/`, aber ohne jedes Tor davor.
 *
 * `/` ist für nicht eingeloggte Besucher die Landing Page — im Wartungsmodus
 * schiebt `proxy.ts` sie aber nach `/wartung`, und eingeloggte Nutzer werden
 * von dort ohnehin ins Dashboard geleitet. Wer die Seite jemandem zeigen will,
 * während die Plattform zu ist, hat also keine Adresse dafür.
 *
 * Diese hier ist diese Adresse: `proxy.ts` nimmt `/vorschau` sowohl vom
 * Wartungs-Gate als auch von der Anmeldepflicht aus, und es gibt keine
 * Dashboard-Weiche. Jeder mit dem Link sieht die Seite, in jedem Zustand.
 *
 * Die Kauf-Schaltflächen zeigen weiterhin auf `/go/<plan>`. Das Wartungs-Gate
 * gilt dort unverändert — im Wartungsmodus ist die Vorschau zum Ansehen da,
 * nicht zum Verkaufen. Soll auch gekauft werden können, muss `/go` in
 * `proxy.ts` ebenfalls von `maintenanceExempt` erfasst werden.
 */
export default function VorschauPage() {
  return <MembershipLanding />;
}
