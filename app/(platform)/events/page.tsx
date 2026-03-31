import { Stack } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { EventsCalendar } from "@/components/platform/EventsCalendar";
import { EventsUpcomingShowcase } from "@/components/platform/EventsUpcomingShowcase";

export default async function EventsPage() {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [{ data: upcoming }, { data: allEvents }] = await Promise.all([
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
  ]);

  return (
    <Stack spacing={{ base: 8, md: 10 }}>
      <EventsUpcomingShowcase events={upcoming ?? []} />
      <EventsCalendar events={allEvents ?? []} />
    </Stack>
  );
}
