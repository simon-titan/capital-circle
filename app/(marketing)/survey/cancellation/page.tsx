import type { Metadata } from "next";
import { Box, Stack } from "@chakra-ui/react";
import { Logo } from "@/components/brand/Logo";
import { CancellationSurveyForm } from "@/components/marketing/CancellationSurveyForm";
import { FunnelHeadline, FunnelLead, rise } from "@/components/marketing/funnel-ui";
import { verifySurveyToken } from "@/lib/email/unsubscribe-token";

export const metadata: Metadata = {
  title: "Feedback · Capital Circle",
  description: "Hilf uns, Capital Circle besser zu machen.",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ token?: string | string[] }>;
}

/**
 * Cancellation-Survey nach Stripe-Subscription-Cancel.
 *
 * Auth-Modell: Token-only (HMAC-signiert, kein Login nötig). Der Token wird
 * in `cancellation-survey.tsx` per Email verschickt; verifiziert via
 * `verifySurveyToken()` (eigener Purpose-String, NICHT identisch mit dem
 * Unsubscribe-Token).
 *
 * Der Pfad `/survey/*` ist in `proxy.ts` als `PUBLIC_PREFIX` freigeschaltet,
 * damit auch nicht-eingeloggte User (typischer Fall nach Cancel) hier landen
 * können, ohne auf `/login` umgeleitet zu werden.
 */
export default async function CancellationSurveyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawToken = params.token;
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  const userId = token ? verifySurveyToken(token) : null;

  return (
    <Box as="main" minH="100vh" w="full" py={{ base: 10, md: 16 }} px={{ base: 4, md: 8 }}>
      <Stack spacing={{ base: 8, md: 10 }}>
        <Box maxW="180px" mx="auto" {...rise(0)}>
          <Logo variant="onDark" priority />
        </Box>

        <Box w="full" {...rise(1)}>
          {!token || !userId ? (
            <InvalidTokenView reason={!token ? "missing" : "invalid"} />
          ) : (
            <CancellationSurveyForm token={token} />
          )}
        </Box>
      </Stack>
    </Box>
  );
}

function InvalidTokenView({ reason }: { reason: "missing" | "invalid" }) {
  return (
    <Box className="cc-card cc-card--still" maxW="520px" mx="auto" p={{ base: 6, md: 8 }}>
      <Stack spacing={4} textAlign="center" align="center">
        <FunnelHeadline scale="md">Link nicht mehr gültig</FunnelHeadline>
        <FunnelLead fontSize="16px">
          {reason === "missing"
            ? "Es fehlt ein Token in der URL. Bitte nutze den Link aus deiner E-Mail."
            : "Dieser Feedback-Link ist nicht mehr gültig. Falls du uns trotzdem etwas mitteilen möchtest, antworte gerne direkt auf die letzte E-Mail."}
        </FunnelLead>
      </Stack>
    </Box>
  );
}
