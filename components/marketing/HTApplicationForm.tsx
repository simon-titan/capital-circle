"use client";

import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  HT_QUESTIONS,
  BUDGET_LABELS,
  type HTQuestion,
  type BudgetTier,
} from "@/config/ht-questions";
import {
  CardLabel,
  FieldError,
  FunnelAlert,
  FunnelHeadline,
  FunnelNotice,
  FunnelProgress,
  FunnelVideoFrame,
  OptionCard,
  funnelErrorProps,
  funnelFieldProps,
  funnelHelperProps,
  funnelLabelProps,
} from "./funnel-ui";

type Phase = "contact" | "questions" | "submitting";

interface ContactState {
  fullName: string;
  email: string;
}

// Turnstile global types defined in types/turnstile.d.ts

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
    <FunnelVideoFrame>
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
    </FunnelVideoFrame>
  );
}

/** Formular-Karte: Glas mit Gold-Kante, ohne Anheben beim Hover. */
function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <Box className="cc-card cc-card--still" p={{ base: 5, md: 8 }}>
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
    <FormCard>
      <Stack spacing={5}>
        <Stack spacing={3}>
          <CardLabel hero>Bewerbung · 1:1 Mentoring</CardLabel>
          <FunnelHeadline as="h2" scale="md">
            Bevor wir starten — wer bist du?
          </FunnelHeadline>
          <Text fontSize="14px" lineHeight={1.6} color="var(--cc-text-2)">
            Wir melden uns ausschließlich über die hier angegebene E-Mail und WhatsApp-Nummer.
          </Text>
        </Stack>

        <FormControl isInvalid={Boolean(errors.fullName)} isRequired>
          <FormLabel {...funnelLabelProps}>Vollständiger Name</FormLabel>
          <Input
            {...funnelFieldProps}
            h="48px"
            value={contact.fullName}
            onChange={(e) => setContact({ ...contact, fullName: e.target.value })}
            placeholder="Max Mustermann"
            autoComplete="name"
          />
          <FormErrorMessage {...funnelErrorProps}>{errors.fullName}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={Boolean(errors.email)} isRequired>
          <FormLabel {...funnelLabelProps}>E-Mail</FormLabel>
          <Input
            {...funnelFieldProps}
            h="48px"
            type="email"
            value={contact.email}
            onChange={(e) => setContact({ ...contact, email: e.target.value })}
            placeholder="du@example.com"
            autoComplete="email"
          />
          <FormErrorMessage {...funnelErrorProps}>{errors.email}</FormErrorMessage>
        </FormControl>

        {siteKey ? (
          <Box ref={turnstileContainerRef} display="flex" justifyContent="center" />
        ) : (
          <FunnelNotice>Captcha (NEXT_PUBLIC_TURNSTILE_SITE_KEY) ist nicht gesetzt — Schutz inaktiv.</FunnelNotice>
        )}

        <Button variant="gold" size="lg" w="full" h="48px" fontSize="16px" onClick={onContinue}>
          Weiter zu den Fragen →
        </Button>
      </Stack>
    </FormCard>
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
        <CardLabel hero className="cc-num">
          Step {stepIndex + 1} von {totalSteps}
        </CardLabel>
        <Text className="cc-num" fontSize="13px" fontWeight={500} color="var(--cc-text-2)">
          {progressPercent}%
        </Text>
      </HStack>

      <FunnelProgress value={progressPercent} h="6px" />

      <FormCard>
        <Stack spacing={5}>
          <Stack spacing={2}>
            <Text className="cc-num" fontSize="12px" color="var(--cc-text-2)">
              Frage {stepIndex + 1} von {totalSteps}
            </Text>
            <FunnelHeadline as="h2" scale="sm">
              {question.question}
            </FunnelHeadline>
          </Stack>

          {question.type === "select" ? (
            <Stack spacing={3} role="radiogroup" aria-label={question.question}>
              {(question.options ?? []).map((opt) => (
                <OptionCard
                  key={opt}
                  name={question.id}
                  value={opt}
                  checked={value === opt}
                  onSelect={() => onChange(opt)}
                >
                  {BUDGET_LABELS[opt] ?? opt}
                </OptionCard>
              ))}
              {stepError ? <FieldError>{stepError}</FieldError> : null}
            </Stack>
          ) : question.type === "textarea" ? (
            <FormControl isInvalid={Boolean(stepError)}>
              <Textarea
                {...funnelFieldProps}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={question.placeholder}
                minH="160px"
                autoFocus
              />
              {question.helper ? (
                <FormHelperText {...funnelHelperProps}>{question.helper}</FormHelperText>
              ) : null}
              {question.minLength ? (
                <CharCounter value={value} min={question.minLength} />
              ) : null}
              <FormErrorMessage {...funnelErrorProps}>{stepError}</FormErrorMessage>
            </FormControl>
          ) : (
            <FormControl isInvalid={Boolean(stepError)}>
              <Input
                {...funnelFieldProps}
                h="48px"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={question.placeholder}
                autoFocus
              />
              {question.helper ? (
                <FormHelperText {...funnelHelperProps}>{question.helper}</FormHelperText>
              ) : null}
              <FormErrorMessage {...funnelErrorProps}>{stepError}</FormErrorMessage>
            </FormControl>
          )}

          {isLast && siteKey ? (
            <Box ref={turnstileContainerRef} display="flex" justifyContent="center" />
          ) : null}

          {serverError ? <FunnelAlert>{serverError}</FunnelAlert> : null}

          <HStack justify="space-between" pt={2} spacing={3} flexWrap="wrap" rowGap={3}>
            <Button variant="line" h="44px" onClick={onBack} isDisabled={isFirst || submitting}>
              ← Zurück
            </Button>

            <Button
              variant="gold"
              h="44px"
              minW="180px"
              px={6}
              flex={{ base: "1", sm: "0 0 auto" }}
              onClick={onNext}
              isLoading={submitting}
              loadingText="Senden…"
              isDisabled={isLast && Boolean(siteKey) && !turnstileToken}
            >
              {isLast ? "Bewerbung abschicken" : "Weiter →"}
            </Button>
          </HStack>
        </Stack>
      </FormCard>
    </Stack>
  );
}

function CharCounter({ value, min }: { value: string; min: number }) {
  const len = value.trim().length;
  const ok = len >= min;
  return (
    <HStack justify="flex-end" mt={1.5}>
      <Text
        className="cc-num"
        fontSize="12px"
        fontWeight={ok ? 600 : 400}
        color={ok ? "var(--cc-gold-light)" : "var(--cc-text-3)"}
      >
        {len} / {min}
      </Text>
    </HStack>
  );
}
