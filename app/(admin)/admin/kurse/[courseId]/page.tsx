import Link from "next/link";
import { Box, Button } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/adminUi";
import {
  CourseModulesDraggable,
  type ModuleVideoRow,
  type SubcategoryRow,
} from "@/components/admin/CourseModulesDraggable";
import { UNASSIGNED_COURSE_ID } from "@/lib/scan-modules";
import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function CoursePage({ params }: PageProps) {
  const { courseId } = await params;

  // Unassigned-Kurs wird auf der Kurs-Übersicht verwaltet, nicht hier
  if (courseId === UNASSIGNED_COURSE_ID) {
    redirect("/admin/kurse");
  }

  const supabase = await createClient();
  const { data: course } = await supabase.from("courses").select("id,title,slug").eq("id", courseId).single();
  const { data: allCoursesRows } = await supabase.from("courses").select("id,title").order("created_at", { ascending: false });
  const { data: modules } = await supabase
    .from("modules")
    .select("id,title,order_index")
    .eq("course_id", courseId)
    .order("order_index");
  const moduleItems = (modules ?? []) as Array<{ id: string; title: string; order_index: number }>;

  // Untermodule + Videos für die aufklappbaren Modulkacheln. Zwei Sammelabfragen
  // statt einer je Modul — bei 14 Modulen wären das sonst 28 Roundtrips.
  const moduleIds = moduleItems.map((m) => m.id);

  const { data: subRows } =
    moduleIds.length > 0
      ? await supabase
          .from("subcategories")
          .select("id,title,position,module_id")
          .in("module_id", moduleIds)
          .order("position")
      : { data: [] };

  const subIds = (subRows ?? []).map((s) => s.id as string);

  // Direkte Modul-Videos und Subkategorie-Videos in einem Rutsch.
  const { data: videoRows } =
    moduleIds.length > 0 || subIds.length > 0
      ? await supabase
          .from("videos")
          .select("id,title,position,is_published,duration_seconds,module_id,subcategory_id")
          .or(
            [
              moduleIds.length > 0 ? `module_id.in.(${moduleIds.join(",")})` : null,
              subIds.length > 0 ? `subcategory_id.in.(${subIds.join(",")})` : null,
            ]
              .filter(Boolean)
              .join(","),
          )
          .order("position")
      : { data: [] };

  return (
    <Box w="full">
      <AdminPageHeader
        title={course?.title ?? "Kurs"}
        subtitle={
          <>
            Module per Drag &amp; Drop sortieren, zum Aufklappen der Untermodule anklicken. Slug:{" "}
            <Box as="span" color="var(--cc-text-soft)">
              {course?.slug}
            </Box>
          </>
        }
        actions={
          <>
            <Link href="/admin/kurse" style={{ textDecoration: "none" }}>
              <Button variant="line" size="sm" as="span">
                ← Zurück zu allen Kursen
              </Button>
            </Link>
            <Link href={`/admin/kurse/${courseId}/module/new`} style={{ textDecoration: "none" }}>
              <Button variant="gold" size="sm" as="span">
                + Neues Modul anlegen
              </Button>
            </Link>
          </>
        }
      />

      <CourseModulesDraggable
        courseId={courseId}
        initialModules={moduleItems}
        allCourses={(allCoursesRows ?? []) as Array<{ id: string; title: string }>}
        subcategories={(subRows ?? []) as SubcategoryRow[]}
        videos={(videoRows ?? []) as ModuleVideoRow[]}
      />
    </Box>
  );
}
