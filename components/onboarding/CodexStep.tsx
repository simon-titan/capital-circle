"use client";

import { Box, Button, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { glassPrimaryButtonProps } from "@/components/ui/glassButtonStyles";
import { CodexPillarsScroll } from "@/components/codex/CodexPillarsScroll";
import { coreLaws, executionLaws, mindsetLaws } from "@/components/onboarding/codexLaws";
import { AcceptanceCheck, OnboardingHeading } from "@/components/onboarding/OnboardingParts";

/** Mittlere Lücke zwischen Ober- und Unterteil in pillar-glass.svg (viewBox 810×1440). */
const PILLAR_TEXT_INSET = {
  top: "22.14%",
  left: "17.53%",
  right: "17.53%",
  bottom: "18.04%",
};

/** Graphit-Fläche in der Säulenlücke, auf der die Gesetze stehen. */
const pillarPanelSx = {
  w: "full",
  h: "full",
  maxH: "100%",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  p: { base: 2, md: 2.5 },
  borderRadius: "10px",
  border: "1px solid var(--cc-line)",
  bg: "linear-gradient(180deg, rgba(27, 32, 38, 0.92) 0%, rgba(24, 29, 34, 0.92) 100%)",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
};

/** Römische Nummerierung am Anfang (I. … XV.) vom Rest trennen. */
function splitRomanLawLine(rule: string): { numeral: string; body: string } | null {
  const m = rule.match(/^([IVXLC]+)\.\s+(.*)$/);
  if (!m) return null;
  return { numeral: `${m[1]}.`, body: m[2] };
}

function LawRuleLine({ rule }: { rule: string }) {
  const parts = splitRomanLawLine(rule);
  const textProps = {
    fontSize: { base: "11px", md: "12px" },
    color: "var(--cc-text-soft)",
    lineHeight: "1.45",
    textAlign: "center" as const,
  };

  if (!parts) {
    return <Text {...textProps}>{rule}</Text>;
  }

  return (
    <Text {...textProps}>
      <Text as="span" fontWeight={600} letterSpacing="0.06em" color="var(--cc-gold-light)">
        {parts.numeral}
      </Text>{" "}
      {parts.body}
    </Text>
  );
}

type CodexStepProps = {
  onCompleted: () => void | Promise<void>;
};

function PillarColumn({ title, rules }: { title: string; rules: string[] }) {
  return (
    <Box
      flex={{ base: "0 0 min(88vw, 360px)", lg: "unset" }}
      scrollSnapAlign={{ base: "center", lg: "unset" }}
      w={{ base: "min(88vw, 360px)", lg: "full" }}
      maxW={{ base: "360px", lg: "none" }}
    >
      <Box
        as="h2"
        textAlign="center"
        fontSize={{ base: "14px", md: "15px" }}
        lineHeight="20px"
        fontWeight={500}
        letterSpacing="0.14em"
        textTransform="uppercase"
        color="var(--cc-gold-light)"
        mb={3}
      >
        {title}
      </Box>

      <Box position="relative" w="full" mx="auto">
        <Box position="relative" w="full" lineHeight={0}>
          <Image
            src="/svg/pillar-glass.svg"
            alt=""
            width={810}
            height={1440}
            sizes="(max-width: 1024px) 90vw, 33vw"
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              objectFit: "contain",
              opacity: 0.92,
            }}
            priority={false}
          />
        </Box>

        {/* Mittlere Lücke: Graphit-Fläche zwischen Ober- und Unterteil */}
        <Box
          position="absolute"
          top={PILLAR_TEXT_INSET.top}
          left={PILLAR_TEXT_INSET.left}
          right={PILLAR_TEXT_INSET.right}
          bottom={PILLAR_TEXT_INSET.bottom}
          overflow="hidden"
          display="flex"
          flexDirection="column"
          alignItems="stretch"
          justifyContent="center"
          pointerEvents="auto"
        >
          <Box sx={pillarPanelSx}>
            <Stack gap={{ base: 1.5, md: 2 }} w="full" justify="center" textAlign="center">
              {rules.map((rule) => (
                <LawRuleLine key={rule} rule={rule} />
              ))}
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export function CodexStep({ onCompleted }: CodexStepProps) {
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      .update({ codex_accepted: true, codex_accepted_at: new Date().toISOString() })
      .eq("id", data.user.id);

    if (updateError) {
      setSaving(false);
      setError(`Codex konnte nicht gespeichert werden: ${updateError.message}`);
      return;
    }

    const { data: profileCheck } = await supabase
      .from("profiles")
      .select("codex_accepted")
      .eq("id", data.user.id)
      .single();

    if (!profileCheck?.codex_accepted) {
      setSaving(false);
      setError("Profil wurde nicht gefunden. Bitte Migration für Profile-Trigger/RLS ausführen.");
      return;
    }

    setSaving(false);
    await onCompleted();
  };

  return (
    <Stack
      minH="100vh"
      w="full"
      align="center"
      justify="center"
      px={{ base: 4, md: 6 }}
      py={{ base: 8, md: 10 }}
    >
      <Stack
        as="section"
        aria-labelledby="codex-title"
        className="cc-card cc-card--hero cc-card--still"
        p={{ base: 6, md: 8 }}
        maxW="1100px"
        w="full"
        gap={{ base: 6, md: 8 }}
      >
        <Box className="cc-rise">
          <OnboardingHeading id="codex-title" title="Codex" />
        </Box>

        <CodexPillarsScroll>
          <PillarColumn title="Core Law" rules={coreLaws} />
          <PillarColumn title="Execution Laws" rules={executionLaws} />
          <PillarColumn title="Mindset Laws" rules={mindsetLaws} />
        </CodexPillarsScroll>

        <AcceptanceCheck
          isChecked={accepted}
          onChange={setAccepted}
          title="Ich verpflichte mich."
          text="Du verpflichtest dich hiermit konsequent unseren Codex einzuhalten!"
        />

        {error ? (
          <Text role="alert" fontSize="14px" color="var(--cc-danger)" textAlign="center">
            {error}
          </Text>
        ) : null}
        <Button {...glassPrimaryButtonProps} isDisabled={!accepted} onClick={onConfirm} isLoading={saving}>
          Weiter
        </Button>
      </Stack>
    </Stack>
  );
}
