import type { Metadata } from "next";
import { Box, Stack, Text } from "@chakra-ui/react";
import { Logo } from "@/components/brand/Logo";
import { PricingCards } from "@/components/marketing/PricingCards";
import { PricingVideo } from "@/components/marketing/PricingVideo";
import { CalendlyCallout } from "@/components/marketing/CalendlyCallout";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Preise — Capital Circle",
  description:
    "Wähle dein Capital-Circle-Modell: Monatlich, Lifetime oder 1:1-Strategiegespräch mit Emre. Jederzeit kündbar.",
};

// Auf Server-Seite den aktuellen Membership-Tier ermitteln, damit die Buttons
// gleich beim ersten Render korrekt deaktiviert / beschriftet sind.
async function loadViewerTier() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return { isLoggedIn: false, membershipTier: null as null | string };

  const { data: profile } = await supabase
    .from("profiles")
    .select("membership_tier")
    .eq("id", user.id)
    .single();

  const tier = (profile as { membership_tier?: string | null } | null)?.membership_tier ?? "free";
  return { isLoggedIn: true, membershipTier: tier };
}

export default async function PricingPage() {
  const { isLoggedIn, membershipTier } = await loadViewerTier();

  return (
    <Box
      as="main"
      minH="100vh"
      w="full"
      py={{ base: 8, md: 14 }}
      px={{ base: 4, md: 8 }}
    >
      <Stack spacing={{ base: 8, md: 12 }} maxW="1100px" mx="auto">
        <Box maxW="200px" mx="auto">
          <Logo variant="onDark" priority />
        </Box>

        <Stack spacing={4} maxW="720px" mx="auto" textAlign="center">
          <Text
            fontSize="xs"
            letterSpacing="0.22em"
            textTransform="uppercase"
            color="var(--color-accent-gold)"
            className="inter-semibold"
          >
            Capital Circle Membership
          </Text>
          <Text
            as="h1"
            className="radley-regular"
            fontWeight={400}
            fontSize={{ base: "3xl", md: "5xl" }}
            lineHeight="1.1"
            color="var(--color-text-primary)"
          >
            Die Investition in dein Trading
          </Text>
          <Text
            fontSize={{ base: "md", md: "lg" }}
            color="rgba(255,255,255,0.62)"
            className="inter"
          >
            Wähle das Modell, das zu deinem Weg passt — flexibel monatlich, dauerhaft als Lifetime oder ein persönliches 1:1-Mentoring mit Emre.
          </Text>
        </Stack>

        <PricingVideo />

        <PricingCards
          isLoggedIn={isLoggedIn}
          membershipTier={(membershipTier ?? "free") as "free" | "monthly" | "lifetime" | "ht_1on1"}
        />

        <CalendlyCallout />

        <Text
          fontSize="xs"
          color="rgba(255,255,255,0.32)"
          textAlign="center"
          className="inter"
          maxW="640px"
          mx="auto"
        >
          Alle Preise inkl. gesetzl. MwSt. Trading birgt Verlustrisiken — Ergebnisse aus der Vergangenheit sind keine Garantie. Kündigung jederzeit zum Ende der Abrechnungsperiode.
        </Text>
      </Stack>
    </Box>
  );
}
