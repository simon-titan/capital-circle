"use client";

import { DndContext, type DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Box, Button, Flex, Heading, Progress, Stack, Text } from "@chakra-ui/react";
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
      borderRadius="lg"
      borderWidth="1px"
      borderColor={isDragging ? "var(--color-accent-gold)" : "var(--color-border)"}
      bg={isDragging ? "rgba(212,175,55,0.1)" : "var(--color-surface)"}
      cursor="grab"
      {...attributes}
      {...listeners}
    >
      <Box
        w="28px"
        h="28px"
        borderRadius="full"
        bg="rgba(255,255,255,0.12)"
        display="grid"
        placeItems="center"
        className="inter-semibold"
        fontSize="sm"
      >
        {rank + 1}
      </Box>
      <Text className="inter">{text}</Text>
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
              variant="outline"
              justifyContent="flex-start"
              whiteSpace="normal"
              h="auto"
              py={3}
              px={4}
              borderColor={selected ? "var(--color-accent-gold)" : "rgba(255,255,255,0.16)"}
              bg={selected ? "rgba(212,175,55,0.14)" : "transparent"}
              color="var(--color-text-primary)"
              _hover={{ bg: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.2)" }}
              onClick={() => onChange(String(idx))}
            >
              <Text className="inter" textAlign="left">
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
          variant={value === true ? "solid" : "outline"}
          borderColor="rgba(212,175,55,0.45)"
          color={value === true ? "var(--color-white)" : "var(--color-accent-gold-light)"}
          bg={value === true ? "linear-gradient(135deg, var(--color-accent-gold) 0%, var(--color-accent-gold-dark) 100%)" : "transparent"}
          onClick={() => onChange(true)}
        >
          Wahr
        </Button>
        <Button
          flex={1}
          h="56px"
          variant={value === false ? "solid" : "outline"}
          borderColor="rgba(212,175,55,0.45)"
          color={value === false ? "var(--color-white)" : "var(--color-accent-gold-light)"}
          bg={value === false ? "linear-gradient(135deg, var(--color-accent-gold) 0%, var(--color-accent-gold-dark) 100%)" : "transparent"}
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
  const normalizedQuestions = useMemo(() => questions.map(normalizeQuestion), [questions]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAnswers({});
      setCurrentIndex(0);
      setResult(null);
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
  const total = normalizedQuestions.length;
  const current = normalizedQuestions[currentIndex] ?? null;

  const answeredCount = useMemo(
    () => normalizedQuestions.reduce((count, q) => (questionAnswered(q, answers[q.id] ?? null) ? count + 1 : count), 0),
    [answers, normalizedQuestions],
  );
  const progressPercent = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

  const submitQuiz = async () => {
    if (!total) return;
    const correct = normalizedQuestions.reduce(
      (count, question) => (questionCorrect(question, answers[question.id] ?? null) ? count + 1 : count),
      0,
    );
    const score = Math.round((correct / total) * 100);
    const passed = score >= passThreshold;
    setResult({ score, passed });
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

  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={1400}
      bg="rgba(7,8,10,0.88)"
      backdropFilter="blur(12px)"
      px={{ base: 4, md: 8 }}
      py={{ base: 6, md: 10 }}
      overflowY="auto"
      display="flex"
      justifyContent="center"
      alignItems="center"
      minH="100dvh"
    >
      <Box
        maxW="760px"
        mx="auto"
        borderRadius="24px"
        p={{ base: 5, md: 8 }}
        bg="rgba(10,11,14,0.94)"
        border="2px solid rgba(212,175,55,0.42)"
        boxShadow="0 32px 80px rgba(0,0,0,0.9)"
      >
        {result ? (
          <Stack gap={5} textAlign="center">
            {result.passed ? (
              <Box className="quiz-success-wrap" mx="auto">
                <Box className="quiz-success-ring" />
                <Box className="quiz-success-icon">
                  <CheckCircle2 size={56} />
                </Box>
              </Box>
            ) : (
              <Box
                w="84px"
                h="84px"
                mx="auto"
                borderRadius="full"
                display="grid"
                placeItems="center"
                bg="rgba(234,179,8,0.12)"
                border="1px solid rgba(234,179,8,0.38)"
                color="#FDE047"
                className="inter-bold"
                fontSize="2xl"
              >
                !
              </Box>
            )}
            <Heading size="lg" className="radley-regular" fontWeight={400}>
              {result.passed ? "Stark gemacht!" : "Fast geschafft"}
            </Heading>
            <Box
              p={3}
              borderRadius="12px"
              bg={result.passed ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.1)"}
              border={result.passed ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(234,179,8,0.3)"}
            >
              <Text className="inter" color={result.passed ? "#4ADE80" : "#FDE047"}>
                Dein Ergebnis: {result.score}% (benötigt: {passThreshold}%)
              </Text>
            </Box>
            <Text className="inter" color="var(--color-text-muted)" fontSize="sm">
              {result.passed
                ? "Du wirst in Kürze automatisch zum nächsten Modul weitergeleitet — oder tippe unten auf die Schaltfläche."
                : "Du bist nah dran - prüfe die Antworten und versuche es erneut."}
            </Text>
            {!result.passed ? (
              <Button
                onClick={() => setResult(null)}
                variant="outline"
                borderColor="rgba(212,175,55,0.45)"
                color="var(--color-accent-gold-light)"
                _hover={{ bg: "rgba(212,175,55,0.08)" }}
              >
                Erneut versuchen
              </Button>
            ) : (
              <Button
                onClick={() => {
                  if (navigatedRef.current) return;
                  navigatedRef.current = true;
                  onClose();
                  router.push(nextModuleHref?.trim() || "/ausbildung");
                }}
                className="quiz-success-cta"
                color="var(--color-white)"
                bg="linear-gradient(135deg, #22C55E 0%, #15803D 100%)"
                border="1px solid rgba(74, 222, 128, 0.65)"
                boxShadow="0 0 22px rgba(34,197,94,0.25), inset 0 1px 0 rgba(255,255,255,0.18)"
                _hover={{
                  bg: "linear-gradient(135deg, #4ADE80 0%, #22C55E 100%)",
                  transform: "translateY(-1px)",
                  boxShadow: "0 0 30px rgba(34,197,94,0.36), inset 0 1px 0 rgba(255,255,255,0.2)",
                }}
              >
                ZUM NÄCHSTEN MODUL
              </Button>
            )}
          </Stack>
        ) : (
          <Stack gap={6}>
            <Stack gap={2}>
              <Flex justify="space-between" align="center">
                <Heading size="md" className="inter-semibold" fontWeight={600}>
                  Modul-Test
                </Heading>
                <Text className="inter" fontSize="sm" color="var(--color-text-muted)">
                  {answeredCount}/{total} beantwortet
                </Text>
              </Flex>
              <Progress
                value={progressPercent}
                borderRadius="full"
                bg="rgba(255,255,255,0.14)"
                sx={{
                  "& > div": {
                    background: "linear-gradient(90deg, var(--color-accent-gold-dark) 0%, var(--color-accent-gold) 100%)",
                  },
                }}
              />
            </Stack>

            {quizMode === "single_page" ? (
              <Stack gap={6}>
                {normalizedQuestions.map((question, idx) => (
                  <Box key={question.id} p={4} borderRadius="xl" borderWidth="1px" borderColor="var(--color-border)" bg="var(--color-surface)">
                    <Text className="inter-semibold" mb={3}>
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
                <Button
                  onClick={submitQuiz}
                  isDisabled={answeredCount < total}
                  color="var(--color-white)"
                  bg="linear-gradient(135deg, var(--color-accent-gold) 0%, var(--color-accent-gold-dark) 100%)"
                  _hover={{ bg: "linear-gradient(135deg, var(--color-accent-gold-light) 0%, var(--color-accent-gold) 100%)" }}
                >
                  Test abschließen
                </Button>
              </Stack>
            ) : (
              <Stack gap={4}>
                {current ? (
                  <>
                    <Text className="inter" color="var(--color-text-muted)" fontSize="sm">
                      Frage {currentIndex + 1} von {total}
                    </Text>
                    <Text className="inter-semibold">{current.question}</Text>
                    <QuestionRenderer
                      question={current}
                      value={answers[current.id] ?? null}
                      onChange={(value) => setAnswers((prev) => ({ ...prev, [current.id]: value }))}
                      index={currentIndex}
                    />
                    <Flex justify="space-between" gap={3}>
                      <Button
                        variant="ghost"
                        onClick={() => setCurrentIndex((idx) => Math.max(0, idx - 1))}
                        isDisabled={currentIndex === 0}
                        color="var(--color-text-secondary)"
                        _hover={{ bg: "rgba(255,255,255,0.06)", color: "var(--color-text-primary)" }}
                      >
                        Zurück
                      </Button>
                      <Button
                        onClick={onNext}
                        isDisabled={!canMoveNext}
                        color="var(--color-white)"
                        bg="linear-gradient(135deg, var(--color-accent-gold) 0%, var(--color-accent-gold-dark) 100%)"
                        _hover={{ bg: "linear-gradient(135deg, var(--color-accent-gold-light) 0%, var(--color-accent-gold) 100%)" }}
                      >
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
  );
}
