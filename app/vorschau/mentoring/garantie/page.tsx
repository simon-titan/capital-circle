import type { Metadata } from "next";
import GarantiePage from "@/app/garantie/page";
import { VorschauStreifen } from "../VorschauStreifen";

export const metadata: Metadata = {
  title: "Vorschau Garantie · Capital Circle",
  robots: { index: false, follow: false },
};

/**
 * Der Garantie-Entwurf unter `/vorschau/`, damit er auch im Wartungsmodus
 * erreichbar ist. Rendert dieselbe Seite wie `/garantie?vorschau=1`.
 */
export default function GarantieVorschau() {
  return (
    <>
      <VorschauStreifen text="Entwurf der Garantiebedingungen, noch nicht freigegeben" />
      <GarantiePage searchParams={Promise.resolve({ vorschau: "1" })} />
    </>
  );
}
