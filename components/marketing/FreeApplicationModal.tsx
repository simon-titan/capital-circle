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
import { useCallback, useEffect, useRef, useState } from "react";
import { glassPrimaryButtonProps } from "@/components/ui/glassButtonStyles";

const STEPS = 5;
const MIN_EXPERIENCE = 30;
const MIN_PROBLEM = 50;
const MIN_GOAL = 50;

const STEP_LABELS = [
  "Frage 1 / 3",
  "Frage 2 / 3",
  "Frage 3 / 3",
  "Fast geschafft",
  "Eingegangen",
] as const;

const inputStyles = {
  bg: "rgba(255,255,255,0.05)",
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
          appearance?: "always" | "execute" | "interaction-only";
        },
      ) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function FreeApplicationModal({ isOpen, onClose }: Props) {
  const router = useRouter();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

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

  // Turnstile-Widget auf Step 4 initialisieren
  useEffect(() => {
    if (step !== 4) return;
    if (!siteKey) return;
    if (turnstileWidgetId.current) return;

    const tryRender = () => {
      if (!window.turnstile || !turnstileContainerRef.current) return false;
      turnstileWidgetId.current = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: siteKey,
        theme: "dark",
        appearance: "interaction-only",
        callback: (token) => setTurnstileToken(token),
        "error-callback": () => setTurnstileToken(null),
        "expired-callback": () => setTurnstileToken(null),
      });
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

  // Auto-Redirect nach Thanks-Screen (Step 5)
  useEffect(() => {
    if (step !== 5) return;
    const timer = setTimeout(() => {
      router.push("/pending-review");
    }, 3000);
    return () => clearTimeout(timer);
  }, [step, router]);

  const resetModal = useCallback(() => {
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
    if (step === 5) return; // kein manuelles Schließen im Thanks-Step
    resetModal();
    onClose();
  }, [step, resetModal, onClose]);

  function validateStep(): boolean {
    const errs: Record<string, string> = {};
    if (step === 1 && experience.trim().length < MIN_EXPERIENCE) {
      errs.experience = `Bitte mindestens ${MIN_EXPERIENCE} Zeichen.`;
    }
    if (step === 2 && biggestProblem.trim().length < MIN_PROBLEM) {
      errs.biggestProblem = `Bitte mindestens ${MIN_PROBLEM} Zeichen.`;
    }
    if (step === 3 && goal6Months.trim().length < MIN_GOAL) {
      errs.goal6Months = `Bitte mindestens ${MIN_GOAL} Zeichen.`;
    }
    if (step === 4) {
      if (fullName.trim().length < 2) errs.fullName = "Bitte vollständigen Namen angeben.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = "Ungültige E-Mail-Adresse.";
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

    // Step 4 → Submit
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
      const json = (await res.json()) as { ok?: boolean; error?: string; redirectTo?: string };
      if (!res.ok || !json.ok) {
        setServerError(json.error ?? "Bewerbung konnte nicht abgeschickt werden. Bitte erneut versuchen.");
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
        closeOnOverlayClick={step < 5}
        isCentered
      >
        <ModalOverlay
          bg="rgba(0,0,0,0.72)"
          backdropFilter="blur(10px)"
          sx={{ WebkitBackdropFilter: "blur(10px)" }}
        />
        <ModalContent
          sx={{
            background: "rgba(12,12,14,0.92)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: "20px",
            boxShadow: "0 24px 80px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.07)",
          }}
          maxW="640px"
          mx={4}
        >
          <ModalHeader px={6} pt={6} pb={0}>
            {step < 5 && (
              <Stack spacing={3}>
                <HStack justify="space-between" align="center">
                  <Text
                    fontSize="xs"
                    letterSpacing="0.18em"
                    textTransform="uppercase"
                    color="var(--color-accent-gold)"
                    className="inter-semibold"
                  >
                    {STEP_LABELS[step - 1]}
                  </Text>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    color="rgba(255,255,255,0.4)"
                    _hover={{ color: "rgba(255,255,255,0.7)", bg: "rgba(255,255,255,0.06)" }}
                    borderRadius="8px"
                    minW="auto"
                    px={2}
                    fontSize="lg"
                  >
                    ×
                  </Button>
                </HStack>

                {/* Progress-Bar */}
                <Box
                  h="3px"
                  w="full"
                  bg="rgba(255,255,255,0.08)"
                  borderRadius="full"
                  overflow="hidden"
                >
                  <Box
                    h="full"
                    w={`${progressPct}%`}
                    bg="linear-gradient(90deg, rgba(212,175,55,0.7) 0%, rgba(212,175,55,1) 100%)"
                    borderRadius="full"
                    transition="width 0.35s cubic-bezier(0.4,0,0.2,1)"
                  />
                </Box>
              </Stack>
            )}
          </ModalHeader>

          <ModalBody px={6} py={6}>
            {step === 1 && (
              <QuestionStep
                heading="Wie viel Erfahrung hast du im Trading?"
                description="Erzähl uns kurz von deinem bisherigen Weg — Anfänger, aktiver Trader oder erfahren? Jeder Hintergrund ist willkommen."
                value={experience}
                onChange={setExperience}
                error={errors.experience}
                min={MIN_EXPERIENCE}
                placeholder="Ich trade seit ... , habe Erfahrung mit ..., mein bisheriges Ergebnis war ..."
              />
            )}
            {step === 2 && (
              <QuestionStep
                heading="Was ist aktuell dein größtes Problem?"
                description="Was hält dich gerade vom nächsten Schritt zurück — technisch, mental oder strukturell?"
                value={biggestProblem}
                onChange={setBiggestProblem}
                error={errors.biggestProblem}
                min={MIN_PROBLEM}
                placeholder="Mein größtes Problem ist gerade ..."
              />
            )}
            {step === 3 && (
              <QuestionStep
                heading="Was willst du in den nächsten 6 Monaten erreichen?"
                description="Sei so konkret wie möglich — Trading-Ziele, finanzielle Ziele, Entwicklungsziele."
                value={goal6Months}
                onChange={setGoal6Months}
                error={errors.goal6Months}
                min={MIN_GOAL}
                placeholder="In 6 Monaten will ich ..."
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
          </ModalBody>

          {step < 5 && (
            <ModalFooter px={6} pb={6} pt={2} gap={3} flexDirection="column">
              <Button
                {...glassPrimaryButtonProps}
                onClick={handleNext}
                isLoading={submitting}
                loadingText={step === 4 ? "Bewerbung wird abgeschickt…" : undefined}
              >
                {step === 4 ? "Bewerbung absenden" : "Weiter"}
              </Button>

              {step > 1 && (
                <Button
                  variant="ghost"
                  w="full"
                  size="sm"
                  onClick={handleBack}
                  color="rgba(255,255,255,0.45)"
                  _hover={{ color: "rgba(255,255,255,0.75)", bg: "rgba(255,255,255,0.05)" }}
                  borderRadius="10px"
                >
                  ← Zurück
                </Button>
              )}

              <Text fontSize="xs" color="rgba(255,255,255,0.28)" className="inter" textAlign="center">
                Mit dem Absenden stimmst du unserer{" "}
                <Box as="a" href="/datenschutz" target="_blank" color="var(--color-accent-gold)" textDecoration="underline">
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
        <Heading
          as="h2"
          className="radley-regular"
          fontWeight={400}
          fontSize={{ base: "xl", md: "2xl" }}
          lineHeight="1.25"
          color="var(--color-text-primary)"
        >
          {heading}
        </Heading>
        <Text fontSize="sm" color="rgba(255,255,255,0.58)" className="inter">
          {description}
        </Text>
      </Stack>

      <FormControl isInvalid={Boolean(error)} isRequired>
        <Textarea
          {...inputStyles}
          minH="140px"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          resize="vertical"
        />
        <CharCounter value={value} min={min} />
        <FormErrorMessage>{error}</FormErrorMessage>
      </FormControl>
    </Stack>
  );
}

function AccountStep({
  fullName, setFullName,
  email, setEmail,
  password, setPassword,
  errors, serverError,
  siteKey, turnstileContainerRef,
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
        <Heading
          as="h2"
          className="radley-regular"
          fontWeight={400}
          fontSize={{ base: "xl", md: "2xl" }}
          lineHeight="1.25"
          color="var(--color-text-primary)"
        >
          Fast geschafft — deine Daten
        </Heading>
        <Text fontSize="sm" color="rgba(255,255,255,0.58)" className="inter">
          Wir legen deinen Account an und schicken dir eine Bestätigung sobald deine Bewerbung geprüft wurde.
        </Text>
      </Stack>

      <FormControl isInvalid={Boolean(errors.fullName)} isRequired>
        <FormLabel className="inter" fontSize="sm" color="var(--color-text-primary)">
          Vollständiger Name
        </FormLabel>
        <Input
          {...inputStyles}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Max Mustermann"
          autoComplete="name"
        />
        <FormErrorMessage>{errors.fullName}</FormErrorMessage>
      </FormControl>

      <FormControl isInvalid={Boolean(errors.email)} isRequired>
        <FormLabel className="inter" fontSize="sm" color="var(--color-text-primary)">
          E-Mail-Adresse
        </FormLabel>
        <Input
          {...inputStyles}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="du@example.com"
          autoComplete="email"
        />
        <FormErrorMessage>{errors.email}</FormErrorMessage>
      </FormControl>

      <FormControl isInvalid={Boolean(errors.password)} isRequired>
        <FormLabel className="inter" fontSize="sm" color="var(--color-text-primary)">
          Passwort
        </FormLabel>
        <Input
          {...inputStyles}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mindestens 8 Zeichen"
          autoComplete="new-password"
        />
        <FormHelperText color="rgba(255,255,255,0.35)" fontSize="xs" className="inter">
          Mindestens 8 Zeichen.
        </FormHelperText>
        <FormErrorMessage>{errors.password}</FormErrorMessage>
      </FormControl>

      {siteKey ? (
        <Box ref={turnstileContainerRef} display="flex" justifyContent="center" />
      ) : null}

      {serverError && (
        <Alert status="error" variant="subtle" bg="rgba(229,72,77,0.10)" borderRadius="12px" border="1px solid rgba(229,72,77,0.25)">
          <AlertIcon />
          <Text fontSize="sm" className="inter">{serverError}</Text>
        </Alert>
      )}

      <Text fontSize="xs" color="rgba(255,255,255,0.38)" className="inter" textAlign="center">
        Du hast bereits einen Account?{" "}
        <Box as="a" href="/login" color="var(--color-accent-gold)" textDecoration="underline">
          Einloggen
        </Box>
      </Text>
    </Stack>
  );
}

function ThanksStep() {
  return (
    <Stack spacing={5} align="center" textAlign="center" py={4}>
      <Box
        w="64px"
        h="64px"
        borderRadius="full"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="rgba(212,175,55,0.18)"
        border="1px solid rgba(212,175,55,0.5)"
        color="var(--color-accent-gold)"
        fontSize="26px"
      >
        ✓
      </Box>
      <Heading
        as="h2"
        className="radley-regular"
        fontWeight={400}
        fontSize={{ base: "2xl", md: "3xl" }}
        lineHeight="1.2"
        color="var(--color-text-primary)"
      >
        Deine Bewerbung ist eingegangen.
      </Heading>
      <Text fontSize="md" color="rgba(255,255,255,0.72)" className="inter" maxW="420px">
        Wir prüfen sie innerhalb von 24–48 Stunden und melden uns per E-Mail bei dir. Eine Bestätigung ist bereits unterwegs.
      </Text>
      <Text fontSize="xs" color="rgba(255,255,255,0.35)" className="inter">
        Du wirst in wenigen Sekunden weitergeleitet…
      </Text>
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
        color={ok ? "rgba(212,175,55,0.85)" : "rgba(255,255,255,0.32)"}
      >
        {len} / {min}
      </Text>
    </HStack>
  );
}
