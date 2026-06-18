import type { Metadata } from "next";
import { Suspense } from "react";
import { DiscordLandingClient } from "@/components/landing/DiscordLandingClient";

export const metadata: Metadata = {
  title: "Discord Funnel — Capital Circle",
  description:
    "Lerne kostenlos die Strategie, mit der meine Schüler innerhalb weniger Wochen ihre ersten Payouts erzielen. Sichere dir jetzt deinen Zugang zu unserem Discord.",
};

export default function DiscordPage() {
  return (
    <Suspense fallback={null}>
      <DiscordLandingClient />
    </Suspense>
  );
}
