import { BewerbungsLandingCard } from "@/components/landing/BewerbungsLandingCard";
import { RechtsLinks } from "@/components/legal/RechtsFusszeile";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

/**
 * Login und Onboarding.
 *
 * Seit dem 16.09.2026 die Heimat des Anmeldebildschirms: `/` zeigt jetzt die
 * Verkaufsseite. Die Adresse war bereits das Ziel aller `redirect("/einsteig")`
 * im Projekt, deshalb musste dafür keine neue Route entstehen — nur die
 * Bewerbungs-Karte ist mitgezogen, die vorher unter dem Login auf `/` stand.
 *
 * Unter dem Login stehen die rechtlichen Links (Impressum, Datenschutz, AGB,
 * Widerruf, „Verträge hier kündigen") — wer sich anmelden will, um zu
 * kündigen, findet den Kündigungsbutton hier auch ohne Passwort.
 */
export default function EinsteigPage() {
  return (
    <OnboardingFlow
      loginFooter={
        <>
          <BewerbungsLandingCard />
          <RechtsLinks mt={10} maxW="360px" />
        </>
      }
    />
  );
}
