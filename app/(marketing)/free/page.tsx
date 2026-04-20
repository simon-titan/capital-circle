import type { Metadata } from "next";
import { Box, Stack, Text } from "@chakra-ui/react";
import { FreeApplicationForm } from "@/components/marketing/FreeApplicationForm";
import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = {
  title: "Bewerbung — Capital Circle",
  description:
    "Bewirb dich für deinen Zugang zu Capital Circle. Wir nehmen pro Periode nur eine begrenzte Anzahl neuer Trader:innen auf.",
};

export default function FreePage() {
  return (
    <Box as="main" minH="100vh" w="full" py={{ base: 8, md: 14 }} px={{ base: 4, md: 8 }}>
      <Stack spacing={{ base: 8, md: 10 }}>
        <Box maxW="200px" mx="auto">
          <Logo variant="onDark" priority />
        </Box>

        <Stack spacing={3} maxW="640px" mx="auto" textAlign="center">
          <Text
            fontSize="xs"
            letterSpacing="0.22em"
            textTransform="uppercase"
            color="var(--color-accent-gold)"
            className="inter-semibold"
          >
            Capital Circle Institut
          </Text>
          <Text
            as="h1"
            className="radley-regular"
            fontWeight={400}
            fontSize={{ base: "3xl", md: "5xl" }}
            lineHeight="1.1"
            color="var(--color-text-primary)"
          >
            Trete dem inneren Zirkel bei.
          </Text>
          <Text
            fontSize={{ base: "md", md: "lg" }}
            color="rgba(255,255,255,0.62)"
            className="inter"
          >
            Lerne unseren Ansatz in einem 5-Tage-Onboarding-Kurs kennen — kostenlos. Bewerbung in zwei kurzen Schritten.
          </Text>
        </Stack>

        <FreeApplicationForm />

        <Text
          fontSize="xs"
          color="rgba(255,255,255,0.32)"
          textAlign="center"
          className="inter"
          maxW="520px"
          mx="auto"
        >
          Mit dem Abschicken stimmst du unserer{" "}
          <Box as="a" href="/datenschutz" color="var(--color-accent-gold)" textDecoration="underline">
            Datenschutzerklärung
          </Box>{" "}
          zu. Trading birgt Verlustrisiken — Ergebnisse aus der Vergangenheit sind keine Garantie.
        </Text>
      </Stack>
    </Box>
  );
}
