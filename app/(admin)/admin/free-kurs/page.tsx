import Link from "next/link";
import { Box, Button, Divider, HStack, Stack, Text } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { CourseModulesDraggable } from "@/components/admin/CourseModulesDraggable";
import { FreeKursScan } from "@/components/admin/FreeKursScan";
import { AdminPageHeader, ADMIN_CARD_CLASS, adminCardPadding, StatusPill } from "@/components/admin/adminUi";
import {
  AUFZEICHNUNGEN_COURSE_ID,
  FREE_KURS_COURSE_ID,
} from "@/lib/scan-modules";

type FreeCourseSection = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  bucketPrefix: string;
  modules: Array<{ id: string; title: string; order_index: number; is_published: boolean | null }>;
};

export default async function AdminFreeKursPage() {
  const supabase = await createClient();

  const [{ data: freeKursCourse }, { data: aufzeichnungenCourse }] = await Promise.all([
    supabase
      .from("courses")
      .select("id,title,slug,description")
      .eq("id", FREE_KURS_COURSE_ID)
      .maybeSingle(),
    supabase
      .from("courses")
      .select("id,title,slug,description")
      .eq("id", AUFZEICHNUNGEN_COURSE_ID)
      .maybeSingle(),
  ]);

  const courseIds = [FREE_KURS_COURSE_ID, AUFZEICHNUNGEN_COURSE_ID];
  const { data: modules } = await supabase
    .from("modules")
    .select("id,title,order_index,course_id,is_published")
    .in("course_id", courseIds)
    .order("order_index");

  const { data: allCoursesRows } = await supabase
    .from("courses")
    .select("id,title")
    .order("created_at", { ascending: false });

  const byCourse = new Map<string, FreeCourseSection["modules"]>();
  for (const cid of courseIds) byCourse.set(cid, []);
  for (const m of modules ?? []) {
    const cid = m.course_id as string;
    if (!byCourse.has(cid)) continue;
    byCourse.get(cid)!.push({
      id: m.id as string,
      title: m.title as string,
      order_index: (m.order_index as number) ?? 0,
      is_published: (m.is_published as boolean | null) ?? null,
    });
  }

  const sections: FreeCourseSection[] = [
    {
      id: FREE_KURS_COURSE_ID,
      title: freeKursCourse?.title ?? "Kostenloser Einblick",
      slug: (freeKursCourse?.slug as string | null) ?? "kostenloser-einblick",
      description: (freeKursCourse?.description as string | null) ?? null,
      bucketPrefix: "FREE-KURS/FREE-VALUE/",
      modules: byCourse.get(FREE_KURS_COURSE_ID) ?? [],
    },
    {
      id: AUFZEICHNUNGEN_COURSE_ID,
      title: aufzeichnungenCourse?.title ?? "Aufzeichnungen",
      slug: (aufzeichnungenCourse?.slug as string | null) ?? "aufzeichnungen",
      description: (aufzeichnungenCourse?.description as string | null) ?? null,
      bucketPrefix: "AUFZEICHNUNGEN/",
      modules: byCourse.get(AUFZEICHNUNGEN_COURSE_ID) ?? [],
    },
  ];

  return (
    <Box maxW="var(--adminMaxWidth, 1440px)" mx="auto">
      <AdminPageHeader
        title="Free Kurs Verwaltung"
        subtitle="Verwaltung des kostenlosen Kurs-Bereichs. Beide Kurse sind für alle eingeloggten Nutzer sichtbar (auch ohne Paid-Mitgliedschaft)."
      />

      <Stack spacing={8}>
        <FreeKursScan />

        {sections.map((section) => (
          <Stack key={section.id} spacing={5} className={ADMIN_CARD_CLASS} p={adminCardPadding}>
            <Stack spacing={2}>
              <HStack spacing={3} flexWrap="wrap">
                <Text as="h2" fontSize={{ base: "17px", md: "18px" }} fontWeight={600} color="var(--cc-text)">
                  {section.title}
                </Text>
                <StatusPill tone="attention">is_free = true</StatusPill>
                <StatusPill tone="neutral">{section.bucketPrefix}</StatusPill>
              </HStack>
              {section.description ? (
                <Text fontSize="14px" color="var(--cc-text-2)">
                  {section.description}
                </Text>
              ) : null}
              <Text fontSize="13px" color="var(--cc-text-3)">
                Slug:{" "}
                <Box as="span" color="var(--cc-text-2)">
                  {section.slug}
                </Box>
              </Text>
            </Stack>

            <Divider borderColor="var(--cc-line)" />

            <HStack spacing={3} flexWrap="wrap">
              <Link href={`/admin/kurse/${section.id}/module/new`} style={{ textDecoration: "none" }}>
                <Button variant="gold" size="sm" as="span">
                  + Neues Modul anlegen
                </Button>
              </Link>
              <Link href={`/admin/kurse/${section.id}`} style={{ textDecoration: "none" }}>
                <Button variant="line" size="sm" as="span">
                  In Kurs-Detail öffnen
                </Button>
              </Link>
            </HStack>

            {section.modules.length === 0 ? (
              <Text fontSize="14px" color="var(--cc-text-2)">
                Noch keine Module. Synchronisiere oben den Bucket oder lege ein Modul manuell an.
              </Text>
            ) : (
              <CourseModulesDraggable
                courseId={section.id}
                initialModules={section.modules.map((m) => ({
                  id: m.id,
                  title: m.title,
                  order_index: m.order_index,
                }))}
                allCourses={(allCoursesRows ?? []) as Array<{ id: string; title: string }>}
              />
            )}
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
