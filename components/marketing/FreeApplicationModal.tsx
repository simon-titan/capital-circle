"use client";

import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
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
} from "@chakra-ui/react";
import { Check } from "lucide-react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CharCounterPill,
  FunnelAlert,
  FunnelHeadline,
  FunnelModalTopBar,
  FunnelProgress,
  FunnelStepIndicator,
  FunnelWarningOverlay,
  funnelBackButtonProps,
  funnelErrorProps,
  funnelFieldProps,
  funnelHelperProps,
  funnelLabelProps,
  funnelModalContentProps,
  funnelOverlayProps,
  noMotion,
} from "./funnel-ui";

const STEPS = 4;
const MIN_CHARS = 150;
const WARNING_SECONDS = 5;

const QUESTIONS = {
  experience: {
    heading:
      "Wie lange beschäftigst du dich bereits mit Trading — und wie läuft es aktuell für dich?",
    description:
      "Erzähl uns von deinem bisherigen Weg — egal ob Anfänger oder erfahrener Trader. Wir wollen verstehen, wo du heute stehst.",
    placeholder:
      "Ich beschäftige mich seit ... mit Trading. Aktuell trade ich ... und meine bisherigen Ergebnisse waren ...",
  },
  biggestProblem: {
    heading:
      "Was möchtest du im Trading in den nächsten 12 Monaten erreichen — und warum ist dir das wichtig?",
    description:
      "Sei konkret. Finanzielle Ziele, Trading-Ziele, Entwicklungsziele — alles ist willkommen. Wir suchen Trader mit echtem Antrieb.",
    placeholder:
      "In den nächsten 12 Monaten möchte ich ... erreichen, weil ...",
  },
  goal6Months: {
    heading:
      "Warum möchtest du bei Capital Circle aufgenommen werden — und weshalb glaubst du, dass genau jetzt der richtige Zeitpunkt dafür ist?",
    description:
      "Was macht dich zur richtigen Person für Capital Circle? Überzeuge uns — wir nehmen nur Bewerber auf, die wirklich bereit sind.",
    placeholder:
      "Ich möchte aufgenommen werden, weil ... Jetzt ist der richtige Zeitpunkt, weil ...",
  },
} as const;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function FreeApplicationModal({ isOpen, onClose }: Props) {
  const router = useRouter();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  const [showWarning, setShowWarning] = useState(true);
  const [warningCountdown, setWarningCountdown] = useState(WARNING_SECONDS);
  const [warningFadingOut, setWarningFadingOut] = useState(false);

  const [step, setStep] = useState(1);
  const [experience, setExperience] = useState("");
  const [biggestProblem, setBiggestProblem] = useState("");
  const [goal6Months, setGoal6Months] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const turnstileWidgetId = useRef<string | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);

  // Warning countdown
  useEffect(() => {
    if (!isOpen || !showWarning || warningFadingOut) return;
    if (warningCountdown <= 0) return;
    const timer = setTimeout(
      () => setWarningCountdown((c) => c - 1),
      1000,
    );
    return () => clearTimeout(timer);
  }, [isOpen, showWarning, warningCountdown, warningFadingOut]);

  function dismissWarning() {
    setWarningFadingOut(true);
    setTimeout(() => {
      setShowWarning(false);
      setWarningFadingOut(false);
    }, 300);
  }

  // Turnstile on step 4
  useEffect(() => {
    if (step !== 4) return;
    if (!siteKey) return;
    if (turnstileWidgetId.current) return;

    const tryRender = () => {
      if (!window.turnstile || !turnstileContainerRef.current) return false;
      turnstileWidgetId.current = window.turnstile.render(
        turnstileContainerRef.current,
        {
          sitekey: siteKey,
          theme: "dark",
          appearance: "interaction-only",
          callback: (token) => setTurnstileToken(token),
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
  }, [step, siteKey]);

  const resetModal = useCallback(() => {
    setShowWarning(true);
    setWarningCountdown(WARNING_SECONDS);
    setWarningFadingOut(false);
    setStep(1);
    setExperience("");
    setBiggestProblem("");
    setGoal6Months("");
    setFullName("");
    setEmail("");
    setPassword("");
    setTurnstileToken(null);
    setErrors({});
    setServerError(null);
    setSubmitting(false);
    if (turnstileWidgetId.current && window.turnstile) {
      window.turnstile.remove(turnstileWidgetId.current);
      turnstileWidgetId.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    if (showWarning) return;
    resetModal();
    onClose();
  }, [showWarning, resetModal, onClose]);

  const currentStepMeetsMin = useMemo(() => {
    if (step === 1) return experience.trim().length >= MIN_CHARS;
    if (step === 2) return biggestProblem.trim().length >= MIN_CHARS;
    if (step === 3) return goal6Months.trim().length >= MIN_CHARS;
    return true;
  }, [step, experience, biggestProblem, goal6Months]);

  const accountStepComplete = useMemo(() => {
    if (fullName.trim().length < 2) return false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return false;
    if (password.length < 8) return false;
    if (siteKey && !turnstileToken) return false;
    return true;
  }, [fullName, email, password, siteKey, turnstileToken]);

  function validateStep(): boolean {
    const errs: Record<string, string> = {};
    if (step === 1 && experience.trim().length < MIN_CHARS)
      errs.experience = `Bitte mindestens ${MIN_CHARS} Zeichen.`;
    if (step === 2 && biggestProblem.trim().length < MIN_CHARS)
      errs.biggestProblem = `Bitte mindestens ${MIN_CHARS} Zeichen.`;
    if (step === 3 && goal6Months.trim().length < MIN_CHARS)
      errs.goal6Months = `Bitte mindestens ${MIN_CHARS} Zeichen.`;
    if (step === 4) {
      if (fullName.trim().length < 2)
        errs.fullName = "Bitte vollständigen Namen angeben.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        errs.email = "Ungültige E-Mail-Adresse.";
      if (password.length < 8) errs.password = "Mindestens 8 Zeichen.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleNext() {
    setServerError(null);
    if (!validateStep()) return;

    if (step < 4) {
      setStep((s) => s + 1);
      return;
    }

    if (siteKey && !turnstileToken) {
      setServerError("Bitte das Sicherheits-Widget bestätigen.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/applications/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          experience: experience.trim(),
          biggest_problem: biggestProblem.trim(),
          goal_6_months: goal6Months.trim(),
          turnstileToken,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        redirectTo?: string;
      };
      if (!res.ok || !json.ok) {
        setServerError(
          json.error ??
            "Bewerbung konnte nicht abgeschickt werden. Bitte erneut versuchen.",
        );
        return;
      }
      // Tracking: Application-Event für den Kanal feuern, über den der Nutzer gekommen ist
      try {
        const ref = sessionStorage.getItem("cc_tracking_ref");
        if (ref) {
          const sid = sessionStorage.getItem("cc_tracking_sid") ?? "unknown";
          fetch("/api/tracking/event", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ slug: ref, type: "application", session_id: sid }),
          }).catch(() => undefined);
        }
      } catch {
        // Tracking-Fehler still ignorieren
      }
      onClose();
      router.push(json.redirectTo ?? "/pending-review");
      router.refresh();
      resetModal();
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack() {
    setErrors({});
    setServerError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  const progressPct = (step / STEPS) * 100;
  const isSubmitStep = step === 4;
  const hiddenWhileWarning = {
    "aria-hidden": showWarning,
    sx: {
      visibility: showWarning ? "hidden" : "visible",
      pointerEvents: showWarning ? "none" : "auto",
    },
  } as const;

  return (
    <>
      {siteKey ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          async
          defer
          strategy="afterInteractive"
        />
      ) : null}

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        size="xl"
        scrollBehavior="inside"
        closeOnOverlayClick={!showWarning}
        closeOnEsc={!showWarning}
        isCentered
      >
        <ModalOverlay {...funnelOverlayProps} />
        <ModalContent {...funnelModalContentProps}>
          {/* Warning overlay */}
          {showWarning && (
            <FunnelWarningOverlay
              countdown={warningCountdown}
              fadingOut={warningFadingOut}
              onDismiss={dismissWarning}
              lead="Das ist deine offizielle Bewerbung für Capital Circle."
            />
          )}

          <ModalHeader px={6} pt={6} pb={0} position="relative" zIndex={1} {...hiddenWhileWarning}>
            {step < 5 && (
              <Stack spacing={4}>
                <FunnelModalTopBar label="Capital Circle · Offizielle Bewerbung" onClose={handleClose} />
                <FunnelStepIndicator current={step} total={4} />
                <FunnelProgress value={progressPct} />
              </Stack>
            )}
          </ModalHeader>

          <ModalBody px={6} py={6} position="relative" zIndex={1}>
            <Box
              key={step}
              sx={{
                animation: "appStepEnter 0.3s cubic-bezier(0.16,1,0.3,1)",
                ...noMotion,
              }}
            >
              {step === 1 && (
                <QuestionStep
                  heading={QUESTIONS.experience.heading}
                  description={QUESTIONS.experience.description}
                  value={experience}
                  onChange={setExperience}
                  error={errors.experience}
                  min={MIN_CHARS}
                  placeholder={QUESTIONS.experience.placeholder}
                />
              )}
              {step === 2 && (
                <QuestionStep
                  heading={QUESTIONS.biggestProblem.heading}
                  description={QUESTIONS.biggestProblem.description}
                  value={biggestProblem}
                  onChange={setBiggestProblem}
                  error={errors.biggestProblem}
                  min={MIN_CHARS}
                  placeholder={QUESTIONS.biggestProblem.placeholder}
                />
              )}
              {step === 3 && (
                <QuestionStep
                  heading={QUESTIONS.goal6Months.heading}
                  description={QUESTIONS.goal6Months.description}
                  value={goal6Months}
                  onChange={setGoal6Months}
                  error={errors.goal6Months}
                  min={MIN_CHARS}
                  placeholder={QUESTIONS.goal6Months.placeholder}
                />
              )}
              {step === 4 && (
                <AccountStep
                  fullName={fullName}
                  setFullName={setFullName}
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  errors={errors}
                  serverError={serverError}
                  siteKey={siteKey}
                  turnstileContainerRef={turnstileContainerRef}
                />
              )}
            </Box>
          </ModalBody>

          {step < 5 && (
            <ModalFooter
              px={6}
              pb={5}
              pt={2}
              gap={3}
              flexDirection="column"
              position="relative"
              zIndex={1}
              {...hiddenWhileWarning}
            >
              {isSubmitStep ? (
                <Button
                  variant="gold"
                  w="full"
                  h="48px"
                  fontSize="16px"
                  leftIcon={<Check size={18} strokeWidth={2.25} />}
                  onClick={handleNext}
                  isLoading={submitting}
                  isDisabled={!accountStepComplete}
                  loadingText="Bewerbung wird abgeschickt…"
                >
                  Bewerbung absenden
                </Button>
              ) : (
                <Button
                  variant="gold"
                  w="full"
                  h="48px"
                  fontSize="16px"
                  onClick={handleNext}
                  isDisabled={!currentStepMeetsMin}
                >
                  Weiter
                </Button>
              )}

              {step > 1 && (
                <Button {...funnelBackButtonProps} onClick={handleBack}>
                  ← Zurück
                </Button>
              )}

              <Text fontSize="11px" color="var(--cc-text-3)" textAlign="center">
                Mit dem Absenden stimmst du unserer Datenschutzerklärung zu.
              </Text>
            </ModalFooter>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

/* ================================================================
   Question Step
   ================================================================ */

function QuestionStep({
  heading,
  description,
  value,
  onChange,
  error,
  min,
  placeholder,
}: {
  heading: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  min: number;
  placeholder: string;
}) {
  return (
    <Stack spacing={5}>
      <Stack spacing={2}>
        <FunnelHeadline as="h2" scale="sm">
          {heading}
        </FunnelHeadline>
        <Text fontSize="14px" color="var(--cc-text-2)" lineHeight="1.6">
          {description}
        </Text>
      </Stack>

      <FormControl isInvalid={Boolean(error)} isRequired>
        <Box position="relative">
          <Textarea
            {...funnelFieldProps}
            minH="150px"
            pb={10}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            resize="vertical"
            fontSize="14px"
            aria-label={heading}
          />
          <CharCounterPill value={value} min={min} />
        </Box>
        <FormErrorMessage {...funnelErrorProps}>{error}</FormErrorMessage>
      </FormControl>
    </Stack>
  );
}

/* ================================================================
   Account Step
   ================================================================ */

function AccountStep({
  fullName,
  setFullName,
  email,
  setEmail,
  password,
  setPassword,
  errors,
  serverError,
  siteKey,
  turnstileContainerRef,
}: {
  fullName: string;
  setFullName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  errors: Record<string, string>;
  serverError: string | null;
  siteKey: string;
  turnstileContainerRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  return (
    <Stack spacing={5}>
      <Stack spacing={2}>
        <FunnelHeadline as="h2" scale="sm">
          Fast geschafft — deine Daten
        </FunnelHeadline>
        <Text fontSize="14px" color="var(--cc-text-2)" lineHeight="1.6">
          Wir legen deinen Account an und schicken dir eine Bestätigung sobald
          deine Bewerbung geprüft wurde.
        </Text>
      </Stack>

      <FormControl isInvalid={Boolean(errors.fullName)} isRequired>
        <FormLabel {...funnelLabelProps}>Vollständiger Name</FormLabel>
        <Input
          {...funnelFieldProps}
          h="48px"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Max Mustermann"
          autoComplete="name"
        />
        <FormErrorMessage {...funnelErrorProps}>{errors.fullName}</FormErrorMessage>
      </FormControl>

      <FormControl isInvalid={Boolean(errors.email)} isRequired>
        <FormLabel {...funnelLabelProps}>E-Mail-Adresse</FormLabel>
        <Input
          {...funnelFieldProps}
          h="48px"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="du@example.com"
          autoComplete="email"
        />
        <FormErrorMessage {...funnelErrorProps}>{errors.email}</FormErrorMessage>
      </FormControl>

      <FormControl isInvalid={Boolean(errors.password)} isRequired>
        <FormLabel {...funnelLabelProps}>Passwort</FormLabel>
        <Input
          {...funnelFieldProps}
          h="48px"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mindestens 8 Zeichen"
          autoComplete="new-password"
        />
        <FormHelperText {...funnelHelperProps}>Mindestens 8 Zeichen.</FormHelperText>
        <FormErrorMessage {...funnelErrorProps}>{errors.password}</FormErrorMessage>
      </FormControl>

      {siteKey ? (
        <Box
          ref={turnstileContainerRef}
          display="flex"
          justifyContent="center"
        />
      ) : null}

      {serverError && <FunnelAlert>{serverError}</FunnelAlert>}

      <Text fontSize="13px" color="var(--cc-text-2)" textAlign="center">
        Du hast bereits einen Account?{" "}
        <Box
          as="a"
          href="/login"
          color="var(--cc-gold-light)"
          textDecoration="underline"
          textUnderlineOffset="2px"
        >
          Einloggen
        </Box>
      </Text>
    </Stack>
  );
}
