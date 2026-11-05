import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, AlertIcon, Box, Button, Text } from "@chakra-ui/react";
import { AdminTrainingBoard } from "@/components/admin/AdminTrainingBoard";
import { AdminPageHeader, adminAlertIconColor, adminAlertProps } from "@/components/admin/adminUi";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { ladeTrainingBoard } from "@/lib/training/board";

export const dynamic = "force-dynamic";

/**
 * CRM-Board des Free Trainings (`config/training.ts`): wer sich über
 * `/training` registriert hat, wie weit er in den Videos ist, und wer ein
 * Analysegespräch angefragt hat — getrennt vom Discord-/Call-Funnel-Board.
 */
export default async function AdminTrainingPage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  let daten: Awaited<ReturnType<typeof ladeTrainingBoard>> | null = null;
  let fehler: string | null = null;
  try {
    daten = await ladeTrainingBoard(createServiceClient());
  } catch (err) {
    fehler = err instanceof Error ? err.message : String(err);
  }

  return (
    <Box>
      <AdminPageHeader
        title="Free Training"
        subtitle="Registrierungen über /training, Fortschritt in den Trainingsvideos und die Analysegespräche aus dem Mitgliederbereich."
        actions={
          <Link href="/admin/training/videos" style={{ textDecoration: "none" }}>
            <Button as="span" size="sm" variant="gold">
              Videos anordnen
            </Button>
          </Link>
        }
      />
      {fehler ? (
        <Alert status="error" {...adminAlertProps("error")}>
          <AlertIcon color={adminAlertIconColor("error")} />
          <Text fontSize="sm">{fehler} — ist Migration 109 eingespielt?</Text>
        </Alert>
      ) : daten ? (
        <AdminTrainingBoard {...daten} />
      ) : null}
    </Box>
  );
}
