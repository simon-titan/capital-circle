import { RechtsLinks } from "@/components/legal/RechtsFusszeile";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export default function LoginRedirectPage() {
  // Rechtliche Links unter dem Login — dieselbe Zeile wie auf `/einsteig`.
  return <OnboardingFlow loginFooter={<RechtsLinks mt={10} maxW="360px" />} />;
}
