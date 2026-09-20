import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { AdminGutscheineManager } from "@/components/admin/AdminGutscheineManager";

export const dynamic = "force-dynamic";

export default async function AdminGutscheinePage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  return (
    <Box maxW="1200px" mx="auto">
      <AdminPageHeader
        title="Gutscheine"
        subtitle="Rabattcodes anlegen und verwalten. Läuft über echte Stripe-Coupons/Promotion-Codes, einlösbar direkt im Checkout."
      />
      <AdminGutscheineManager />
    </Box>
  );
}
