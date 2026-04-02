import { Stack, Text } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { AdminCoursesManager } from "@/components/admin/AdminCoursesManager";
import { AdminModuleScan } from "@/components/admin/AdminModuleScan";
import { UnassignedModulesManager } from "@/components/admin/UnassignedModulesManager";
import { UNASSIGNED_COURSE_ID } from "@/lib/scan-modules";

export default async function AdminKursePage() {
  const supabase = await createClient();
  const { data: allCourses } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  const courseItems =
    (allCourses ?? []) as Array<{
      id: string;
      title: string;
      slug: string;
      description: string | null;
      is_free: boolean | null;
      icon: string | null;
      accent_color: string | null;
    }>;

  // Echte Kurse (ohne __unassigned__)
  const realCourses = courseItems.filter((c) => c.slug !== "__unassigned__");

  // Nicht zugeordnete Module laden
  const { data: unassignedModules } = await supabase
    .from("modules")
    .select("id,title,storage_folder_key")
    .eq("course_id", UNASSIGNED_COURSE_ID)
    .order("order_index");

  return (
    <Stack gap={8} maxW="var(--adminMaxWidth, 1440px)" mx="auto" px={{ base: 4, md: 6 }} py={{ base: 6, md: 8 }}>
      <Stack spacing={2}>
        <Text as="h1" className="radley-regular" fontSize={{ base: "2xl", md: "3xl" }} color="whiteAlpha.900">
          Bereiche & Module
        </Text>
        <Text className="inter" fontSize="sm" color="gray.500">
          Zwei logische Bereiche: Free (`is_free`) und Paid. Module haengen an einem Bereich; die Akademie zeigt
          Mitgliedern automatisch nur passende Module (Paid nur mit `profiles.is_paid`).
        </Text>
      </Stack>

      <AdminModuleScan />

      <UnassignedModulesManager
        initialModules={(unassignedModules ?? []) as Array<{ id: string; title: string; storage_folder_key: string | null }>}
        courses={realCourses.map((c) => ({ id: c.id, title: c.title }))}
      />

      <AdminCoursesManager
        initialCourses={realCourses.map((c) => ({
          id: c.id,
          title: c.title,
          slug: c.slug,
          description: c.description,
          is_free: Boolean(c.is_free),
          icon: c.icon,
          accent_color: c.accent_color,
        }))}
      />
    </Stack>
  );
}
