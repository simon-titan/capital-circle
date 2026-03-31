import { Box } from "@chakra-ui/react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box display="flex" bg="var(--color-bg-secondary)">
      <AdminSidebar />
      <Box flex="1" p={8}>
        {children}
      </Box>
    </Box>
  );
}
