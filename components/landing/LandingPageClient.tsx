"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { Box } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { PlatformBackground } from "@/components/layout/PlatformBackground";
import { MobileCTAFooter } from "./MobileCTAFooter";
import { HeroSection } from "./HeroSection";
import { GoldGlowDivider } from "./GoldGlowDivider";
import { LandingChromeStyles, LandingFooter, LandingSplash } from "./landing-ui";

// Below-fold: lazy laden nach dem ersten Paint (Platzhalter transparent, der Himmel scheint durch)
const ReviewSection = dynamic(
  () => import("./ReviewSection").then((m) => ({ default: m.ReviewSection })),
  { loading: () => <Box h="400px" /> },
);
const CasesSection = dynamic(
  () => import("./CasesSection").then((m) => ({ default: m.CasesSection })),
  { loading: () => <Box h="400px" /> },
);
const FounderSection = dynamic(
  () => import("./FounderSection").then((m) => ({ default: m.FounderSection })),
  { loading: () => <Box h="500px" /> },
);
const StatsAndTargetSection = dynamic(
  () => import("./StatsAndTargetSection").then((m) => ({ default: m.StatsAndTargetSection })),
);
// Modal: nur laden wenn tatsächlich geöffnet
const FreeApplicationModal = dynamic(
  () => import("@/components/marketing/FreeApplicationModal").then((m) => ({ default: m.FreeApplicationModal })),
  { ssr: false },
);
const Step2ApplicationModal = dynamic(
  () => import("@/components/marketing/Step2ApplicationModal").then((m) => ({ default: m.Step2ApplicationModal })),
  { ssr: false },
);

interface CtaOverrides {
  primary?: string;
  secondary?: string;
  videoEndedLabel?: string;
  trustLine?: string | null;
  subheadline?: string;
}

interface LandingPageClientProps {
  /** Wenn gesetzt, wird anstelle des FreeApplicationModal das Step-2-Formular inline angezeigt. */
  step2Form?: ReactNode;
  /** Wenn true, Step2ApplicationModal statt Inline-Scroll / FreeApplicationModal verwenden. */
  useStep2Modal?: boolean;
  /** CTA-Text-Overrides (z.B. fuer /bewerbung ohne "kostenlos"). */
  ctaOverrides?: CtaOverrides;
  /**
   * Eigenes Hero-Video (z. B. Step-2 /bewerbung). Server-seitig aus
   * NEXT_PUBLIC_STEP2_BEWERBUNG_VIDEO_URL setzen; sonst FREE_FUNNEL-Video.
   */
  funnelVideoSrc?: string;
  /** Wenn gesetzt, lädt ReviewSection die Reviews per API statt aus der Config. */
  landingSlug?: string;
}

export function LandingPageClient({
  step2Form,
  useStep2Modal,
  ctaOverrides,
  funnelVideoSrc,
  landingSlug,
}: LandingPageClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const step2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const openModal = () => {
    if (useStep2Modal) {
      setIsModalOpen(true);
      return;
    }
    if (step2Form && step2Ref.current) {
      step2Ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setIsModalOpen(true);
  };
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      {/* Splash — fährt nach 300ms nach oben weg */}
      <LandingSplash loading={loading} />

      <LandingChromeStyles />

      <MobileCTAFooter onApply={openModal} ctaPrimary={ctaOverrides?.primary} trustLine={ctaOverrides?.trustLine} />

      {/* Graphitgrund mit Sternenfeld und Champagner-Licht (wie die Plattform) */}
      <PlatformBackground>
        <Box color="var(--cc-text)">
          <HeroSection
            onApply={openModal}
            ctaOverrides={ctaOverrides}
            funnelVideoSrc={funnelVideoSrc}
            landingSlug={landingSlug}
          />

          <GoldGlowDivider />
          {landingSlug === "bewerbung" ? <CasesSection /> : <ReviewSection landingSlug={landingSlug} />}
          <GoldGlowDivider />
          <FounderSection />
          <GoldGlowDivider />
          <StatsAndTargetSection onApply={openModal} />

          {step2Form && (
            <Box
              ref={step2Ref}
              id="step2-form"
              py={{ base: 14, md: 20 }}
              px={{ base: 4, md: 8, lg: 12 }}
              borderTop="1px solid var(--cc-line)"
            >
              {step2Form}
            </Box>
          )}

          <LandingFooter applicationNote />
        </Box>
      </PlatformBackground>

      {useStep2Modal && isModalOpen && (
        <Step2ApplicationModal isOpen={isModalOpen} onClose={closeModal} />
      )}
      {!useStep2Modal && !step2Form && isModalOpen && (
        <FreeApplicationModal isOpen={isModalOpen} onClose={closeModal} />
      )}
    </>
  );
}
