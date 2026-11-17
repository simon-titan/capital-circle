import type { Metadata } from "next";
import { FunnelHimmel } from "@/components/landing/FunnelHimmel";
import { TrainingLanding } from "@/components/landing/training/TrainingLanding";
import { landing } from "@/config/training";
import { ladeFunnelVideos } from "@/lib/funnel-videos";

/**
 * `/training` — öffentliche Landingpage des kostenlosen Trainings
 * (`config/training.ts`). Statisch; die Registrierung läuft im Client über
 * `/api/training/registrieren`. Öffentlich über `PUBLIC_PATHS` in `proxy.ts`.
 *
 * Ist der Verkauf geschlossen (`/admin/verkauf`), sollte das Ziel der
 * Hinweisseite auf `/training` stehen.
 */
/**
 * Das Video wählt der Admin (`lib/funnel-videos.ts`). Die Seite bleibt statisch:
 * Speichern im Admin erzeugt sie per `revalidatePath` neu, `revalidate` ist das Netz.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: landing.meta.title,
  description: landing.meta.description,
};

export default async function TrainingPage() {
  const { videos } = await ladeFunnelVideos();
  // Seit 08.11.2026 ohne Sternezeile unter den Knöpfen (Emres Mockup) — der
  // Bewertungsspiegel wird hier deshalb nicht mehr geladen. Die Bewertungsliste
  // selbst holt `ReviewSection` im Client.
  return (
    <FunnelHimmel>
      <TrainingLanding video={videos.training} />
    </FunnelHimmel>
  );
}
