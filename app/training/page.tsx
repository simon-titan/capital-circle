import type { Metadata } from "next";
import { TrainingLanding } from "@/components/landing/training/TrainingLanding";
import { landing } from "@/config/training";

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

export default function TrainingPage() {
  return <TrainingLanding />;
}
