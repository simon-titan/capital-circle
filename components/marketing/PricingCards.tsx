"use client";

import {
  Box,
  Button,
  Flex,
  HStack,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Tier = "free" | "monthly" | "lifetime" | "ht_1on1";
type Plan = "monthly" | "lifetime";

type PricingCardsProps = {
  isLoggedIn: boolean;
  membershipTier: Tier;
};

const monthlyFeatures = [
  "Täglicher Market-Bias",
  "Live-Sessions 3× pro Woche",
  "Kompletter Kursbereich",
  "Private Community",
  "Tradingplan-Vorlagen",
];

const lifetimeFeatures = [
  ...monthlyFeatures,
  "Lebenslanger Zugang",
  "Alle zukünftigen Updates",
  "Priority Support",
];

/**
 * Liefert Beschriftung & Disabled-State für einen Plan-Button basierend auf
 * dem aktuellen Membership-Tier des Users. Zentral hier statt in JSX,
 * damit beide Cards die gleiche Logik nutzen.
 */
function buttonStateFor(plan: Plan, tier: Tier): { label: string; disabled: boolean } {
  if (tier === "lifetime") {
    return { label: "Du hast Lifetime ⚡", disabled: true };
  }
  if (tier === "ht_1on1") {
    return { label: "Du bist im 1:1-Mentoring", disabled: true };
  }
  if (plan === "monthly" && tier === "monthly") {
    return { label: "Dein aktueller Plan", disabled: true };
  }
  if (plan === "monthly") return { label: "Jetzt starten", disabled: false };
  return { label: "Lifetime sichern", disabled: false };
}

export function PricingCards({ isLoggedIn, membershipTier }: PricingCardsProps) {
  const router = useRouter();
  const toast = useToast();
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);

  const monthlyState = buttonStateFor("monthly", membershipTier);
  const lifetimeState = buttonStateFor("lifetime", membershipTier);

  async function handleSelectPlan(plan: Plan) {
    if (!isLoggedIn) {
      router.push(`/login?next=/pricing&plan=${plan}`);
      return;
    }

    setLoadingPlan(plan);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        clientSecret?: string;
        sessionId?: string;
        error?: string;
      };

      if (!res.ok || !json.ok || !json.clientSecret) {
        throw new Error(json.error ?? "checkout_failed");
      }

      // Wir übergeben das clientSecret per Query-Param an /checkout.
      // /checkout instantiiert dann den Embedded-Stripe-Checkout damit.
      const cs = encodeURIComponent(json.clientSecret);
      router.push(`/checkout?plan=${plan}&cs=${cs}`);
    } catch (error) {
      const msg =
        error instanceof Error && error.message ? error.message : "Unbekannter Fehler";
      toast({
        title: "Checkout konnte nicht gestartet werden",
        description: msg,
        status: "error",
        duration: 6000,
        isClosable: true,
      });
      setLoadingPlan(null);
    }
  }

  return (
    <Box w="full" maxW="900px" mx="auto">
      <Flex
        direction={{ base: "column-reverse", md: "row" }}
        gap={{ base: 6, md: 8 }}
        align={{ base: "stretch", md: "stretch" }}
        justify="center"
        position="relative"
      >
        {/* Monthly */}
        <PricingCardShell variant="ghost" w={{ base: "full", md: "360px" }}>
          <PricingCardContent
            label="Monatlich"
            priceMain="97 €"
            priceSuffix="/ Monat"
            savingsLine={null}
            features={monthlyFeatures}
          >
            <Button
              variant="unstyled"
              w="full"
              minH="48px"
              borderRadius="10px"
              borderWidth="1px"
              borderStyle="solid"
              borderColor="rgba(212,175,55,0.40)"
              color={monthlyState.disabled ? "rgba(255,255,255,0.45)" : "var(--color-accent-gold)"}
              bg="transparent"
              fontWeight={600}
              fontSize="15px"
              className="inter-semibold"
              transition="all 150ms cubic-bezier(0.16, 1, 0.3, 1)"
              _hover={
                monthlyState.disabled
                  ? undefined
                  : {
                      bg: "rgba(212,175,55,0.10)",
                      borderColor: "rgba(212,175,55,0.65)",
                      transform: "translateY(-1px)",
                    }
              }
              _active={{ transform: "translateY(0)" }}
              onClick={() => handleSelectPlan("monthly")}
              isDisabled={monthlyState.disabled}
              isLoading={loadingPlan === "monthly"}
              loadingText="Wird vorbereitet…"
              opacity={monthlyState.disabled ? 0.55 : 1}
              cursor={monthlyState.disabled ? "not-allowed" : "pointer"}
            >
              {monthlyState.label}
            </Button>
          </PricingCardContent>
        </PricingCardShell>

        {/* Lifetime — hervorgehoben */}
        <PricingCardShell variant="featured" w={{ base: "full", md: "360px" }}>
          <PricingCardContent
            label="Lifetime"
            priceMain="699 €"
            priceSuffix="einmalig"
            savingsLine="Spare 465 € im 1. Jahr"
            features={lifetimeFeatures}
          >
            <Button
              variant="unstyled"
              w="full"
              minH="48px"
              borderRadius="10px"
              border="none"
              fontWeight={600}
              fontSize="15px"
              color="#FFFFFF"
              className="inter-semibold"
              bg="linear-gradient(135deg, #D4AF37 0%, #A67C00 100%)"
              boxShadow="0 0 20px rgba(212,175,55,0.20), inset 0 1px 0 rgba(255,255,255,0.12)"
              transition="all 150ms cubic-bezier(0.16, 1, 0.3, 1)"
              _hover={
                lifetimeState.disabled
                  ? undefined
                  : {
                      bg: "linear-gradient(135deg, #E8C547 0%, #D4AF37 100%)",
                      boxShadow:
                        "0 0 32px rgba(212,175,55,0.35), inset 0 1px 0 rgba(255,255,255,0.16)",
                      transform: "translateY(-1px)",
                    }
              }
              _active={{ transform: "translateY(0)" }}
              onClick={() => handleSelectPlan("lifetime")}
              isDisabled={lifetimeState.disabled}
              isLoading={loadingPlan === "lifetime"}
              loadingText="Wird vorbereitet…"
              opacity={lifetimeState.disabled ? 0.55 : 1}
              cursor={lifetimeState.disabled ? "not-allowed" : "pointer"}
            >
              {lifetimeState.label}
            </Button>
          </PricingCardContent>
        </PricingCardShell>
      </Flex>
    </Box>
  );
}

/**
 * Optisches Gerüst für eine Pricing-Card. Variant `featured` setzt den Gold-
 * Glow + Badge + leichten Scale-Effekt (nur Desktop). Variant `ghost` ist die
 * monochrome Glassmorphism-Variante.
 */
function PricingCardShell({
  variant,
  children,
  ...rest
}: {
  variant: "ghost" | "featured";
  children: React.ReactNode;
} & React.ComponentProps<typeof Box>) {
  const isFeatured = variant === "featured";
  return (
    <Box
      position="relative"
      borderRadius="16px"
      p={{ base: 7, md: 8 }}
      sx={{
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: isFeatured
          ? "2px solid rgba(212, 175, 55, 0.40)"
          : "1px solid rgba(255, 255, 255, 0.09)",
        boxShadow: isFeatured
          ? "0 0 60px rgba(212, 175, 55, 0.20), 0 8px 32px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.07)"
          : "0 8px 32px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.05)",
        transform: isFeatured ? { base: "none", md: "scale(1.05)" } : undefined,
        transition: "transform 220ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 220ms ease",
      }}
      {...rest}
    >
      {isFeatured ? (
        <Box
          position="absolute"
          top="-16px"
          left="50%"
          transform="translateX(-50%)"
          px="14px"
          py="4px"
          borderRadius="9999px"
          color="#07080A"
          whiteSpace="nowrap"
          sx={{
            background: "linear-gradient(135deg, #D4AF37 0%, #A67C00 100%)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            boxShadow: "0 4px 14px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.32)",
          }}
        >
          ⭐ Beliebteste Wahl
        </Box>
      ) : null}
      {children}
    </Box>
  );
}

function PricingCardContent({
  label,
  priceMain,
  priceSuffix,
  savingsLine,
  features,
  children,
}: {
  label: string;
  priceMain: string;
  priceSuffix: string;
  savingsLine: string | null;
  features: string[];
  children: React.ReactNode;
}) {
  return (
    <Stack spacing={6} h="full">
      <Stack spacing={2}>
        <Text
          className="inter-semibold"
          fontSize="xs"
          letterSpacing="0.22em"
          textTransform="uppercase"
          color="rgba(255,255,255,0.55)"
        >
          {label}
        </Text>
        <HStack align="baseline" spacing={2}>
          <Text
            sx={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "36px",
              fontWeight: 700,
              lineHeight: 1,
              color: "var(--color-text-primary)",
            }}
          >
            {priceMain}
          </Text>
          <Text className="inter" fontSize="14px" color="rgba(255,255,255,0.55)">
            {priceSuffix}
          </Text>
        </HStack>
        {savingsLine ? (
          <Text
            className="inter-semibold"
            fontSize="14px"
            color="var(--color-accent-gold-light)"
          >
            {savingsLine}
          </Text>
        ) : (
          // Platzhalter, damit beide Cards die gleiche vertikale Höhe haben
          <Box h="20px" />
        )}
      </Stack>

      <Stack spacing={3} flex={1}>
        {features.map((feature) => (
          <HStack key={feature} spacing={3} align="flex-start">
            <Box pt="2px" color="var(--color-accent-gold)" flexShrink={0}>
              <CheckCircle2 size={16} strokeWidth={2} />
            </Box>
            <Text className="inter" fontSize="15px" color="#E8E8EA" lineHeight="1.45">
              {feature}
            </Text>
          </HStack>
        ))}
      </Stack>

      {children}
    </Stack>
  );
}
