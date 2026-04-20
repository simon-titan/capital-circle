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
} from "@chakra-ui/react";
import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { glassPrimaryButtonProps } from "@/components/ui/glassButtonStyles";

type Step = "account" | "questions" | "thanks";

interface AccountState {
  fullName: string;
  email: string;
  password: string;
}

interface QuestionState {
  experience: string;
  biggestProblem: string;
  goal6Months: string;
}

const MIN_EXPERIENCE = 30;
const MIN_PROBLEM = 50;
const MIN_GOAL = 50;

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

export function FreeApplicationForm() {
  const supabase = useMemo(() => createClient(), []);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  const [step, setStep] = useState<Step>("account");
  const [account, setAccount] = useState<AccountState>({
    fullName: "",
    email: "",
    password: "",
  });
  const [questions, setQuestions] = useState<QuestionState>({
    experience: "",
    biggestProblem: "",
    goal6Months: "",
  });
  const [accountErrors, setAccountErrors] = useState<Partial<Record<keyof AccountState, string>>>({});
  const [questionErrors, setQuestionErrors] = useState<Partial<Record<keyof QuestionState, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileReady = useRef(false);

  // Render Turnstile widget once script + container ready.
  useEffect(() => {
    if (step !== "account") return;
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
      turnstileReady.current = true;
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

  function validateAccount(): boolean {
    const errs: Partial<Record<keyof AccountState, string>> = {};
    if (account.fullName.trim().length < 2) errs.fullName = "Bitte vollständigen Namen angeben.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email.trim())) errs.email = "Ungültige E-Mail-Adresse.";
    if (account.password.length < 8) errs.password = "Mindestens 8 Zeichen.";
    setAccountErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateQuestions(): boolean {
    const errs: Partial<Record<keyof QuestionState, string>> = {};
    if (questions.experience.trim().length < MIN_EXPERIENCE)
      errs.experience = `Bitte mindestens ${MIN_EXPERIENCE} Zeichen.`;
    if (questions.biggestProblem.trim().length < MIN_PROBLEM)
      errs.biggestProblem = `Bitte mindestens ${MIN_PROBLEM} Zeichen.`;
    if (questions.goal6Months.trim().length < MIN_GOAL)
      errs.goal6Months = `Bitte mindestens ${MIN_GOAL} Zeichen.`;
    setQuestionErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleAccountSubmit() {
    setServerError(null);
    if (!validateAccount()) return;

    if (siteKey && !turnstileToken) {
      setServerError("Bitte das Captcha lösen.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: account.email.trim(),
        password: account.password,
        options: {
          data: { full_name: account.fullName.trim() },
        },
      });

      if (error) {
        setServerError(error.message);
        return;
      }
      if (!data.user) {
        setServerError("Konto konnte nicht angelegt werden.");
        return;
      }

      // Falls Email-Confirmation aktiv ist, gibt es noch keine Session — wir
      // versuchen trotzdem direkt einzuloggen, damit /api/applications/create
      // einen User-Context hat. Schlägt fehl, wenn email_confirm true ist.
      if (!data.session) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: account.email.trim(),
          password: account.password,
        });
        if (signInErr) {
          // Wenn Bestätigung nötig ist, kann der User trotzdem die Bewerbung
          // einreichen, sobald er die Mail bestätigt — wir erlauben den
          // weiteren Flow, weil /api/applications/create einen Auth-Check
          // macht. Falls keine Session: Hinweis zeigen und auf account bleiben.
          setServerError(
            "Bitte bestätige zuerst deine E-Mail-Adresse, um fortzufahren.",
          );
          return;
        }
      }

      setStep("questions");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuestionsSubmit() {
    setServerError(null);
    if (!validateQuestions()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/applications/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          experience: questions.experience.trim(),
          biggest_problem: questions.biggestProblem.trim(),
          goal_6_months: questions.goal6Months.trim(),
          turnstileToken,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setServerError(json.error ?? "Bewerbung konnte nicht abgeschickt werden.");
        return;
      }
      setStep("thanks");
    } finally {
      setSubmitting(false);
    }
  }

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

      <Box
        as="section"
        maxW="560px"
        mx="auto"
        p={{ base: 6, md: 8 }}
        sx={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.07)",
        }}
      >
        <Stack spacing={6}>
          {step === "account" && (
            <AccountSection
              account={account}
              setAccount={setAccount}
              errors={accountErrors}
              submitting={submitting}
              serverError={serverError}
              siteKey={siteKey}
              turnstileContainerRef={turnstileContainerRef}
              onSubmit={handleAccountSubmit}
            />
          )}

          {step === "questions" && (
            <QuestionsSection
              questions={questions}
              setQuestions={setQuestions}
              errors={questionErrors}
              submitting={submitting}
              serverError={serverError}
              onSubmit={handleQuestionsSubmit}
            />
          )}

          {step === "thanks" && <ThanksSection />}
        </Stack>
      </Box>
    </>
  );
}

function AccountSection(props: {
  account: AccountState;
  setAccount: (a: AccountState) => void;
  errors: Partial<Record<keyof AccountState, string>>;
  submitting: boolean;
  serverError: string | null;
  siteKey: string;
  turnstileContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  onSubmit: () => void;
}) {
  const { account, setAccount, errors, submitting, serverError, siteKey, turnstileContainerRef, onSubmit } = props;

  return (
    <Stack spacing={5}>
      <Stack spacing={2}>
        <Text
          fontSize="xs"
          letterSpacing="0.18em"
          textTransform="uppercase"
          color="var(--color-accent-gold)"
          className="inter-semibold"
        >
          Schritt 1 von 2 · Account
        </Text>
        <Heading
          as="h2"
          className="radley-regular"
          fontWeight={400}
          fontSize={{ base: "2xl", md: "3xl" }}
          lineHeight="1.2"
        >
          Bewirb dich bei Capital Circle
        </Heading>
        <Text fontSize="sm" color="rgba(255,255,255,0.62)" className="inter">
          Wir nehmen pro Periode nur eine kleine Zahl neuer Trader:innen auf. Dein Account wird sofort angelegt — die Plattform öffnet sich, sobald wir deine Bewerbung geprüft haben.
        </Text>
      </Stack>

      <FormControl isInvalid={Boolean(errors.fullName)} isRequired>
        <FormLabel className="inter" fontSize="sm" color="var(--color-text-primary)">
          Vollständiger Name
        </FormLabel>
        <Input
          {...inputStyles}
          value={account.fullName}
          onChange={(e) => setAccount({ ...account, fullName: e.target.value })}
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
          value={account.email}
          onChange={(e) => setAccount({ ...account, email: e.target.value })}
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
          value={account.password}
          onChange={(e) => setAccount({ ...account, password: e.target.value })}
          placeholder="Mindestens 8 Zeichen"
          autoComplete="new-password"
        />
        <FormHelperText color="rgba(255,255,255,0.4)" fontSize="xs">
          Mindestens 8 Zeichen.
        </FormHelperText>
        <FormErrorMessage>{errors.password}</FormErrorMessage>
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

      {serverError && (
        <Alert status="error" variant="subtle" bg="rgba(229,72,77,0.10)" borderRadius="12px">
          <AlertIcon />
          <Text fontSize="sm" className="inter">{serverError}</Text>
        </Alert>
      )}

      <Button
        {...glassPrimaryButtonProps}
        onClick={onSubmit}
        isLoading={submitting}
        loadingText="Account wird erstellt…"
      >
        Account erstellen & weiter
      </Button>

      <Text fontSize="xs" color="rgba(255,255,255,0.4)" className="inter" textAlign="center">
        Du hast bereits einen Account?{" "}
        <Box as="a" href="/login" color="var(--color-accent-gold)" textDecoration="underline">
          Einloggen
        </Box>
      </Text>
    </Stack>
  );
}

function QuestionsSection(props: {
  questions: QuestionState;
  setQuestions: (q: QuestionState) => void;
  errors: Partial<Record<keyof QuestionState, string>>;
  submitting: boolean;
  serverError: string | null;
  onSubmit: () => void;
}) {
  const { questions, setQuestions, errors, submitting, serverError, onSubmit } = props;

  return (
    <Stack spacing={5}>
      <Stack spacing={2}>
        <Text
          fontSize="xs"
          letterSpacing="0.18em"
          textTransform="uppercase"
          color="var(--color-accent-gold)"
          className="inter-semibold"
        >
          Schritt 2 von 2 · Drei kurze Fragen
        </Text>
        <Heading
          as="h2"
          className="radley-regular"
          fontWeight={400}
          fontSize={{ base: "2xl", md: "3xl" }}
          lineHeight="1.2"
        >
          Erzähl uns kurz von dir
        </Heading>
        <Text fontSize="sm" color="rgba(255,255,255,0.62)" className="inter">
          Damit wir besser einschätzen können, ob Capital Circle für dich passt.
        </Text>
      </Stack>

      <FormControl isInvalid={Boolean(errors.experience)} isRequired>
        <FormLabel className="inter" fontSize="sm" color="var(--color-text-primary)">
          Wie viel Erfahrung hast du im Trading?
        </FormLabel>
        <Textarea
          {...inputStyles}
          minH="110px"
          value={questions.experience}
          onChange={(e) => setQuestions({ ...questions, experience: e.target.value })}
          placeholder="Erzähl uns kurz von deinem Werdegang…"
        />
        <CharCounter value={questions.experience} min={MIN_EXPERIENCE} />
        <FormErrorMessage>{errors.experience}</FormErrorMessage>
      </FormControl>

      <FormControl isInvalid={Boolean(errors.biggestProblem)} isRequired>
        <FormLabel className="inter" fontSize="sm" color="var(--color-text-primary)">
          Was ist aktuell dein größtes Problem?
        </FormLabel>
        <Textarea
          {...inputStyles}
          minH="130px"
          value={questions.biggestProblem}
          onChange={(e) => setQuestions({ ...questions, biggestProblem: e.target.value })}
          placeholder="Was hält dich gerade vom nächsten Schritt ab?"
        />
        <CharCounter value={questions.biggestProblem} min={MIN_PROBLEM} />
        <FormErrorMessage>{errors.biggestProblem}</FormErrorMessage>
      </FormControl>

      <FormControl isInvalid={Boolean(errors.goal6Months)} isRequired>
        <FormLabel className="inter" fontSize="sm" color="var(--color-text-primary)">
          Was willst du in den nächsten 6 Monaten erreichen?
        </FormLabel>
        <Textarea
          {...inputStyles}
          minH="130px"
          value={questions.goal6Months}
          onChange={(e) => setQuestions({ ...questions, goal6Months: e.target.value })}
          placeholder="Sei so konkret wie möglich…"
        />
        <CharCounter value={questions.goal6Months} min={MIN_GOAL} />
        <FormErrorMessage>{errors.goal6Months}</FormErrorMessage>
      </FormControl>

      {serverError && (
        <Alert status="error" variant="subtle" bg="rgba(229,72,77,0.10)" borderRadius="12px">
          <AlertIcon />
          <Text fontSize="sm" className="inter">{serverError}</Text>
        </Alert>
      )}

      <Button
        {...glassPrimaryButtonProps}
        onClick={onSubmit}
        isLoading={submitting}
        loadingText="Bewerbung wird abgeschickt…"
      >
        Bewerbung absenden
      </Button>
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

function ThanksSection() {
  return (
    <Stack spacing={4} align="center" textAlign="center" py={4}>
      <Box
        w="56px"
        h="56px"
        borderRadius="full"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="rgba(212,175,55,0.18)"
        border="1px solid rgba(212,175,55,0.5)"
        color="var(--color-accent-gold)"
        fontSize="24px"
      >
        ✓
      </Box>
      <Heading
        as="h2"
        className="radley-regular"
        fontWeight={400}
        fontSize={{ base: "2xl", md: "3xl" }}
      >
        Deine Bewerbung ist eingegangen.
      </Heading>
      <Text fontSize="md" color="rgba(255,255,255,0.72)" className="inter" maxW="420px">
        Wir prüfen sie innerhalb von 24–48 Stunden und melden uns per E-Mail bei dir. Bis dahin musst du nichts weiter tun.
      </Text>
      <Text fontSize="xs" color="rgba(255,255,255,0.4)" className="inter">
        Du kannst dieses Fenster jetzt schließen.
      </Text>
    </Stack>
  );
}
