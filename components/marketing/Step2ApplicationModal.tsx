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
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  Textarea,
  VisuallyHidden,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { STEP2_QUESTIONS, INVESTMENT_LABELS, type Step2Question } from "@/config/insight-step2-questions";
import { glassPrimaryButtonProps } from "@/components/ui/glassButtonStyles";

const WARNING_SECONDS = 5;

const inputStyles = {
  bg: "rgba(255,255,255,0.04)",
  borderColor: "rgba(255,255,255,0.10)",
  color: "var(--color-text-primary)",
  _placeholder: {
    color: "rgba(255,255,255,0.28)",
    fontStyle: "italic" as const,
  },
  _hover: { borderColor: "rgba(212,175,55,0.40)" },
  _focus: {
    borderColor: "rgba(212,175,55,0.65)",
    boxShadow: "0 0 0 1px rgba(212,175,55,0.45)",
    bg: "rgba(212,175,55,0.04)",
  },
  transition: "all 200ms ease",
} as const;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function Step2ApplicationModal({ isOpen, onClose }: Props) {
  const router = useRouter();
  const totalSteps = STEP2_QUESTIONS.length;

  const [showWarning, setShowWarning] = useState(true);
  const [warningCountdown, setWarningCountdown] = useState(WARNING_SECONDS);
  const [warningFadingOut, setWarningFadingOut] = useState(false);

  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const q of STEP2_QUESTIONS) init[q.id] = "";
    return init;
  });
  const [stepError, setStepError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const currentQuestion: Step2Question | undefined = STEP2_QUESTIONS[stepIndex];
  const currentValue = currentQuestion ? (answers[currentQuestion.id] ?? "") : "";
  const progressPct = ((stepIndex + 1) / totalSteps) * 100;
  const isLastStep = stepIndex === totalSteps - 1;

  // Warning countdown
  useEffect(() => {
    if (!isOpen || !showWarning || warningFadingOut) return;
    if (warningCountdown <= 0) return;
    const timer = setTimeout(() => setWarningCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [isOpen, showWarning, warningCountdown, warningFadingOut]);

  function dismissWarning() {
    setWarningFadingOut(true);
    setTimeout(() => {
      setShowWarning(false);
      setWarningFadingOut(false);
    }, 300);
  }

  // Auto-redirect after thanks
  useEffect(() => {
    if (!submitted) return;
    const timer = setTimeout(() => {
      router.push("/bewerbung/danke");
    }, 3000);
    return () => clearTimeout(timer);
  }, [submitted, router]);

  const resetModal = useCallback(() => {
    setShowWarning(true);
    setWarningCountdown(WARNING_SECONDS);
    setWarningFadingOut(false);
    setStepIndex(0);
    const init: Record<string, string> = {};
    for (const q of STEP2_QUESTIONS) init[q.id] = "";
    setAnswers(init);
    setStepError(null);
    setServerError(null);
    setSubmitting(false);
    setSubmitted(false);
  }, []);

  const handleClose = useCallback(() => {
    if (submitted || showWarning) return;
    resetModal();
    onClose();
  }, [submitted, showWarning, resetModal, onClose]);

  const currentStepMeetsMin = useMemo(() => {
    if (!currentQuestion) return false;
    if (currentQuestion.type === "select") {
      return (currentQuestion.options ?? []).includes(currentValue);
    }
    if (currentQuestion.required) {
      const len = currentValue.trim().length;
      if (!len) return false;
      if (currentQuestion.minLength && len < currentQuestion.minLength) return false;
    }
    return true;
  }, [currentQuestion, currentValue]);

  function validateStep(): boolean {
    if (!currentQuestion) return false;
    const value = currentValue.trim();

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
        setStepError(`Bitte mindestens ${currentQuestion.minLength} Zeichen — aktuell ${value.length}.`);
        return false;
      }
    }
    setStepError(null);
    return true;
  }

  async function handleNext() {
    setServerError(null);
    if (!validateStep()) return;

    if (!isLastStep) {
      setStepIndex((i) => i + 1);
      setStepError(null);
      return;
    }

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

      setSubmitted(true);
    } catch {
      setServerError("Verbindungsfehler. Bitte erneut versuchen.");
      setSubmitting(false);
    }
  }

  function handleBack() {
    setStepError(null);
    setServerError(null);
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }

  if (!currentQuestion && !submitted) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="xl"
      scrollBehavior="inside"
      closeOnOverlayClick={!showWarning && !submitted}
      closeOnEsc={!showWarning && !submitted}
      isCentered
    >
      <ModalOverlay
        bg="rgba(0,0,0,0.78)"
        backdropFilter="blur(14px)"
        sx={{ WebkitBackdropFilter: "blur(14px)" }}
      />
      <ModalContent
        minH={{ base: "min(78dvh, 720px)", md: "min(620px, 86vh)" }}
        sx={{
          position: "relative",
          overflow: "hidden",
          background: "rgba(10,10,12,0.94)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "24px",
          boxShadow:
            "0 24px 80px rgba(0,0,0,0.80), 0 0 0 1px rgba(212,175,55,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
          _before: {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "150px",
            background:
              "radial-gradient(ellipse at top, rgba(212,175,55,0.07), transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          },
        }}
        maxW="680px"
        mx={4}
      >
        {/* Warning overlay */}
        {showWarning && (
          <WarningOverlay
            countdown={warningCountdown}
            fadingOut={warningFadingOut}
            onDismiss={dismissWarning}
          />
        )}

        <ModalHeader
          px={6}
          pt={6}
          pb={0}
          position="relative"
          zIndex={1}
          aria-hidden={showWarning}
          sx={{
            visibility: showWarning ? "hidden" : "visible",
            pointerEvents: showWarning ? "none" : "auto",
          }}
        >
          {!submitted && (
            <Stack spacing={4}>
              <HStack justify="space-between" align="center">
                <Text
                  fontSize="10px"
                  letterSpacing="0.22em"
                  textTransform="uppercase"
                  color="var(--color-accent-gold)"
                  className="inter-semibold"
                >
                  Capital Circle · Erweiterte Bewerbung
                </Text>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  color="rgba(255,255,255,0.35)"
                  _hover={{
                    color: "rgba(255,255,255,0.7)",
                    bg: "rgba(255,255,255,0.06)",
                  }}
                  borderRadius="8px"
                  minW="auto"
                  px={2}
                  fontSize="lg"
                >
                  ×
                </Button>
              </HStack>

              <StepIndicator current={stepIndex + 1} total={totalSteps} />

              <Box
                h="2px"
                w="full"
                bg="rgba(255,255,255,0.06)"
                borderRadius="full"
                overflow="hidden"
              >
                <Box
                  h="full"
                  w={`${progressPct}%`}
                  bg="linear-gradient(90deg, rgba(212,175,55,0.6) 0%, rgba(212,175,55,1) 100%)"
                  borderRadius="full"
                  boxShadow="0 0 10px rgba(212,175,55,0.4)"
                  transition="width 0.4s cubic-bezier(0.4,0,0.2,1)"
                />
              </Box>
            </Stack>
          )}
        </ModalHeader>

        <ModalBody
          px={6}
          py={6}
          position="relative"
          zIndex={1}
          aria-hidden={showWarning}
          sx={{
            visibility: showWarning ? "hidden" : "visible",
            pointerEvents: showWarning ? "none" : "auto",
          }}
        >
          <Box
            key={submitted ? "thanks" : stepIndex}
            sx={{ animation: "appStepEnter 0.3s cubic-bezier(0.16,1,0.3,1)" }}
          >
            {submitted ? (
              <ThanksStep />
            ) : currentQuestion?.type === "select" ? (
              <SelectStep
                question={currentQuestion}
                value={currentValue}
                onChange={(v) => {
                  setAnswers((a) => ({ ...a, [currentQuestion.id]: v }));
                  if (stepError) setStepError(null);
                }}
                error={stepError}
              />
            ) : currentQuestion?.type === "textarea" ? (
              <TextareaStep
                question={currentQuestion}
                value={currentValue}
                onChange={(v) => {
                  setAnswers((a) => ({ ...a, [currentQuestion.id]: v }));
                  if (stepError) setStepError(null);
                }}
                error={stepError}
              />
            ) : currentQuestion ? (
              <TextInputStep
                question={currentQuestion}
                value={currentValue}
                onChange={(v) => {
                  setAnswers((a) => ({ ...a, [currentQuestion.id]: v }));
                  if (stepError) setStepError(null);
                }}
                error={stepError}
              />
            ) : null}

            {serverError && (
              <Alert status="error" variant="subtle" bg="rgba(229,72,77,0.10)" borderRadius="12px" mt={4}>
                <AlertIcon />
                <Text fontSize="sm" className="inter">{serverError}</Text>
              </Alert>
            )}
          </Box>
        </ModalBody>

        {!submitted && (
          <ModalFooter
            px={6}
            pb={5}
            pt={2}
            gap={3}
            flexDirection="column"
            position="relative"
            zIndex={1}
            aria-hidden={showWarning}
            sx={{
              visibility: showWarning ? "hidden" : "visible",
              pointerEvents: showWarning ? "none" : "auto",
            }}
          >
            {isLastStep ? (
              <Button
                variant="unstyled"
                display="flex"
                alignItems="center"
                justifyContent="center"
                gap={2}
                w="full"
                minH="48px"
                fontWeight="600"
                fontSize="md"
                borderRadius="12px"
                color="white"
                bg="rgba(34,197,94,0.55)"
                borderWidth="1px"
                borderColor="rgba(34,197,94,0.65)"
                boxShadow="inset 0 1px 0 rgba(255,255,255,0.12)"
                _hover={
                  currentStepMeetsMin
                    ? {
                        bg: "rgba(34,197,94,0.70)",
                        borderColor: "rgba(74,222,128,0.75)",
                        boxShadow:
                          "0 0 24px rgba(34,197,94,0.30), inset 0 1px 0 rgba(255,255,255,0.12)",
                        transform: "translateY(-1px)",
                      }
                    : {}
                }
                _active={{ bg: "rgba(22,163,74,0.65)" }}
                _disabled={{
                  opacity: 0.5,
                  cursor: "not-allowed",
                  transform: "none",
                  boxShadow: "none",
                }}
                transition="all 200ms ease"
                onClick={handleNext}
                isLoading={submitting}
                isDisabled={!currentStepMeetsMin}
                loadingText="Bewerbung wird abgeschickt…"
                className="inter-semibold"
              >
                <Box as="span" fontSize="18px" lineHeight="1">✓</Box>
                Bewerbung absenden
              </Button>
            ) : (
              <Button
                {...glassPrimaryButtonProps}
                color="white"
                onClick={handleNext}
                isDisabled={!currentStepMeetsMin}
                _hover={
                  currentStepMeetsMin
                    ? {
                        ...glassPrimaryButtonProps._hover,
                        color: "white",
                        boxShadow: "0 0 24px rgba(212,175,55,0.25)",
                        transform: "translateY(-1px)",
                      }
                    : {}
                }
                transition="all 200ms ease"
              >
                Weiter
              </Button>
            )}

            {stepIndex > 0 && (
              <Button
                variant="ghost"
                w="full"
                size="sm"
                onClick={handleBack}
                color="rgba(255,255,255,0.45)"
                _hover={{
                  color: "rgba(255,255,255,0.75)",
                  bg: "rgba(255,255,255,0.05)",
                  borderColor: "rgba(212,175,55,0.25)",
                }}
                borderRadius="10px"
                border="1px solid transparent"
                transition="all 200ms ease"
                className="inter"
              >
                ← Zurück
              </Button>
            )}

            <Text
              fontSize="9px"
              color="rgba(255,255,255,0.18)"
              className="inter"
              textAlign="center"
            >
              Mit dem Absenden stimmst du unserer{" "}
              <Box
                as="a"
                href="/datenschutz"
                target="_blank"
                color="rgba(255,255,255,0.28)"
                textDecoration="underline"
              >
                Datenschutzerklärung
              </Box>{" "}
              zu.
            </Text>
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  );
}

/* ================================================================
   Warning Overlay
   ================================================================ */

function WarningOverlay({
  countdown,
  fadingOut,
  onDismiss,
}: {
  countdown: number;
  fadingOut: boolean;
  onDismiss: () => void;
}) {
  const canDismiss = countdown <= 0;

  return (
    <Box
      position="absolute"
      inset={0}
      zIndex={10}
      borderRadius="inherit"
      w="100%"
      minH="100%"
      h="100%"
      display="flex"
      flexDirection="column"
      alignItems="stretch"
      justifyContent="center"
      textAlign="center"
      px={6}
      pt={{
        base: "max(24px, env(safe-area-inset-top, 0px))",
        md: 6,
      }}
      pb={{
        base: "max(24px, env(safe-area-inset-bottom, 0px))",
        md: 6,
      }}
      overflowX="hidden"
      overflowY="auto"
      sx={{
        minHeight: "100%",
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
        background: "rgba(10,10,12,0.88)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: "2px solid rgba(220,60,60,0.35)",
        animation: fadingOut ? "appWarningFadeOut 0.3s ease forwards" : undefined,
      }}
    >
      <Box w="100%" maxW="100%" flexShrink={0} mx="auto">
        <Box
          w="48px"
          h="3px"
          borderRadius="full"
          bg="linear-gradient(90deg, rgba(220,60,60,0.6), rgba(220,60,60,0.2))"
          mb={{ base: 3, md: 5 }}
          mx="auto"
        />

        <Box
          w={{ base: "48px", md: "56px" }}
          h={{ base: "48px", md: "56px" }}
          borderRadius="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="rgba(220,60,60,0.10)"
          border="1.5px solid rgba(220,60,60,0.30)"
          mb={{ base: 3, md: 5 }}
          mx="auto"
          sx={{ animation: "appWarningPulse 2.5s ease-in-out infinite" }}
        >
          <Text
            fontSize={{ base: "22px", md: "26px" }}
            lineHeight="1"
            userSelect="none"
            color="rgba(248,113,113,0.85)"
          >
            !
          </Text>
        </Box>

        <Text
          className="inter-bold"
          fontSize="xs"
          letterSpacing="0.22em"
          textTransform="uppercase"
          color="rgba(248,113,113,0.80)"
          mb={{ base: 3, md: 4 }}
        >
          Wichtige Mitteilung
        </Text>

        <Stack spacing={3} maxW="420px" mb={{ base: 5, md: 7 }} mx="auto">
          <Text className="inter" fontSize={{ base: "sm", md: "md" }} lineHeight="1.7" color="rgba(255,255,255,0.78)">
            Das ist deine erweiterte Bewerbung für Capital Circle.
          </Text>
          <Text className="inter" fontSize={{ base: "sm", md: "md" }} lineHeight="1.7" color="rgba(255,255,255,0.78)">
            Wir wählen alle Teilnehmer nach einer ausführlichen Auswertung aus!
          </Text>
          <Text className="inter" fontSize={{ base: "sm", md: "md" }} lineHeight="1.7" color="rgba(255,255,255,0.78)">
            Du hast eine{" "}
            <Box as="span" className="inter-bold" color="rgba(248,113,113,0.90)">
              einmalige Chance
            </Box>{" "}
            dich zu bewerben, sofern wir dich ablehnen ist diese Entscheidung{" "}
            <Box as="span" className="inter-bold" color="rgba(248,113,113,0.90)">
              final
            </Box>
            !
          </Text>
          <Text className="inter-semibold" fontSize={{ base: "sm", md: "md" }} lineHeight="1.7" color="rgba(255,255,255,0.88)">
            Nimm dir also Zeit und beantworte alle Fragen ausführlich!
          </Text>
        </Stack>

        <Button
          variant="unstyled"
          display="flex"
          alignItems="center"
          justifyContent="center"
          w="full"
          maxW="380px"
          minH={{ base: "44px", md: "48px" }}
          px={5}
          borderRadius="12px"
          fontSize={{ base: "13px", md: "sm" }}
          fontWeight="600"
          className="inter-semibold"
          mx="auto"
          isDisabled={!canDismiss}
          onClick={onDismiss}
          bg={canDismiss ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)"}
          color={canDismiss ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.35)"}
          border="1px solid"
          borderColor={canDismiss ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.06)"}
          _hover={
            canDismiss
              ? {
                  bg: "rgba(255,255,255,0.16)",
                  borderColor: "rgba(255,255,255,0.30)",
                  transform: "translateY(-1px)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                }
              : {}
          }
          _disabled={{ opacity: 1, cursor: "not-allowed" }}
          transition="all 200ms ease"
        >
          {canDismiss
            ? "Ich habe verstanden — Bewerbung starten →"
            : `Bitte lies die Mitteilung sorgfältig… (${countdown}s)`}
        </Button>
      </Box>
    </Box>
  );
}

/* ================================================================
   Step Indicator (Gold Circles)
   ================================================================ */

function StepIndicator({ current, total }: { current: number; total: number }) {
  const maxVisible = 6;
  const showCompact = total > maxVisible;

  if (showCompact) {
    return (
      <HStack spacing={2} justify="center" align="center" w="full">
        <Text fontSize="xs" color="var(--color-accent-gold)" className="inter-semibold">
          Frage {current} von {total}
        </Text>
      </HStack>
    );
  }

  return (
    <HStack spacing={0} justify="center" align="center" w="full">
      {Array.from({ length: total }, (_, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === current;
        const isCompleted = stepNum < current;

        return (
          <HStack key={stepNum} spacing={0} align="center">
            {i > 0 && (
              <Box
                h="2px"
                w={{ base: "12px", md: "20px" }}
                bg={
                  isCompleted || isActive
                    ? "linear-gradient(90deg, rgba(212,175,55,0.8), rgba(212,175,55,0.4))"
                    : "rgba(255,255,255,0.08)"
                }
                transition="background 0.4s ease"
              />
            )}
            <Box
              w="28px"
              h="28px"
              borderRadius="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="10px"
              fontWeight="700"
              className="inter-bold"
              flexShrink={0}
              transition="all 0.25s cubic-bezier(0.16,1,0.3,1)"
              transform={isActive ? "scale(1.12)" : "scale(1)"}
              bg={
                isCompleted
                  ? "linear-gradient(135deg, #D4AF37, #F4D76E)"
                  : isActive
                    ? "linear-gradient(135deg, #D4AF37, #F4D76E)"
                    : "rgba(255,255,255,0.05)"
              }
              color={isCompleted || isActive ? "#0a0a0a" : "rgba(255,255,255,0.4)"}
              border={isCompleted || isActive ? "none" : "1px solid rgba(255,255,255,0.12)"}
              boxShadow={
                isActive
                  ? "0 0 16px rgba(212,175,55,0.45)"
                  : isCompleted
                    ? "0 0 8px rgba(212,175,55,0.25)"
                    : "none"
              }
            >
              {isCompleted ? "✓" : stepNum}
            </Box>
          </HStack>
        );
      })}
    </HStack>
  );
}

/* ================================================================
   Textarea Step
   ================================================================ */

function TextareaStep({
  question,
  value,
  onChange,
  error,
}: {
  question: Step2Question;
  value: string;
  onChange: (v: string) => void;
  error: string | null;
}) {
  return (
    <Stack spacing={5}>
      <Stack spacing={2}>
        <Text
          as="h2"
          className="inter"
          fontWeight={300}
          fontSize={{ base: "xl", md: "2xl" }}
          lineHeight="1.25"
          letterSpacing="-0.01em"
          color="var(--color-text-primary)"
        >
          {question.question}
        </Text>
      </Stack>

      <FormControl isInvalid={Boolean(error)} isRequired={question.required}>
        <Box position="relative">
          <Textarea
            {...inputStyles}
            minH="150px"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            resize="vertical"
            borderRadius="14px"
            className="inter"
            fontSize="sm"
          />
          {question.minLength && (
            <CharCounterPill value={value} min={question.minLength} />
          )}
        </Box>
        {question.helper && (
          <FormHelperText color="rgba(255,255,255,0.4)" fontSize="xs">
            {question.helper}
          </FormHelperText>
        )}
        <FormErrorMessage>{error}</FormErrorMessage>
      </FormControl>
    </Stack>
  );
}

/* ================================================================
   Text Input Step
   ================================================================ */

function TextInputStep({
  question,
  value,
  onChange,
  error,
}: {
  question: Step2Question;
  value: string;
  onChange: (v: string) => void;
  error: string | null;
}) {
  return (
    <Stack spacing={5}>
      <Stack spacing={2}>
        <Text
          as="h2"
          className="inter"
          fontWeight={300}
          fontSize={{ base: "xl", md: "2xl" }}
          lineHeight="1.25"
          letterSpacing="-0.01em"
          color="var(--color-text-primary)"
        >
          {question.question}
        </Text>
      </Stack>

      <FormControl isInvalid={Boolean(error)} isRequired={question.required}>
        <Input
          {...inputStyles}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          borderRadius="12px"
          className="inter"
          autoFocus
        />
        {question.helper && (
          <FormHelperText color="rgba(255,255,255,0.4)" fontSize="xs">
            {question.helper}
          </FormHelperText>
        )}
        <FormErrorMessage>{error}</FormErrorMessage>
      </FormControl>
    </Stack>
  );
}

/* ================================================================
   Select Step
   ================================================================ */

function SelectStep({
  question,
  value,
  onChange,
  error,
}: {
  question: Step2Question;
  value: string;
  onChange: (v: string) => void;
  error: string | null;
}) {
  return (
    <Stack spacing={5}>
      <Stack spacing={2}>
        <Text
          as="h2"
          className="inter"
          fontWeight={300}
          fontSize={{ base: "xl", md: "2xl" }}
          lineHeight="1.25"
          letterSpacing="-0.01em"
          color="var(--color-text-primary)"
        >
          {question.question}
        </Text>
      </Stack>

      <Stack spacing={3}>
        {(question.options ?? []).map((opt) => {
          const selected = value === opt;
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
                    name={question.id}
                    value={opt}
                    checked={selected}
                    onChange={() => onChange(opt)}
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
        {error && (
          <Text fontSize="sm" color="red.300" className="inter">{error}</Text>
        )}
      </Stack>
    </Stack>
  );
}

/* ================================================================
   Thanks Step
   ================================================================ */

function ThanksStep() {
  return (
    <Stack spacing={6} align="center" textAlign="center" py={6}>
      <Box position="relative" w="80px" h="80px">
        <Box
          position="absolute"
          inset={0}
          borderRadius="full"
          border="1.5px solid rgba(212,175,55,0.3)"
          sx={{ animation: "appRipple 2.5s ease-out infinite" }}
        />
        <Box
          position="absolute"
          inset={0}
          borderRadius="full"
          border="1.5px solid rgba(212,175,55,0.2)"
          sx={{ animation: "appRipple 2.5s ease-out 0.8s infinite" }}
        />
        <Box
          w="80px"
          h="80px"
          borderRadius="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="linear-gradient(135deg, rgba(212,175,55,0.22), rgba(212,175,55,0.12))"
          border="1.5px solid rgba(212,175,55,0.55)"
          color="var(--color-accent-gold)"
          fontSize="32px"
          position="relative"
          zIndex={1}
          boxShadow="0 0 30px rgba(212,175,55,0.2)"
        >
          ✓
        </Box>
      </Box>

      <Text
        as="h2"
        className="inter"
        fontWeight={400}
        fontSize={{ base: "2xl", md: "3xl" }}
        lineHeight="1.2"
        letterSpacing="-0.02em"
        color="var(--color-text-primary)"
      >
        Deine Bewerbung ist eingegangen
      </Text>

      <Stack spacing={3} maxW="400px">
        <HStack spacing={3} align="flex-start">
          <Box w="6px" h="6px" borderRadius="full" bg="var(--color-accent-gold)" mt="8px" flexShrink={0} />
          <Text fontSize="sm" color="rgba(255,255,255,0.65)" className="inter" textAlign="left">
            Wir prüfen deine Bewerbung sorgfältig
          </Text>
        </HStack>
        <HStack spacing={3} align="flex-start">
          <Box w="6px" h="6px" borderRadius="full" bg="var(--color-accent-gold)" mt="8px" flexShrink={0} />
          <Text fontSize="sm" color="rgba(255,255,255,0.65)" className="inter" textAlign="left">
            Du wirst gleich zur Terminbuchung weitergeleitet
          </Text>
        </HStack>
      </Stack>

      <Stack spacing={2} w="full" maxW="300px" pt={2}>
        <Box h="2px" w="full" bg="rgba(255,255,255,0.06)" borderRadius="full" overflow="hidden">
          <Box
            h="full"
            bg="linear-gradient(90deg, rgba(212,175,55,0.5), rgba(212,175,55,0.9))"
            borderRadius="full"
            sx={{ animation: "appRedirectFill 3s linear forwards" }}
          />
        </Box>
        <Text fontSize="xs" color="rgba(255,255,255,0.30)" className="inter">
          Du wirst in wenigen Sekunden weitergeleitet…
        </Text>
      </Stack>
    </Stack>
  );
}

/* ================================================================
   Character Counter Pill
   ================================================================ */

function CharCounterPill({ value, min }: { value: string; min: number }) {
  const len = value.trim().length;
  const pct = Math.min(len / min, 1);
  const ok = pct >= 1;

  const r = 9;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <HStack
      position="absolute"
      bottom="8px"
      right="10px"
      spacing={1.5}
      bg="rgba(0,0,0,0.55)"
      backdropFilter="blur(8px)"
      borderRadius="full"
      px={2}
      py={0.5}
      zIndex={2}
    >
      {ok ? (
        <Box
          w="22px"
          h="22px"
          borderRadius="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="rgba(34,197,94,0.20)"
          border="1.5px solid rgba(34,197,94,0.55)"
        >
          <Text fontSize="12px" lineHeight="1" color="rgba(74,222,128,0.95)">✓</Text>
        </Box>
      ) : (
        <Box as="svg" w="22px" h="22px" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
          <circle
            cx="12"
            cy="12"
            r={r}
            fill="none"
            stroke="rgba(212,175,55,0.4)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform="rotate(-90 12 12)"
            style={{ transition: "stroke-dashoffset 0.3s ease" }}
          />
        </Box>
      )}
      <Text
        fontSize="10px"
        className="inter-semibold"
        color={ok ? "rgba(74,222,128,0.90)" : "rgba(255,255,255,0.35)"}
        lineHeight="1"
        whiteSpace="nowrap"
      >
        {ok ? `${len} ✓` : `${len}/${min}`}
      </Text>
    </HStack>
  );
}
