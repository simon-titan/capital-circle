import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { AdminCoursesManager } from "@/components/admin/AdminCoursesManager";
import { AdminModuleScan } from "@/components/admin/AdminModuleScan";
import { UnassignedModulesManager } from "@/components/admin/UnassignedModulesManager";
import { UNASSIGNED_COURSE_ID } from "@/lib/scan-modules";

export default async function AdminKursePage() {
  const supabase = await createClient();
  const { data: allCourses } = await supabase
    .from("courses")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const courseItems =
    (allCourses ?? []) as Array<{
      id: string;
      title: string;
      slug: string;
      description: string | null;
      is_free: boolean | null;
      icon: string | null;
      accent_color: string | null;
      sort_order: number | null;
      is_sequential_exempt: boolean | null;
    }>;

  // Echte Kurse (ohne __unassigned__)
  const realCourses = courseItems.filter((c) => c.slug !== "__unassigned__");

  // Nicht zugeordnete Module laden
  const { data: unassignedModules } = await supabase
    .from("modules")
    .select("id,title,storage_folder_key")
    .eq("course_id", UNASSIGNED_COURSE_ID)
    .order("order_index");

  // Der Stapel nicht zugeordneter Videos (Migration 070). Hier nur die Anzahl —
  // einsortiert wird im Modul-Editor per Drag & Drop, weil dort Untermodule und
  // Reihenfolge sichtbar sind.
  const { count: stapelAnzahl } = await supabase
    .from("videos")
    .select("id", { count: "exact", head: true })
    .is("module_id", null)
    .is("subcategory_id", null);

  return (
    <Box w="full">
      <AdminPageHeader
        title="Bereiche & Module"
        subtitle="Zwei logische Bereiche: Free (`is_free`) und Paid. Module haengen an einem Bereich; die Akademie zeigt Mitgliedern automatisch nur passende Module (Paid nur mit `profiles.is_paid`)."
      />

      <Stack spacing={8}>
        {stapelAnzahl && stapelAnzahl > 0 ? (
          <HStack
            spacing={3}
            px={{ base: 4, md: 5 }}
            py={4}
            borderRadius="12px"
            border="1px solid var(--cc-gold-line)"
            bg="rgba(212, 176, 128, 0.06)"
            align="center"
            flexWrap="wrap"
          >
            {/*
              Icon direkt rendern statt `as={Inbox}`: Diese Seite ist eine
              Server-Komponente, Chakras Box eine Client-Komponente — eine
              Komponente als Prop ist eine Funktion über die Serialisierungsgrenze.
            */}
            <Box color="var(--cc-gold-light)" flexShrink={0} aria-hidden>
              <Inbox size={18} strokeWidth={1.75} />
            </Box>
            {/* Fliesstext bekommt eine Lesebreite, auch wenn das Banner voll breit ist. */}
            <Box flex={1} minW="240px" maxW="64rem">
              <Text fontSize="15px" fontWeight={600} color="var(--cc-text)">
                <Box as="span" className="cc-num">
                  {stapelAnzahl}
                </Box>{" "}
                {stapelAnzahl === 1 ? "Video liegt" : "Videos liegen"} unsortiert im Stapel
              </Text>
              <Text mt={0.5} fontSize="13px" color="var(--cc-text-2)">
                Sie sind in Cloudflare fertig verarbeitet, aber noch keinem Modul zugeordnet. Öffne ein Modul über
                „Bearbeiten“. Der Stapel steht dort rechts und wird per Drag &amp; Drop geleert.
              </Text>
            </Box>
          </HStack>
        ) : null}

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
            sort_order: typeof c.sort_order === "number" ? c.sort_order : 0,
            is_sequential_exempt: Boolean(c.is_sequential_exempt),
          }))}
        />
      </Stack>
    </Box>
  );
}
