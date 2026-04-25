import { BewerbungsLandingCard } from "@/components/landing/BewerbungsLandingCard";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

/**
 * Root — zeigt Login / Onboarding mit einer Bewerbungs-Karte darunter.
 * Auth-Redirect (eingeloggt → /dashboard) übernimmt proxy.ts, daher kein
 * getUser()-Call hier nötig.
 */
export default function Home() {
  return <OnboardingFlow loginFooter={<BewerbungsLandingCard />} />;
}
