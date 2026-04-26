import type { Metadata } from "next";
import { LandingPageClient } from "@/components/landing/LandingPageClient";

export const metadata: Metadata = {
  title: "Erweiterte Bewerbung — Capital Circle Institut",
  description:
    "Fülle die erweiterte Bewerbung aus und sichere dir Zugang zu Premium-Inhalten bei Capital Circle.",
};

/**
 * /bewerbung — Protected Route für approved Free-Nutzer.
 * Zeigt die Marketing-Landing mit dem Step-2-Modal (11 Fragen).
 * Zugangsschutz erfolgt über proxy.ts.
 */
export default function BewerbungPage() {
  const step2FunnelVideo = process.env.NEXT_PUBLIC_STEP2_BEWERBUNG_VIDEO_URL?.trim() || undefined;

  return (
    <LandingPageClient
      useStep2Modal
      funnelVideoSrc={step2FunnelVideo}
      landingSlug="bewerbung"
      ctaOverrides={{
        primary: "Ergreife deine Chance!",
        secondary: "Bist du dir sicher dass du dir diese Möglichkeit verdient hast?",
        videoEndedLabel: "Ergreife deine Chance!",
        trustLine: null,
        subheadline:
          "Bewirb dich für einen der {exklusiven} Plätze bei {Capital Circle} nur ausgewählte {Trader} werden aufgenommen.",
      }}
    />
  );
}
