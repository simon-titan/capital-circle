import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { AdminWhopUmzugManager } from "@/components/admin/AdminWhopUmzugManager";

export const dynamic = "force-dynamic";

export default async function AdminWhopUmzugPage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  return (
    <Box maxW="1200px" mx="auto">
      <AdminPageHeader
        title="Whop-Umzug"
        subtitle="Die letzten zahlenden Mitglieder von Whop. Jeder behält den Zugang bis zum Ende seines bei Whop bezahlten Zeitraums; danach beendet ihn der Nachtlauf. Diese Seite zeigt nur den Stand — verschickt wird über npm run whop:umzug, importiert über npm run whop:import."
      />
      <AdminWhopUmzugManager />
    </Box>
  );
}
