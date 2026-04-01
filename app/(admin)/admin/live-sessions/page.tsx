import { Stack, Text } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { LiveSessionManager } from "@/components/admin/LiveSessionManager";

export default async function AdminLiveSessionsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("id,title,start_time,event_type")
    .order("start_time", { ascending: false })
    .limit(200);
  const initialEvents = (data ?? []) as Array<{
    id: string;
    title: string;
    start_time: string;
    event_type: string | null;
  }>;

  return (
    <Stack gap={8} maxW="var(--adminMaxWidth, 1440px)" mx="auto">
      <Stack spacing={2}>
        <Text as="h1" className="radley-regular" fontSize={{ base: "xl", md: "2xl" }} color="whiteAlpha.900">
          Live Session Replays
        </Text>
        <Text className="inter" fontSize="sm" color="gray.500">
          Replays vergangener Live Calls — optional mit Event aus dem Kalender verknüpfen.
        </Text>
      </Stack>
      <LiveSessionManager initialEvents={initialEvents} />
    </Stack>
  );
}
