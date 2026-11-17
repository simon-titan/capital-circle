import Link from "next/link";
import { redirect } from "next/navigation";
import { Box, Button } from "@chakra-ui/react";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { TradingBlueprintManager } from "@/components/admin/TradingBlueprintManager";
import { requireAdmin } from "@/lib/supabase/admin-auth";

export const dynamic = "force-dynamic";

/**
 * Trading Blueprint (Free-Ansicht nach Emres Mockup, 08.11.2026): PDF per
 * Drag & Drop nach R2, optional eine Videoanleitung aus Cloudflare Stream.
 * Solange kein PDF hinterlegt ist, zeigen Dashboard und `/trading-blueprint`
 * „Erscheint in Kürze“.
 */
export default async function AdminTradingBlueprintPage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  return (
    <Box maxW="900px" mx="auto">
      <AdminPageHeader
        title="Trading Blueprint"
        subtitle="Die Vorlage zum Herunterladen für alle Mitglieder (Free und Zahlende) samt optionaler Videoanleitung. Ein neues PDF ersetzt das bisherige sofort."
        actions={
          <Link href="/admin/training/videos" style={{ textDecoration: "none" }}>
            <Button as="span" size="sm" variant="line">
              Zu den Trainingsvideos
            </Button>
          </Link>
        }
      />
      <TradingBlueprintManager />
    </Box>
  );
}
