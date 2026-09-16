"use client";

import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  HStack,
  Input,
  Select,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useState } from "react";
import type { QuizMode, QuizQuestion } from "@/components/platform/QuizModal";
import { ArrowDown, ArrowUp, Eye, Plus, Trash2 } from "lucide-react";

type InitialQuiz = {
  title: string;
  quizMode: QuizMode;
  passThreshold: number;
  questions: QuizQuestion[];
};

/** Eingabefelder im Admin (DESIGN.md v3.2): Haarlinie, Fokus in Champagner. */
const fieldSx = {
  bg: "rgba(255, 255, 255, 0.03)",
  border: "1px solid",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  color: "var(--cc-text)",
  _placeholder: { color: "var(--cc-text-3)" },
  _hover: { borderColor: "rgba(255, 255, 255, 0.22)" },
  _focusVisible: { borderColor: "var(--cc-gold-line)", boxShadow: "0 0 0 1px var(--cc-gold-line)" },
} as const;

const optionSx = { "& option": { background: "var(--cc-panel-solid)", color: "var(--cc-text)" } };

const labelProps = { fontSize: "13px", fontWeight: 500, color: "var(--cc-text-soft)" } as const;

const pillBase = {
  borderRadius: "full",
  textTransform: "none",
  fontSize: "11px",
  fontWeight: 500,
  px: 2,
  py: 0.5,
} as const;

const champagnePill = { ...pillBase, bg: "rgba(212, 176, 128, 0.12)", color: "var(--cc-gold-light)" } as const;
const neutralPill = { ...pillBase, bg: "rgba(255, 255, 255, 0.06)", color: "var(--cc-text-2)" } as const;

/** Markierung der richtigen Antwort: semantisch grün, nicht Gold. */
const correctChoice = {
  bg: "rgba(74, 222, 128, 0.1)",
  borderColor: "rgba(74, 222, 128, 0.35)",
  color: "var(--cc-success)",
  _hover: { bg: "rgba(74, 222, 128, 0.14)", borderColor: "rgba(74, 222, 128, 0.5)", boxShadow: "none" },
} as const;

const idleChoice = { color: "var(--cc-text-2)" } as const;

const iconBtn = {
  size: "sm",
  variant: "ghost",
  color: "var(--cc-text-2)",
  _hover: { bg: "rgba(255, 255, 255, 0.06)", color: "var(--cc-text)" },
} as const;

function defaultMcQuestion(id: string): QuizQuestion {
  return {
    type: "multiple_choice",
    id,
    question: "",
    options: ["", "", "", ""],
    correct_index: 0,
    explanation: "Bitte erneut prüfen.",
  };
}

function PreviewPanel({
  quizMode,
  passThreshold,
  questions,
}: {
  quizMode: QuizMode;
  passThreshold: number;
  questions: QuizQuestion[];
}) {
  const previewQuestion = questions[0] ?? defaultMcQuestion("preview");
  return (
    // Sticky sitzt am Wrapper: `.cc-card` setzt selbst `position: relative`.
    <Box position={{ md: "sticky" }} top={{ md: "20px" }}>
      <Stack spacing={4} p={5} className="cc-card cc-card--still">
        <HStack justify="space-between">
          <Text fontSize="15px" fontWeight={600} color="var(--cc-text)">
            Vorschau
          </Text>
          <Badge {...champagnePill}>{quizMode === "multi_page" ? "Multi Page" : "Single Page"}</Badge>
        </HStack>
        <Text fontSize="sm" color="var(--cc-text-2)">
          So wirkt der Test für Nutzer. Bestehen ab{" "}
          <Box as="b" className="cc-num" color="var(--cc-text)">
            {passThreshold}%
          </Box>
          .
        </Text>
        <Box borderRadius="10px" border="1px solid var(--cc-line)" p={4} bg="rgba(255, 255, 255, 0.02)">
          <HStack justify="space-between" mb={3}>
            <Text fontWeight={600} color="var(--cc-text)">
              Modul-Test
            </Text>
            <Text fontSize="sm" color="var(--cc-text-2)" className="cc-num">
              {Math.max(questions.length, 1)} Fragen
            </Text>
          </HStack>
          <Box h="8px" borderRadius="full" bg="rgba(255, 255, 255, 0.07)" mb={4}>
            <Box w="35%" h="100%" borderRadius="full" bg="var(--cc-gold-bar)" />
          </Box>
          <Text color="var(--cc-text-2)" fontSize="sm" mb={2} className="cc-num">
            Frage 1 von {Math.max(questions.length, 1)}
          </Text>
          <Text fontWeight={600} color="var(--cc-text)" mb={3}>
            {previewQuestion.question || "Hier erscheint die erste Frage aus deinem Test."}
          </Text>
          <Stack spacing={2}>
            {previewQuestion.type === "multiple_choice"
              ? previewQuestion.options.map((option, idx) => (
                  <Box
                    key={`p-${idx}`}
                    p={2.5}
                    borderRadius="8px"
                    border="1px solid var(--cc-line-strong)"
                    bg="rgba(255, 255, 255, 0.03)"
                    fontSize="sm"
                    color="var(--cc-text-soft)"
                  >
                    {option || `Option ${idx + 1}`}
                  </Box>
                ))
              : null}
            {previewQuestion.type === "true_false" ? (
              <HStack>
                <Box
                  flex={1}
                  p={2.5}
                  borderRadius="8px"
                  border="1px solid var(--cc-line-strong)"
                  color="var(--cc-text-soft)"
                  textAlign="center"
                >
                  Wahr
                </Box>
                <Box
                  flex={1}
                  p={2.5}
                  borderRadius="8px"
                  border="1px solid var(--cc-line-strong)"
                  color="var(--cc-text-soft)"
                  textAlign="center"
                >
                  Falsch
                </Box>
              </HStack>
            ) : null}
            {previewQuestion.type === "ordering"
              ? previewQuestion.items.map((item, idx) => (
                  <HStack key={`o-${idx}`} p={2.5} borderRadius="8px" border="1px solid var(--cc-line-strong)">
                    <Badge {...neutralPill} className="cc-num">
                      {idx + 1}
                    </Badge>
                    <Text fontSize="sm" color="var(--cc-text-soft)">
                      {item || `Reihenfolge-Item ${idx + 1}`}
                    </Text>
                  </HStack>
                ))
              : null}
          </Stack>
        </Box>
        <Button
          leftIcon={<Eye size={16} />}
          variant="line"
          borderColor="var(--cc-gold-line)"
          color="var(--cc-gold-light)"
        >
          Vorschau aktualisiert sich live
        </Button>
      </Stack>
    </Box>
  );
}

export function QuizEditor({
  moduleId,
  moduleTitle,
  initialQuiz,
}: {
  moduleId: string;
  moduleTitle?: string | null;
  initialQuiz?: InitialQuiz;
}) {
  const [title, setTitle] = useState(initialQuiz?.title ?? "Quiz");
  const [quizMode, setQuizMode] = useState<QuizMode>(initialQuiz?.quizMode ?? "multi_page");
  const [passThreshold, setPassThreshold] = useState(initialQuiz?.passThreshold ?? 80);
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    initialQuiz?.questions?.length ? initialQuiz.questions : [defaultMcQuestion("q1")],
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const updateQuestion = (idx: number, next: QuizQuestion) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? next : q)));
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      defaultMcQuestion(`q${prev.length + 1}`),
    ]);
  };

  const normalizeOrdering = (q: QuizQuestion): QuizQuestion => {
    if (q.type !== "ordering") return q;
    const trimmedItems = q.items.map((item) => item.trim()).filter(Boolean);
    const cleanOrder = q.correct_order.filter((n) => Number.isInteger(n) && n >= 0 && n < trimmedItems.length);
    const fallback = trimmedItems.map((_, idx) => idx);
    const finalOrder = cleanOrder.length === trimmedItems.length ? cleanOrder : fallback;
    return { ...q, items: trimmedItems, correct_order: finalOrder };
  };

  const save = async () => {
    setStatus(null);
    setSaving(true);
    const payloadQuestions = questions.map(normalizeOrdering);
    const response = await fetch("/api/admin/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moduleId,
        title,
        quizMode,
        passThreshold,
        questions: payloadQuestions,
      }),
    });
    const json = (await response.json()) as { ok?: boolean; error?: string };
    setStatus(json.ok ? "Quiz gespeichert." : `Fehler: ${json.error ?? "Unbekannt"}`);
    setSaving(false);
  };

  return (
    <Grid templateColumns={{ base: "1fr", xl: "minmax(0,1.2fr) minmax(380px,0.8fr)" }} gap={6}>
      <GridItem>
        <Stack spacing={6}>
          <Stack spacing={1}>
            <Text fontSize="20px" fontWeight={600} lineHeight={1.3} color="var(--cc-text)">
              Quiz-Setup
            </Text>
            <Text fontSize="14px" color="var(--cc-text-2)" className={moduleTitle ? undefined : "cc-num"}>
              {moduleTitle ? `Modul: ${moduleTitle}` : `Modul-ID: ${moduleId}`}
            </Text>
          </Stack>

          <Stack spacing={4} p={5} className="cc-card cc-card--still">
            <FormControl>
              <FormLabel {...labelProps}>Quiz-Titel</FormLabel>
              <Input {...fieldSx} value={title} onChange={(e) => setTitle(e.target.value)} />
            </FormControl>

            <FormControl>
              <FormLabel {...labelProps}>Anzeigemodus</FormLabel>
              <Select {...fieldSx} sx={optionSx} value={quizMode} onChange={(e) => setQuizMode(e.target.value as QuizMode)}>
                <option value="multi_page">Multi Page - eine Frage pro Seite</option>
                <option value="single_page">Single Page - alle Fragen auf einer Seite</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel {...labelProps}>Pass-Schwelle</FormLabel>
              <Stack spacing={3}>
                <HStack justify="space-between">
                  <Badge {...champagnePill} px={3} py={1} className="cc-num">
                    Mindestens {passThreshold}% richtig zum Bestehen
                  </Badge>
                  <Input
                    {...fieldSx}
                    w="88px"
                    type="number"
                    className="cc-num"
                    min={1}
                    max={100}
                    value={passThreshold}
                    onChange={(e) => setPassThreshold(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
                  />
                </HStack>
                <Slider
                  min={1}
                  max={100}
                  value={passThreshold}
                  onChange={(v) => setPassThreshold(v)}
                  aria-label="Pass-Schwelle in Prozent"
                >
                  <SliderTrack bg="rgba(255, 255, 255, 0.07)">
                    <SliderFilledTrack bg="var(--cc-gold-bar)" />
                  </SliderTrack>
                  <SliderThumb bg="var(--cc-gold-light)" boxShadow="0 0 10px rgba(212, 176, 128, 0.45)" />
                </Slider>
              </Stack>
            </FormControl>
          </Stack>

          {questions.map((question, idx) => (
            <Stack key={question.id} p={5} gap={4} className="cc-card cc-card--still">
              <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                <HStack>
                  <Text fontWeight={600} color="var(--cc-text)" className="cc-num">
                    Frage {idx + 1}
                  </Text>
                  <Badge {...(question.type === "multiple_choice" ? champagnePill : neutralPill)}>
                    {question.type === "multiple_choice" ? "MC" : question.type === "true_false" ? "W/F" : "Reihenfolge"}
                  </Badge>
                </HStack>
                <HStack spacing={1}>
                  <Button
                    {...iconBtn}
                    aria-label="Frage nach oben verschieben"
                    onClick={() => {
                      if (idx === 0) return;
                      setQuestions((prev) => {
                        const next = [...prev];
                        const curr = next[idx];
                        next[idx] = next[idx - 1]!;
                        next[idx - 1] = curr!;
                        return next;
                      });
                    }}
                  >
                    <ArrowUp size={14} />
                  </Button>
                  <Button
                    {...iconBtn}
                    aria-label="Frage nach unten verschieben"
                    onClick={() => {
                      if (idx >= questions.length - 1) return;
                      setQuestions((prev) => {
                        const next = [...prev];
                        const curr = next[idx];
                        next[idx] = next[idx + 1]!;
                        next[idx + 1] = curr!;
                        return next;
                      });
                    }}
                  >
                    <ArrowDown size={14} />
                  </Button>
                  <Button
                    {...iconBtn}
                    aria-label="Frage löschen"
                    color="var(--cc-text-3)"
                    _hover={{ color: "var(--cc-danger)", bg: "rgba(248, 113, 113, 0.08)" }}
                    onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== idx))}
                    isDisabled={questions.length <= 1}
                  >
                    <Trash2 size={14} />
                  </Button>
                </HStack>
              </Flex>

              <FormControl>
                <FormLabel {...labelProps}>Fragetyp</FormLabel>
                <Select
                  {...fieldSx}
                  sx={optionSx}
                  value={question.type}
                  onChange={(e) => {
                    const type = e.target.value as QuizQuestion["type"];
                    if (type === "multiple_choice") {
                      updateQuestion(idx, {
                        type,
                        id: question.id,
                        question: question.question,
                        options: ["", "", "", ""],
                        correct_index: 0,
                        explanation: question.explanation,
                      });
                      return;
                    }
                    if (type === "true_false") {
                      updateQuestion(idx, {
                        type,
                        id: question.id,
                        question: question.question,
                        correct: true,
                        explanation: question.explanation,
                      });
                      return;
                    }
                    updateQuestion(idx, {
                      type: "ordering",
                      id: question.id,
                      question: question.question,
                      items: ["", "", ""],
                      correct_order: [0, 1, 2],
                      explanation: question.explanation,
                    });
                  }}
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="true_false">Wahr/Falsch</option>
                  <option value="ordering">Reihenfolge</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel {...labelProps}>Fragetext</FormLabel>
                <Textarea
                  {...fieldSx}
                  value={question.question}
                  onChange={(e) => updateQuestion(idx, { ...question, question: e.target.value })}
                />
              </FormControl>

              {question.type === "multiple_choice" ? (
                <Stack spacing={2}>
                  <Text {...labelProps}>Antwortoptionen und richtige Lösung</Text>
                  {question.options.map((option, optionIdx) => {
                    const isCorrect = question.correct_index === optionIdx;
                    return (
                      <HStack key={`${question.id}-${optionIdx}`}>
                        <Button
                          size="sm"
                          minW="44px"
                          variant="line"
                          aria-pressed={isCorrect}
                          {...(isCorrect ? correctChoice : idleChoice)}
                          onClick={() => updateQuestion(idx, { ...question, correct_index: optionIdx })}
                        >
                          {String.fromCharCode(65 + optionIdx)}
                        </Button>
                        <Input
                          {...fieldSx}
                          placeholder={`Option ${String.fromCharCode(65 + optionIdx)}`}
                          value={option}
                          onChange={(e) =>
                            updateQuestion(idx, {
                              ...question,
                              options: question.options.map((op, i) => (i === optionIdx ? e.target.value : op)),
                            })
                          }
                        />
                      </HStack>
                    );
                  })}
                  <Text fontSize="xs" color="var(--cc-text-3)">
                    Klicke auf A/B/C/D, um die richtige Antwort zu markieren.
                  </Text>
                </Stack>
              ) : null}

              {question.type === "true_false" ? (
                <FormControl>
                  <FormLabel {...labelProps}>Richtige Antwort</FormLabel>
                  <HStack>
                    <Button
                      flex={1}
                      variant="line"
                      aria-pressed={question.correct}
                      {...(question.correct ? correctChoice : idleChoice)}
                      onClick={() => updateQuestion(idx, { ...question, correct: true })}
                    >
                      Wahr
                    </Button>
                    <Button
                      flex={1}
                      variant="line"
                      aria-pressed={!question.correct}
                      {...(!question.correct ? correctChoice : idleChoice)}
                      onClick={() => updateQuestion(idx, { ...question, correct: false })}
                    >
                      Falsch
                    </Button>
                  </HStack>
                </FormControl>
              ) : null}

              {question.type === "ordering" ? (
                <Stack spacing={2}>
                  <FormControl>
                    <FormLabel {...labelProps}>Items (eine Zeile pro Item)</FormLabel>
                    <Textarea
                      {...fieldSx}
                      value={question.items.join("\n")}
                      onChange={(e) =>
                        updateQuestion(idx, {
                          ...question,
                          items: e.target.value.split("\n"),
                        })
                      }
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel {...labelProps}>Korrekte Reihenfolge (Indices)</FormLabel>
                    <Input
                      {...fieldSx}
                      className="cc-num"
                      placeholder="z.B. 0,2,1"
                      value={question.correct_order.join(",")}
                      onChange={(e) =>
                        updateQuestion(idx, {
                          ...question,
                          correct_order: e.target.value
                            .split(",")
                            .map((n) => Number(n.trim()))
                            .filter((n) => !Number.isNaN(n)),
                        })
                      }
                    />
                  </FormControl>
                </Stack>
              ) : null}

              <FormControl>
                <FormLabel {...labelProps}>Erklärung bei falscher Antwort</FormLabel>
                <Textarea
                  {...fieldSx}
                  placeholder="Wird dem Nutzer bei falscher Antwort angezeigt."
                  value={question.explanation ?? ""}
                  onChange={(e) => updateQuestion(idx, { ...question, explanation: e.target.value })}
                />
              </FormControl>
            </Stack>
          ))}

          <Flex
            position={{ base: "static", md: "sticky" }}
            bottom={0}
            zIndex={1}
            bg="var(--cc-panel-solid)"
            border="1px solid var(--cc-line-strong)"
            borderRadius="12px"
            boxShadow="0 -8px 24px rgba(0, 0, 0, 0.35)"
            p={3}
            justify="space-between"
            align="center"
            gap={3}
            wrap="wrap"
          >
            <HStack>
              <Button leftIcon={<Plus size={14} />} variant="line" onClick={addQuestion}>
                Frage hinzufügen
              </Button>
              <Button variant="gold" isLoading={saving} onClick={save}>
                Quiz speichern
              </Button>
            </HStack>
            {status ? (
              <Text fontSize="sm" color={status.startsWith("Fehler") ? "var(--cc-danger)" : "var(--cc-success)"} role="status">
                {status}
              </Text>
            ) : null}
          </Flex>
        </Stack>
      </GridItem>

      <GridItem>
        <PreviewPanel quizMode={quizMode} passThreshold={passThreshold} questions={questions} />
      </GridItem>
    </Grid>
  );
}
