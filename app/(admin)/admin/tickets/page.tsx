import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { AdminTicketsManager } from "@/components/admin/AdminTicketsManager";

export const dynamic = "force-dynamic";

export default async function AdminTicketsPage() {
  const { error } = await requireAdmin();
  if (error) {
    redirect("/dashboard");
  }

  return (
    <Box maxW="var(--adminMaxWidth, 1440px)" mx="auto">
      <AdminPageHeader
        title="Support-Tickets"
        subtitle="Alle Anfragen der Mitglieder, gefiltert nach Status & Priorität. Die Antwortzeit misst die Zeit bis zur ersten Admin-Antwort."
      />
      <AdminTicketsManager />
    </Box>
  );
}
