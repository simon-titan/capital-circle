"use client";

import { Box, Button, Flex, Heading, HStack, Stack, Text, useToast } from "@chakra-ui/react";
import { Check, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { preiskarten } from "@/config/landing-membership";
import type { MembershipPlan } from "@/lib/stripe/plan-map";

/** Alle Stufen, die ein Profil tragen kann — auch die nicht mehr verkäuflichen. */
type Tier = "free" | MembershipPlan | "lifetime" | "ht_1on1";

type PricingCardsProps = {
  isLoggedIn: boolean;
  membershipTier: Tier;
};

/**
 * Laufzeit-Auswahl für **eingeloggte** Nutzer (Upgrade aus `/billing`).
 *
 * Sie führt über den eingebetteten Checkout, nicht über `/go/<plan>`: Hier ist
 * bekannt, wer kauft, und ein Gast-Checkout würde den Nutzer zwingen, seine
 * Adresse erneut einzutippen — mit einem Tippfehler entstünde ein zweites
 * Konto. Auf der Landing ist es genau umgekehrt, dort gibt es noch kein Konto.
 *
 * Die Leistungen stehen bewusst **einmal** unter den Karten statt dreimal
 * darin: Die drei Laufzeiten unterscheiden sich ausschließlich im Preis, und
 * dieselbe Liste in drei Spalten lässt den einen Unterschied untergehen.
 */
const LEISTUNGEN = [
  "Institut: 10 Module, 114 Videos",
  "Live-Sessions vier Mal pro Woche",
  "Trading Journal mit Auswertung",
  "Wochenaufgaben und Fortschritt",
  "Discord-Community",
];

/**
 * Beschriftung und Zustand eines Knopfes. Zentral hier statt im JSX, damit
 * alle drei Karten dieselbe Logik nutzen.
 */
function knopfZustand(plan: MembershipPlan, tier: Tier): { label: string; disabled: boolean } {
  if (tier === "lifetime") return { label: "Du hast Lifetime ⚡", disabled: true };
  if (tier === "ht_1on1") return { label: "Du bist im 1:1-Mentoring", disabled: true };
  if (tier === plan) return { label: "Dein aktueller Plan", disabled: true };
  return { label: "Jetzt starten", disabled: false };
}

export function PricingCards({ isLoggedIn, membershipTier }: PricingCardsProps) {
  const router = useRouter();
  const toast = useToast();
  const [laufenderPlan, setLaufenderPlan] = useState<MembershipPlan | null>(null);

  async function planWaehlen(plan: MembershipPlan) {
    if (!isLoggedIn) {
      router.push(`/login?next=/billing&plan=${plan}`);
      return;
    }

    setLaufenderPlan(plan);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        clientSecret?: string;
        error?: string;
      };

      if (!res.ok || !json.ok || !json.clientSecret) {
        throw new Error(json.error ?? "checkout_failed");
      }

      // Das clientSecret wandert per Query an /checkout, das daraus den
      // eingebetteten Stripe-Checkout aufbaut.
      router.push(`/checkout?plan=${plan}&cs=${encodeURIComponent(json.clientSecret)}`);
    } catch (error) {
      const msg = error instanceof Error && error.message ? error.message : "Unbekannter Fehler";
      toast({
        title: "Checkout konnte nicht gestartet werden",
        description: msg,
        status: "error",
        duration: 6000,
        isClosable: true,
      });
      setLaufenderPlan(null);
    }
  }

  return (
    <Stack w="full" maxW="960px" mx="auto" spacing={8}>
      <Flex direction={{ base: "column", md: "row" }} gap={{ base: 8, md: 5 }} align="stretch" justify="center" pt={4}>
        {preiskarten.map((karte) => {
          const zustand = knopfZustand(karte.plan, membershipTier);
          return (
            <Box
              key={karte.plan}
              className={karte.beliebt ? "cc-card cc-card--hero" : "cc-card"}
              flex="1"
              minW={0}
              p={{ base: 6, md: 7 }}
            >
              {karte.beliebt ? (
                <HStack
                  position="absolute"
                  top="-13px"
                  left="50%"
                  transform="translateX(-50%)"
                  zIndex={2}
                  spacing={1.5}
                  h="26px"
                  px="12px"
                  borderRadius="full"
                  bg="var(--cc-gold)"
                  bgImage="var(--cc-gold-grad)"
                  color="var(--cc-on-gold)"
                  whiteSpace="nowrap"
                  fontSize="11px"
                  fontWeight={600}
                  letterSpacing="0.12em"
                  textTransform="uppercase"
                  boxShadow="0 6px 18px rgba(212, 176, 128, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.35)"
                >
                  <Sparkles size={12} strokeWidth={2} aria-hidden />
                  <Text as="span">Beliebteste Wahl</Text>
                </HStack>
              ) : null}

              <Stack spacing={6} h="full">
                <Stack spacing={3}>
                  <Heading
                    as="h3"
                    fontSize="13px"
                    lineHeight="18px"
                    fontWeight={500}
                    letterSpacing="0.12em"
                    textTransform="uppercase"
                    color={karte.beliebt ? "var(--cc-gold-light)" : "var(--cc-text-soft)"}
                  >
                    {karte.laufzeit}
                  </Heading>
                  <HStack align="baseline" spacing={2} flexWrap="wrap">
                    <Text
                      className="cc-num"
                      fontSize={{ base: "38px", md: "42px" }}
                      fontWeight={600}
                      lineHeight={1}
                      letterSpacing="-0.02em"
                      color="var(--cc-text)"
                    >
                      {karte.preis}
                    </Text>
                    <Text fontSize="14px" color="var(--cc-text-2)">
                      {karte.periode}
                    </Text>
                  </HStack>
                  <Text
                    className="cc-num"
                    fontSize="13px"
                    lineHeight="20px"
                    color={karte.beliebt ? "var(--cc-gold-light)" : "var(--cc-text-3)"}
                    fontWeight={karte.beliebt ? 600 : 400}
                  >
                    {karte.hinweis}
                  </Text>
                </Stack>

                <Box flex="1" />

                <Button
                  variant={karte.beliebt ? "gold" : "line"}
                  w="full"
                  h="48px"
                  fontSize="15px"
                  color={karte.beliebt ? undefined : "var(--cc-gold-light)"}
                  borderColor={karte.beliebt ? undefined : "rgba(232, 192, 148, 0.35)"}
                  onClick={() => void planWaehlen(karte.plan)}
                  isDisabled={zustand.disabled}
                  isLoading={laufenderPlan === karte.plan}
                  loadingText="Wird vorbereitet…"
                >
                  {zustand.label}
                </Button>
              </Stack>
            </Box>
          );
        })}
      </Flex>

      <Box className="cc-card cc-card--still" p={{ base: 5, md: 6 }}>
        <Heading
          as="h3"
          fontSize="13px"
          lineHeight="18px"
          fontWeight={500}
          letterSpacing="0.12em"
          textTransform="uppercase"
          color="var(--cc-text-soft)"
          mb={4}
        >
          In jeder Laufzeit enthalten
        </Heading>
        <Stack
          as="ul"
          listStyleType="none"
          spacing={3}
          sx={{ columnCount: { base: 1, md: 2 }, columnGap: "24px" }}
        >
          {LEISTUNGEN.map((leistung) => (
            <HStack as="li" key={leistung} spacing={3} align="flex-start" sx={{ breakInside: "avoid" }}>
              <Box
                mt="2px"
                w="18px"
                h="18px"
                flexShrink={0}
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
                color="var(--cc-gold-light)"
                bg="var(--cc-gold-wash)"
                border="1px solid rgba(232, 192, 148, 0.35)"
                aria-hidden
              >
                <Check size={11} strokeWidth={2.5} />
              </Box>
              <Text fontSize="15px" color="var(--cc-text-soft)" lineHeight={1.45}>
                {leistung}
              </Text>
            </HStack>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}
