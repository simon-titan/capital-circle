import { redirect } from "next/navigation";
import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { StreamTogglePanel, type AdminStreamSettings } from "@/components/admin/StreamTogglePanel";

export const dynamic = "force-dynamic";

/**
 * /admin/stream — Admin-Steuerung des Free-Live-Streams.
 * Nur fuer is_admin=true; andere werden auf /dashboard umgeleitet.
 */
export default async function AdminStreamPage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  const service = createServiceClient();
  const { data } = await service
    .from("stream_settings")
    .select("is_live, cloudflare_stream_id, title, started_at, updated_at")
    .eq("id", 1)
    .maybeSingle();

  const row = data as
    | {
        is_live: boolean;
        cloudflare_stream_id: string | null;
        title: string;
        started_at: string | null;
        updated_at: string;
      }
    | null;

  const initial: AdminStreamSettings = {
    isLive: Boolean(row?.is_live),
    streamId: row?.cloudflare_stream_id ?? "",
    title: row?.title ?? "Live Analyse",
    startedAt: row?.started_at ?? null,
    updatedAt: row?.updated_at ?? null,
  };

  return (
    <Box maxW="960px" mx="auto" px={{ base: 4, md: 6 }} py={8}>
      <Stack spacing={6}>
        <Stack spacing={1}>
          <Heading
            as="h1"
            className="radley-regular"
            fontWeight={400}
            fontSize={{ base: "2xl", md: "3xl" }}
            color="whiteAlpha.950"
          >
            Live Stream
          </Heading>
          <Text fontSize="sm" color="var(--color-text-secondary)" className="inter">
            Steuerung des Free-User-Streams. Schalte hier an/aus und hinterlege die Cloudflare Video-UID.
          </Text>
        </Stack>
        <StreamTogglePanel initial={initial} />
      </Stack>
    </Box>
  );
}
