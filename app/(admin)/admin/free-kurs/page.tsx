import Link from "next/link";
import { Badge, Box, Button, Divider, HStack, Stack, Text } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { CourseModulesDraggable } from "@/components/admin/CourseModulesDraggable";
import { FreeKursScan } from "@/components/admin/FreeKursScan";
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
    <Stack gap={8} maxW="var(--adminMaxWidth, 1440px)" mx="auto" px={{ base: 4, md: 6 }} py={{ base: 6, md: 8 }}>
      <Stack spacing={2}>
        <Text as="h1" className="radley-regular" fontSize={{ base: "2xl", md: "3xl" }} color="whiteAlpha.900">
          Free Kurs Verwaltung
        </Text>
        <Text className="inter" fontSize="sm" color="gray.500">
          Verwaltung des kostenlosen Kurs-Bereichs. Beide Kurse sind fuer alle eingeloggten
          Nutzer sichtbar (auch ohne Paid-Mitgliedschaft).
        </Text>
      </Stack>

      <FreeKursScan />

      {sections.map((section) => (
        <Stack
          key={section.id}
          spacing={5}
          p={{ base: 4, md: 6 }}
          borderRadius="20px"
          borderWidth="1px"
          borderColor="rgba(212,175,55,0.22)"
          bg="rgba(212,175,55,0.04)"
        >
          <Stack spacing={2}>
            <HStack spacing={3} flexWrap="wrap">
              <Text className="inter-semibold" fontSize={{ base: "lg", md: "xl" }} color="whiteAlpha.900">
                {section.title}
              </Text>
              <Badge
                px={2}
                py={0.5}
                borderRadius="md"
                variant="subtle"
                colorScheme="yellow"
                fontSize="xs"
                className="inter"
              >
                is_free = true
              </Badge>
              <Badge
                px={2}
                py={0.5}
                borderRadius="md"
                variant="subtle"
                colorScheme="gray"
                fontSize="xs"
                className="jetbrains-mono"
              >
                {section.bucketPrefix}
              </Badge>
            </HStack>
            {section.description ? (
              <Text className="inter" fontSize="sm" color="gray.400">
                {section.description}
              </Text>
            ) : null}
            <Text className="inter" fontSize="xs" color="gray.500">
              Slug:{" "}
              <Box as="span" className="jetbrains-mono" color="gray.400">
                {section.slug}
              </Box>
            </Text>
          </Stack>

          <Divider borderColor="whiteAlpha.100" />

          <HStack spacing={3} flexWrap="wrap">
            <Link href={`/admin/kurse/${section.id}/module/new`} style={{ textDecoration: "none" }}>
              <Button colorScheme="blue" size="sm" as="span">
                + Neues Modul anlegen
              </Button>
            </Link>
            <Link href={`/admin/kurse/${section.id}`} style={{ textDecoration: "none" }}>
              <Button variant="outline" size="sm" as="span" borderColor="whiteAlpha.300" color="gray.200">
                In Kurs-Detail oeffnen
              </Button>
            </Link>
          </HStack>

          {section.modules.length === 0 ? (
            <Text className="inter" fontSize="sm" color="gray.400">
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
  );
}
