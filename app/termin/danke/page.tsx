import type { Metadata } from "next";
import { Suspense } from "react";
import { DiscordDankeClient } from "@/components/landing/DiscordDankeClient";

export const metadata: Metadata = {
  title: "Dein Termin — Capital Circle",
  description: "Buche jetzt deinen persönlichen Gesprächstermin mit Capital Circle.",
  robots: { index: false, follow: false },
};

export default function TerminDankePage() {
  return (
    <Suspense fallback={null}>
      <DiscordDankeClient />
    </Suspense>
  );
}
