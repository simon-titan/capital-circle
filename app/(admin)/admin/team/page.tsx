import { Box } from "@chakra-ui/react";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { AdminTeamManager } from "@/components/admin/AdminTeamManager";

export default function AdminTeamPage() {
  return (
    <Box maxW="1200px" mx="auto">
      <AdminPageHeader title="Team" />
      <AdminTeamManager />
    </Box>
  );
}
