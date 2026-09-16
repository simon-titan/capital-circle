import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { HTApplicationsManager } from "@/components/admin/HTApplicationsManager";

export const dynamic = "force-dynamic";

export default async function AdminHTApplicationsPage() {
  const { error } = await requireAdmin();
  if (error) {
    redirect("/dashboard");
  }

  return (
    <Box maxW="1200px" mx="auto">
      <AdminPageHeader
        title="High-Ticket Bewerbungen"
        subtitle={
          <>
            Bewerbungen aus dem 1:1-Funnel. „Über 2.000 €“-Leads stehen oben mit Priority-Badge.
            Setze nach dem Call den Outcome — bei „Closed Won“ wird der Plattform-Zugang automatisch
            auf <Box as="span" color="var(--cc-gold-light)">ht_1on1</Box> aufgestuft.
          </>
        }
      />
      <HTApplicationsManager />
    </Box>
  );
}
