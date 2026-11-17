import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { AuswertungDashboard } from "@/components/admin/auswertung/AuswertungDashboard";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { requireAdmin } from "@/lib/supabase/admin-auth";

export const dynamic = "force-dynamic";

/**
 * `/admin/auswertung` — Tracking & Finanzen (Emres Playbook 1.0, Stufe P0):
 * Übersicht mit acht KPI-Karten, Funnel (teilweise), Vertrieb, Finanzen mit
 * Provision, Nachtrag und Exporten. Rechnung in `lib/finanzen/*`.
 */
export default async function AdminAuswertungPage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");
  return (
    <Box maxW="1400px" mx="auto">
      <AdminPageHeader
        title="Auswertung"
        subtitle="Geld, Vertrieb und Funnel aus serverbestätigten Daten: Stripe-Ledger, Termine, CRM. Jede Kennzahl nennt ihre Definition; wo Daten fehlen, steht „No Data“ statt 0. Gespeichert in UTC, angezeigt in Europe/Berlin."
      />
      <AuswertungDashboard />
    </Box>
  );
}
