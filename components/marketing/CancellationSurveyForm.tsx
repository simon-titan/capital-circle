"use client";

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  Select,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useState } from "react";
import { glassPrimaryButtonProps } from "@/components/ui/glassButtonStyles";

type StructuredReason =
  | "too_expensive"
  | "not_enough_value"
  | "tech_issues"
  | "other";

const REASON_OPTIONS: { value: StructuredReason; label: string }[] = [
  { value: "too_expensive", label: "Zu teuer" },
  { value: "not_enough_value", label: "Nicht genug Wert" },
  { value: "tech_issues", label: "Technische Probleme" },
  { value: "other", label: "Anderes" },
];

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

interface Props {
  token: string;
}

export function CancellationSurveyForm({ token }: Props) {
  const [structuredReason, setStructuredReason] =
    useState<StructuredReason>("other");
  const [missing, setMissing] = useState("");
  const [improvement, setImprovement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ missing?: string }>({});

  function validate(): boolean {
    const errs: { missing?: string } = {};
    if (missing.trim().length < 10) {
      errs.missing = "Bitte mindestens 10 Zeichen.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    setServerError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/survey/cancellation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          structured_reason: structuredReason,
          // Wir packen die strukturierte Antwort + Free-Text-Felder in den
          // `feedback`-Block, damit `cancellations.feedback` (Textarea-frei)
          // alles in einem lesbaren Format hat.
          reason: missing.trim(),
          feedback: improvement.trim() || null,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setServerError(
          json.error ?? "Feedback konnte nicht gespeichert werden.",
        );
        return;
      }
      setSubmitted(true);
    } catch {
      setServerError("Netzwerkfehler — bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return <ThanksSection />;
  }

  return (
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
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.07)",
      }}
    >
      <Stack spacing={6}>
        <Stack spacing={2}>
          <Text
            fontSize="xs"
            letterSpacing="0.18em"
            textTransform="uppercase"
            color="var(--color-accent-gold)"
            className="inter-semibold"
          >
            60 Sekunden · Feedback
          </Text>
          <Heading
            as="h1"
            className="radley-regular"
            fontWeight={400}
            fontSize={{ base: "2xl", md: "3xl" }}
            lineHeight="1.2"
          >
            Schade, dass du gehst.
          </Heading>
          <Text fontSize="sm" color="rgba(255,255,255,0.62)" className="inter">
            Dein Feedback hilft uns, Capital Circle für die nächsten
            Trader:innen besser zu machen. Wir lesen jede Antwort selbst.
          </Text>
        </Stack>

        <FormControl isRequired>
          <FormLabel
            className="inter"
            fontSize="sm"
            color="var(--color-text-primary)"
          >
            Hauptgrund für deine Kündigung
          </FormLabel>
          <Select
            {...inputStyles}
            value={structuredReason}
            onChange={(e) =>
              setStructuredReason(e.target.value as StructuredReason)
            }
            sx={{
              "& > option": {
                background: "var(--color-bg-primary, #07080A)",
                color: "var(--color-text-primary)",
              },
            }}
          >
            {REASON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FormControl>

        <FormControl isInvalid={Boolean(errors.missing)} isRequired>
          <FormLabel
            className="inter"
            fontSize="sm"
            color="var(--color-text-primary)"
          >
            Was hat dir gefehlt?
          </FormLabel>
          <Textarea
            {...inputStyles}
            minH="120px"
            value={missing}
            onChange={(e) => setMissing(e.target.value)}
            placeholder="Sei so direkt wie du willst — wir vertragen das."
          />
          <FormErrorMessage>{errors.missing}</FormErrorMessage>
        </FormControl>

        <FormControl>
          <FormLabel
            className="inter"
            fontSize="sm"
            color="var(--color-text-primary)"
          >
            Was hätte besser sein können? (optional)
          </FormLabel>
          <Textarea
            {...inputStyles}
            minH="120px"
            value={improvement}
            onChange={(e) => setImprovement(e.target.value)}
            placeholder="Konkrete Vorschläge willkommen."
          />
        </FormControl>

        {serverError && (
          <Alert
            status="error"
            variant="subtle"
            bg="rgba(229,72,77,0.10)"
            borderRadius="12px"
          >
            <AlertIcon />
            <Text fontSize="sm" className="inter">
              {serverError}
            </Text>
          </Alert>
        )}

        <Button
          {...glassPrimaryButtonProps}
          onClick={handleSubmit}
          isLoading={submitting}
          loadingText="Wird gesendet…"
        >
          Feedback abschicken
        </Button>

        <Text
          fontSize="xs"
          color="rgba(255,255,255,0.4)"
          className="inter"
          textAlign="center"
        >
          Wir verwenden dein Feedback ausschließlich intern, um die Plattform
          weiterzuentwickeln.
        </Text>
      </Stack>
    </Box>
  );
}

function ThanksSection() {
  return (
    <Box
      maxW="520px"
      mx="auto"
      p={{ base: 6, md: 8 }}
      sx={{
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: "16px",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.07)",
      }}
    >
      <Stack spacing={5} align="center" textAlign="center">
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
          Danke für deine Ehrlichkeit.
        </Heading>
        <Text
          fontSize="md"
          color="rgba(255,255,255,0.72)"
          className="inter"
          maxW="420px"
        >
          Wir haben dein Feedback erhalten und nehmen es ernst. Falls du
          irgendwann zurückkommen willst, ist die Tür offen.
        </Text>
        <Text fontSize="xs" color="rgba(255,255,255,0.4)" className="inter">
          Du kannst dieses Fenster jetzt schließen.
        </Text>
      </Stack>
    </Box>
  );
}
