import type { Metadata } from "next";
import { FunnelHimmel } from "@/components/landing/FunnelHimmel";
import { TrainingLanding } from "@/components/landing/training/TrainingLanding";
import { landing } from "@/config/training";
import { ladeBewertungsspiegel } from "@/lib/landing-reviews";

/**
 * `/training` — öffentliche Landingpage des kostenlosen Trainings
 * (`config/training.ts`). Statisch; die Registrierung läuft im Client über
 * `/api/training/registrieren`. Öffentlich über `PUBLIC_PATHS` in `proxy.ts`.
 *
 * Ist der Verkauf geschlossen (`/admin/verkauf`), sollte das Ziel der
 * Hinweisseite auf `/training` stehen.
 */
export const metadata: Metadata = {
  title: landing.meta.title,
  description: landing.meta.description,
};

export default async function TrainingPage() {
  // Dieselbe Quelle wie die Bewertungsliste auf der Seite (Kategorie `global`), wie auf `/`.
  const bewertungen = await ladeBewertungsspiegel(["global"]);
  return (
    <FunnelHimmel>
      <TrainingLanding bewertungen={bewertungen} />
    </FunnelHimmel>
  );
}
