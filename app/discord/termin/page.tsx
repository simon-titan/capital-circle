import type { Metadata } from "next";
import { Suspense } from "react";
import { DiscordTerminClient } from "@/components/landing/DiscordTerminClient";

export const metadata: Metadata = {
  title: "Dein kostenloser Discord-Zugang — Capital Circle",
  description:
    "Schau das Video vollständig an und sichere dir deinen kostenlosen Zugang zum Capital Circle Discord.",
  robots: { index: false, follow: false },
};

export default function DiscordTerminPage() {
  return (
    <Suspense fallback={null}>
      <DiscordTerminClient />
    </Suspense>
  );
}
