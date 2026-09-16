import Link from "next/link";
import { Box, Button, HStack, Stack, Text } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, ADMIN_CARD_CLASS, adminRowProps, StatusPill } from "@/components/admin/adminUi";

type ModuleRow = {
  id: string;
  title: string;
  slug: string | null;
  is_published: boolean | null;
  quizzes:
    | {
        id: string;
        pass_threshold: number | null;
        questions: unknown[] | null;
      }[]
    | null;
};

export default async function AdminQuizOverviewPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("modules")
    .select("id,title,slug,is_published,quizzes(id,pass_threshold,questions)")
    .order("created_at", { ascending: false });

  const modules = (data ?? []) as ModuleRow[];

  return (
    <Box maxW="1000px" mx="auto">
      <AdminPageHeader title="Quiz Verwaltung" subtitle="Wähle ein Modul und bearbeite den Modul-Test." />

      <Box className={ADMIN_CARD_CLASS}>
        {modules.map((module) => (
          (() => {
            const quiz = module.quizzes?.[0] ?? null;
            const hasQuiz = Boolean(quiz?.id);
            const questionCount = Array.isArray(quiz?.questions) ? quiz.questions.length : 0;
            const threshold = typeof quiz?.pass_threshold === "number" ? quiz.pass_threshold : 100;
            return (
          <HStack
            key={module.id}
            px={4}
            py={3}
            spacing={4}
            justify="space-between"
            {...adminRowProps}
            _first={{ borderTopRadius: "12px" }}
            _last={{ borderBottom: "none", borderBottomRadius: "12px" }}
          >
            <Stack spacing={1.5} minW={0}>
              <Text fontSize="15px" fontWeight={600} color="var(--cc-text)">
                {module.title}
              </Text>
              <Text fontSize="12px" color="var(--cc-text-3)" wordBreak="break-all">
                {module.slug || module.id}
              </Text>
              <HStack spacing={2} flexWrap="wrap">
                <StatusPill tone={hasQuiz ? "success" : "neutral"}>
                  {hasQuiz ? "Quiz vorhanden" : "Kein Quiz"}
                </StatusPill>
                {hasQuiz ? (
                  <StatusPill tone="neutral" className="cc-num">
                    {questionCount} Fragen · {threshold}%
                  </StatusPill>
                ) : null}
              </HStack>
            </Stack>
            <Link href={`/admin/quiz/${module.id}`}>
              <Button variant="line" size="sm">
                {hasQuiz ? "Quiz bearbeiten" : "Quiz anlegen"}
              </Button>
            </Link>
          </HStack>
            );
          })()
        ))}
      </Box>
    </Box>
  );
}
