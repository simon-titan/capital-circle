import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { AdminTradingViewManager } from "@/components/admin/AdminTradingViewManager";

export const dynamic = "force-dynamic";

export default async function AdminTradingViewPage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  return (
    <Box maxW="1200px" mx="auto">
      <AdminPageHeader
        title="TradingView-Zugänge"
        subtitle="Anfragen für den Capital Circle Indicator. Freigeschaltet und entzogen wird von Hand auf TradingView (Invite-only-Script → Manage Access), hier wird es abgehakt. Wer keinen Plattformzugang mehr hat, landet über den Nachtlauf automatisch unter „Entziehen“."
      />
      <AdminTradingViewManager />
    </Box>
  );
}
