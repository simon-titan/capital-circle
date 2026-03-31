import { createClient } from "@/lib/supabase/server";
import { AdminHomeworkManager } from "@/components/admin/AdminHomeworkManager";

export default async function AdminHomeworkPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("homework").select("id,title,due_date").order("due_date");
  const initialHomework = (data ?? []) as Array<{ id: string; title: string; due_date: string | null }>;
  return <AdminHomeworkManager initialHomework={initialHomework} />;
}
