"use client";

import { DndContext, type DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Box, Button, Flex, Stack, Text, type BoxProps, type TextProps } from "@chakra-ui/react";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type BaseQuestion = {
  id: string;
  question: string;
  explanation?: string;
};

export type MultipleChoiceQuestion = BaseQuestion & {
  type: "multiple_choice";
  options: string[];
  correct_index: number;
};

export type TrueFalseQuestion = BaseQuestion & {
  type: "true_false";
  correct: boolean;
};

export type OrderingQuestion = BaseQuestion & {
  type: "ordering";
  items: string[];
  correct_order: number[];
};

export type QuizQuestion = MultipleChoiceQuestion | TrueFalseQuestion | OrderingQuestion;
export type QuizMode = "single_page" | "multi_page";

type QuizModalProps = {
  isOpen: boolean;
  onClose: () => void;
  questions: QuizQuestion[];
  quizMode?: QuizMode;
  passThreshold?: number;
  /** Nach Auswertung (bestanden oder nicht) — Fortschritt / Score persistieren */
  onQuizResult: (result: { score: number; passed: boolean }) => Promise<void> | void;
  /** Nach Bestehen: Navigation (Fallback Instituts-Übersicht) */
  nextModuleHref?: string | null;
};

type QuestionAnswer = string | boolean | number[] | null;

/* ── Stil (v3.2 „Champagner auf Graphit“) ─────────────────────────────────── */

/** Abgedunkelter Grund hinter den Test-Ebenen (DESIGN.md › Overlay). */
const OVERLAY_PROPS: BoxProps = {
  position: "fixed",
  inset: 0,
  bg: "rgba(8, 10, 12, 0.82)",
  backdropFilter: "blur(6px)",
  px: { base: 4, md: 8 },
  py: { base: 6, md: 10 },
  overflowY: "auto",
  display: "flex",
  justifyContent: "center",
  minH: "100dvh",
};

/** Panel: Graphit massiv mit Champagner-Kante — wie die übrigen Modals der Plattform. */
const PANEL_PROPS: BoxProps = {
  maxW: "760px",
  w: "100%",
  mx: "auto",
  borderRadius: "12px",
  p: { base: 5, md: 8 },
  bg: "var(--cc-panel-solid)",
  border: "1px solid var(--cc-gold-line)",
  boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(212, 176, 128, 0.08)",
};

/** Eingelassene Fläche für einzelne Fragen (keine Karte in der Karte). */
const INSET_PROPS: BoxProps = {
  p: 4,
  borderRadius: "10px",
  border: "1px solid var(--cc-line)",
  bg: "rgba(255, 255, 255, 0.02)",
};

const QUESTION_TEXT: TextProps = {
  fontSize: { base: "16px", md: "17px" },
  fontWeight: 600,
  lineHeight: 1.4,
  color: "var(--cc-text)",
};

const META_TEXT: TextProps = {
  fontSize: "14px",
  lineHeight: 1.5,
  color: "var(--cc-text-2)",
};

const SMALL_LABEL: TextProps = {
  fontSize: "12px",
  fontWeight: 500,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--cc-text-3)",
  mb: 1,
};

function normalizeQuestion(question: QuizQuestion): QuizQuestion {
  if ("type" in question && question.type) return question;
  const legacy = question as unknown as {
    id: string;
    question: string;
    options: string[];
    correct_index: number;
    explanation?: string;
  };
  return {
    type: "multiple_choice",
    id: legacy.id,
    question: legacy.question,
    options: legacy.options,
    correct_index: legacy.correct_index,
    explanation: legacy.explanation,
  };
}

function questionCorrect(question: QuizQuestion, answer: QuestionAnswer): boolean {
  if (question.type === "multiple_choice") {
    return typeof answer === "string" && Number(answer) === question.correct_index;
  }
  if (question.type === "true_false") {
    return typeof answer === "boolean" && answer === question.correct;
  }
  if (!Array.isArray(answer) || answer.length !== question.correct_order.length) return false;
  return answer.every((value, idx) => value === question.correct_order[idx]);
}

function questionAnswered(question: QuizQuestion, answer: QuestionAnswer): boolean {
  if (question.type === "multiple_choice") return typeof answer === "string" && answer.length > 0;
  if (question.type === "true_false") return typeof answer === "boolean";
  return Array.isArray(answer) && answer.length > 0;
}

function formatUserAnswer(question: QuizQuestion, answer: QuestionAnswer): string {
  if (question.type === "multiple_choice") {
    if (typeof answer !== "string" || answer === "") return "(nicht beantwortet)";
    const idx = Number(answer);
    if (Number.isNaN(idx)) return "(nicht beantwortet)";
    return question.options[idx] ?? `Option ${idx + 1}`;
  }
  if (question.type === "true_false") {
    if (typeof answer !== "boolean") return "(nicht beantwortet)";
    return answer ? "Wahr" : "Falsch";
  }
  if (!Array.isArray(answer) || answer.length !== question.items.length) return "(nicht beantwortet)";
  return answer.map((i) => question.items[i] ?? "").join(" → ");
}

function formatCorrectAnswer(question: QuizQuestion): string {
  if (question.type === "multiple_choice") {
    return question.options[question.correct_index] ?? "";
  }
  if (question.type === "true_false") {
    return question.correct ? "Wahr" : "Falsch";
  }
  return question.correct_order.map((i) => question.items[i] ?? "").join(" → ");
}

type QuizResultState = {
  score: number;
  passed: boolean;
  wrongQuestions: QuizQuestion[];
  answers: Record<string, QuestionAnswer>;
  attemptTotal: number;
};

function SortableOrderItem({
  id,
  text,
  rank,
}: {
  id: string;
  text: string;
  rank: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <Flex
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      align="center"
      gap={3}
      p={3}
      borderRadius="8px"
      border="1px solid"
      borderColor={isDragging ? "var(--cc-gold-line)" : "var(--cc-line-strong)"}
      bg={isDragging ? "var(--cc-gold-wash)" : "rgba(255, 255, 255, 0.02)"}
      boxShadow={isDragging ? "0 8px 24px rgba(0, 0, 0, 0.4), 0 0 18px rgba(212, 176, 128, 0.14)" : undefined}
      cursor="grab"
      {...attributes}
      {...listeners}
    >
      <Flex
        w="28px"
        h="28px"
        flexShrink={0}
        borderRadius="full"
        align="center"
        justify="center"
        border="1px solid var(--cc-line-strong)"
        bg="rgba(255, 255, 255, 0.04)"
        className="cc-num"
        fontSize="13px"
        fontWeight={600}
        color="var(--cc-text-soft)"
      >
        {rank + 1}
      </Flex>
      <Text fontSize="15px" lineHeight={1.45} color="var(--cc-text)">
        {text}
      </Text>
    </Flex>
  );
}

function QuestionRenderer({
  question,
  value,
  onChange,
  index,
}: {
  question: QuizQuestion;
  value: QuestionAnswer;
  onChange: (value: QuestionAnswer) => void;
  index: number;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  if (question.type === "multiple_choice") {
    return (
      <Stack gap={3}>
        {question.options.map((option, idx) => {
          const selected = value === String(idx);
          return (
            <Button
              key={`${question.id}-${idx}`}
              variant="line"
              justifyContent="flex-start"
              whiteSpace="normal"
              h="auto"
              minH="48px"
              py={3}
              px={4}
              aria-pressed={selected}
              borderColor={selected ? "var(--cc-gold-line)" : undefined}
              bg={selected ? "rgba(212, 176, 128, 0.1)" : undefined}
              boxShadow={selected ? "0 0 18px rgba(212, 176, 128, 0.12)" : undefined}
              onClick={() => onChange(String(idx))}
            >
              <Text as="span" textAlign="left" fontSize="15px" lineHeight={1.45}>
                {option}
              </Text>
            </Button>
          );
        })}
      </Stack>
    );
  }

  if (question.type === "true_false") {
    return (
      <Flex gap={3}>
        <Button
          flex={1}
          h="56px"
          variant={value === true ? "gold" : "line"}
          aria-pressed={value === true}
          onClick={() => onChange(true)}
        >
          Wahr
        </Button>
        <Button
          flex={1}
          h="56px"
          variant={value === false ? "gold" : "line"}
          aria-pressed={value === false}
          onClick={() => onChange(false)}
        >
          Falsch
        </Button>
      </Flex>
    );
  }

  const itemIds = question.items.map((_, idx) => `q${index}-i${idx}`);
  const order = Array.isArray(value) && value.length === question.items.length ? value : question.items.map((_, idx) => idx);
  const orderedIds = order.map((originalIndex) => itemIds[originalIndex]);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldPos = orderedIds.indexOf(String(active.id));
    const newPos = orderedIds.indexOf(String(over.id));
    if (oldPos < 0 || newPos < 0) return;
    const nextOrder = arrayMove(order, oldPos, newPos);
    onChange(nextOrder);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
        <Stack gap={2}>
          {order.map((originalIndex, rank) => (
            <SortableOrderItem key={itemIds[originalIndex]} id={itemIds[originalIndex]} text={question.items[originalIndex] ?? ""} rank={rank} />
          ))}
        </Stack>
      </SortableContext>
    </DndContext>
  );
}

/** Fortschritt im Test: Gold-Balken, wächst mit jeder beantworteten Frage. */
function QuizProgress({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <Box
      role="progressbar"
      aria-label="Fortschritt im Test"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      h="8px"
      w="100%"
      borderRadius="full"
      bg="rgba(255, 255, 255, 0.07)"
      overflow="hidden"
    >
      <Box
        h="100%"
        w={`${v}%`}
        bg="var(--cc-gold-bar)"
        borderRadius="full"
        boxShadow={v > 0 ? "0 0 12px rgba(212, 176, 128, 0.45)" : undefined}
        transition="width 300ms var(--cc-ease)"
      />
    </Box>
  );
}

export function QuizModal({
  isOpen,
  onClose,
  questions,
  onQuizResult,
  quizMode = "multi_page",
  passThreshold = 100,
  nextModuleHref = null,
}: QuizModalProps) {
  const router = useRouter();
  const navigatedRef = useRef(false);
  const normalizedFromProps = useMemo(() => questions.map(normalizeQuestion), [questions]);
  const [retryQuestions, setRetryQuestions] = useState<QuizQuestion[] | null>(null);
  const [showReview, setShowReview] = useState(false);
  const activeQuestions = useMemo(
    () => (retryQuestions ? retryQuestions.map(normalizeQuestion) : normalizedFromProps),
    [retryQuestions, normalizedFromProps],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({});
  const [result, setResult] = useState<QuizResultState | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAnswers({});
      setCurrentIndex(0);
      setResult(null);
      setRetryQuestions(null);
      setShowReview(false);
      navigatedRef.current = false;
    }
  }, [isOpen]);

  /** Nach Bestehen automatisch zum nächsten Modul (oder Übersicht), optional sofort per Button. */
  useEffect(() => {
    if (!result?.passed) return;
    const href = nextModuleHref?.trim() || "/ausbildung";
    const t = window.setTimeout(() => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      onClose();
      router.push(href);
    }, 2000);
    return () => window.clearTimeout(t);
  }, [result, nextModuleHref, onClose, router]);
  const total = activeQuestions.length;
  const current = activeQuestions[currentIndex] ?? null;

  const answeredCount = useMemo(
    () => activeQuestions.reduce((count, q) => (questionAnswered(q, answers[q.id] ?? null) ? count + 1 : count), 0),
    [answers, activeQuestions],
  );
  const progressPercent = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

  const submitQuiz = async () => {
    if (!total) return;
    const wrongQuestions = activeQuestions.filter((q) => !questionCorrect(q, answers[q.id] ?? null));
    const correct = total - wrongQuestions.length;
    const score = Math.round((correct / total) * 100);
    const passed = score >= passThreshold;
    setResult({
      score,
      passed,
      wrongQuestions,
      answers: { ...answers },
      attemptTotal: total,
    });
    await onQuizResult({ score, passed });
  };

  const canMoveNext = current ? questionAnswered(current, answers[current.id] ?? null) : false;

  const onNext = async () => {
    if (!current) return;
    if (currentIndex >= total - 1) {
      await submitQuiz();
      return;
    }
    setCurrentIndex((idx) => Math.min(idx + 1, total - 1));
  };

  if (!isOpen) return null;

  const reviewWrong = result && !result.passed ? result.wrongQuestions : [];

  return (
    <>
      <Box {...OVERLAY_PROPS} zIndex={1400} alignItems="center">
        <Box {...PANEL_PROPS} data-platform role="dialog" aria-modal="true" aria-labelledby="quiz-modal-title">
          {result ? (
            <Stack gap={5} textAlign="center">
              {result.passed ? (
                // Bestanden bleibt grün (semantisch) — Ring und Haken aus globals.css.
                <Box className="quiz-success-wrap" mx="auto">
                  <Box className="quiz-success-ring" />
                  <Box className="quiz-success-icon">
                    <CheckCircle2 size={56} aria-hidden />
                  </Box>
                </Box>
              ) : (
                <Flex
                  w="84px"
                  h="84px"
                  mx="auto"
                  borderRadius="full"
                  align="center"
                  justify="center"
                  bg="var(--cc-gold-wash)"
                  border="1px solid var(--cc-gold-line)"
                  color="var(--cc-gold-light)"
                  boxShadow="0 0 28px rgba(212, 176, 128, 0.16)"
                  fontSize="28px"
                  fontWeight={600}
                  aria-hidden
                >
                  !
                </Flex>
              )}
              <Text
                as="h2"
                id="quiz-modal-title"
                fontSize={{ base: "24px", md: "28px" }}
                fontWeight={600}
                letterSpacing="-0.01em"
                lineHeight={1.2}
                color="var(--cc-text)"
              >
                {result.passed ? "Stark gemacht!" : "Fast geschafft"}
              </Text>
              <Box
                p={3}
                borderRadius="10px"
                border="1px solid"
                bg={result.passed ? "rgba(74, 222, 128, 0.08)" : "var(--cc-gold-wash)"}
                borderColor={result.passed ? "rgba(74, 222, 128, 0.3)" : "rgba(212, 176, 128, 0.3)"}
              >
                <Text className="cc-num" fontWeight={500} color={result.passed ? "var(--cc-success)" : "var(--cc-gold-light)"}>
                  Dein Ergebnis: {result.score}% (benötigt: {passThreshold}%)
                </Text>
              </Box>
              <Text {...META_TEXT} lineHeight={1.6}>
                {result.passed
                  ? "Du wirst in Kürze automatisch zum nächsten Modul weitergeleitet, oder tippe unten auf die Schaltfläche."
                  : "Du bist nah dran - prüfe die Antworten und versuche es erneut."}
              </Text>
              {!result.passed ? (
                <Stack gap={3} w="100%">
                  <Button
                    variant="gold"
                    onClick={() => setShowReview(true)}
                    isDisabled={result.wrongQuestions.length === 0}
                  >
                    Falsche Antworten prüfen
                  </Button>
                  <Button
                    variant="line"
                    onClick={() => {
                      setResult(null);
                      setAnswers({});
                      setRetryQuestions(null);
                      setCurrentIndex(0);
                    }}
                  >
                    Erneut versuchen
                  </Button>
                </Stack>
              ) : (
                <Button
                  variant="gold"
                  size="lg"
                  onClick={() => {
                    if (navigatedRef.current) return;
                    navigatedRef.current = true;
                    onClose();
                    router.push(nextModuleHref?.trim() || "/ausbildung");
                  }}
                >
                  ZUM NÄCHSTEN MODUL
                </Button>
              )}
            </Stack>
          ) : (
            <Stack gap={6}>
              <Stack gap={3}>
                <Flex justify="space-between" align="center" flexWrap="wrap" gap={2}>
                  <Text
                    as="h2"
                    id="quiz-modal-title"
                    fontSize="18px"
                    fontWeight={600}
                    letterSpacing="-0.01em"
                    color="var(--cc-text)"
                  >
                    Modul-Test
                  </Text>
                  <Text {...META_TEXT} className="cc-num">
                    {answeredCount}/{total} beantwortet
                  </Text>
                </Flex>
                {retryQuestions != null && retryQuestions.length > 0 ? (
                  <Text fontSize="13px" color="var(--cc-text-2)" textAlign="left">
                    Nur falsch beantwortete Fragen
                  </Text>
                ) : null}
                <QuizProgress value={progressPercent} />
              </Stack>

              {quizMode === "single_page" ? (
                <Stack gap={6}>
                  {activeQuestions.map((question, idx) => (
                    <Box key={question.id} {...INSET_PROPS}>
                      <Text {...QUESTION_TEXT} mb={3}>
                        Frage {idx + 1}: {question.question}
                      </Text>
                      <QuestionRenderer
                        question={question}
                        value={answers[question.id] ?? null}
                        onChange={(value) => setAnswers((prev) => ({ ...prev, [question.id]: value }))}
                        index={idx}
                      />
                    </Box>
                  ))}
                  <Button variant="gold" onClick={submitQuiz} isDisabled={answeredCount < total}>
                    Test abschließen
                  </Button>
                </Stack>
              ) : (
                <Stack gap={4}>
                  {current ? (
                    <>
                      <Text {...META_TEXT} className="cc-num">
                        Frage {currentIndex + 1} von {total}
                      </Text>
                      <Text {...QUESTION_TEXT}>{current.question}</Text>
                      <QuestionRenderer
                        question={current}
                        value={answers[current.id] ?? null}
                        onChange={(value) => setAnswers((prev) => ({ ...prev, [current.id]: value }))}
                        index={currentIndex}
                      />
                      <Flex justify="space-between" gap={3} pt={1}>
                        <Button
                          variant="line"
                          onClick={() => setCurrentIndex((idx) => Math.max(0, idx - 1))}
                          isDisabled={currentIndex === 0}
                        >
                          Zurück
                        </Button>
                        <Button variant="gold" onClick={onNext} isDisabled={!canMoveNext}>
                          {currentIndex + 1 >= total ? "Auswerten" : "Weiter"}
                        </Button>
                      </Flex>
                    </>
                  ) : null}
                </Stack>
              )}
            </Stack>
          )}
        </Box>
      </Box>

      {showReview && result && !result.passed && reviewWrong.length > 0 ? (
        <Box {...OVERLAY_PROPS} zIndex={1500} alignItems="flex-start">
          <Box
            {...PANEL_PROPS}
            my={{ base: 4, md: 8 }}
            data-platform
            role="dialog"
            aria-modal="true"
            aria-labelledby="quiz-review-title"
          >
            <Stack gap={5} textAlign="left">
              <Text
                as="h2"
                id="quiz-review-title"
                fontSize={{ base: "24px", md: "28px" }}
                fontWeight={600}
                letterSpacing="-0.01em"
                lineHeight={1.2}
                color="var(--cc-text)"
                textAlign="center"
              >
                Falsche Antworten
              </Text>
              <Text {...META_TEXT} className="cc-num" textAlign="center">
                {reviewWrong.length} von {result.attemptTotal} falsch
              </Text>
              <Stack gap={4}>
                {reviewWrong.map((q, idx) => {
                  const saved = result.answers[q.id] ?? null;
                  return (
                    <Box key={q.id} {...INSET_PROPS}>
                      <Text {...QUESTION_TEXT} mb={3}>
                        Frage {idx + 1}: {q.question}
                      </Text>
                      <Stack gap={3} fontSize="15px">
                        <Box>
                          <Text {...SMALL_LABEL}>Deine Antwort</Text>
                          <Text color="var(--cc-danger)">{formatUserAnswer(q, saved)}</Text>
                        </Box>
                        <Box>
                          <Text {...SMALL_LABEL}>Richtige Antwort</Text>
                          <Text color="var(--cc-success)">{formatCorrectAnswer(q)}</Text>
                        </Box>
                        {q.explanation ? (
                          <Text {...META_TEXT} fontStyle="italic">
                            {q.explanation}
                          </Text>
                        ) : null}
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
              <Flex gap={3} flexWrap="wrap" justify="center" pt={2}>
                <Button variant="line" onClick={() => setShowReview(false)}>
                  Schließen
                </Button>
                <Button
                  variant="gold"
                  onClick={() => {
                    const wrong = result.wrongQuestions.map(normalizeQuestion);
                    setRetryQuestions(wrong);
                    setResult(null);
                    setAnswers({});
                    setShowReview(false);
                    setCurrentIndex(0);
                  }}
                >
                  Erneut versuchen
                </Button>
              </Flex>
            </Stack>
          </Box>
        </Box>
      ) : null}
    </>
  );
}
