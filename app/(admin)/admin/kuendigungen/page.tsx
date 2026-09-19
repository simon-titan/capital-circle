import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { AdminKuendigungenManager } from "@/components/admin/AdminKuendigungenManager";

export const dynamic = "force-dynamic";

export default async function AdminKuendigungenPage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  return (
    <Box maxW="1200px" mx="auto">
      <AdminPageHeader
        title="Kündigungen"
        subtitle="Eingänge über den Kündigungsbutton /kuendigen (§ 312k BGB). Ordentliche Kündigungen mit eindeutigem Abo sind bei Stripe bereits zum Periodenende gesetzt; „Manuell prüfen“ und „Kein Vertrag“ brauchen einen Blick und eine Antwort an den Kunden."
      />
      <AdminKuendigungenManager />
    </Box>
  );
}
