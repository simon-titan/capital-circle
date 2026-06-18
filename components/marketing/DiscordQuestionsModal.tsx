"use client";

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  HStack,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  VisuallyHidden,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DISCORD_FUNNEL_QUESTIONS,
  type DiscordFunnelQuestion,
} from "@/config/discord-funnel-questions";

const WARNING_SECONDS = 5;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Lead-Token (lid) — wird mit den Antworten an die API gesendet. */
  token: string;
  /** Wird nach erfolgreichem Submit aufgerufen, damit der Parent Calendly enthüllt. */
  onComplete: () => void;
}

export function DiscordQuestionsModal({ isOpen, onClose, token, onComplete }: Props) {
  const totalSteps = DISCORD_FUNNEL_QUESTIONS.length;

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

  const currentQuestion: DiscordFunnelQuestion | undefined = DISCORD_FUNNEL_QUESTIONS[stepIndex];
  const currentValue = currentQuestion ? (answers[currentQuestion.id] ?? "") : "";
  const progressPct = ((stepIndex + 1) / totalSteps) * 100;
  const isLastStep = stepIndex === totalSteps - 1;

  const currentStepAnswered = useMemo(() => {
    if (!currentQuestion) return false;
    return currentQuestion.options.includes(currentValue);
  }, [currentQuestion, currentValue]);

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

  async function handleNext() {
    setServerError(null);
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
        body: JSON.stringify({ token, answers }),
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
        onComplete();
      }, 1600);
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
      closeOnOverlayClick={!submitted && !submitting && !showWarning}
      closeOnEsc={!submitted && !submitting && !showWarning}
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
            "0 24px 80px rgba(0,0,0,0.80), 0 0 0 1px rgba(71,247,220,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
          _before: {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "150px",
            background:
              "radial-gradient(ellipse at top, rgba(71,247,220,0.07), transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          },
        }}
        maxW="680px"
        mx={4}
      >
        {showWarning && (
          <Box
            position="absolute"
            inset={0}
            zIndex={20}
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            textAlign="center"
            px={{ base: 5, md: 8 }}
            py={{ base: 8, md: 10 }}
            overflowY="auto"
            sx={{
              background: "rgba(8,8,10,0.95)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderRadius: "24px",
              borderTop: "2px solid rgba(220,60,60,0.35)",
              animation: warningFadingOut ? "dqWarnOut 0.3s ease forwards" : undefined,
              "@keyframes dqWarnOut": { to: { opacity: 0 } },
            }}
          >
            <Box
              w="48px"
              h="3px"
              borderRadius="full"
              bg="linear-gradient(90deg, rgba(220,60,60,0.6), rgba(220,60,60,0.2))"
              mb={{ base: 4, md: 6 }}
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
              sx={{
                animation: "dqWarnPulse 2.5s ease-in-out infinite",
                "@keyframes dqWarnPulse": {
                  "0%,100%": { boxShadow: "0 0 0 0 rgba(220,60,60,0.30)" },
                  "50%": { boxShadow: "0 0 0 10px rgba(220,60,60,0)" },
                },
              }}
            >
              <Text fontSize={{ base: "22px", md: "26px" }} lineHeight="1" color="rgba(248,113,113,0.85)">
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
            <Stack spacing={3} maxW="420px" mb={{ base: 6, md: 8 }}>
              <Text className="inter" fontSize={{ base: "sm", md: "md" }} lineHeight="1.7" color="rgba(255,255,255,0.78)">
                Emre liest diese Bewerbung persönlich. Überzeuge ihn.
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
              isDisabled={warningCountdown > 0}
              onClick={dismissWarning}
              bg={warningCountdown <= 0 ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)"}
              color={warningCountdown <= 0 ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.35)"}
              border="1px solid"
              borderColor={warningCountdown <= 0 ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.06)"}
              _hover={
                warningCountdown <= 0
                  ? { bg: "rgba(255,255,255,0.16)", borderColor: "rgba(255,255,255,0.30)", transform: "translateY(-1px)" }
                  : {}
              }
              _disabled={{ opacity: 1, cursor: "not-allowed" }}
              transition="all 200ms ease"
            >
              {warningCountdown <= 0
                ? "Ich habe verstanden → Bewerbung starten"
                : `Bitte lies die Mitteilung sorgfältig… (${warningCountdown}s)`}
            </Button>
          </Box>
        )}

        <ModalHeader px={6} pt={6} pb={0} position="relative" zIndex={1}>
          {!submitted && (
            <Stack spacing={4}>
              <HStack justify="space-between" align="center">
                <Text
                  fontSize="10px"
                  letterSpacing="0.22em"
                  textTransform="uppercase"
                  color="#47F7DC"
                  className="inter-semibold"
                >
                  Capital Circle · Kurze Einordnung
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
                  bg="linear-gradient(90deg, rgba(71,247,220,0.6) 0%, rgba(71,247,220,1) 100%)"
                  borderRadius="full"
                  boxShadow="0 0 10px rgba(71,247,220,0.4)"
                  transition="width 0.4s cubic-bezier(0.4,0,0.2,1)"
                />
              </Box>
            </Stack>
          )}
        </ModalHeader>

        <ModalBody px={6} py={6} position="relative" zIndex={1}>
          <Box
            key={submitted ? "thanks" : stepIndex}
            sx={{ animation: "appStepEnter 0.3s cubic-bezier(0.16,1,0.3,1)" }}
          >
            {submitted ? (
              <ThanksStep />
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

            {serverError && (
              <Alert
                status="error"
                variant="subtle"
                bg="rgba(229,72,77,0.10)"
                borderRadius="12px"
                mt={4}
              >
                <AlertIcon />
                <Text fontSize="sm" className="inter">
                  {serverError}
                </Text>
              </Alert>
            )}
          </Box>
        </ModalBody>

        {!submitted && (
          <ModalFooter px={6} pb={5} pt={2} gap={3} flexDirection="column" position="relative" zIndex={1}>
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
                color="#000000"
                bg="linear-gradient(135deg, #16cc9b 0%, #5FE6C6 100%)"
                borderWidth="0"
                boxShadow="0 0 24px rgba(22,204,155,0.35), inset 0 1px 0 rgba(255,255,255,0.28)"
                _hover={
                  currentStepAnswered
                    ? {
                        bg: "linear-gradient(135deg, #1AE0AC 0%, #82EFD6 100%)",
                        boxShadow:
                          "0 0 36px rgba(22,204,155,0.50), inset 0 1px 0 rgba(255,255,255,0.34)",
                        transform: "translateY(-1px)",
                      }
                    : {}
                }
                _active={{ bg: "linear-gradient(135deg, #14b88c 0%, #4FDDBC 100%)" }}
                _disabled={{
                  opacity: 0.5,
                  cursor: "not-allowed",
                  transform: "none",
                  boxShadow: "none",
                }}
                transition="all 200ms ease"
                onClick={handleNext}
                isLoading={submitting}
                isDisabled={!currentStepAnswered}
                loadingText="Wird gespeichert…"
                className="inter-semibold"
              >
                <Box as="span" fontSize="18px" lineHeight="1">
                  ✓
                </Box>
                Termin freischalten
              </Button>
            ) : (
              <Button
                variant="unstyled"
                display="flex"
                alignItems="center"
                justifyContent="center"
                w="full"
                minH="48px"
                fontWeight="600"
                fontSize="md"
                borderRadius="12px"
                color="#04130F"
                onClick={handleNext}
                isDisabled={!currentStepAnswered}
                bg="linear-gradient(135deg, #8FFBEB 0%, #47F7DC 50%, #1FB9A6 100%)"
                boxShadow="0 0 24px rgba(71,247,220,0.30), inset 0 1px 0 rgba(255,255,255,0.30)"
                _hover={
                  currentStepAnswered
                    ? { boxShadow: "0 0 38px rgba(71,247,220,0.50)", transform: "translateY(-1px)" }
                    : {}
                }
                _active={{ transform: "translateY(0)" }}
                _disabled={{ opacity: 0.5, cursor: "not-allowed", transform: "none", boxShadow: "none" }}
                transition="all 200ms ease"
                className="inter-semibold"
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
                  borderColor: "rgba(71,247,220,0.25)",
                }}
                borderRadius="10px"
                border="1px solid transparent"
                transition="all 200ms ease"
                className="inter"
              >
                ← Zurück
              </Button>
            )}

            <Text fontSize="9px" color="rgba(255,255,255,0.18)" className="inter" textAlign="center">
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
   Step Indicator (Gold Circles)
   ================================================================ */

function StepIndicator({ current, total }: { current: number; total: number }) {
  const maxVisible = 6;
  const showCompact = total > maxVisible;

  if (showCompact) {
    return (
      <HStack spacing={2} justify="center" align="center" w="full">
        <Text fontSize="xs" color="#47F7DC" className="inter-semibold">
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
                    ? "linear-gradient(90deg, rgba(71,247,220,0.8), rgba(71,247,220,0.4))"
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
                isCompleted || isActive
                  ? "linear-gradient(135deg, #47F7DC, #8FFBEB)"
                  : "rgba(255,255,255,0.05)"
              }
              color={isCompleted || isActive ? "#0a0a0a" : "rgba(255,255,255,0.4)"}
              border={isCompleted || isActive ? "none" : "1px solid rgba(255,255,255,0.12)"}
              boxShadow={
                isActive
                  ? "0 0 16px rgba(71,247,220,0.45)"
                  : isCompleted
                    ? "0 0 8px rgba(71,247,220,0.25)"
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
        {question.options.map((opt) => {
          const selected = value === opt;
          return (
            <Box
              key={opt}
              as="label"
              cursor="pointer"
              p={4}
              borderRadius="12px"
              border="1px solid"
              borderColor={selected ? "rgba(71,247,220,0.65)" : "rgba(255,255,255,0.12)"}
              bg={selected ? "rgba(71,247,220,0.10)" : "rgba(255,255,255,0.03)"}
              transition="all .15s ease"
              _hover={{
                borderColor: "rgba(71,247,220,0.45)",
                bg: "rgba(255,255,255,0.05)",
              }}
              boxShadow={
                selected
                  ? "0 0 0 1px rgba(71,247,220,0.45), 0 0 16px rgba(71,247,220,0.18)"
                  : "none"
              }
            >
              <HStack spacing={3} align="center">
                <Box
                  w="18px"
                  h="18px"
                  borderRadius="full"
                  border="1.5px solid"
                  borderColor={selected ? "#47F7DC" : "rgba(255,255,255,0.4)"}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  flexShrink={0}
                >
                  {selected && (
                    <Box w="8px" h="8px" borderRadius="full" bg="#47F7DC" />
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
                <Text className="inter-semibold" fontSize="md" color="var(--color-text-primary)" flex="1">
                  {opt}
                </Text>
              </HStack>
            </Box>
          );
        })}
        {error && (
          <Text fontSize="sm" color="red.300" className="inter">
            {error}
          </Text>
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
          border="1.5px solid rgba(71,247,220,0.3)"
          sx={{ animation: "appRipple 2.5s ease-out infinite" }}
        />
        <Box
          position="absolute"
          inset={0}
          borderRadius="full"
          border="1.5px solid rgba(71,247,220,0.2)"
          sx={{ animation: "appRipple 2.5s ease-out 0.8s infinite" }}
        />
        <Box
          w="80px"
          h="80px"
          borderRadius="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="linear-gradient(135deg, rgba(71,247,220,0.22), rgba(71,247,220,0.12))"
          border="1.5px solid rgba(71,247,220,0.55)"
          color="#47F7DC"
          fontSize="32px"
          position="relative"
          zIndex={1}
          boxShadow="0 0 30px rgba(71,247,220,0.2)"
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
        Perfekt — dein Termin ist freigeschaltet
      </Text>

      <Stack spacing={3} maxW="400px">
        <HStack spacing={3} align="flex-start">
          <Box w="6px" h="6px" borderRadius="full" bg="#47F7DC" mt="8px" flexShrink={0} />
          <Text fontSize="sm" color="rgba(255,255,255,0.65)" className="inter" textAlign="left">
            Wähle gleich deinen passenden Gesprächstermin
          </Text>
        </HStack>
        <HStack spacing={3} align="flex-start">
          <Box w="6px" h="6px" borderRadius="full" bg="#47F7DC" mt="8px" flexShrink={0} />
          <Text fontSize="sm" color="rgba(255,255,255,0.65)" className="inter" textAlign="left">
            Danach erhältst du deinen kostenlosen Discord-Zugang
          </Text>
        </HStack>
      </Stack>

      <Stack spacing={2} w="full" maxW="300px" pt={2}>
        <Box h="2px" w="full" bg="rgba(255,255,255,0.06)" borderRadius="full" overflow="hidden">
          <Box
            h="full"
            bg="linear-gradient(90deg, rgba(71,247,220,0.5), rgba(71,247,220,0.9))"
            borderRadius="full"
            sx={{ animation: "appRedirectFill 1.6s linear forwards" }}
          />
        </Box>
        <Text fontSize="xs" color="rgba(255,255,255,0.30)" className="inter">
          Terminkalender wird geladen…
        </Text>
      </Stack>
    </Stack>
  );
}
