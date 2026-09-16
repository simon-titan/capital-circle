import { Box } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { ModuleForm } from "@/components/admin/ModuleForm";

type PageProps = {
  params: Promise<{ courseId: string; moduleId: string }>;
};

export default async function EditModulePage({ params }: PageProps) {
  const { courseId, moduleId } = await params;
  const supabase = await createClient();
  const { data: mod } = await supabase
    .from("modules")
    .select("id,title,description,order_index,is_published,is_locked,slug,thumbnail_storage_key")
    .eq("id", moduleId)
    .single();

  const initialModule = mod as
    | {
        id: string;
        title: string;
        description: string | null;
        order_index: number;
        is_published: boolean;
        is_locked?: boolean;
        slug: string | null;
        thumbnail_storage_key: string | null;
      }
    | null;

  return (
    <Box w="full">
      <AdminPageHeader title="Modul bearbeiten" subtitle="Metadaten, Videos und Subkategorien verwalten." />
      <ModuleForm courseId={courseId} moduleId={moduleId} initialModule={initialModule ?? undefined} />
    </Box>
  );
}
