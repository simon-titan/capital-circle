import type { Metadata } from "next";
import { Box, Stack } from "@chakra-ui/react";
import { FreeLandingExperience } from "@/components/marketing/FreeLandingExperience";
import { FunnelFinePrint, rise } from "@/components/marketing/funnel-ui";
import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = {
  title: "Kostenlos bewerben · Capital Circle",
  description:
    "Bewirb dich für den kostenlosen 5-Tage-Onboarding-Kurs von Capital Circle. Lerne professionelles Trading von Profi-Trader Emre. Bewerbung in 3 Schritten.",
};

export default function FreePage() {
  return (
    <Box as="main" minH="100vh" w="full" py={{ base: 10, md: 16 }} px={{ base: 4, md: 8 }}>
      <Stack spacing={{ base: 10, md: 16 }} maxW="1000px" mx="auto">
        {/* Logo */}
        <Box maxW="180px" mx="auto" {...rise(0)}>
          <Logo variant="onDark" priority />
        </Box>

        {/* Hero + Video + Stats + CTAs + Modal */}
        <FreeLandingExperience />

        {/* Footer-Disclaimer */}
        <Stack spacing={2} textAlign="center" pb={4} pt={6} borderTop="1px solid var(--cc-line)">
          <FunnelFinePrint maxW="560px" mx="auto">
            Mit dem Abschicken der Bewerbung stimmst du unserer{" "}
            <Box
              as="a"
              href="/datenschutz"
              color="var(--cc-gold-light)"
              textDecoration="underline"
              textUnderlineOffset="2px"
            >
              Datenschutzerklärung
            </Box>{" "}
            zu.{" "}
            Trading und Investitionen sind mit erheblichen Verlustrisiken verbunden.
            Frühere Ergebnisse sind keine Garantie für zukünftige Gewinne.
          </FunnelFinePrint>
          <FunnelFinePrint className="cc-num">© {new Date().getFullYear()} Capital Circle Institut</FunnelFinePrint>
        </Stack>
      </Stack>
    </Box>
  );
}
