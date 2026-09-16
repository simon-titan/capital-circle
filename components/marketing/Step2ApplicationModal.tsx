"use client";

import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Textarea,
} from "@chakra-ui/react";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { STEP2_QUESTIONS, INVESTMENT_LABELS, type Step2Question } from "@/config/insight-step2-questions";
import {
  CharCounterPill,
  FieldError,
  FunnelAlert,
  FunnelFinePrint,
  FunnelHeadline,
  FunnelModalTopBar,
  FunnelProgress,
  FunnelStepIndicator,
  FunnelThanks,
  FunnelWarningOverlay,
  OptionCard,
  funnelBackButtonProps,
  funnelErrorProps,
  funnelFieldProps,
  funnelHelperProps,
  funnelModalContentProps,
  funnelOverlayProps,
} from "./funnel-ui";

const WARNING_SECONDS = 5;

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

  // Solange der Pflicht-Hinweis liegt, ist der Rest nicht erreichbar.
  const hiddenBehindWarning = {
    "aria-hidden": showWarning,
    sx: { visibility: showWarning ? "hidden" : "visible", pointerEvents: showWarning ? "none" : "auto" },
  } as const;

  const setAnswer = (v: string) => {
    if (!currentQuestion) return;
    setAnswers((a) => ({ ...a, [currentQuestion.id]: v }));
    if (stepError) setStepError(null);
  };

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
      <ModalOverlay {...funnelOverlayProps} />
      <ModalContent {...funnelModalContentProps} minH={{ base: "min(78dvh, 720px)", md: "min(620px, 86vh)" }}>
        {showWarning && (
          <FunnelWarningOverlay
            countdown={warningCountdown}
            fadingOut={warningFadingOut}
            onDismiss={dismissWarning}
            lead="Emre liest diese Bewerbung persönlich. Überzeuge ihn."
          />
        )}

        <ModalHeader px={6} pt={6} pb={0} position="relative" zIndex={1} {...hiddenBehindWarning}>
          {!submitted && (
            <Stack spacing={4}>
              <FunnelModalTopBar label="Capital Circle · Erweiterte Bewerbung" onClose={handleClose} />
              <FunnelStepIndicator current={stepIndex + 1} total={totalSteps} />
              <FunnelProgress value={progressPct} label="Fortschritt der Bewerbung" />
            </Stack>
          )}
        </ModalHeader>

        <ModalBody px={6} py={6} position="relative" zIndex={1} {...hiddenBehindWarning}>
          <Box key={submitted ? "thanks" : stepIndex} sx={{ animation: "appStepEnter 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
            {submitted ? (
              <FunnelThanks
                title="Deine Bewerbung ist eingegangen"
                bullets={["Wir prüfen deine Bewerbung sorgfältig", "Du wirst gleich zur Terminbuchung weitergeleitet"]}
                footer="Du wirst in wenigen Sekunden weitergeleitet…"
                fillSeconds={3}
              />
            ) : currentQuestion?.type === "select" ? (
              <SelectStep question={currentQuestion} value={currentValue} onChange={setAnswer} error={stepError} />
            ) : currentQuestion?.type === "textarea" ? (
              <TextareaStep question={currentQuestion} value={currentValue} onChange={setAnswer} error={stepError} />
            ) : currentQuestion ? (
              <TextInputStep question={currentQuestion} value={currentValue} onChange={setAnswer} error={stepError} />
            ) : null}

            {serverError && <FunnelAlert mt={4}>{serverError}</FunnelAlert>}
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
            {...hiddenBehindWarning}
          >
            <Button
              variant="gold"
              w="full"
              minH="48px"
              onClick={handleNext}
              isDisabled={!currentStepMeetsMin}
              isLoading={submitting}
              loadingText={isLastStep ? "Bewerbung wird abgeschickt…" : "Wird gespeichert…"}
              leftIcon={isLastStep ? <Check size={18} strokeWidth={2.25} /> : undefined}
            >
              {isLastStep ? "Bewerbung absenden" : "Weiter"}
            </Button>

            {stepIndex > 0 && (
              <Button {...funnelBackButtonProps} onClick={handleBack}>
                ← Zurück
              </Button>
            )}

            <FunnelFinePrint textAlign="center" fontSize="11px">
              Mit dem Absenden stimmst du unserer{" "}
              <Box as="a" href="/datenschutz" target="_blank" color="var(--cc-text-2)" textDecoration="underline">
                Datenschutzerklärung
              </Box>{" "}
              zu.
            </FunnelFinePrint>
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  );
}

type StepProps = {
  question: Step2Question;
  value: string;
  onChange: (v: string) => void;
  error: string | null;
};

function QuestionTitle({ children }: { children: string }) {
  return (
    <FunnelHeadline as="h2" scale="sm">
      {children}
    </FunnelHeadline>
  );
}

function TextareaStep({ question, value, onChange, error }: StepProps) {
  return (
    <Stack spacing={5}>
      <QuestionTitle>{question.question}</QuestionTitle>
      <FormControl isInvalid={Boolean(error)} isRequired={question.required}>
        <Box position="relative">
          <Textarea
            {...funnelFieldProps}
            minH={{ base: "200px", md: "180px" }}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            resize="vertical"
            fontSize={{ base: "md", md: "sm" }}
            py={{ base: 4, md: 3 }}
            px={{ base: 4, md: 3 }}
            pb={10}
          />
          {question.minLength && <CharCounterPill value={value} min={question.minLength} />}
        </Box>
        {question.helper && <FormHelperText {...funnelHelperProps}>{question.helper}</FormHelperText>}
        <FormErrorMessage {...funnelErrorProps}>{error}</FormErrorMessage>
      </FormControl>
    </Stack>
  );
}

function TextInputStep({ question, value, onChange, error }: StepProps) {
  return (
    <Stack spacing={5}>
      <QuestionTitle>{question.question}</QuestionTitle>
      <FormControl isInvalid={Boolean(error)} isRequired={question.required}>
        <Input
          {...funnelFieldProps}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          autoFocus
          h={{ base: "52px", md: "44px" }}
          fontSize={{ base: "md", md: "sm" }}
          px={{ base: 4, md: 3 }}
        />
        {question.helper && <FormHelperText {...funnelHelperProps}>{question.helper}</FormHelperText>}
        <FormErrorMessage {...funnelErrorProps}>{error}</FormErrorMessage>
      </FormControl>
    </Stack>
  );
}

function SelectStep({ question, value, onChange, error }: StepProps) {
  return (
    <Stack spacing={5}>
      <QuestionTitle>{question.question}</QuestionTitle>
      <Stack spacing={3} role="radiogroup" aria-label={question.question}>
        {(question.options ?? []).map((opt) => (
          <OptionCard key={opt} name={question.id} value={opt} checked={value === opt} onSelect={() => onChange(opt)}>
            {INVESTMENT_LABELS[opt] ?? opt}
          </OptionCard>
        ))}
        {error && <FieldError>{error}</FieldError>}
      </Stack>
    </Stack>
  );
}
