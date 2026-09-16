import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { AdminZahlungsstoerungenManager } from "@/components/admin/AdminZahlungsstoerungenManager";

export const dynamic = "force-dynamic";

export default async function AdminZahlungsstoerungenPage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  return (
    <Box maxW="1200px" mx="auto">
      <AdminPageHeader
        title="Zahlungsstörungen"
        subtitle="Mitglieder im Grace-Zeitraum nach fehlgeschlagener Zahlung — Dunning-Status und verbleibende Zeit bis zum Zugangsverlust auf einen Blick."
      />
      <AdminZahlungsstoerungenManager />
    </Box>
  );
}
