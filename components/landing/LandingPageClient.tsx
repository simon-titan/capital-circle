"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { Box, Stack, Text } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { MobileCTAFooter } from "./MobileCTAFooter";
import { HeroSection } from "./HeroSection";
import { GoldGlowDivider } from "./GoldGlowDivider";

// Below-fold: lazy laden nach dem ersten Paint
const ReviewSection = dynamic(
  () => import("./ReviewSection").then((m) => ({ default: m.ReviewSection })),
  { loading: () => <Box h="400px" bg="var(--color-bg-primary, #07080A)" /> },
);
const CasesSection = dynamic(
  () => import("./CasesSection").then((m) => ({ default: m.CasesSection })),
  { loading: () => <Box h="400px" bg="var(--color-bg-primary, #07080A)" /> },
);
const FounderSection = dynamic(
  () => import("./FounderSection").then((m) => ({ default: m.FounderSection })),
  { loading: () => <Box h="500px" bg="var(--color-bg-secondary, #0C0D10)" /> },
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
      {/* Splash overlay — slides up after 300ms */}
      <Box
        position="fixed"
        inset={0}
        zIndex={9999}
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        gap={5}
        bg="#07080A"
        pointerEvents={loading ? "auto" : "none"}
        sx={{
          transition: "transform 450ms cubic-bezier(0.4, 0, 0.2, 1), opacity 350ms ease",
          transform: loading ? "translateY(0)" : "translateY(-100%)",
          opacity: loading ? 1 : 0,
        }}
      >
        <Logo variant="onDark" width={200} height={56} priority />
        {/* Progress bar */}
        <Box w="120px" h="3px" borderRadius="full" bg="rgba(255,255,255,0.06)" overflow="hidden">
          <Box
            h="full"
            borderRadius="full"
            sx={{
              background: "linear-gradient(90deg, #A67C00, #D4AF37, #E8C547)",
              animation: "splashProgress 300ms linear forwards",
              "@keyframes splashProgress": {
                "0%": { width: "0%" },
                "100%": { width: "100%" },
              },
            }}
          />
        </Box>
      </Box>

      <style>{`
        nav[aria-label], header[role="banner"], [data-platform-nav], [data-topbar] {
          display: none !important;
        }
        body {
          padding-top: 0 !important;
          margin-top: 0 !important;
          padding-bottom: 120px;
        }
        @media (min-width: 768px) {
          body { padding-bottom: 0; }
        }
      `}</style>

      <MobileCTAFooter onApply={openModal} ctaPrimary={ctaOverrides?.primary} trustLine={ctaOverrides?.trustLine} />

      <Box
        minH="100vh"
        w="full"
        bg="var(--color-bg-primary, #07080A)"
        color="var(--color-text-primary, #F0F0F2)"
        position="relative"
        overflowX="hidden"
        _before={{
          content: '""',
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 80% -10%, rgba(212,175,55,0.12), transparent 60%), radial-gradient(ellipse 60% 50% at 10% 100%, rgba(212,175,55,0.06), transparent 65%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <Box position="relative" zIndex={1}>
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
              bg="var(--color-bg-secondary, #0C0D10)"
            >
              {step2Form}
            </Box>
          )}

          <Box
            py={10}
            px={{ base: 4, md: 8 }}
            textAlign="center"
            borderTop="1px solid rgba(255,255,255,0.05)"
          >
            <Stack spacing={2}>
              <Text
                fontSize="xs"
                color="rgba(255,255,255,0.22)"
                className="inter"
                maxW="560px"
                mx="auto"
                lineHeight="1.7"
              >
                Mit dem Abschicken der Bewerbung stimmst du unserer Datenschutzerklärung zu. Trading
                und Investitionen sind mit erheblichen Verlustrisiken verbunden.
                Frühere Ergebnisse sind keine Garantie für zukünftige Gewinne.
              </Text>
              <Text fontSize="xs" color="rgba(255,255,255,0.15)" className="inter">
                © {new Date().getFullYear()} Capital Circle Institut
              </Text>
            </Stack>
          </Box>
        </Box>
      </Box>

      {useStep2Modal && isModalOpen && (
        <Step2ApplicationModal isOpen={isModalOpen} onClose={closeModal} />
      )}
      {!useStep2Modal && !step2Form && isModalOpen && (
        <FreeApplicationModal isOpen={isModalOpen} onClose={closeModal} />
      )}
    </>
  );
}
