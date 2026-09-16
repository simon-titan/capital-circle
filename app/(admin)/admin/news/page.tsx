import { Box } from "@chakra-ui/react";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { NewsManager } from "@/components/admin/NewsManager";

export default function AdminNewsPage() {
  return (
    <Box maxW="var(--adminMaxWidth, 1440px)" mx="auto">
      <AdminPageHeader
        title="Capital Circle News"
        subtitle="Kurze News-Beiträge für alle Mitglieder (Free & Paid). Interaktionen: Like, Kommentar (max. 1 pro User), Speichern."
      />
      <NewsManager />
    </Box>
  );
}
