import Link from "next/link";
import { Badge, Box, Button, HStack, Stack, Text } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";

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
    <Stack gap={6} maxW="1000px" mx="auto">
      <Stack spacing={1}>
        <Text as="h1" className="radley-regular" fontSize={{ base: "2xl", md: "3xl" }} color="var(--color-text-primary)">
          Quiz Verwaltung
        </Text>
        <Text className="inter" fontSize="sm" color="var(--color-text-secondary)">
          Wähle ein Modul und bearbeite den Modul-Test.
        </Text>
      </Stack>

      <Box border="1px solid var(--color-border-default)" borderRadius="16px" overflow="hidden" bg="rgba(255,255,255,0.03)">
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
            justify="space-between"
            borderBottom="1px solid rgba(255,255,255,0.06)"
            _last={{ borderBottom: "none" }}
            _hover={{ bg: "rgba(255,255,255,0.04)" }}
          >
            <Stack spacing={1.5}>
              <Text className="inter-semibold" color="var(--color-text-primary)">
                {module.title}
              </Text>
              <Text className="jetbrains-mono" fontSize="xs" color="var(--color-text-tertiary)">
                {module.slug || module.id}
              </Text>
              <HStack spacing={2} flexWrap="wrap">
                <Badge
                  borderRadius="full"
                  px={2}
                  py={0.5}
                  bg={hasQuiz ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.08)"}
                  color={hasQuiz ? "var(--color-accent-gold-light)" : "var(--color-text-secondary)"}
                  border="1px solid"
                  borderColor={hasQuiz ? "rgba(212,175,55,0.35)" : "rgba(255,255,255,0.15)"}
                >
                  {hasQuiz ? "Quiz vorhanden" : "Kein Quiz"}
                </Badge>
                {hasQuiz ? (
                  <Badge borderRadius="full" px={2} py={0.5} bg="rgba(255,255,255,0.08)" color="var(--color-text-secondary)">
                    {questionCount} Fragen · {threshold}%
                  </Badge>
                ) : null}
              </HStack>
            </Stack>
            <Link href={`/admin/quiz/${module.id}`}>
              <Button
                variant="outline"
                borderColor="rgba(212,175,55,0.45)"
                color="var(--color-accent-gold-light)"
                _hover={{ bg: "rgba(212,175,55,0.08)", borderColor: "rgba(212,175,55,0.7)" }}
              >
                {hasQuiz ? "Quiz bearbeiten" : "Quiz anlegen"}
              </Button>
            </Link>
          </HStack>
            );
          })()
        ))}
      </Box>
    </Stack>
  );
}
