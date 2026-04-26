import type { Metadata } from "next";
import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { Logo } from "@/components/brand/Logo";
import { CancellationSurveyForm } from "@/components/marketing/CancellationSurveyForm";
import { verifySurveyToken } from "@/lib/email/unsubscribe-token";

export const metadata: Metadata = {
  title: "Feedback — Capital Circle",
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
    <Box
      as="main"
      minH="100vh"
      w="full"
      py={{ base: 8, md: 14 }}
      px={{ base: 4, md: 8 }}
    >
      <Stack spacing={{ base: 8, md: 10 }}>
        <Box maxW="200px" mx="auto">
          <Logo variant="onDark" priority />
        </Box>

        {!token || !userId ? (
          <InvalidTokenView reason={!token ? "missing" : "invalid"} />
        ) : (
          <CancellationSurveyForm token={token} />
        )}
      </Stack>
    </Box>
  );
}

function InvalidTokenView({ reason }: { reason: "missing" | "invalid" }) {
  return (
    <Box
      maxW="520px"
      mx="auto"
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
      <Stack spacing={4} textAlign="center" align="center">
        <Heading
          as="h1"
          className="radley-regular"
          fontWeight={400}
          fontSize={{ base: "2xl", md: "3xl" }}
        >
          Link nicht mehr gültig
        </Heading>
        <Text fontSize="md" color="rgba(255,255,255,0.72)" className="inter">
          {reason === "missing"
            ? "Es fehlt ein Token in der URL — bitte nutze den Link aus deiner E-Mail."
            : "Dieser Feedback-Link ist nicht mehr gültig. Falls du uns trotzdem etwas mitteilen möchtest, antworte gerne direkt auf die letzte E-Mail."}
        </Text>
      </Stack>
    </Box>
  );
}
