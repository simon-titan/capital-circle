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

function defaultMcQuestion(id: string): QuizQuestion {
  return {
    type: "multiple_choice",
    id,
    question: "",
    options: ["", "", "", ""],
    correct_index: 0,
    explanation: "Bitte erneut pruefen.",
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
    <Stack
      spacing={4}
      p={5}
      borderRadius="16px"
      border="1px solid var(--color-border)"
      bg="var(--color-surface)"
      position={{ md: "sticky" }}
      top={{ md: "20px" }}
    >
      <HStack justify="space-between">
        <Text className="radley-regular" fontSize="xl" color="var(--color-text-primary)">
          Vorschau
        </Text>
        <Badge borderRadius="full" px={2} py={0.5} bg="rgba(212,175,55,0.14)" color="var(--color-accent-gold-light)">
          {quizMode === "multi_page" ? "Multi Page" : "Single Page"}
        </Badge>
      </HStack>
      <Text className="inter" fontSize="sm" color="var(--color-text-secondary)">
        So wirkt der Test für Nutzer. Bestehen ab <b>{passThreshold}%</b>.
      </Text>
      <Box borderRadius="12px" border="1px solid var(--color-border)" p={4} bg="var(--color-bg-secondary)">
        <HStack justify="space-between" mb={3}>
          <Text className="inter-semibold">Modul-Test</Text>
          <Text className="inter" fontSize="sm" color="var(--color-text-secondary)">
            {Math.max(questions.length, 1)} Fragen
          </Text>
        </HStack>
        <Box h="8px" borderRadius="full" bg="rgba(255,255,255,0.12)" mb={4}>
          <Box w="35%" h="100%" borderRadius="full" bg="linear-gradient(90deg, #A67C00 0%, #D4AF37 100%)" />
        </Box>
        <Text className="inter" color="var(--color-text-secondary)" fontSize="sm" mb={2}>
          Frage 1 von {Math.max(questions.length, 1)}
        </Text>
        <Text className="inter-semibold" mb={3}>
          {previewQuestion.question || "Hier erscheint die erste Frage aus deinem Test."}
        </Text>
        <Stack spacing={2}>
          {previewQuestion.type === "multiple_choice"
            ? previewQuestion.options.map((option, idx) => (
                <Box
                  key={`p-${idx}`}
                  p={2.5}
                  borderRadius="10px"
                  border="1px solid rgba(255,255,255,0.15)"
                  bg="rgba(255,255,255,0.03)"
                  className="inter"
                  fontSize="sm"
                >
                  {option || `Option ${idx + 1}`}
                </Box>
              ))
            : null}
          {previewQuestion.type === "true_false" ? (
            <HStack>
              <Box flex={1} p={2.5} borderRadius="10px" border="1px solid rgba(255,255,255,0.15)" className="inter" textAlign="center">
                Wahr
              </Box>
              <Box flex={1} p={2.5} borderRadius="10px" border="1px solid rgba(255,255,255,0.15)" className="inter" textAlign="center">
                Falsch
              </Box>
            </HStack>
          ) : null}
          {previewQuestion.type === "ordering"
            ? previewQuestion.items.map((item, idx) => (
                <HStack key={`o-${idx}`} p={2.5} borderRadius="10px" border="1px solid rgba(255,255,255,0.15)">
                  <Badge borderRadius="full">{idx + 1}</Badge>
                  <Text className="inter" fontSize="sm">
                    {item || `Reihenfolge-Item ${idx + 1}`}
                  </Text>
                </HStack>
              ))
            : null}
        </Stack>
      </Box>
      <Button leftIcon={<Eye size={16} />} variant="outline" borderColor="rgba(212,175,55,0.45)" color="var(--color-accent-gold-light)">
        Vorschau aktualisiert sich live
      </Button>
    </Stack>
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
          <Stack spacing={2}>
            <Text className="radley-regular" fontSize="2xl">
              Quiz-Setup
            </Text>
            <Text className="inter" color="var(--color-text-secondary)">
              {moduleTitle ? `Modul: ${moduleTitle}` : `Modul-ID: ${moduleId}`}
            </Text>
          </Stack>

          <Stack spacing={4} p={5} borderRadius="16px" border="1px solid var(--color-border)" bg="var(--color-surface)">
            <FormControl>
              <FormLabel className="inter-semibold">Quiz-Titel</FormLabel>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </FormControl>

            <FormControl>
              <FormLabel className="inter-semibold">Anzeigemodus</FormLabel>
              <Select value={quizMode} onChange={(e) => setQuizMode(e.target.value as QuizMode)}>
                <option value="multi_page">Multi Page - eine Frage pro Seite</option>
                <option value="single_page">Single Page - alle Fragen auf einer Seite</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel className="inter-semibold">Pass-Schwelle</FormLabel>
              <Stack spacing={2}>
                <HStack justify="space-between">
                  <Badge borderRadius="full" px={3} py={1} bg="rgba(212,175,55,0.14)" color="var(--color-accent-gold-light)">
                    Mindestens {passThreshold}% richtig zum Bestehen
                  </Badge>
                  <Input
                    w="88px"
                    type="number"
                    min={1}
                    max={100}
                    value={passThreshold}
                    onChange={(e) => setPassThreshold(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
                  />
                </HStack>
                <Slider min={1} max={100} value={passThreshold} onChange={(v) => setPassThreshold(v)}>
                  <SliderTrack bg="rgba(255,255,255,0.15)">
                    <SliderFilledTrack bg="linear-gradient(90deg, #A67C00 0%, #D4AF37 100%)" />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </Stack>
            </FormControl>
          </Stack>

          {questions.map((question, idx) => (
            <Stack key={question.id} p={5} borderWidth="1px" borderColor="var(--color-border)" borderRadius="lg" gap={4} bg="var(--color-surface)">
              <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                <HStack>
                  <Text className="inter-semibold">Frage {idx + 1}</Text>
                  <Badge
                    borderRadius="full"
                    bg={question.type === "multiple_choice" ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.10)"}
                          color={question.type === "multiple_choice" ? "var(--color-accent-gold-light)" : "var(--color-text-secondary)"}
                  >
                    {question.type === "multiple_choice" ? "MC" : question.type === "true_false" ? "W/F" : "Reihenfolge"}
                  </Badge>
                </HStack>
                <HStack>
                  <Button
                    size="sm"
                    variant="ghost"
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
                    size="sm"
                    variant="ghost"
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
                    size="sm"
                    variant="ghost"
                    color="var(--color-text-muted)"
                    _hover={{ color: "#F87171", bg: "rgba(239,68,68,0.08)" }}
                    onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== idx))}
                    isDisabled={questions.length <= 1}
                  >
                    <Trash2 size={14} />
                  </Button>
                </HStack>
              </Flex>

              <FormControl>
                <FormLabel className="inter-semibold" fontSize="sm">
                  Fragetyp
                </FormLabel>
                <Select
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
                <FormLabel className="inter-semibold" fontSize="sm">
                  Fragetext
                </FormLabel>
                <Textarea value={question.question} onChange={(e) => updateQuestion(idx, { ...question, question: e.target.value })} />
              </FormControl>

              {question.type === "multiple_choice" ? (
                <Stack spacing={2}>
                  <Text className="inter-semibold" fontSize="sm">
                    Antwortoptionen und richtige Lösung
                  </Text>
                  {question.options.map((option, optionIdx) => (
                    <HStack key={`${question.id}-${optionIdx}`}>
                      <Button
                        size="sm"
                        minW="44px"
                        variant={question.correct_index === optionIdx ? "solid" : "outline"}
                        color={question.correct_index === optionIdx ? "var(--color-white)" : "var(--color-accent-gold-light)"}
                        bg={
                          question.correct_index === optionIdx
                            ? "linear-gradient(135deg, var(--color-accent-gold) 0%, var(--color-accent-gold-dark) 100%)"
                            : "transparent"
                        }
                        borderColor="rgba(212,175,55,0.45)"
                        onClick={() => updateQuestion(idx, { ...question, correct_index: optionIdx })}
                      >
                        {String.fromCharCode(65 + optionIdx)}
                      </Button>
                      <Input
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
                  ))}
                  <Text className="inter" fontSize="xs" color="var(--color-text-tertiary)">
                    Klicke auf A/B/C/D, um die richtige Antwort zu markieren.
                  </Text>
                </Stack>
              ) : null}

              {question.type === "true_false" ? (
                <FormControl>
                  <FormLabel className="inter-semibold" fontSize="sm">
                    Richtige Antwort
                  </FormLabel>
                  <HStack>
                    <Button
                      flex={1}
                      variant={question.correct ? "solid" : "outline"}
                      color={question.correct ? "var(--color-white)" : "var(--color-accent-gold-light)"}
                      bg={question.correct ? "linear-gradient(135deg, var(--color-accent-gold) 0%, var(--color-accent-gold-dark) 100%)" : "transparent"}
                      borderColor="rgba(212,175,55,0.45)"
                      onClick={() => updateQuestion(idx, { ...question, correct: true })}
                    >
                      Wahr
                    </Button>
                    <Button
                      flex={1}
                      variant={!question.correct ? "solid" : "outline"}
                      color={!question.correct ? "var(--color-white)" : "var(--color-accent-gold-light)"}
                      bg={!question.correct ? "linear-gradient(135deg, var(--color-accent-gold) 0%, var(--color-accent-gold-dark) 100%)" : "transparent"}
                      borderColor="rgba(212,175,55,0.45)"
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
                    <FormLabel className="inter-semibold" fontSize="sm">
                      Items (eine Zeile pro Item)
                    </FormLabel>
                    <Textarea
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
                    <FormLabel className="inter-semibold" fontSize="sm">
                      Korrekte Reihenfolge (Indices)
                    </FormLabel>
                    <Input
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
                <FormLabel className="inter-semibold" fontSize="sm">
                  Erklärung bei falscher Antwort
                </FormLabel>
                <Textarea
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
            bg="rgba(12,13,16,0.94)"
            backdropFilter="blur(10px)"
            border="1px solid rgba(255,255,255,0.08)"
            borderRadius="14px"
            p={3}
            justify="space-between"
            align="center"
            gap={3}
            wrap="wrap"
          >
            <HStack>
              <Button leftIcon={<Plus size={14} />} variant="outline" borderColor="rgba(212,175,55,0.45)" color="var(--color-accent-gold-light)" onClick={addQuestion}>
                Frage hinzufügen
              </Button>
              <Button
                isLoading={saving}
                onClick={save}
                color="var(--color-white)"
                bg="linear-gradient(135deg, var(--color-accent-gold) 0%, var(--color-accent-gold-dark) 100%)"
                _hover={{ bg: "linear-gradient(135deg, var(--color-accent-gold-light) 0%, var(--color-accent-gold) 100%)" }}
              >
                Quiz speichern
              </Button>
            </HStack>
            {status ? <Text className="inter" fontSize="sm">{status}</Text> : null}
          </Flex>
        </Stack>
      </GridItem>

      <GridItem>
        <PreviewPanel quizMode={quizMode} passThreshold={passThreshold} questions={questions} />
      </GridItem>
    </Grid>
  );
}
