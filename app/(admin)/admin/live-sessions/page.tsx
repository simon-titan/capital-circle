import { Box } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/adminUi";
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
    <Box maxW="var(--adminMaxWidth, 1440px)" mx="auto">
      <AdminPageHeader
        title="Live Session Replays"
        subtitle="Replays vergangener Live Calls — optional mit Event aus dem Kalender verknüpfen."
      />
      <LiveSessionManager initialEvents={initialEvents} />
    </Box>
  );
}
