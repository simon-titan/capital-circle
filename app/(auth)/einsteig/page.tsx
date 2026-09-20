import { MitgliedWerdenCard } from "@/components/landing/MitgliedWerdenCard";
import { RechtsLinks } from "@/components/legal/RechtsFusszeile";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

/**
 * Login und Onboarding.
 *
 * Seit dem 16.09.2026 die Heimat des Anmeldebildschirms: `/` zeigt jetzt die
 * Verkaufsseite. Die Adresse war bereits das Ziel aller `redirect("/einsteig")`
 * im Projekt, deshalb musste dafür keine neue Route entstehen. Wer noch kein
 * Mitglied ist, wird über die Karte unter dem Login auf die Verkaufsseite `/`
 * geschickt; einen Bewerbungsweg gibt es nicht mehr.
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
          <MitgliedWerdenCard />
          <RechtsLinks mt={10} maxW="360px" />
        </>
      }
    />
  );
}
