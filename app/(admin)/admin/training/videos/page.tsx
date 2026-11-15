import Link from "next/link";
import { redirect } from "next/navigation";
import { Box, Button, Stack } from "@chakra-ui/react";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { FunnelVideosManager } from "@/components/admin/FunnelVideosManager";
import { TrainingVideosManager } from "@/components/admin/TrainingVideosManager";
import { requireAdmin } from "@/lib/supabase/admin-auth";

export const dynamic = "force-dynamic";

/**
 * Alle Videos des Free-Funnels an einer Stelle: oben die öffentlichen
 * Funnel-Videos (`/training`, `/call`), darunter die Kursvideos des kostenlosen
 * Trainings (`/kostenloses-training`) — anordnen, benennen, veröffentlichen.
 */
export default async function AdminTrainingVideosPage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  return (
    <Box maxW="1100px" mx="auto">
      <AdminPageHeader
        title="Funnel- & Kursvideos"
        subtitle="Oben die Videos der öffentlichen Seiten /training und /call, darunter die Kursvideos des kostenlosen Trainings — Reihenfolge, Titel und Sichtbarkeit."
        actions={
          <Link href="/admin/training" style={{ textDecoration: "none" }}>
            <Button as="span" size="sm" variant="line">
              Zum Free-Training-Board
            </Button>
          </Link>
        }
      />
      <Stack spacing={6}>
        <FunnelVideosManager />
        <TrainingVideosManager />
      </Stack>
    </Box>
  );
}
