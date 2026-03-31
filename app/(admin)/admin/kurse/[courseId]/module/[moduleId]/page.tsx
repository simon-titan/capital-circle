import { Stack, Text } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { ModuleForm } from "@/components/admin/ModuleForm";

type PageProps = {
  params: Promise<{ courseId: string; moduleId: string }>;
};

export default async function EditModulePage({ params }: PageProps) {
  const { courseId, moduleId } = await params;
  const supabase = await createClient();
  const { data: mod } = await supabase
    .from("modules")
    .select("id,title,description,order_index,is_published,slug,thumbnail_storage_key")
    .eq("id", moduleId)
    .single();

  const initialModule = mod as
    | {
        id: string;
        title: string;
        description: string | null;
        order_index: number;
        is_published: boolean;
        slug: string | null;
        thumbnail_storage_key: string | null;
      }
    | null;

  return (
    <Stack gap={8} maxW="var(--adminMaxWidth, 1440px)" mx="auto" px={{ base: 4, md: 6 }} py={{ base: 6, md: 8 }}>
      <Stack spacing={2}>
        <Text as="h1" className="radley-regular" fontSize={{ base: "xl", md: "2xl" }} color="whiteAlpha.900">
          Modul bearbeiten
        </Text>
        <Text className="inter" fontSize="sm" color="gray.500">
          Metadaten, Videos und Subkategorien verwalten.
        </Text>
      </Stack>
      <ModuleForm courseId={courseId} moduleId={moduleId} initialModule={initialModule ?? undefined} />
    </Stack>
  );
}
