import { Box } from "@chakra-ui/react";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { AdminMembersManager } from "@/components/admin/AdminMembersManager";

export default function AdminMembersPage() {
  return (
    <Box maxW="1200px" mx="auto">
      <AdminPageHeader title="Mitglieder" />
      <AdminMembersManager />
    </Box>
  );
}
