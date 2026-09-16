import Link from "next/link";
import { Box } from "@chakra-ui/react";
import { QuizEditor } from "@/components/admin/QuizEditor";
import { AdminPageHeader } from "@/components/admin/adminUi";
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
    <Box>
      {/* Link aussen herum statt `as={Link}` — siehe app/(admin)/admin/page.tsx. */}
      <Link href="/admin/quiz" style={{ textDecoration: "none" }}>
        <Box
          display="inline-block"
          mb={3}
          fontSize="14px"
          color="var(--cc-text-2)"
          transition="color 150ms var(--cc-ease)"
          _hover={{ color: "var(--cc-gold-light)" }}
        >
          ← Zur Quiz-Übersicht
        </Box>
      </Link>
      <AdminPageHeader title={`Quiz / ${module?.title ?? moduleId}`} />
      <QuizEditor moduleId={moduleId} initialQuiz={initialQuiz} moduleTitle={module?.title ?? null} />
    </Box>
  );
}
