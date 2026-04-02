import { createClient } from "@/lib/supabase/server";
import { AdminEventsManager } from "@/components/admin/AdminEventsManager";

export default async function AdminEventsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("id,title,start_time,event_type,is_recurring,recurrence_group_id")
    .order("start_time");
  const initialEvents = (data ?? []) as Array<{
    id: string;
    title: string;
    start_time: string;
    event_type: string | null;
    is_recurring?: boolean | null;
    recurrence_group_id?: string | null;
  }>;
  return <AdminEventsManager initialEvents={initialEvents} />;
}
