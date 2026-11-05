import Link from "next/link";
import { redirect } from "next/navigation";
import { Box, Button } from "@chakra-ui/react";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { TrainingVideosManager } from "@/components/admin/TrainingVideosManager";
import { requireAdmin } from "@/lib/supabase/admin-auth";

export const dynamic = "force-dynamic";

/**
 * Videos des kostenlosen Trainings (`/kostenloses-training`) anordnen,
 * benennen, veröffentlichen und aus Cloudflare Stream hinzufügen.
 */
export default async function AdminTrainingVideosPage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  return (
    <Box maxW="1100px" mx="auto">
      <AdminPageHeader
        title="Trainingsvideos"
        subtitle="Die Videos des kostenlosen Trainings — Reihenfolge, Titel und Sichtbarkeit. Was hier oben steht, sieht ein neues Konto als Video 1."
        actions={
          <Link href="/admin/training" style={{ textDecoration: "none" }}>
            <Button as="span" size="sm" variant="line">
              Zum Free-Training-Board
            </Button>
          </Link>
        }
      />
      <TrainingVideosManager />
    </Box>
  );
}
