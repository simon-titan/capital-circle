"use client";

import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Select,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useState } from "react";
import {
  FunnelAlert,
  FunnelEyebrow,
  FunnelFinePrint,
  FunnelHeadline,
  FunnelLead,
  SuccessMark,
  funnelErrorProps,
  funnelFieldProps,
  funnelLabelProps,
  funnelSelectSx,
} from "./funnel-ui";

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
      setServerError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return <ThanksSection />;
  }

  return (
    <Box as="section" className="cc-card cc-card--still" maxW="560px" mx="auto" p={{ base: 6, md: 8 }}>
      <Stack spacing={6}>
        <Stack spacing={4} align="flex-start">
          <FunnelEyebrow>60 Sekunden · Feedback</FunnelEyebrow>
          <FunnelHeadline scale="md">Schade, dass du gehst.</FunnelHeadline>
          <Text fontSize="14px" lineHeight={1.6} color="var(--cc-text-2)">
            Dein Feedback hilft uns, Capital Circle für die nächsten
            Trader:innen besser zu machen. Wir lesen jede Antwort selbst.
          </Text>
        </Stack>

        <FormControl isRequired>
          <FormLabel {...funnelLabelProps}>Hauptgrund für deine Kündigung</FormLabel>
          <Select
            {...funnelFieldProps}
            value={structuredReason}
            onChange={(e) =>
              setStructuredReason(e.target.value as StructuredReason)
            }
            sx={funnelSelectSx}
          >
            {REASON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FormControl>

        <FormControl isInvalid={Boolean(errors.missing)} isRequired>
          <FormLabel {...funnelLabelProps}>Was hat dir gefehlt?</FormLabel>
          <Textarea
            {...funnelFieldProps}
            minH="120px"
            value={missing}
            onChange={(e) => setMissing(e.target.value)}
            placeholder="Sei so direkt wie du willst, wir vertragen das."
          />
          <FormErrorMessage {...funnelErrorProps}>{errors.missing}</FormErrorMessage>
        </FormControl>

        <FormControl>
          <FormLabel {...funnelLabelProps}>Was hätte besser sein können? (optional)</FormLabel>
          <Textarea
            {...funnelFieldProps}
            minH="120px"
            value={improvement}
            onChange={(e) => setImprovement(e.target.value)}
            placeholder="Konkrete Vorschläge willkommen."
          />
        </FormControl>

        {serverError && <FunnelAlert>{serverError}</FunnelAlert>}

        <Button
          variant="gold"
          size="lg"
          w="full"
          h="48px"
          fontSize="16px"
          onClick={handleSubmit}
          isLoading={submitting}
          loadingText="Wird gesendet…"
        >
          Feedback abschicken
        </Button>

        <FunnelFinePrint textAlign="center">
          Wir verwenden dein Feedback ausschließlich intern, um die Plattform
          weiterzuentwickeln.
        </FunnelFinePrint>
      </Stack>
    </Box>
  );
}

function ThanksSection() {
  return (
    <Box className="cc-card" maxW="520px" mx="auto" p={{ base: 6, md: 8 }}>
      <Stack spacing={5} align="center" textAlign="center" role="status">
        <SuccessMark size={56} />
        <FunnelHeadline as="h2" scale="md">
          Danke für deine Ehrlichkeit.
        </FunnelHeadline>
        <FunnelLead fontSize="16px" maxW="420px">
          Wir haben dein Feedback erhalten und nehmen es ernst. Falls du
          irgendwann zurückkommen willst, ist die Tür offen.
        </FunnelLead>
        <FunnelFinePrint>Du kannst dieses Fenster jetzt schließen.</FunnelFinePrint>
      </Stack>
    </Box>
  );
}
