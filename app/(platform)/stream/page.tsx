import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { Radio } from "lucide-react";
import { StreamRoom, type StreamStatus } from "@/components/platform/StreamRoom";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/server-data";

export const dynamic = "force-dynamic";

/**
 * /stream — Free-User Live-Stream Page.
 *
 * Zugriff:
 *  - Nicht eingeloggt      -> /einsteig
 *  - membership_tier='free' -> darf streamen
 *  - is_admin=true          -> darf streamen (Testing/Moderation)
 *  - Sonstige               -> /dashboard
 */
export default async function StreamPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  const profileAny = profile as Record<string, unknown>;
  const isAdmin = profileAny.is_admin === true;
  const tier = typeof profileAny.membership_tier === "string" ? profileAny.membership_tier : "free";
  const canWatch = isAdmin || tier === "free";
  if (!canWatch) redirect("/dashboard");

  // Initiale Settings SSR-geladen, damit der Player beim ersten Render sofort den korrekten Status zeigt.
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("stream_settings")
    .select("is_live, cloudflare_stream_id, title, started_at, updated_at")
    .eq("id", 1)
    .maybeSingle();

  const row = settings as
    | {
        is_live: boolean;
        cloudflare_stream_id: string | null;
        title: string;
        started_at: string | null;
        updated_at: string;
      }
    | null;

  const initialStatus: StreamStatus = {
    isLive: Boolean(row?.is_live),
    streamId: row?.cloudflare_stream_id ?? null,
    title: row?.title ?? "Live Event Stream",
    startedAt: row?.started_at ?? null,
    updatedAt: row?.updated_at ?? null,
  };

  const customerSubdomain = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN ?? "";

  return (
    <Stack gap={{ base: 6, md: 8 }}>
      <Stack gap={3}>
        <Flex align="center" gap={3} flexWrap="wrap">
          <Flex
            align="center"
            justify="center"
            w="44px"
            h="44px"
            borderRadius="12px"
            bg="linear-gradient(145deg, rgba(74, 144, 217, 0.35), rgba(30, 58, 138, 0.25))"
            borderWidth="1px"
            borderColor="rgba(100, 170, 240, 0.45)"
            boxShadow="0 0 22px rgba(74, 144, 217, 0.28)"
          >
            <Radio size={22} strokeWidth={2} aria-hidden style={{ color: "white" }} />
          </Flex>
          <Stack gap={1} flex={1} minW={0}>
            <Text
              fontSize="xs"
              letterSpacing="0.12em"
              textTransform="uppercase"
              className="inter-semibold"
              color="rgba(147, 197, 253, 0.95)"
            >
              Live Stream
            </Text>
            <Box
              as="h1"
              className="radley-regular"
              fontSize="clamp(1.75rem, 4vw, 2.25rem)"
              color="var(--color-text-primary)"
            >
              Live Event Stream
            </Box>
          </Stack>
        </Flex>
        <Box
          h="2px"
          w={{ base: "100%", md: "min(300px, 100%)" }}
          borderRadius="full"
          bg="linear-gradient(90deg, rgba(74, 144, 217, 0) 0%, rgba(100, 170, 240, 0.95) 45%, rgba(74, 144, 217, 0.25) 100%)"
          boxShadow="0 0 18px rgba(74, 144, 217, 0.25)"
        />
        <Text className="inter" fontSize="sm" color="var(--color-text-muted)" maxW="42rem">
          Wenn Emre live geht, startet der Player hier automatisch. Diese Seite ist eine
          reine Ansicht! Es sind keine Interaktionen möglich. Du siehst den
          Stream innerhalb weniger Sekunden, sobald er online ist.
        </Text>
      </Stack>

      <StreamRoom initialStatus={initialStatus} customerSubdomain={customerSubdomain} />
    </Stack>
  );
}
