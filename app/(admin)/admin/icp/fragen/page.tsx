import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { IcpFragen } from "@/components/admin/IcpFragen";
import { requireAdmin } from "@/lib/supabase/admin-auth";

export const dynamic = "force-dynamic";

/**
 * `/admin/icp/fragen` — die ICP-Fragen nach Emre (Migration 113, `config/onboarding.ts`):
 * Free-Mitglieder beantworten 1–7, Mentoring-Käufer 1–10. Die ältere Auswertung
 * der Abo-Mitglieder (fünf Fragen, Aktivierung) bleibt unter `/admin/icp`.
 */
export default async function AdminIcpFragenPage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  return (
    <Box maxW="1400px" mx="auto">
      <AdminPageHeader
        title="ICP-Fragen"
        subtitle="Was Free-Mitglieder (Fragen 1–7) und Mentoring-Käufer (Fragen 1–10) im Onboarding angeben: Verteilung je Frage und die Antworten jeder Person."
      />
      <IcpFragen />
    </Box>
  );
}
