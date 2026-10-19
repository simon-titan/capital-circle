import type { Metadata } from "next";
import { CallFunnelClient } from "@/components/landing/call/CallFunnelClient";
import { VorschauStreifen } from "../VorschauStreifen";

export const metadata: Metadata = {
  title: "Vorschau Call-Funnel · Capital Circle",
  robots: { index: false, follow: false },
};

/**
 * `/call` zum Durchklicken: ohne Besuchs- und Video-Tracking, ohne Lead, ohne
 * Calendly (`vorschau` in `CallFunnelClient`). Steht unter `/vorschau/`, damit
 * die Seite auch im Wartungsmodus erreichbar ist.
 */
export default function CallVorschau() {
  return (
    <>
      <VorschauStreifen text="Vorschau: Das Formular schickt nichts ab, der Kalender ist ausgeblendet." />
      <CallFunnelClient vorschau />
    </>
  );
}
