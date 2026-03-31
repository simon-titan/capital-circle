import { Stack, Text } from "@chakra-ui/react";
import { ModuleForm } from "@/components/admin/ModuleForm";

type PageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function NewModulePage({ params }: PageProps) {
  const { courseId } = await params;
  return (
    <Stack gap={8} maxW="var(--adminMaxWidth, 1440px)" mx="auto" px={{ base: 4, md: 6 }} py={{ base: 6, md: 8 }}>
      <Stack spacing={2}>
        <Text as="h1" className="radley-regular" fontSize={{ base: "xl", md: "2xl" }} color="whiteAlpha.900">
          Neues Modul
        </Text>
        <Text className="inter" fontSize="sm" color="gray.500">
          Nach dem Anlegen kannst du Videos und Subkategorien hinzufügen.
        </Text>
      </Stack>
      <ModuleForm courseId={courseId} />
    </Stack>
  );
}
