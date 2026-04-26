import { redirect } from "next/navigation";
import { Box, Heading, HStack, Stack, Text } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { ApplicationReceivedPendingBody } from "@/components/platform/ApplicationReceivedPendingBody";
import { PendingReviewStatusIcon } from "@/components/platform/PendingReviewStatusIcon";

const TELEGRAM_BLUE = "#229ED9";

function TelegramLogo() {
  return (
    <svg viewBox="0 0 240 240" width="28" height="28" fill="none" aria-hidden>
      <path
        d="M120 0C53.7 0 0 53.7 0 120s53.7 120 120 120 120-53.7 120-120S186.3 0 120 0z"
        fill={TELEGRAM_BLUE}
      />
      <path
        d="M49.9 118.5l82-37.7c3.6-1.5 15.8-6.6 15.8-6.6s5.6-2.2 5.2 3.1c-.2 2.2-1.5 9.7-2.9 18l-8.4 51.6s-.7 5.6-6.6 5.8c-5.8.2-9.7-4.2-10.8-5.1-1.1-.9-19.8-12.8-26.6-18.4-1.8-1.5-3.8-4.4.2-7.9 9-8.3 19.8-18.6 26.3-25.1 3.1-3.1 6.2-10.2-6.6-1.5l-35.2 23.7s-5.1 3.1-14.6.3l-20.7-6.4s-7.8-4.7 5.3-10z"
        fill="#fff"
      />
    </svg>
  );
}

export const dynamic = "force-dynamic";

/**
 * Wartesseite für User mit `application_status` in {pending, rejected}.
 *
 * Routing-Sicherheit:
 *   - proxy.ts redirected `pending`-User HIERHER (und entfernt sie wenn approved).
 *   - Doppelt-checken wir hier serverseitig, damit keine Bestand-Member ohne
 *     Application versehentlich auf der Seite landen.
 */
export default async function PendingReviewPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("application_status")
    .eq("id", authData.user.id)
    .single();

  const status = (profile as { application_status?: string | null } | null)?.application_status;

  if (status !== "pending" && status !== "rejected") {
    // Nach Freischaltung (approved) Nutzer zum Einsteig-Onboarding leiten
    redirect("/einsteig");
  }

  const isRejected = status === "rejected";

  return (
    <Box
      minH="60vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={{ base: 4, md: 8 }}
    >
      <Box
        maxW="580px"
        w="full"
        p={{ base: 6, md: 8 }}
        sx={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: isRejected
            ? "1px solid rgba(248,113,113,0.35)"
            : `1px solid rgba(34,158,217,0.40)`,
          borderRadius: "16px",
          boxShadow: isRejected
            ? "0 8px 32px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.07)"
            : "0 8px 32px rgba(0,0,0,0.60), inset 0 1px 0 rgba(34,158,217,0.08)",
        }}
      >
        <Stack spacing={5} textAlign="center" align="center">
          {isRejected ? (
            <Box
              w="56px"
              h="56px"
              borderRadius="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
              bg="rgba(248,113,113,0.16)"
              border="1px solid rgba(248,113,113,0.5)"
            >
              <PendingReviewStatusIcon rejected />
            </Box>
          ) : (
            <HStack spacing={3}>
              <Box
                w="52px"
                h="52px"
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
                bg="rgba(212,175,55,0.18)"
                border="1px solid rgba(212,175,55,0.5)"
              >
                <PendingReviewStatusIcon rejected={false} />
              </Box>
              <Text fontSize="xl" color="rgba(255,255,255,0.3)" fontWeight={300} userSelect="none">+</Text>
              <Box
                w="52px"
                h="52px"
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
                bg="rgba(34,158,217,0.14)"
                border="1px solid rgba(34,158,217,0.45)"
              >
                <TelegramLogo />
              </Box>
            </HStack>
          )}

          <Heading
            as="h1"
            className="radley-regular"
            fontWeight={400}
            fontSize={{ base: "2xl", md: "3xl" }}
            lineHeight="1.2"
          >
            {isRejected
              ? "Update zu deiner Bewerbung"
              : "Bewerbung eingegangen."}
          </Heading>

          {isRejected ? (
            <>
              <Text fontSize="md" color="rgba(255,255,255,0.72)" className="inter">
                Aktuell können wir dir leider keinen Platz anbieten. Wir nehmen pro Periode
                nur eine sehr begrenzte Zahl an Trader:innen auf — danke, dass du dir die Zeit
                genommen hast.
              </Text>
              <Text fontSize="xs" color="rgba(255,255,255,0.4)" className="inter">
                Wir wünschen dir alles Gute auf deinem Weg an den Märkten.
              </Text>
            </>
          ) : (
            <Box w="full" alignSelf="stretch">
              <ApplicationReceivedPendingBody />
            </Box>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
