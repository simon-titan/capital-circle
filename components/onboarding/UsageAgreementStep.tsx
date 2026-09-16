"use client";

import { Box, Button, Stack, Text, type HTMLChakraProps } from "@chakra-ui/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { glassPrimaryButtonProps } from "@/components/ui/glassButtonStyles";
import { usageAgreementLeadParagraphs, usageAgreementSections } from "@/components/onboarding/usageAgreementContent";
import { AcceptanceCheck, OnboardingHeading } from "@/components/onboarding/OnboardingParts";

/** Rendert *hervorgehobenen* Text in Gold hell (600) — Inter, ohne Kursive. */
function TextWithEmphasis({ text, baseProps }: { text: string; baseProps: HTMLChakraProps<"p"> }) {
  const parts = text.split(/(\*[^*]+\*)/g).filter(Boolean);
  return (
    <Text {...baseProps}>
      {parts.map((part, i) => {
        if (part.startsWith("*") && part.endsWith("*")) {
          return (
            <Text as="em" key={i} fontStyle="normal" fontWeight={600} color="var(--cc-gold-light)">
              {part.slice(1, -1)}
            </Text>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </Text>
  );
}

const textProps: HTMLChakraProps<"p"> = {
  fontSize: { base: "14px", md: "15px" },
  color: "var(--cc-text-soft)",
  lineHeight: "1.65",
};

const leadTextProps: HTMLChakraProps<"p"> = {
  fontSize: { base: "13px", md: "14px" },
  color: "var(--cc-text-2)",
  lineHeight: "1.5",
  textAlign: "center",
};

export function UsageAgreementStep() {
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const onConfirm = async () => {
    setError(null);
    setSaving(true);
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setSaving(false);
      setError("Keine aktive Session gefunden. Bitte erneut einloggen.");
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        usage_agreement_accepted: true,
        usage_agreement_accepted_at: new Date().toISOString(),
      })
      .eq("id", data.user.id);

    if (updateError) {
      setSaving(false);
      setError(`Vereinbarung konnte nicht gespeichert werden: ${updateError.message}`);
      return;
    }

    const { data: profileCheck } = await supabase
      .from("profiles")
      .select("usage_agreement_accepted")
      .eq("id", data.user.id)
      .single();

    if (!profileCheck?.usage_agreement_accepted) {
      setSaving(false);
      setError("Profil wurde nicht gefunden. Bitte Migration für Profile/RLS prüfen.");
      return;
    }

    setSaving(false);
    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <Stack
      minH="100dvh"
      w="full"
      align="center"
      justify="center"
      px={{ base: 4, md: 6 }}
      py={{ base: 8, md: 5 }}
      overflowY={{ base: "auto", md: "hidden" }}
    >
      {/* Ohne overflow: hidden, damit die Gold-Kante (::before) der Karte sichtbar bleibt. */}
      <Stack
        as="section"
        aria-labelledby="agreement-title"
        className="cc-card cc-card--hero cc-card--still"
        p={{ base: 6, md: 8 }}
        maxW="800px"
        w="full"
        gap={{ base: 5, md: 6 }}
        flexDir="column"
        minH={0}
        h={{ base: "auto", md: "calc(100dvh - 40px)" }}
        maxH={{ base: "none", md: "calc(100dvh - 40px)" }}
      >
        <Stack className="cc-rise" flexShrink={0} spacing={{ base: 4, md: 5 }} align="center" textAlign="center">
          <OnboardingHeading id="agreement-title" title="Vereinbarung" />
          <Stack spacing={1.5}>
            {usageAgreementLeadParagraphs.map((p) => (
              <TextWithEmphasis key={p} text={p} baseProps={leadTextProps} />
            ))}
          </Stack>
        </Stack>

        <Box
          role="region"
          aria-label="Vereinbarung zur Nutzung und Vertraulichkeit"
          tabIndex={0}
          flex={{ base: "none", md: "1 1 0" }}
          minH={{ base: "auto", md: 0 }}
          maxH={{ base: "min(52vh, 480px)", md: "none" }}
          overflowY="auto"
          borderRadius="10px"
          border="1px solid var(--cc-line)"
          bg="rgba(255, 255, 255, 0.02)"
          boxShadow="inset 0 1px 0 rgba(255, 255, 255, 0.03)"
          sx={{
            scrollbarWidth: "thin",
            scrollbarColor: "var(--cc-track) transparent",
            "&::-webkit-scrollbar": { width: "8px" },
            "&::-webkit-scrollbar-track": { background: "transparent" },
            "&::-webkit-scrollbar-thumb": {
              background: "var(--cc-line-strong)",
              borderRadius: "999px",
            },
            "&:focus-visible": {
              outline: "2px solid var(--cc-gold-line)",
              outlineOffset: "2px",
            },
          }}
          px={{ base: 4, md: 6 }}
          py={{ base: 4, md: 5 }}
        >
          <Stack spacing={5}>
            {usageAgreementSections.map((section) => (
              <Box key={section.heading}>
                <Text
                  as="h2"
                  fontSize={{ base: "15px", md: "16px" }}
                  fontWeight={600}
                  lineHeight={1.35}
                  color="var(--cc-text)"
                  mb={2}
                >
                  {section.heading}
                </Text>
                <Stack spacing={3}>
                  {section.blocks.map((block, bi) => (
                    <TextWithEmphasis
                      key={`${section.heading}-${bi}`}
                      text={block}
                      baseProps={{
                        ...textProps,
                        whiteSpace: "pre-line",
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>

        <Stack spacing={3} flexShrink={0} w="full">
          <AcceptanceCheck
            isChecked={accepted}
            onChange={setAccepted}
            title="Ich akzeptiere diese Vereinbarung"
            text="Mit dem Haken bestätigst du, den Text gelesen zu haben und an die Bedingungen gebunden zu sein."
          />

          {error ? (
            <Text role="alert" fontSize="14px" color="var(--cc-danger)" textAlign="center">
              {error}
            </Text>
          ) : null}
          <Button {...glassPrimaryButtonProps} isDisabled={!accepted} onClick={onConfirm} isLoading={saving}>
            Zur Plattform
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}
