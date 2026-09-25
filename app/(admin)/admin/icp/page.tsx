import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { IcpAuswertung } from "@/components/admin/IcpAuswertung";
import { requireAdmin } from "@/lib/supabase/admin-auth";

export const dynamic = "force-dynamic";

/**
 * `/admin/icp` — Antworten aus dem Onboarding-Fragebogen (ICP) und die
 * Aktivierung der Neukäufer. Rohdaten als CSV, um sie mit Umsatz, Churn und
 * Nutzung zu verbinden. Pro Mitglied stehen die Antworten unter
 * `/admin/mitglieder` (Spalte „Onboarding").
 */
export default async function AdminIcpPage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  return (
    <Box maxW="1400px" mx="auto">
      <AdminPageHeader
        title="Kunden & ICP"
        subtitle="Wer unsere Mitglieder sind: Erfahrung, Stand, größtes Problem, Ziel und Herkunft aus den fünf Onboarding-Fragen, dazu der Weg der Neukäufer von den Fragen bis zum ersten Kursstart."
      />
      <IcpAuswertung />
    </Box>
  );
}
