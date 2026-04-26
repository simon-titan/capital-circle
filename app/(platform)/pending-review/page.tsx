import { redirect } from "next/navigation";
import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { ApplicationReceivedPendingBody } from "@/components/platform/ApplicationReceivedPendingBody";
import { PendingReviewStatusIcon } from "@/components/platform/PendingReviewStatusIcon";

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
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.07)",
        }}
      >
        <Stack spacing={5} textAlign="center" align="center">
          <Box
            w="56px"
            h="56px"
            borderRadius="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg={isRejected ? "rgba(248,113,113,0.16)" : "rgba(212,175,55,0.18)"}
            border={
              isRejected
                ? "1px solid rgba(248,113,113,0.5)"
                : "1px solid rgba(212,175,55,0.5)"
            }
          >
            <PendingReviewStatusIcon rejected={isRejected} />
          </Box>

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
