import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { AdminWiderrufeManager } from "@/components/admin/AdminWiderrufeManager";

export const dynamic = "force-dynamic";

export default async function AdminWiderrufePage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  return (
    <Box maxW="1200px" mx="auto">
      <AdminPageHeader
        title="Widerrufe"
        subtitle="Eingänge über die Widerrufsfunktion /widerrufen (§ 356a BGB). Nichts davon wird automatisch ausgeführt: Widerrufsrecht und Frist prüfen, Wertersatz festlegen, Abo in Stripe beenden, erstatten (spätestens 14 Tage nach Eingang) und dem Kunden antworten."
      />
      <AdminWiderrufeManager />
    </Box>
  );
}
