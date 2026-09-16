import { BewerbungsLandingCard } from "@/components/landing/BewerbungsLandingCard";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

/**
 * Login und Onboarding.
 *
 * Seit dem 16.09.2026 die Heimat des Anmeldebildschirms: `/` zeigt jetzt die
 * Verkaufsseite. Die Adresse war bereits das Ziel aller `redirect("/einsteig")`
 * im Projekt, deshalb musste dafür keine neue Route entstehen — nur die
 * Bewerbungs-Karte ist mitgezogen, die vorher unter dem Login auf `/` stand.
 */
export default function EinsteigPage() {
  return <OnboardingFlow loginFooter={<BewerbungsLandingCard />} />;
}
