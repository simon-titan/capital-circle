import { Stack, Text } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { AdminCoursesManager } from "@/components/admin/AdminCoursesManager";
import { AdminModuleScan } from "@/components/admin/AdminModuleScan";

export default async function AdminKursePage() {
  const supabase = await createClient();
  const { data: courses } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
  const courseItems =
    (courses ?? []) as Array<{
      id: string;
      title: string;
      slug: string;
      description: string | null;
      is_free: boolean | null;
      icon: string | null;
      accent_color: string | null;
    }>;

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
      <AdminModuleScan
        courses={courseItems.map((c) => ({
          id: c.id,
          title: c.title,
          isFree: Boolean(c.is_free),
        }))}
      />
      <AdminCoursesManager
        initialCourses={courseItems.map((c) => ({
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
