import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, AlertIcon, Box, Button, Text } from "@chakra-ui/react";
import { TrainingBewerbungen } from "@/components/admin/TrainingBewerbungen";
import { AdminPageHeader, adminAlertIconColor, adminAlertProps } from "@/components/admin/adminUi";
import { bewerbung } from "@/config/training";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { ladeTrainingBoard } from "@/lib/training/board";

export const dynamic = "force-dynamic";

/**
 * `/admin/training/bewerbungen` — die Free-Kurs-Bewerbungen über `/training` auf
 * eigener Seite (Sidebar „Free-Bewerbungen"), im Aufbau von `/admin/applications`.
 * Dieselbe Liste steht auch im Board `/admin/training` im Reiter „Bewerbungen".
 */
export default async function Seite() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  let bewerbungen: Awaited<ReturnType<typeof ladeTrainingBoard>>["bewerbungen"] | null = null;
  let fehler: string | null = null;
  try {
    bewerbungen = (await ladeTrainingBoard(createServiceClient())).bewerbungen;
  } catch (err) {
    fehler = err instanceof Error ? err.message : String(err);
  }

  return (
    <Box maxW="1200px" mx="auto">
      <AdminPageHeader
        title="Free-Bewerbungen"
        subtitle="Bewerbungen für den kostenlosen Kurs über /training. Annehmen schaltet 30 Tage frei und schickt A02, Ablehnen schickt A03 — endgültig."
        actions={
          <Link href="/admin/training" style={{ textDecoration: "none" }}>
            <Button as="span" size="sm" variant="line">
              Zum Free-Training-Board
            </Button>
          </Link>
        }
      />
      {fehler ? (
        <Alert status="error" {...adminAlertProps("error")}>
          <AlertIcon color={adminAlertIconColor("error")} />
          <Text fontSize="sm">{fehler} — ist Migration 110 eingespielt?</Text>
        </Alert>
      ) : bewerbungen ? (
        <TrainingBewerbungen bewerbungen={bewerbungen} fragen={bewerbung.fragen} />
      ) : null}
    </Box>
  );
}
