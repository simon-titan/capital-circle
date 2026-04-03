"use client";

import { Box, Button, Checkbox, Flex, Stack, Text } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { glassPrimaryButtonProps } from "@/components/ui/glassButtonStyles";
import { CodexPillarsScroll } from "@/components/codex/CodexPillarsScroll";
import { coreLaws, executionLaws, mindsetLaws } from "@/components/onboarding/codexLaws";
import { type HTMLChakraProps } from "@chakra-ui/react";

const MotionBox = motion<HTMLChakraProps<"div">>(Box);

/** Mittlere Lücke zwischen Ober- und Unterteil in pillar-glass.svg (viewBox 810×1440). */
const PILLAR_TEXT_INSET = {
  top: "22.14%",
  left: "17.53%",
  right: "17.53%",
  bottom: "18.04%",
};

const pillarGlassBoxSx = {
  w: "full",
  h: "full",
  maxH: "100%",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  p: { base: 2, md: 2.5 },
  borderRadius: "16px",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  bg: "linear-gradient(145deg, rgba(212, 175, 55, 0.12) 0%, rgba(60, 45, 10, 0.08) 100%)",
  backdropFilter: "blur(16px) saturate(1.12)",
  WebkitBackdropFilter: "blur(16px) saturate(1.12)",
  boxShadow:
    "0 2px 18px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 -1px 0 rgba(212, 175, 55, 0.08)",
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
    className: "inter",
    color: "rgba(248, 250, 252, 0.94)",
    lineHeight: "1.45",
    textAlign: "center" as const,
  };

  if (!parts) {
    return <Text {...textProps}>{rule}</Text>;
  }

  return (
    <Text {...textProps}>
      <Text
        as="span"
        fontWeight="700"
        letterSpacing="0.06em"
        color="rgba(253, 230, 138, 0.98)"
        textShadow="0 0 20px rgba(212, 175, 55, 0.35)"
      >
        {parts.numeral}
      </Text>{" "}
      {parts.body}
    </Text>
  );
}

type CodexStepProps = {
  onCompleted: () => void | Promise<void>;
};

function PillarColumn({
  title,
  rules,
}: {
  title: string;
  rules: string[];
}) {
  return (
    <Box
      flex={{ base: "0 0 min(88vw, 360px)", lg: "unset" }}
      scrollSnapAlign={{ base: "center", lg: "unset" }}
      w={{ base: "min(88vw, 360px)", lg: "full" }}
      maxW={{ base: "360px", lg: "none" }}
    >
      <Text
        textAlign="center"
        fontSize={{ base: "xl", md: "2xl" }}
        fontWeight="400"
        className="radley-regular"
        letterSpacing="0.12em"
        textTransform="uppercase"
        color="rgba(240, 240, 242, 0.95)"
        mb={3}
      >
        {title}
      </Text>

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

        {/* Mittlere Lücke: blaue Glassmorphism-Box zwischen Ober- und Unterteil */}
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
          <Box sx={pillarGlassBoxSx}>
            <Stack
              gap={{ base: 1.5, md: 2 }}
              w="full"
              justify="center"
              textAlign="center"
            >
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
  const canContinue = useMemo(() => accepted, [accepted]);

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
      setError("Profil wurde nicht gefunden. Bitte Migration fuer Profile-Trigger/RLS ausfuehren.");
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
        className="glass-card"
        p={{ base: 6, md: 8 }}
        maxW="1100px"
        w="full"
        gap={{ base: 6, md: 8 }}
        borderColor="rgba(255, 255, 255, 0.12)"
        boxShadow="0 8px 40px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06)"
      >
        <MotionBox initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <Flex justify="center" mb={2}>
            <Box position="relative" w="full" maxW={{ base: "300px", md: "400px" }}>
              <Image
                src="/logo/codex-new.png"
                alt="Capital Circle Codex"
                width={760}
                height={280}
                priority
                style={{
                  width: "100%",
                  height: "auto",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </Box>
          </Flex>
        </MotionBox>

        <CodexPillarsScroll>
          <PillarColumn title="Core Law" rules={coreLaws} />
          <PillarColumn title="Execution Laws" rules={executionLaws} />
          <PillarColumn title="Mindset Laws" rules={mindsetLaws} />
        </CodexPillarsScroll>

        <Box
          borderRadius="20px"
          p={{ base: 5, md: 6 }}
          border="2px solid"
          borderColor={accepted ? "rgba(212, 175, 55, 0.55)" : "rgba(255, 255, 255, 0.18)"}
          bg={accepted ? "rgba(212, 175, 55, 0.12)" : "rgba(255, 255, 255, 0.03)"}
          backdropFilter="blur(22px) saturate(1.4)"
          sx={{
            WebkitBackdropFilter: "blur(22px) saturate(1.4)",
            boxShadow: accepted
              ? "0 0 40px rgba(212, 175, 55, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
              : "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
            transition: "border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease",
          }}
        >
          <Checkbox
            isChecked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            colorScheme="brand"
            size="lg"
            w="full"
            flexDirection="column"
            alignItems="center"
            gap={4}
            sx={{
              ".chakra-checkbox__label": {
                marginInlineStart: "0 !important",
                width: "100%",
                textAlign: "center",
              },
              ".chakra-checkbox__control": {
                w: "28px",
                h: "28px",
                borderWidth: "2px",
              },
            }}
          >
            <Stack spacing={2} align="center" maxW="lg" mx="auto">
              <Text fontSize={{ base: "md", md: "lg" }} fontWeight="600" className="inter-semibold" color="rgba(248, 250, 252, 0.98)">
                Ich verpflichte mich.
              </Text>
              <Text fontSize="sm" className="inter" color="rgba(240, 240, 242, 0.55)" lineHeight="1.55">
                Du verpflichtest dich hiermit konsequent unseren Codex einzuhalten!
              </Text>
            </Stack>
          </Checkbox>
        </Box>

        {error ? (
          <Text fontSize="sm" color="red.300" textAlign="center">
            {error}
          </Text>
        ) : null}
        <Button {...glassPrimaryButtonProps} isDisabled={!canContinue} onClick={onConfirm} isLoading={saving}>
          Weiter
        </Button>
      </Stack>
    </Stack>
  );
}
