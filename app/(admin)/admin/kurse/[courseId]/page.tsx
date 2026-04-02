import Link from "next/link";
import { Box, Button, HStack, Stack, Text } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { CourseModulesDraggable } from "@/components/admin/CourseModulesDraggable";

type PageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function CoursePage({ params }: PageProps) {
  const { courseId } = await params;
  const supabase = await createClient();
  const { data: course } = await supabase.from("courses").select("id,title,slug").eq("id", courseId).single();
  const { data: allCoursesRows } = await supabase.from("courses").select("id,title").order("created_at", { ascending: false });
  const { data: modules } = await supabase
    .from("modules")
    .select("id,title,order_index")
    .eq("course_id", courseId)
    .order("order_index");
  const moduleItems = (modules ?? []) as Array<{ id: string; title: string; order_index: number }>;

  return (
    <Stack gap={8} maxW="var(--adminMaxWidth, 1440px)" mx="auto" px={{ base: 4, md: 6 }} py={{ base: 6, md: 8 }}>
      <Stack spacing={2}>
        <Text as="h1" className="radley-regular" fontSize={{ base: "xl", md: "2xl" }} color="whiteAlpha.900">
          {course?.title ?? "Kurs"}
        </Text>
        <Text className="inter" fontSize="sm" color="gray.500">
          Module per Drag & Drop sortieren. Slug:{" "}
          <Box as="span" className="jetbrains-mono" color="gray.400">
            {course?.slug}
          </Box>
        </Text>
      </Stack>

      <HStack spacing={3} flexWrap="wrap">
        <Link href={`/admin/kurse/${courseId}/module/new`} style={{ textDecoration: "none" }}>
          <Button colorScheme="blue" size="md" as="span">
            + Neues Modul anlegen
          </Button>
        </Link>
        <Link href="/admin/kurse" style={{ textDecoration: "none" }}>
          <Button variant="outline" size="md" as="span" borderColor="whiteAlpha.300" color="gray.200">
            ← Zurück zu allen Kursen
          </Button>
        </Link>
      </HStack>

      <CourseModulesDraggable
        courseId={courseId}
        initialModules={moduleItems}
        allCourses={(allCoursesRows ?? []) as Array<{ id: string; title: string }>}
      />
    </Stack>
  );
}
