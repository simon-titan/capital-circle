import Link from "next/link";
import { Heading, Stack, Text } from "@chakra-ui/react";
import { QuizEditor } from "@/components/admin/QuizEditor";
import { createClient } from "@/lib/supabase/server";
import type { QuizMode, QuizQuestion } from "@/components/platform/QuizModal";

type PageProps = {
  params: Promise<{ moduleId: string }>;
};

export default async function AdminQuizPage({ params }: PageProps) {
  const { moduleId } = await params;
  const supabase = await createClient();
  const [{ data: module }, { data: quiz }] = await Promise.all([
    supabase.from("modules").select("id,title").eq("id", moduleId).maybeSingle(),
    supabase
      .from("quizzes")
      .select("title,pass_threshold,quiz_mode,questions")
      .eq("module_id", moduleId)
      .maybeSingle(),
  ]);

  const initialQuiz = {
    title: typeof quiz?.title === "string" && quiz.title.length > 0 ? quiz.title : "Quiz",
    passThreshold: typeof quiz?.pass_threshold === "number" ? quiz.pass_threshold : 100,
    quizMode: quiz?.quiz_mode === "single_page" ? ("single_page" as QuizMode) : ("multi_page" as QuizMode),
    questions: Array.isArray(quiz?.questions) ? (quiz.questions as QuizQuestion[]) : [],
  };

  return (
    <Stack gap={6}>
      <Stack spacing={1}>
        <Link href="/admin/quiz" className="inter" style={{ color: "var(--color-accent-gold-light)", fontSize: "0.875rem" }}>
          ← Zur Quiz-Übersicht
        </Link>
        <Heading size="md" className="radley-regular" fontWeight={400}>
          Quiz / {module?.title ?? moduleId}
        </Heading>
      </Stack>
      <QuizEditor moduleId={moduleId} initialQuiz={initialQuiz} moduleTitle={module?.title ?? null} />
    </Stack>
  );
}
