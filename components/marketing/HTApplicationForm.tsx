"use client";

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  HStack,
  Heading,
  Input,
  Stack,
  Text,
  Textarea,
  VisuallyHidden,
} from "@chakra-ui/react";
import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  HT_QUESTIONS,
  BUDGET_LABELS,
  type HTQuestion,
  type BudgetTier,
} from "@/config/ht-questions";
import { glassPrimaryButtonProps } from "@/components/ui/glassButtonStyles";

type Phase = "contact" | "questions" | "submitting";

interface ContactState {
  fullName: string;
  email: string;
}

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

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: string | HTMLElement,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

interface HTApplicationFormProps {
  /** Pfad zum Intro-Video (z. B. /videos/ht-intro.mp4). Optional. */
  videoSrc?: string;
  /** Optionales Poster-Bild für das Video. */
  videoPoster?: string;
  /** Wenn true: Kontakt-Step überspringen (z. B. wenn User eingeloggt ist). */
  prefillEmail?: string;
  prefillName?: string;
}

export function HTApplicationForm({
  videoSrc,
  videoPoster,
  prefillEmail,
  prefillName,
}: HTApplicationFormProps) {
  const router = useRouter();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  const skipContact = Boolean(prefillEmail);
  const [phase, setPhase] = useState<Phase>(skipContact ? "questions" : "contact");
  const [contact, setContact] = useState<ContactState>({
    fullName: prefillName ?? "",
    email: prefillEmail ?? "",
  });
  const [contactErrors, setContactErrors] =
    useState<Partial<Record<keyof ContactState, string>>>({});

  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const q of HT_QUESTIONS) init[q.id] = "";
    return init;
  });
  const [stepError, setStepError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);

  // Turnstile-Widget rendern, sobald sichtbar
  useEffect(() => {
    if (!siteKey) return;
    if (turnstileWidgetId.current) return;

    const tryRender = () => {
      if (!window.turnstile || !turnstileContainerRef.current) return false;
      turnstileWidgetId.current = window.turnstile.render(
        turnstileContainerRef.current,
        {
          sitekey: siteKey,
          theme: "dark",
          callback: (token: string) => setTurnstileToken(token),
          "error-callback": () => setTurnstileToken(null),
          "expired-callback": () => setTurnstileToken(null),
        },
      );
      return true;
    };

    if (!tryRender()) {
      const interval = window.setInterval(() => {
        if (tryRender()) window.clearInterval(interval);
      }, 200);
      return () => window.clearInterval(interval);
    }
    return undefined;
  }, [siteKey, phase]);

  const totalSteps = HT_QUESTIONS.length;
  const currentQuestion: HTQuestion | undefined = HT_QUESTIONS[stepIndex];
  const progressPercent = Math.round(((stepIndex + 1) / totalSteps) * 100);

  function validateContact(): boolean {
    const errs: Partial<Record<keyof ContactState, string>> = {};
    if (contact.fullName.trim().length < 2)
      errs.fullName = "Bitte vollständigen Namen angeben.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim()))
      errs.email = "Ungültige E-Mail-Adresse.";
    setContactErrors(errs);
    return Object.keys(errs).length === 0;
  }

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
    } else if (!skipContact) {
      setPhase("contact");
    }
  }

  async function handleSubmit() {
    if (siteKey && !turnstileToken) {
      setServerError("Bitte das Captcha lösen.");
      return;
    }
    setServerError(null);
    setPhase("submitting");

    try {
      const res = await fetch("/api/ht-applications/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          answers,
          email: contact.email.trim(),
          name: contact.fullName.trim(),
          turnstileToken,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        budget_tier?: BudgetTier;
        error?: string;
      };

      if (!res.ok || !json.ok) {
        setServerError(json.error ?? "Bewerbung konnte nicht abgeschickt werden.");
        setPhase("questions");
        return;
      }

      const target =
        json.budget_tier === "over_2000"
          ? "/apply/thanks-high-ticket"
          : "/apply/thanks-membership";
      router.push(target);
    } catch (err) {
      console.error(err);
      setServerError("Verbindungsfehler. Bitte erneut versuchen.");
      setPhase("questions");
    }
  }

  return (
    <Stack spacing={{ base: 8, md: 10 }} maxW="780px" mx="auto" w="full">
      {siteKey ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          async
          defer
          strategy="afterInteractive"
        />
      ) : null}

      {videoSrc ? <IntroVideo src={videoSrc} poster={videoPoster} /> : null}

      {phase === "contact" && !skipContact ? (
        <ContactStep
          contact={contact}
          setContact={setContact}
          errors={contactErrors}
          siteKey={siteKey}
          turnstileContainerRef={turnstileContainerRef}
          onContinue={() => {
            if (validateContact()) {
              setPhase("questions");
            }
          }}
        />
      ) : (
        <QuestionStep
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          progressPercent={progressPercent}
          question={currentQuestion}
          value={currentQuestion ? answers[currentQuestion.id] ?? "" : ""}
          onChange={(val) => {
            if (!currentQuestion) return;
            setAnswers((a) => ({ ...a, [currentQuestion.id]: val }));
            if (stepError) setStepError(null);
          }}
          stepError={stepError}
          serverError={serverError}
          submitting={phase === "submitting"}
          isFirst={stepIndex === 0 && skipContact}
          isLast={stepIndex === totalSteps - 1}
          onBack={handleBack}
          onNext={handleNext}
          siteKey={siteKey}
          turnstileContainerRef={turnstileContainerRef}
          turnstileToken={turnstileToken}
        />
      )}
    </Stack>
  );
}

// ---------- Sub-Components ----------

function IntroVideo({ src, poster }: { src: string; poster?: string }) {
  return (
    <Box
      maxW="768px"
      mx="auto"
      w="full"
      borderRadius="16px"
      overflow="hidden"
      border="1px solid rgba(255,255,255,0.09)"
      boxShadow="0 18px 60px rgba(0,0,0,0.55)"
      sx={{ aspectRatio: "16/9" }}
      bg="black"
    >
      <Box
        as="video"
        src={src}
        poster={poster}
        controls
        playsInline
        preload="metadata"
        w="full"
        h="full"
        sx={{ objectFit: "cover" }}
      />
    </Box>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <Box
      h="5px"
      w="full"
      borderRadius="9999px"
      bg="rgba(255,255,255,0.08)"
      overflow="hidden"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <Box
        h="full"
        w={`${percent}%`}
        bg="linear-gradient(90deg, #A67C00 0%, #D4AF37 100%)"
        boxShadow="0 0 8px rgba(212,175,55,0.30)"
        transition="width .3s ease"
      />
    </Box>
  );
}

function GlassPanel({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: "16px",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.07)",
      }}
      p={{ base: 6, md: 8 }}
    >
      {children}
    </Box>
  );
}

function ContactStep(props: {
  contact: ContactState;
  setContact: (c: ContactState) => void;
  errors: Partial<Record<keyof ContactState, string>>;
  siteKey: string;
  turnstileContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  onContinue: () => void;
}) {
  const { contact, setContact, errors, siteKey, turnstileContainerRef, onContinue } = props;
  return (
    <GlassPanel>
      <Stack spacing={5}>
        <Stack spacing={2}>
          <Text
            fontSize="xs"
            letterSpacing="0.18em"
            textTransform="uppercase"
            color="var(--color-accent-gold)"
            className="inter-semibold"
          >
            Bewerbung · 1:1 Mentoring
          </Text>
          <Heading
            as="h2"
            className="radley-regular"
            fontWeight={400}
            fontSize={{ base: "2xl", md: "3xl" }}
            lineHeight="1.2"
          >
            Bevor wir starten — wer bist du?
          </Heading>
          <Text fontSize="sm" color="rgba(255,255,255,0.62)" className="inter">
            Wir melden uns ausschließlich über die hier angegebene E-Mail und WhatsApp-Nummer.
          </Text>
        </Stack>

        <FormControl isInvalid={Boolean(errors.fullName)} isRequired>
          <FormLabel className="inter" fontSize="sm" color="var(--color-text-primary)">
            Vollständiger Name
          </FormLabel>
          <Input
            {...inputStyles}
            value={contact.fullName}
            onChange={(e) => setContact({ ...contact, fullName: e.target.value })}
            placeholder="Max Mustermann"
            autoComplete="name"
          />
          <FormErrorMessage>{errors.fullName}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={Boolean(errors.email)} isRequired>
          <FormLabel className="inter" fontSize="sm" color="var(--color-text-primary)">
            E-Mail
          </FormLabel>
          <Input
            {...inputStyles}
            type="email"
            value={contact.email}
            onChange={(e) => setContact({ ...contact, email: e.target.value })}
            placeholder="du@example.com"
            autoComplete="email"
          />
          <FormErrorMessage>{errors.email}</FormErrorMessage>
        </FormControl>

        {siteKey ? (
          <Box ref={turnstileContainerRef} display="flex" justifyContent="center" />
        ) : (
          <Alert status="warning" variant="subtle" bg="rgba(255,180,0,0.08)" borderRadius="12px">
            <AlertIcon />
            <Text fontSize="xs" className="inter">
              Captcha (NEXT_PUBLIC_TURNSTILE_SITE_KEY) ist nicht gesetzt — Schutz inaktiv.
            </Text>
          </Alert>
        )}

        <Button
          {...glassPrimaryButtonProps}
          onClick={onContinue}
        >
          Weiter zu den Fragen →
        </Button>
      </Stack>
    </GlassPanel>
  );
}

function QuestionStep(props: {
  stepIndex: number;
  totalSteps: number;
  progressPercent: number;
  question: HTQuestion | undefined;
  value: string;
  onChange: (v: string) => void;
  stepError: string | null;
  serverError: string | null;
  submitting: boolean;
  isFirst: boolean;
  isLast: boolean;
  onBack: () => void;
  onNext: () => void;
  siteKey: string;
  turnstileContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  turnstileToken: string | null;
}) {
  const {
    stepIndex,
    totalSteps,
    progressPercent,
    question,
    value,
    onChange,
    stepError,
    serverError,
    submitting,
    isFirst,
    isLast,
    onBack,
    onNext,
    siteKey,
    turnstileContainerRef,
    turnstileToken,
  } = props;

  if (!question) return null;

  return (
    <Stack spacing={5}>
      <HStack justify="space-between" align="center">
        <Text
          fontSize="xs"
          letterSpacing="0.18em"
          textTransform="uppercase"
          color="var(--color-accent-gold)"
          className="inter-semibold"
        >
          Step {stepIndex + 1} von {totalSteps}
        </Text>
        <Text fontSize="xs" color="var(--color-text-secondary)" className="inter">
          {progressPercent}%
        </Text>
      </HStack>

      <ProgressBar percent={progressPercent} />

      <GlassPanel>
        <Stack spacing={5}>
          <Stack spacing={2}>
            <Text
              fontSize="xs"
              className="inter"
              color="var(--color-text-secondary)"
            >
              Frage {stepIndex + 1} von {totalSteps}
            </Text>
            <Heading
              as="h2"
              className="radley-regular"
              fontWeight={400}
              fontSize={{ base: "xl", md: "2xl" }}
              lineHeight="1.3"
            >
              {question.question}
            </Heading>
          </Stack>

          {question.type === "select" ? (
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
                    borderColor={
                      selected ? "rgba(212,175,55,0.65)" : "rgba(255,255,255,0.12)"
                    }
                    bg={
                      selected
                        ? "rgba(212,175,55,0.10)"
                        : "rgba(255,255,255,0.03)"
                    }
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
                        borderColor={
                          selected ? "var(--color-accent-gold)" : "rgba(255,255,255,0.4)"
                        }
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        {selected ? (
                          <Box
                            w="8px"
                            h="8px"
                            borderRadius="full"
                            bg="var(--color-accent-gold)"
                          />
                        ) : null}
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
                        {BUDGET_LABELS[opt] ?? opt}
                      </Text>
                    </HStack>
                  </Box>
                );
              })}
            </Stack>
          ) : question.type === "textarea" ? (
            <FormControl isInvalid={Boolean(stepError)}>
              <Textarea
                {...inputStyles}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={question.placeholder}
                minH="160px"
                autoFocus
              />
              {question.helper ? (
                <FormHelperText color="rgba(255,255,255,0.4)" fontSize="xs">
                  {question.helper}
                </FormHelperText>
              ) : null}
              {question.minLength ? (
                <CharCounter value={value} min={question.minLength} />
              ) : null}
              <FormErrorMessage>{stepError}</FormErrorMessage>
            </FormControl>
          ) : (
            <FormControl isInvalid={Boolean(stepError)}>
              <Input
                {...inputStyles}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={question.placeholder}
                autoFocus
              />
              {question.helper ? (
                <FormHelperText color="rgba(255,255,255,0.4)" fontSize="xs">
                  {question.helper}
                </FormHelperText>
              ) : null}
              <FormErrorMessage>{stepError}</FormErrorMessage>
            </FormControl>
          )}

          {isLast && siteKey ? (
            <Box ref={turnstileContainerRef} display="flex" justifyContent="center" />
          ) : null}

          {serverError ? (
            <Alert status="error" variant="subtle" bg="rgba(229,72,77,0.10)" borderRadius="12px">
              <AlertIcon />
              <Text fontSize="sm" className="inter">{serverError}</Text>
            </Alert>
          ) : null}

          <HStack justify="space-between" pt={2} spacing={3} flexWrap="wrap">
            <Button
              variant="outline"
              onClick={onBack}
              isDisabled={isFirst || submitting}
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
              onClick={onNext}
              isLoading={submitting}
              loadingText="Senden…"
              isDisabled={isLast && Boolean(siteKey) && !turnstileToken}
            >
              {isLast ? "Bewerbung abschicken" : "Weiter →"}
            </Button>
          </HStack>
        </Stack>
      </GlassPanel>
    </Stack>
  );
}

function CharCounter({ value, min }: { value: string; min: number }) {
  const len = value.trim().length;
  const ok = len >= min;
  return (
    <HStack justify="flex-end" mt={1}>
      <Text
        fontSize="xs"
        className="inter"
        color={ok ? "rgba(212,175,55,0.85)" : "rgba(255,255,255,0.35)"}
      >
        {len} / {min}
      </Text>
    </HStack>
  );
}
