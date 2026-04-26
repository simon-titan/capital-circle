"use client";

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  HStack,
  Heading,
  Input,
  Stack,
  Text,
  Textarea,
  VisuallyHidden,
} from "@chakra-ui/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { STEP2_QUESTIONS, INVESTMENT_LABELS, type Step2Question } from "@/config/insight-step2-questions";
import { glassPrimaryButtonProps } from "@/components/ui/glassButtonStyles";

const inputStyles = {
  bg: "rgba(255,255,255,0.04)",
  borderColor: "rgba(255,255,255,0.12)",
  color: "var(--color-text-primary)",
  _placeholder: { color: "rgba(255,255,255,0.32)" },
  _hover: { borderColor: "rgba(212,175,55,0.45)" },
  _focus: {
    borderColor: "rgba(212,175,55,0.65)",
    boxShadow: "0 0 0 1px rgba(212,175,55,0.45)",
  },
} as const;

export function InsightStep2Form() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const q of STEP2_QUESTIONS) init[q.id] = "";
    return init;
  });
  const [stepError, setStepError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const totalSteps = STEP2_QUESTIONS.length;
  const currentQuestion: Step2Question | undefined = STEP2_QUESTIONS[stepIndex];
  const progressPercent = Math.round(((stepIndex + 1) / totalSteps) * 100);

  function validateCurrent(): boolean {
    if (!currentQuestion) return false;
    const value = (answers[currentQuestion.id] ?? "").trim();

    if (currentQuestion.type === "select") {
      if (currentQuestion.required && !(currentQuestion.options ?? []).includes(value)) {
        setStepError("Bitte wähle eine Option.");
        return false;
      }
    } else if (currentQuestion.required) {
      if (!value) {
        setStepError("Dieses Feld ist Pflicht.");
        return false;
      }
      if (currentQuestion.minLength && value.length < currentQuestion.minLength) {
        setStepError(
          `Bitte mindestens ${currentQuestion.minLength} Zeichen — aktuell ${value.length}.`,
        );
        return false;
      }
    }
    setStepError(null);
    return true;
  }

  function handleNext() {
    if (!validateCurrent()) return;
    if (stepIndex < totalSteps - 1) {
      setStepIndex((i) => i + 1);
      setStepError(null);
    } else {
      void handleSubmit();
    }
  }

  function handleBack() {
    setStepError(null);
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
    }
  }

  async function handleSubmit() {
    setServerError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/applications/step2/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        redirectTo?: string;
      };

      if (!res.ok || !json.ok) {
        setServerError(json.error ?? "Bewerbung konnte nicht abgeschickt werden.");
        setSubmitting(false);
        return;
      }

      router.push(json.redirectTo ?? "/bewerbung/danke");
    } catch (err) {
      console.error(err);
      setServerError("Verbindungsfehler. Bitte erneut versuchen.");
      setSubmitting(false);
    }
  }

  if (!currentQuestion) return null;

  const currentValue = answers[currentQuestion.id] ?? "";

  return (
    <Stack spacing={5} maxW="780px" mx="auto" w="full">
      <HStack justify="space-between" align="center">
        <Text
          fontSize="xs"
          letterSpacing="0.18em"
          textTransform="uppercase"
          color="var(--color-accent-gold)"
          className="inter-semibold"
        >
          Frage {stepIndex + 1} von {totalSteps}
        </Text>
        <Text fontSize="xs" color="var(--color-text-secondary)" className="inter">
          {progressPercent}%
        </Text>
      </HStack>

      <Box
        h="5px"
        w="full"
        borderRadius="9999px"
        bg="rgba(255,255,255,0.08)"
        overflow="hidden"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <Box
          h="full"
          w={`${progressPercent}%`}
          bg="linear-gradient(90deg, #A67C00 0%, #D4AF37 100%)"
          boxShadow="0 0 8px rgba(212,175,55,0.30)"
          transition="width .3s ease"
        />
      </Box>

      <Box
        sx={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.07)",
        }}
        p={{ base: 6, md: 8 }}
      >
        <Stack spacing={5}>
          <Stack spacing={2}>
            <Text fontSize="xs" className="inter" color="var(--color-text-secondary)">
              Erweiterte Bewerbung
            </Text>
            <Heading
              as="h2"
              className="radley-regular"
              fontWeight={400}
              fontSize={{ base: "xl", md: "2xl" }}
              lineHeight="1.3"
            >
              {currentQuestion.question}
            </Heading>
          </Stack>

          {currentQuestion.type === "select" ? (
            <Stack spacing={3}>
              {(currentQuestion.options ?? []).map((opt) => {
                const selected = currentValue === opt;
                return (
                  <Box
                    key={opt}
                    as="label"
                    cursor="pointer"
                    p={4}
                    borderRadius="12px"
                    border="1px solid"
                    borderColor={selected ? "rgba(212,175,55,0.65)" : "rgba(255,255,255,0.12)"}
                    bg={selected ? "rgba(212,175,55,0.10)" : "rgba(255,255,255,0.03)"}
                    transition="all .15s ease"
                    _hover={{
                      borderColor: "rgba(212,175,55,0.45)",
                      bg: "rgba(255,255,255,0.05)",
                    }}
                    boxShadow={
                      selected
                        ? "0 0 0 1px rgba(212,175,55,0.45), 0 0 16px rgba(212,175,55,0.18)"
                        : "none"
                    }
                  >
                    <HStack spacing={3} align="center">
                      <Box
                        w="18px"
                        h="18px"
                        borderRadius="full"
                        border="1.5px solid"
                        borderColor={selected ? "var(--color-accent-gold)" : "rgba(255,255,255,0.4)"}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        flexShrink={0}
                      >
                        {selected && (
                          <Box w="8px" h="8px" borderRadius="full" bg="var(--color-accent-gold)" />
                        )}
                      </Box>
                      <VisuallyHidden>
                        <input
                          type="radio"
                          name={currentQuestion.id}
                          value={opt}
                          checked={selected}
                          onChange={() => {
                            setAnswers((a) => ({ ...a, [currentQuestion.id]: opt }));
                            if (stepError) setStepError(null);
                          }}
                        />
                      </VisuallyHidden>
                      <Text
                        className="inter-semibold"
                        fontSize="md"
                        color="var(--color-text-primary)"
                        flex="1"
                      >
                        {INVESTMENT_LABELS[opt] ?? opt}
                      </Text>
                    </HStack>
                  </Box>
                );
              })}
              {stepError && (
                <Text fontSize="sm" color="red.300" className="inter">{stepError}</Text>
              )}
            </Stack>
          ) : currentQuestion.type === "textarea" ? (
            <FormControl isInvalid={Boolean(stepError)}>
              <Textarea
                {...inputStyles}
                value={currentValue}
                onChange={(e) => {
                  setAnswers((a) => ({ ...a, [currentQuestion.id]: e.target.value }));
                  if (stepError) setStepError(null);
                }}
                placeholder={currentQuestion.placeholder}
                minH="160px"
                autoFocus
              />
              {currentQuestion.helper && (
                <FormHelperText color="rgba(255,255,255,0.4)" fontSize="xs">
                  {currentQuestion.helper}
                </FormHelperText>
              )}
              {currentQuestion.minLength && (
                <HStack justify="flex-end" mt={1}>
                  <Text
                    fontSize="xs"
                    className="inter"
                    color={
                      currentValue.trim().length >= currentQuestion.minLength
                        ? "rgba(212,175,55,0.85)"
                        : "rgba(255,255,255,0.35)"
                    }
                  >
                    {currentValue.trim().length} / {currentQuestion.minLength}
                  </Text>
                </HStack>
              )}
              <FormErrorMessage>{stepError}</FormErrorMessage>
            </FormControl>
          ) : (
            <FormControl isInvalid={Boolean(stepError)}>
              <Input
                {...inputStyles}
                value={currentValue}
                onChange={(e) => {
                  setAnswers((a) => ({ ...a, [currentQuestion.id]: e.target.value }));
                  if (stepError) setStepError(null);
                }}
                placeholder={currentQuestion.placeholder}
                autoFocus
              />
              {currentQuestion.helper && (
                <FormHelperText color="rgba(255,255,255,0.4)" fontSize="xs">
                  {currentQuestion.helper}
                </FormHelperText>
              )}
              <FormErrorMessage>{stepError}</FormErrorMessage>
            </FormControl>
          )}

          {serverError && (
            <Alert status="error" variant="subtle" bg="rgba(229,72,77,0.10)" borderRadius="12px">
              <AlertIcon />
              <Text fontSize="sm" className="inter">{serverError}</Text>
            </Alert>
          )}

          <HStack justify="space-between" pt={2} spacing={3} flexWrap="wrap">
            <Button
              variant="outline"
              onClick={handleBack}
              isDisabled={stepIndex === 0 || submitting}
              borderColor="rgba(255,255,255,0.12)"
              color="var(--color-text-secondary)"
              _hover={{
                bg: "rgba(255,255,255,0.04)",
                borderColor: "rgba(212,175,55,0.4)",
              }}
              className="inter"
            >
              ← Zurück
            </Button>

            <Button
              {...glassPrimaryButtonProps}
              w="auto"
              minW="180px"
              px={6}
              onClick={handleNext}
              isLoading={submitting}
              loadingText="Senden…"
            >
              {stepIndex === totalSteps - 1 ? "Bewerbung abschicken" : "Weiter →"}
            </Button>
          </HStack>
        </Stack>
      </Box>
    </Stack>
  );
}
