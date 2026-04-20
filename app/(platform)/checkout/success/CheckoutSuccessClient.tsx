"use client";

import { Box, Button, Center, Spinner, Stack, Text } from "@chakra-ui/react";
import { CheckCircle2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 10; // ~20s

type Phase = "polling" | "ready" | "timeout";

/**
 * Success-Seite nach Stripe-Checkout.
 *
 * Stripe ruft uns mit `?session_id=cs_test_…` zurück. Der Webhook
 * (subscription.created bzw. checkout.session.completed) sollte parallel
 * laufen und `profiles.membership_tier` setzen — wir pollen bis das passiert
 * ist und leiten dann auf /dashboard weiter.
 *
 * Polling läuft direkt gegen Supabase (RLS lässt User die eigene Row lesen),
 * keine zusätzliche Server-Route nötig.
 */
export function CheckoutSuccessClient() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get("session_id");

  const [phase, setPhase] = useState<Phase>("polling");
  const attemptsRef = useRef(0);
  const supabaseRef = useRef(createClient());

  const checkStatus = useCallback(async () => {
    const supabase = supabaseRef.current;
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) {
      router.replace("/login");
      return true;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("membership_tier,is_paid")
      .eq("id", user.id)
      .single();

    const tier = (profile as { membership_tier?: string | null } | null)?.membership_tier;
    const isPaid = (profile as { is_paid?: boolean } | null)?.is_paid;

    if ((tier && tier !== "free") || isPaid === true) {
      setPhase("ready");
      // Kurze Verzögerung, damit der User die Erfolgsmeldung sieht.
      setTimeout(() => router.push("/dashboard"), 800);
      return true;
    }
    return false;
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (cancelled) return;
      attemptsRef.current += 1;
      const done = await checkStatus();
      if (cancelled || done) return;
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setPhase("timeout");
        return;
      }
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [checkStatus]);

  return (
    <Center minH="60vh" px={4}>
      <Box
        maxW="520px"
        w="full"
        p={{ base: 6, md: 8 }}
        sx={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: "16px",
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.07)",
        }}
      >
        <Stack spacing={5} textAlign="center" align="center">
          <Box
            w="64px"
            h="64px"
            borderRadius="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg="rgba(212,175,55,0.18)"
            border="1px solid rgba(212,175,55,0.5)"
            color="var(--color-accent-gold)"
          >
            {phase === "ready" ? (
              <CheckCircle2 size={32} strokeWidth={2} />
            ) : (
              <Spinner thickness="3px" speed="0.8s" />
            )}
          </Box>

          <Stack spacing={2}>
            <Text
              as="h1"
              className="radley-regular"
              fontWeight={400}
              fontSize={{ base: "2xl", md: "3xl" }}
              lineHeight="1.2"
              color="var(--color-text-primary)"
            >
              {phase === "ready"
                ? "Willkommen im Zirkel"
                : phase === "timeout"
                  ? "Zahlung empfangen"
                  : "Zahlung wird bestätigt …"}
            </Text>
            <Text className="inter" fontSize="md" color="rgba(255,255,255,0.72)">
              {phase === "ready"
                ? "Dein Zugang ist aktiviert. Wir leiten dich gleich auf dein Dashboard weiter."
                : phase === "timeout"
                  ? "Stripe hat die Zahlung bestätigt, aber die Plattform-Aktivierung dauert gerade etwas länger. Lade die Seite neu — falls weiterhin nichts passiert, melde dich bei uns."
                  : "Wir gleichen deine Zahlung mit unserer Plattform ab. Bitte schließe das Fenster nicht."}
            </Text>
            {sessionId ? (
              <Text
                className="inter"
                fontSize="11px"
                color="rgba(255,255,255,0.32)"
                mt={1}
                wordBreak="break-all"
              >
                Referenz: {sessionId}
              </Text>
            ) : null}
          </Stack>

          {phase === "timeout" ? (
            <Stack direction={{ base: "column", sm: "row" }} spacing={3}>
              <Button
                onClick={() => router.refresh()}
                variant="unstyled"
                px={5}
                minH="44px"
                borderRadius="10px"
                borderWidth="1px"
                borderColor="rgba(212,175,55,0.40)"
                color="var(--color-accent-gold)"
                className="inter-semibold"
                _hover={{ bg: "rgba(212,175,55,0.10)" }}
              >
                Seite neu laden
              </Button>
              <Button
                onClick={() => router.push("/dashboard")}
                variant="unstyled"
                px={5}
                minH="44px"
                borderRadius="10px"
                color="rgba(255,255,255,0.72)"
                className="inter-semibold"
                _hover={{ bg: "rgba(255,255,255,0.06)" }}
              >
                Zum Dashboard
              </Button>
            </Stack>
          ) : null}
        </Stack>
      </Box>
    </Center>
  );
}
