"use client";

import { Box, Button, Center, Spinner, Stack, Text } from "@chakra-ui/react";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/journal/PageHeader";
import { Meta } from "@/components/platform/dashboard/primitives";
import { getStripePromise } from "@/lib/stripe/client";
import { isMembershipPlan, type MembershipPlan } from "@/lib/stripe/plan-map";

const stripePromise = getStripePromise();

/**
 * Embedded-Stripe-Checkout-Wrapper für **eingeloggte** Nutzer.
 *
 * Erwartet entweder:
 *   - `?cs=<clientSecret>` (aus dem Upgrade-Block in `/billing`) → direktes Mounten
 *   - `?plan=monthly|quarterly|yearly` → ruft selbst
 *     /api/stripe/create-checkout-session auf, um ein clientSecret zu erhalten.
 *
 * Ohne beides → zurück auf `/billing`. Dort stehen die Laufzeiten, seit
 * `/pricing` entfallen ist; der Gast-Weg läuft stattdessen über `/go/<plan>`.
 */
export function CheckoutClient() {
  const params = useSearchParams();
  const router = useRouter();

  const queryClientSecret = params.get("cs");
  const queryPlan = params.get("plan") as MembershipPlan | null;

  const [clientSecret, setClientSecret] = useState<string | null>(queryClientSecret);
  const [loading, setLoading] = useState<boolean>(!queryClientSecret && Boolean(queryPlan));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Kein Plan, kein clientSecret → User hat versehentlich /checkout aufgerufen
    if (!queryClientSecret && !queryPlan) {
      router.replace("/billing");
      return;
    }

    // clientSecret bereits vorhanden → nichts mehr zu tun
    if (queryClientSecret) {
      setClientSecret(queryClientSecret);
      setLoading(false);
      return;
    }

    // Sonst: Session frisch erzeugen
    if (!queryPlan || !isMembershipPlan(queryPlan)) {
      router.replace("/billing");
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
    <Box maxW="720px" mx="auto" w="full" mb={12}>
      <PageHeader
        title="Sichere Zahlung über Stripe"
        subtitle="Du bleibst während der gesamten Bezahlung auf Capital Circle. Daten werden verschlüsselt direkt an Stripe übertragen."
      />

      <Box
        as="section"
        aria-labelledby="checkout-label"
        className="cc-card cc-card--still cc-rise"
        style={{ animationDelay: "80ms" }}
        p={{ base: 4, md: 6 }}
      >
        <Text
          as="h2"
          id="checkout-label"
          fontSize="13px"
          lineHeight="18px"
          fontWeight={500}
          letterSpacing="0.12em"
          textTransform="uppercase"
          color="var(--cc-text-soft)"
          mb={4}
        >
          Bezahlung
        </Text>

        {loading ? (
          <Center py={16}>
            <Stack spacing={4} align="center">
              <Spinner size="lg" color="var(--cc-gold)" emptyColor="var(--cc-track)" thickness="3px" />
              <Meta role="status">Checkout wird vorbereitet…</Meta>
            </Stack>
          </Center>
        ) : error ? (
          <Stack spacing={4} py={4} align="flex-start">
            <Text fontSize="15px" lineHeight={1.6} color="var(--cc-danger)" role="alert">
              Checkout konnte nicht geladen werden ({error}).
            </Text>
            <Button variant="line" onClick={() => router.replace("/billing")}>
              Zurück zur Mitgliedschaft
            </Button>
          </Stack>
        ) : options ? (
          <Box borderRadius="10px" overflow="hidden">
            <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
