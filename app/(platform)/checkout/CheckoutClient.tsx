"use client";

import { Box, Button, Center, Spinner, Stack, Text } from "@chakra-ui/react";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getStripePromise } from "@/lib/stripe/client";

type Plan = "monthly" | "lifetime";

const stripePromise = getStripePromise();

/**
 * Embedded-Stripe-Checkout-Wrapper.
 *
 * Erwartet entweder:
 *   - `?cs=<clientSecret>` (vom /pricing-Flow) → direktes Mounten
 *   - `?plan=monthly|lifetime` → ruft selbst /api/stripe/create-checkout-session
 *     auf, um ein clientSecret zu erhalten (z. B. wenn der User direkt
 *     /checkout?plan=lifetime aufruft).
 *
 * Ohne beides → Redirect auf /pricing.
 */
export function CheckoutClient() {
  const params = useSearchParams();
  const router = useRouter();

  const queryClientSecret = params.get("cs");
  const queryPlan = params.get("plan") as Plan | null;

  const [clientSecret, setClientSecret] = useState<string | null>(queryClientSecret);
  const [loading, setLoading] = useState<boolean>(!queryClientSecret && Boolean(queryPlan));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Kein Plan, kein clientSecret → User hat versehentlich /checkout aufgerufen
    if (!queryClientSecret && !queryPlan) {
      router.replace("/pricing");
      return;
    }

    // clientSecret bereits vorhanden → nichts mehr zu tun
    if (queryClientSecret) {
      setClientSecret(queryClientSecret);
      setLoading(false);
      return;
    }

    // Sonst: Session frisch erzeugen
    if (queryPlan !== "monthly" && queryPlan !== "lifetime") {
      router.replace("/pricing");
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/stripe/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: queryPlan }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          clientSecret?: string;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !json.ok || !json.clientSecret) {
          throw new Error(json.error ?? "checkout_failed");
        }
        setClientSecret(json.clientSecret);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryClientSecret, queryPlan, router]);

  const options = useMemo(
    () => (clientSecret ? { clientSecret } : undefined),
    [clientSecret],
  );

  return (
    <Box maxW="720px" mx="auto" mt={{ base: 6, md: 12 }} mb={12}>
      <Box
        p={{ base: 6, md: 8 }}
        sx={{
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: "24px",
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.07)",
        }}
      >
        <Stack spacing={5}>
          <Stack spacing={1}>
            <Text
              fontSize="xs"
              letterSpacing="0.22em"
              textTransform="uppercase"
              color="var(--color-accent-gold)"
              className="inter-semibold"
            >
              Bezahlung
            </Text>
            <Text
              as="h1"
              className="radley-regular"
              fontWeight={400}
              fontSize={{ base: "2xl", md: "3xl" }}
              lineHeight="1.2"
              color="var(--color-text-primary)"
            >
              Sichere Zahlung über Stripe
            </Text>
            <Text className="inter" fontSize="sm" color="rgba(255,255,255,0.55)">
              Du bleibst während der gesamten Bezahlung auf Capital Circle. Daten werden verschlüsselt direkt an Stripe übertragen.
            </Text>
          </Stack>

          {loading ? (
            <Center py={16}>
              <Stack spacing={4} align="center">
                <Spinner size="lg" color="var(--color-accent-gold)" thickness="3px" />
                <Text className="inter" fontSize="sm" color="rgba(255,255,255,0.55)">
                  Checkout wird vorbereitet…
                </Text>
              </Stack>
            </Center>
          ) : error ? (
            <Stack spacing={4} py={6}>
              <Text className="inter" fontSize="md" color="#FCA5A5">
                Checkout konnte nicht geladen werden ({error}).
              </Text>
              <Button
                onClick={() => router.replace("/pricing")}
                variant="unstyled"
                w="fit-content"
                px={5}
                minH="44px"
                borderRadius="10px"
                borderWidth="1px"
                borderColor="rgba(212,175,55,0.40)"
                color="var(--color-accent-gold)"
                className="inter-semibold"
                _hover={{ bg: "rgba(212,175,55,0.10)" }}
              >
                Zurück zu den Preisen
              </Button>
            </Stack>
          ) : options ? (
            <Box
              borderRadius="14px"
              overflow="hidden"
              sx={{ background: "transparent" }}
            >
              <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </Box>
          ) : null}
        </Stack>
      </Box>
    </Box>
  );
}
