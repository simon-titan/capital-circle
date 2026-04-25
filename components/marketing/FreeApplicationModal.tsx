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
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { glassPrimaryButtonProps } from "@/components/ui/glassButtonStyles";

const STEPS = 5;
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

  // Auto-redirect after thanks
  useEffect(() => {
    if (step !== 5) return;
    const timer = setTimeout(() => {
      router.push("/pending-review");
    }, 3000);
    return () => clearTimeout(timer);
  }, [step, router]);

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
    if (step === 5 || showWarning) return;
    resetModal();
    onClose();
  }, [step, showWarning, resetModal, onClose]);

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
      setStep(5);
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
        closeOnOverlayClick={!showWarning && step < 5}
        closeOnEsc={!showWarning && step < 5}
        isCentered
      >
        <ModalOverlay
          bg="rgba(0,0,0,0.78)"
          backdropFilter="blur(14px)"
          sx={{ WebkitBackdropFilter: "blur(14px)" }}
        />
        <ModalContent
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
              height: "120px",
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

          <ModalHeader px={6} pt={6} pb={0} position="relative" zIndex={1}>
            {step < 5 && !showWarning && (
              <Stack spacing={4}>
                <HStack justify="space-between" align="center">
                  <Text
                    fontSize="10px"
                    letterSpacing="0.22em"
                    textTransform="uppercase"
                    color="var(--color-accent-gold)"
                    className="inter-semibold"
                  >
                    Capital Circle · Offizielle Bewerbung
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

                <StepIndicator current={step} total={4} />

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

          <ModalBody px={6} py={6} position="relative" zIndex={1}>
            <Box
              key={step}
              sx={{
                animation: "appStepEnter 0.3s cubic-bezier(0.16,1,0.3,1)",
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
              {step === 5 && <ThanksStep />}
            </Box>
          </ModalBody>

          {step < 5 && !showWarning && (
            <ModalFooter
              px={6}
              pb={5}
              pt={2}
              gap={3}
              flexDirection="column"
              position="relative"
              zIndex={1}
            >
              {isSubmitStep ? (
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
                    accountStepComplete
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
                  isDisabled={!accountStepComplete}
                  loadingText="Bewerbung wird abgeschickt…"
                  className="inter-semibold"
                >
                  <Box as="span" fontSize="18px" lineHeight="1">
                    ✓
                  </Box>
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

              {step > 1 && (
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
    </>
  );
}

/* ================================================================
   Warning Overlay — subtle, semi-transparent glass over the modal
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
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      textAlign="center"
      px={{ base: 5, md: 10 }}
      py={{ base: 6, md: 8 }}
      sx={{
        background: "rgba(10,10,12,0.88)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: "2px solid rgba(220,60,60,0.35)",
        animation: fadingOut
          ? "appWarningFadeOut 0.3s ease forwards"
          : undefined,
      }}
    >
      {/* Subtle warning accent line */}
      <Box
        w="48px"
        h="3px"
        borderRadius="full"
        bg="linear-gradient(90deg, rgba(220,60,60,0.6), rgba(220,60,60,0.2))"
        mb={5}
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
        mb={5}
        sx={{
          animation: "appWarningPulse 2.5s ease-in-out infinite",
        }}
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
        mb={4}
      >
        Wichtige Mitteilung
      </Text>

      <Stack spacing={3} maxW="420px" mb={{ base: 5, md: 7 }}>
        <Text
          className="inter"
          fontSize={{ base: "sm", md: "md" }}
          lineHeight="1.7"
          color="rgba(255,255,255,0.78)"
        >
          Das ist deine offizielle Bewerbung für Capital Circle.
        </Text>
        <Text
          className="inter"
          fontSize={{ base: "sm", md: "md" }}
          lineHeight="1.7"
          color="rgba(255,255,255,0.78)"
        >
          Wir wählen alle Teilnehmer nach einer ausführlichen Auswertung aus!
        </Text>
        <Text
          className="inter"
          fontSize={{ base: "sm", md: "md" }}
          lineHeight="1.7"
          color="rgba(255,255,255,0.78)"
        >
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
        <Text
          className="inter-semibold"
          fontSize={{ base: "sm", md: "md" }}
          lineHeight="1.7"
          color="rgba(255,255,255,0.88)"
        >
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
        isDisabled={!canDismiss}
        onClick={onDismiss}
        bg={
          canDismiss
            ? "rgba(255,255,255,0.10)"
            : "rgba(255,255,255,0.04)"
        }
        color={
          canDismiss ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.35)"
        }
        border="1px solid"
        borderColor={
          canDismiss
            ? "rgba(255,255,255,0.20)"
            : "rgba(255,255,255,0.06)"
        }
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
        _disabled={{
          opacity: 1,
          cursor: "not-allowed",
        }}
        transition="all 200ms ease"
      >
        {canDismiss
          ? "Ich habe verstanden — Bewerbung starten →"
          : `Bitte lies die Mitteilung sorgfältig… (${countdown}s)`}
      </Button>
    </Box>
  );
}

/* ================================================================
   Step Indicator (Gold Circles)
   ================================================================ */

function StepIndicator({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
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
                w={{ base: "28px", md: "48px" }}
                bg={
                  isCompleted || isActive
                    ? "linear-gradient(90deg, rgba(212,175,55,0.8), rgba(212,175,55,0.4))"
                    : "rgba(255,255,255,0.08)"
                }
                transition="background 0.4s ease"
              />
            )}
            <Box
              w="32px"
              h="32px"
              borderRadius="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="12px"
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
              color={
                isCompleted || isActive
                  ? "#0a0a0a"
                  : "rgba(255,255,255,0.4)"
              }
              border={
                isCompleted || isActive
                  ? "none"
                  : "1px solid rgba(255,255,255,0.12)"
              }
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
        <Text
          as="h2"
          className="inter"
          fontWeight={300}
          fontSize={{ base: "xl", md: "2xl" }}
          lineHeight="1.25"
          letterSpacing="-0.01em"
          color="var(--color-text-primary)"
        >
          {heading}
        </Text>
        <Text
          fontSize="sm"
          color="rgba(255,255,255,0.52)"
          className="inter"
          lineHeight="1.6"
        >
          {description}
        </Text>
      </Stack>

      <FormControl isInvalid={Boolean(error)} isRequired>
        <Box position="relative">
          <Textarea
            {...inputStyles}
            minH="150px"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            resize="vertical"
            borderRadius="14px"
            className="inter"
            fontSize="sm"
          />
          <CharCounterPill value={value} min={min} />
        </Box>
        <FormErrorMessage>{error}</FormErrorMessage>
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
      <Stack spacing={1}>
        <Text
          as="h2"
          className="inter"
          fontWeight={300}
          fontSize={{ base: "xl", md: "2xl" }}
          lineHeight="1.25"
          letterSpacing="-0.01em"
          color="var(--color-text-primary)"
        >
          Fast geschafft — deine Daten
        </Text>
        <Text
          fontSize="sm"
          color="rgba(255,255,255,0.52)"
          className="inter"
          lineHeight="1.6"
        >
          Wir legen deinen Account an und schicken dir eine Bestätigung sobald
          deine Bewerbung geprüft wurde.
        </Text>
      </Stack>

      <FormControl isInvalid={Boolean(errors.fullName)} isRequired>
        <FormLabel
          className="inter-semibold"
          fontSize="xs"
          color="rgba(255,255,255,0.65)"
          letterSpacing="0.04em"
          textTransform="uppercase"
        >
          Vollständiger Name
        </FormLabel>
        <Input
          {...inputStyles}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Max Mustermann"
          autoComplete="name"
          borderRadius="12px"
          className="inter"
        />
        <FormErrorMessage>{errors.fullName}</FormErrorMessage>
      </FormControl>

      <FormControl isInvalid={Boolean(errors.email)} isRequired>
        <FormLabel
          className="inter-semibold"
          fontSize="xs"
          color="rgba(255,255,255,0.65)"
          letterSpacing="0.04em"
          textTransform="uppercase"
        >
          E-Mail-Adresse
        </FormLabel>
        <Input
          {...inputStyles}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="du@example.com"
          autoComplete="email"
          borderRadius="12px"
          className="inter"
        />
        <FormErrorMessage>{errors.email}</FormErrorMessage>
      </FormControl>

      <FormControl isInvalid={Boolean(errors.password)} isRequired>
        <FormLabel
          className="inter-semibold"
          fontSize="xs"
          color="rgba(255,255,255,0.65)"
          letterSpacing="0.04em"
          textTransform="uppercase"
        >
          Passwort
        </FormLabel>
        <Input
          {...inputStyles}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mindestens 8 Zeichen"
          autoComplete="new-password"
          borderRadius="12px"
          className="inter"
        />
        <FormHelperText
          color="rgba(255,255,255,0.30)"
          fontSize="xs"
          className="inter"
        >
          Mindestens 8 Zeichen.
        </FormHelperText>
        <FormErrorMessage>{errors.password}</FormErrorMessage>
      </FormControl>

      {siteKey ? (
        <Box
          ref={turnstileContainerRef}
          display="flex"
          justifyContent="center"
        />
      ) : null}

      {serverError && (
        <Alert
          status="error"
          variant="subtle"
          bg="rgba(229,72,77,0.10)"
          borderRadius="12px"
          border="1px solid rgba(229,72,77,0.25)"
        >
          <AlertIcon />
          <Text fontSize="sm" className="inter">
            {serverError}
          </Text>
        </Alert>
      )}

      <Text
        fontSize="xs"
        color="rgba(255,255,255,0.35)"
        className="inter"
        textAlign="center"
      >
        Du hast bereits einen Account?{" "}
        <Box
          as="a"
          href="/login"
          color="var(--color-accent-gold)"
          textDecoration="underline"
        >
          Einloggen
        </Box>
      </Text>
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
          <Box
            w="6px"
            h="6px"
            borderRadius="full"
            bg="var(--color-accent-gold)"
            mt="8px"
            flexShrink={0}
          />
          <Text
            fontSize="sm"
            color="rgba(255,255,255,0.65)"
            className="inter"
            textAlign="left"
          >
            Bestätigungs-Email ist unterwegs
          </Text>
        </HStack>
        <HStack spacing={3} align="flex-start">
          <Box
            w="6px"
            h="6px"
            borderRadius="full"
            bg="var(--color-accent-gold)"
            mt="8px"
            flexShrink={0}
          />
          <Text
            fontSize="sm"
            color="rgba(255,255,255,0.65)"
            className="inter"
            textAlign="left"
          >
            Prüfung innerhalb von 24–48 Stunden
          </Text>
        </HStack>
        <HStack spacing={3} align="flex-start">
          <Box
            w="6px"
            h="6px"
            borderRadius="full"
            bg="var(--color-accent-gold)"
            mt="8px"
            flexShrink={0}
          />
          <Text
            fontSize="sm"
            color="rgba(255,255,255,0.65)"
            className="inter"
            textAlign="left"
          >
            Antwort per E-Mail
          </Text>
        </HStack>
      </Stack>

      <Stack spacing={2} w="full" maxW="300px" pt={2}>
        <Box
          h="2px"
          w="full"
          bg="rgba(255,255,255,0.06)"
          borderRadius="full"
          overflow="hidden"
        >
          <Box
            h="full"
            bg="linear-gradient(90deg, rgba(212,175,55,0.5), rgba(212,175,55,0.9))"
            borderRadius="full"
            sx={{
              animation: "appRedirectFill 3s linear forwards",
            }}
          />
        </Box>
        <Text
          fontSize="xs"
          color="rgba(255,255,255,0.30)"
          className="inter"
        >
          Du wirst in wenigen Sekunden weitergeleitet…
        </Text>
      </Stack>
    </Stack>
  );
}

/* ================================================================
   Character Counter Pill with green check on completion
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
      top="8px"
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
          <Text
            fontSize="12px"
            lineHeight="1"
            color="rgba(74,222,128,0.95)"
          >
            ✓
          </Text>
        </Box>
      ) : (
        <Box as="svg" w="22px" h="22px" viewBox="0 0 24 24">
          <circle
            cx="12"
            cy="12"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="2"
          />
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
