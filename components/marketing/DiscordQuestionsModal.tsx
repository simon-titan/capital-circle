"use client";

import {
  Box,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, User, Mail, Phone } from "lucide-react";
import {
  DISCORD_FUNNEL_QUESTIONS,
  type DiscordFunnelQuestion,
} from "@/config/discord-funnel-questions";
import type { SourceOrigin } from "@/lib/discord-funnel/types";
import {
  FieldError,
  FunnelAlert,
  FunnelFinePrint,
  FunnelHeadline,
  FunnelLead,
  FunnelModalTopBar,
  FunnelProgress,
  FunnelStepIndicator,
  FunnelThanks,
  FunnelWarningOverlay,
  OptionCard,
  funnelBackButtonProps,
  funnelFieldProps,
  funnelModalContentProps,
  funnelOverlayProps,
} from "./funnel-ui";

const WARNING_SECONDS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Tracking-Payload für die Lead-Anlage (nur bei collectContact relevant). */
export interface LeadFunnelTracking {
  session_id: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Lead-Token (lid) — wird mit den Antworten an die API gesendet.
   * Bei collectContact=true wird der Token erst im Kontakt-Schritt erzeugt; dann darf
   * hier "" übergeben werden.
   */
  token: string;
  /**
   * Wird nach erfolgreichem Submit aufgerufen, damit der Parent Calendly enthüllt.
   * Bei collectContact wird der frisch erzeugte Token mitgegeben.
   */
  onComplete: (token?: string) => void;
  /**
   * Sammelt einen zusätzlichen Schritt VOR den Fragen ab: Name, E-Mail, Telefon.
   * Legt darüber einen Lead an (ohne Discord-Auth, ohne Invite-Mail). Default: false.
   */
  collectContact?: boolean;
  /** utm_source-Fallback für die Lead-Anlage, falls kein UTM in der URL steht. */
  leadSource?: string;
  /** Tracking-Daten (session_id, utm_*, referrer) für die Lead-Anlage. */
  tracking?: LeadFunnelTracking | null;
  /** Herkunft für die Lead-Anlage (discord_funnel | termin_direct). */
  sourceOrigin?: SourceOrigin;
}

export function DiscordQuestionsModal({
  isOpen,
  onClose,
  token,
  onComplete,
  collectContact = false,
  leadSource,
  tracking,
  sourceOrigin,
}: Props) {
  const questionCount = DISCORD_FUNNEL_QUESTIONS.length;
  const totalSteps = collectContact ? questionCount + 1 : questionCount;

  // Bei collectContact startet der Flow im Kontakt-Schritt; sonst direkt bei den Fragen.
  const [phase, setPhase] = useState<"contact" | "questions">(
    collectContact ? "contact" : "questions",
  );
  const [leadToken, setLeadToken] = useState(token);
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });

  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const q of DISCORD_FUNNEL_QUESTIONS) init[q.id] = "";
    return init;
  });
  const [stepError, setStepError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [showWarning, setShowWarning] = useState(true);
  const [warningCountdown, setWarningCountdown] = useState(WARNING_SECONDS);
  const [warningFadingOut, setWarningFadingOut] = useState(false);

  const inContactPhase = phase === "contact";
  const currentQuestion: DiscordFunnelQuestion | undefined = DISCORD_FUNNEL_QUESTIONS[stepIndex];
  const currentValue = currentQuestion ? (answers[currentQuestion.id] ?? "") : "";

  // 1-basierter Anzeige-Schritt über alle Phasen (Kontakt zählt als Schritt 1).
  const displayStep = inContactPhase ? 1 : stepIndex + 1 + (collectContact ? 1 : 0);
  const progressPct = (displayStep / totalSteps) * 100;
  const isLastStep = !inContactPhase && stepIndex === questionCount - 1;

  const contactValid = useMemo(
    () =>
      contact.name.trim().length > 0 &&
      EMAIL_RE.test(contact.email.trim()) &&
      contact.phone.trim().length > 0,
    [contact],
  );

  const currentStepAnswered = useMemo(() => {
    if (inContactPhase) return contactValid;
    if (!currentQuestion) return false;
    return currentQuestion.options.includes(currentValue);
  }, [inContactPhase, contactValid, currentQuestion, currentValue]);

  const handleClose = useCallback(() => {
    if (submitted || submitting || showWarning) return;
    onClose();
  }, [submitted, submitting, showWarning, onClose]);

  // Warn-Countdown (wie /bewerbung).
  useEffect(() => {
    if (!isOpen || !showWarning || warningFadingOut || warningCountdown <= 0) return;
    const t = setTimeout(() => setWarningCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [isOpen, showWarning, warningFadingOut, warningCountdown]);

  function dismissWarning() {
    setWarningFadingOut(true);
    setTimeout(() => {
      setShowWarning(false);
      setWarningFadingOut(false);
    }, 300);
  }

  // Kontakt-Schritt: Lead anlegen (ohne Discord-Auth, ohne Invite-Mail) und Token merken.
  async function submitContact() {
    setServerError(null);
    if (!contactValid) {
      setStepError("Bitte fülle Name, gültige E-Mail und Telefon aus.");
      return;
    }
    setStepError(null);

    setSubmitting(true);
    try {
      const res = await fetch("/api/discord-funnel/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: contact.name.trim(),
          email: contact.email.trim(),
          phone: contact.phone.trim(),
          session_id: tracking?.session_id,
          utm_source: tracking?.utm_source ?? leadSource ?? null,
          utm_medium: tracking?.utm_medium ?? null,
          utm_campaign: tracking?.utm_campaign ?? null,
          utm_content: tracking?.utm_content ?? null,
          utm_term: tracking?.utm_term ?? null,
          referrer: tracking?.referrer ?? null,
          source_origin: sourceOrigin,
          skip_invite: true,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; token?: string; error?: string }
        | null;

      if (!res.ok || !json?.ok || !json.token) {
        setServerError(json?.error ?? "Deine Daten konnten nicht gespeichert werden.");
        setSubmitting(false);
        return;
      }

      setLeadToken(json.token);
      setPhase("questions");
      setStepIndex(0);
      setSubmitting(false);
    } catch {
      setServerError("Verbindungsfehler. Bitte erneut versuchen.");
      setSubmitting(false);
    }
  }

  async function handleNext() {
    setServerError(null);

    if (inContactPhase) {
      await submitContact();
      return;
    }

    if (!currentStepAnswered) {
      setStepError("Bitte wähle eine Option.");
      return;
    }
    setStepError(null);

    if (!isLastStep) {
      setStepIndex((i) => i + 1);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/discord-funnel/questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: leadToken, answers }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok || !json.ok) {
        setServerError(json.error ?? "Antworten konnten nicht gespeichert werden.");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      // Kurze Bestätigung zeigen, dann den Parent Calendly enthüllen lassen.
      setTimeout(() => {
        onComplete(leadToken);
      }, 1600);
    } catch {
      setServerError("Verbindungsfehler. Bitte erneut versuchen.");
      setSubmitting(false);
    }
  }

  function handleBack() {
    setStepError(null);
    setServerError(null);
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
      return;
    }
    // Erste Frage → zurück zum Kontakt-Schritt (Lead bleibt idempotent erhalten).
    if (collectContact && phase === "questions") setPhase("contact");
  }

  if (!currentQuestion && !submitted) return null;

  // Solange der Pflicht-Hinweis liegt, ist der Rest nicht erreichbar.
  const hiddenBehindWarning = {
    "aria-hidden": showWarning,
    sx: { visibility: showWarning ? "hidden" : "visible", pointerEvents: showWarning ? "none" : "auto" },
  } as const;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="xl"
      scrollBehavior="inside"
      closeOnOverlayClick={!submitted && !submitting && !showWarning}
      closeOnEsc={!submitted && !submitting && !showWarning}
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
            readyLabel="Ich habe verstanden → Bewerbung starten"
            zIndex={20}
          />
        )}

        <ModalHeader px={6} pt={6} pb={0} position="relative" zIndex={1} {...hiddenBehindWarning}>
          {!submitted && (
            <Stack spacing={4}>
              <FunnelModalTopBar
                label={inContactPhase ? "Capital Circle · Deine Daten" : "Capital Circle · Kurze Einordnung"}
                onClose={handleClose}
              />
              <FunnelStepIndicator current={displayStep} total={totalSteps} unit={collectContact ? "Schritt" : "Frage"} />
              <FunnelProgress value={progressPct} label="Fortschritt der Einordnung" />
            </Stack>
          )}
        </ModalHeader>

        <ModalBody px={6} py={6} position="relative" zIndex={1} {...hiddenBehindWarning}>
          <Box
            key={submitted ? "thanks" : `${phase}-${stepIndex}`}
            sx={{ animation: "appStepEnter 0.3s cubic-bezier(0.16,1,0.3,1)" }}
          >
            {submitted ? (
              <FunnelThanks
                title="Perfekt — dein Termin ist freigeschaltet"
                bullets={[
                  "Wähle gleich deinen passenden Gesprächstermin",
                  "Danach erhältst du deinen kostenlosen Discord-Zugang",
                ]}
                footer="Terminkalender wird geladen…"
                fillSeconds={1.6}
              />
            ) : inContactPhase ? (
              <ContactStep
                value={contact}
                onChange={(patch) => {
                  setContact((c) => ({ ...c, ...patch }));
                  if (stepError) setStepError(null);
                }}
                error={stepError}
              />
            ) : currentQuestion ? (
              <RadioStep
                question={currentQuestion}
                value={currentValue}
                onChange={(v) => {
                  setAnswers((a) => ({ ...a, [currentQuestion.id]: v }));
                  if (stepError) setStepError(null);
                }}
                error={stepError}
              />
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
              isDisabled={!currentStepAnswered}
              isLoading={submitting}
              loadingText="Wird gespeichert…"
              leftIcon={isLastStep ? <Check size={18} strokeWidth={2.25} /> : undefined}
            >
              {isLastStep ? "Termin freischalten" : "Weiter"}
            </Button>

            {(stepIndex > 0 || (collectContact && phase === "questions")) && (
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

/* ================================================================
   Contact Step (Name / E-Mail / Telefon)
   ================================================================ */

interface ContactValue {
  name: string;
  email: string;
  phone: string;
}

function ContactStep({
  value,
  onChange,
  error,
}: {
  value: ContactValue;
  onChange: (patch: Partial<ContactValue>) => void;
  error: string | null;
}) {
  const fields: { key: keyof ContactValue; type: string; placeholder: string; autoComplete: string; icon: React.ReactNode }[] = [
    { key: "name", type: "text", placeholder: "Voller Name", autoComplete: "name", icon: <User size={18} strokeWidth={1.75} /> },
    { key: "email", type: "email", placeholder: "E-Mail-Adresse", autoComplete: "email", icon: <Mail size={18} strokeWidth={1.75} /> },
    { key: "phone", type: "tel", placeholder: "Telefonnummer", autoComplete: "tel", icon: <Phone size={18} strokeWidth={1.75} /> },
  ];

  return (
    <Stack spacing={5}>
      <Stack spacing={2}>
        <FunnelHeadline as="h2" scale="sm">
          Wohin dürfen wir deine Termin-Bestätigung schicken?
        </FunnelHeadline>
        <FunnelLead fontSize="14px">
          Trag deine Daten ein — danach beantwortest du noch ein paar kurze Fragen.
        </FunnelLead>
      </Stack>

      <Stack spacing={4}>
        {fields.map((f) => (
          <InputGroup key={f.key} size="lg">
            <InputLeftElement pointerEvents="none" color="var(--cc-text-3)" h="52px">
              {f.icon}
            </InputLeftElement>
            <Input
              {...funnelFieldProps}
              type={f.type}
              name={f.key}
              aria-label={f.placeholder}
              placeholder={f.placeholder}
              autoComplete={f.autoComplete}
              value={value[f.key]}
              onChange={(e) => onChange({ [f.key]: e.target.value })}
              h="52px"
              fontSize="15px"
            />
          </InputGroup>
        ))}
        {error && <FieldError>{error}</FieldError>}
      </Stack>
    </Stack>
  );
}

/* ================================================================
   Radio Step (Single-Select Cards)
   ================================================================ */

function RadioStep({
  question,
  value,
  onChange,
  error,
}: {
  question: DiscordFunnelQuestion;
  value: string;
  onChange: (v: string) => void;
  error: string | null;
}) {
  return (
    <Stack spacing={5}>
      <FunnelHeadline as="h2" scale="sm">
        {question.question}
      </FunnelHeadline>

      <Stack spacing={3} role="radiogroup" aria-label={question.question}>
        {question.options.map((opt) => (
          <OptionCard key={opt} name={question.id} value={opt} checked={value === opt} onSelect={() => onChange(opt)}>
            {opt}
          </OptionCard>
        ))}
        {error && <FieldError>{error}</FieldError>}
      </Stack>
    </Stack>
  );
}
