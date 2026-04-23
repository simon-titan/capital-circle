import type { Metadata } from "next";
import { Box, Stack, Text } from "@chakra-ui/react";
import { FreeLandingExperience } from "@/components/marketing/FreeLandingExperience";
import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = {
  title: "Kostenlos bewerben — Capital Circle",
  description:
    "Bewirb dich für den kostenlosen 5-Tage-Onboarding-Kurs von Capital Circle. Lerne professionelles Trading von Profi-Trader Emre. Bewerbung in 3 Schritten.",
};

export default function FreePage() {
  return (
    <Box
      as="main"
      minH="100vh"
      w="full"
      py={{ base: 8, md: 14 }}
      px={{ base: 4, md: 8 }}
    >
      <Stack spacing={{ base: 10, md: 16 }} maxW="1000px" mx="auto">
        {/* Logo */}
        <Box maxW="180px" mx="auto">
          <Logo variant="onDark" priority />
        </Box>

        {/* Hero + Video + Stats + CTAs + Modal */}
        <FreeLandingExperience />

        {/* Footer-Disclaimer */}
        <Stack spacing={2} textAlign="center" pb={4}>
          <Text
            fontSize="xs"
            color="rgba(255,255,255,0.22)"
            className="inter"
            maxW="560px"
            mx="auto"
            lineHeight="1.7"
          >
            Mit dem Abschicken der Bewerbung stimmst du unserer{" "}
            <Box
              as="a"
              href="/datenschutz"
              color="rgba(212,175,55,0.6)"
              textDecoration="underline"
            >
              Datenschutzerklärung
            </Box>{" "}
            zu.{" "}
            Trading und Investitionen sind mit erheblichen Verlustrisiken verbunden.
            Frühere Ergebnisse sind keine Garantie für zukünftige Gewinne.
          </Text>
          <Text
            fontSize="xs"
            color="rgba(255,255,255,0.15)"
            className="inter"
          >
            © {new Date().getFullYear()} Capital Circle Institut
          </Text>
        </Stack>
      </Stack>
    </Box>
  );
}
