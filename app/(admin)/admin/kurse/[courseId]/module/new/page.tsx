import { Box } from "@chakra-ui/react";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { ModuleForm } from "@/components/admin/ModuleForm";

type PageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function NewModulePage({ params }: PageProps) {
  const { courseId } = await params;
  return (
    <Box w="full">
      <AdminPageHeader
        title="Neues Modul"
        subtitle="Nach dem Anlegen kannst du Videos und Subkategorien hinzufügen."
      />
      <ModuleForm courseId={courseId} />
    </Box>
  );
}
