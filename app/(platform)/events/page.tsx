import { Stack } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventsPageCalendar } from "@/components/platform/EventsPageCards";
import { EventsUpcomingShowcase } from "@/components/platform/EventsUpcomingShowcase";
import { getCurrentUserAndProfile } from "@/lib/server-data";

export default async function EventsPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einstieg");

  const isPaid = Boolean((profile as { is_paid?: boolean }).is_paid);

  const supabase = await createClient();
  const now = new Date().toISOString();

  const [{ data: upcoming }, { data: rawEvents }, { data: sessionLinks }] = await Promise.all([
    supabase
      .from("events")
      .select("id,title,description,start_time,end_time,event_type,color,external_url")
      .gte("start_time", now)
      .order("start_time", { ascending: true })
      .limit(3),
    supabase
      .from("events")
      .select("id,title,description,start_time,end_time,event_type,color,external_url")
      .order("start_time", { ascending: true }),
    // Verknüpfte Live Sessions: event_id → session id
    supabase
      .from("live_sessions")
      .select("id,event_id")
      .not("event_id", "is", null),
  ]);

  // Schnelle Lookup-Map: event_id → session_id
  const sessionByEvent = new Map<string, string>();
  for (const s of sessionLinks ?? []) {
    const row = s as { id: string; event_id: string };
    if (row.event_id) sessionByEvent.set(row.event_id, row.id);
  }

  const allEvents = (rawEvents ?? []).map((ev) => ({
    ...ev,
    live_session_id: sessionByEvent.get(ev.id) ?? null,
  }));

  const content = (
    <Stack spacing={{ base: 8, md: 10 }}>
      <EventsUpcomingShowcase events={upcoming ?? []} isPaid={isPaid} />
      <EventsPageCalendar events={allEvents} isPaid={isPaid} />
    </Stack>
  );

  // Always render the events content. For Free Members we handle highlighting and
  // the greyed/locked states inside the event components instead of showing a full-page paywall.
  return content;
}
