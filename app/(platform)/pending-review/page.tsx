import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { ApplicationReceivedPendingBody } from "@/components/platform/ApplicationReceivedPendingBody";
import { PendingReviewStatusIcon } from "@/components/platform/PendingReviewStatusIcon";

/** Telegram-Logo neutral (Markenicons stehen hell, nicht in Markenfarbe). */
function TelegramLogo() {
  return (
    <svg viewBox="0 0 240 240" width="28" height="28" fill="none" aria-hidden>
      <path
        d="M120 0C53.7 0 0 53.7 0 120s53.7 120 120 120 120-53.7 120-120S186.3 0 120 0z"
        fill="currentColor"
      />
      <path
        d="M49.9 118.5l82-37.7c3.6-1.5 15.8-6.6 15.8-6.6s5.6-2.2 5.2 3.1c-.2 2.2-1.5 9.7-2.9 18l-8.4 51.6s-.7 5.6-6.6 5.8c-5.8.2-9.7-4.2-10.8-5.1-1.1-.9-19.8-12.8-26.6-18.4-1.8-1.5-3.8-4.4.2-7.9 9-8.3 19.8-18.6 26.3-25.1 3.1-3.1 6.2-10.2-6.6-1.5l-35.2 23.7s-5.1 3.1-14.6.3l-20.7-6.4s-7.8-4.7 5.3-10z"
        style={{ fill: "var(--cc-bg)" }}
      />
    </svg>
  );
}

/** Runde Status-Kachel: Gold für „wartet auf dich“, sonst neutral mit Haarlinie. */
function StatusTile({ gold = false, children }: { gold?: boolean; children: ReactNode }) {
  return (
    <Box
      w="56px"
      h="56px"
      borderRadius="full"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
      bg={gold ? "var(--cc-gold-wash)" : "rgba(255, 255, 255, 0.02)"}
      border="1px solid"
      borderColor={gold ? "var(--cc-gold-line)" : "var(--cc-line-strong)"}
      color="var(--cc-text-soft)"
      boxShadow={gold ? "0 0 24px rgba(212, 176, 128, 0.18)" : "inset 0 1px 0 rgba(255, 255, 255, 0.05)"}
    >
      {children}
    </Box>
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
    <Box minH="60vh" display="flex" alignItems="center" justifyContent="center" px={{ base: 0, md: 8 }}>
      <Box maxW="580px" w="full" className="cc-card cc-card--still cc-rise" p={{ base: 6, md: 8 }}>
        <Stack spacing={5} textAlign="center" align="center">
          {isRejected ? (
            <StatusTile>
              <PendingReviewStatusIcon rejected />
            </StatusTile>
          ) : (
            <HStack spacing={3}>
              <StatusTile gold>
                <PendingReviewStatusIcon rejected={false} />
              </StatusTile>
              <Text fontSize="20px" color="var(--cc-text-3)" fontWeight={300} userSelect="none" aria-hidden>
                +
              </Text>
              <StatusTile>
                <TelegramLogo />
              </StatusTile>
            </HStack>
          )}

          <Box
            as="h1"
            fontSize={{ base: "26px", md: "30px" }}
            fontWeight={600}
            letterSpacing="-0.01em"
            lineHeight={1.2}
            color="var(--cc-text)"
          >
            {isRejected ? "Update zu deiner Bewerbung" : "Bewerbung eingegangen."}
          </Box>

          {isRejected ? (
            <>
              <Text fontSize="16px" lineHeight={1.6} color="var(--cc-text-soft)">
                Aktuell können wir dir leider keinen Platz anbieten. Wir nehmen pro Periode
                nur eine sehr begrenzte Zahl an Trader:innen auf — danke, dass du dir die Zeit
                genommen hast.
              </Text>
              <Text fontSize="13px" color="var(--cc-text-3)">
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
