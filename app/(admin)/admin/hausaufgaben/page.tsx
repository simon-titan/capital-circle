import { Box } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { AdminHomeworkManager, type AdminHomework } from "@/components/admin/AdminHomeworkManager";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { NACHFRIST_TAGE } from "@/lib/hausaufgaben";
import { berlinCalendarDayKey } from "@/lib/learning-daily";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export default async function AdminHomeworkPage() {
  const { supabase, error } = await requireAdmin();
  if (error) redirect("/dashboard");

  const { data } = await supabase.from("homework").select("*");
  const rows = (data ?? []) as Array<Omit<AdminHomework, "doneCount">>;

  // Wie viele Mitglieder haben abgehakt? RLS zeigt der Admin-Session nur die
  // eigenen Häkchen, deshalb zählt der Service-Client. Eine Zählung je Aufgabe
  // statt einer Liste aller Zeilen: PostgREST kappt Listen bei 1000 Zeilen.
  const service = createServiceClient();
  const counts = await Promise.all(
    rows.map(async (hw) => {
      const { count } = await service
        .from("homework_user_official_done")
        .select("user_id", { count: "exact", head: true })
        .eq("homework_id", hw.id)
        .eq("done", true);
      return count ?? 0;
    }),
  );

  const initialHomework: AdminHomework[] = rows.map((hw, i) => ({ ...hw, doneCount: counts[i] }));

  return (
    <Box maxW="var(--adminMaxWidth, 1440px)" mx="auto">
      <AdminPageHeader
        title="Hausaufgaben"
        subtitle={`Mit Fälligkeitsdatum ist eine Aufgabe bis zur Frist und noch ${NACHFRIST_TAGE} Tage danach (als überfällig) für Mitglieder aktuell, ohne Datum so lange, bis du sie archivierst oder löschst. Danach steht sie bei ihnen unter „Vergangene Aufgaben“.`}
      />
      <AdminHomeworkManager initialHomework={initialHomework} todayKey={berlinCalendarDayKey(new Date())} />
    </Box>
  );
}
