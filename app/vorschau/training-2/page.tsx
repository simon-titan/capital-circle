import type { Metadata } from "next";
import { TrainingZertifikat } from "@/components/landing/training-2/TrainingZertifikat";
import { ZertifikatGrund } from "@/components/landing/training-2/ZertifikatGrund";
import { landing } from "@/config/training";
import { ladeBewertungsspiegel } from "@/lib/landing-reviews";

/**
 * `/vorschau/training-2` — Version 2 der Training-Landingpage („Das
 * Zertifikat", 06.11.2026). Nur Vorschau: nicht verlinkt, nicht indexiert.
 * Die Registrierung ist echt (dieselbe wie auf `/training`). Gefällt sie,
 * ersetzt sie `/training`. Öffentlich über `PUBLIC_PREFIXES` in `proxy.ts`.
 */
export const metadata: Metadata = {
  title: landing.meta.title,
  description: landing.meta.description,
  robots: { index: false, follow: false },
};

export default async function TrainingZertifikatVorschau() {
  const bewertungen = await ladeBewertungsspiegel(["global"]);
  return (
    <ZertifikatGrund>
      <TrainingZertifikat bewertungen={bewertungen} />
    </ZertifikatGrund>
  );
}
