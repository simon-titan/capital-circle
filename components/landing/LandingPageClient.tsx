"use client";

import dynamic from "next/dynamic";
import { Box, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { MobileCTAFooter } from "./MobileCTAFooter";
import { HeroSection } from "./HeroSection";
import { GoldGlowDivider } from "./GoldGlowDivider";

// Below-fold: lazy laden nach dem ersten Paint
const ReviewSection = dynamic(
  () => import("./ReviewSection").then((m) => ({ default: m.ReviewSection })),
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

export function LandingPageClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const openModal = () => setIsModalOpen(true);
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

      <MobileCTAFooter onApply={openModal} />

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
          <HeroSection onApply={openModal} />

          <GoldGlowDivider />
          <ReviewSection />
          <GoldGlowDivider />
          <FounderSection />
          <GoldGlowDivider />
          <StatsAndTargetSection onApply={openModal} />

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
                Mit dem Abschicken der Bewerbung stimmst du unserer{" "}
                <Box as="a" href="/datenschutz" color="rgba(212,175,55,0.55)" textDecoration="underline">
                  Datenschutzerklärung
                </Box>{" "}
                zu. Trading und Investitionen sind mit erheblichen Verlustrisiken verbunden.
                Frühere Ergebnisse sind keine Garantie für zukünftige Gewinne.
              </Text>
              <Text fontSize="xs" color="rgba(255,255,255,0.15)" className="inter">
                © {new Date().getFullYear()} Capital Circle Institut
              </Text>
            </Stack>
          </Box>
        </Box>
      </Box>

      {isModalOpen && (
        <FreeApplicationModal isOpen={isModalOpen} onClose={closeModal} />
      )}
    </>
  );
}
