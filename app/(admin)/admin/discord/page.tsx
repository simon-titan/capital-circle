import { Box } from "@chakra-ui/react";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { AdminDiscordManager } from "@/components/admin/AdminDiscordManager";

export default function AdminDiscordPage() {
  return (
    <Box maxW="1200px" mx="auto">
      <AdminPageHeader title="Discord Übersicht" />
      <AdminDiscordManager />
    </Box>
  );
}
