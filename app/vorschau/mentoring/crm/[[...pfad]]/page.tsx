import { notFound } from "next/navigation";
import { CrmVorschau } from "../CrmVorschau";

export const dynamic = "force-dynamic";

/**
 * `/vorschau/mentoring/crm/…` — das CRM mit Beispieldaten, **nur lokal**
 * (`next dev`). Zum Gestalten und für Bildschirmfotos ohne echte Kontakte; in
 * Produktion 404. Schreibende Aktionen antworten mit „ok", ohne etwas zu ändern.
 */
export default async function Seite({ params }: { params: Promise<{ pfad?: string[] }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { pfad = [] } = await params;
  return <CrmVorschau pfad={pfad} />;
}
