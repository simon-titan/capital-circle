"use client";

import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import Image from "next/image";
import { CodexPillarsScroll } from "@/components/codex/CodexPillarsScroll";
import { coreLaws, executionLaws, mindsetLaws } from "@/components/onboarding/codexLaws";
import { Meta } from "@/components/platform/dashboard/primitives";

const PILLAR_TEXT_INSET = {
  top: "22.14%",
  left: "17.53%",
  right: "17.53%",
  bottom: "18.04%",
};

/** Textfläche im Säulenschaft: deckendes Graphit mit Haarlinie, damit die Regeln auf der hellen Säule lesbar bleiben. */
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
  border: "1px solid var(--cc-line-strong)",
  bg: "linear-gradient(180deg, rgba(27, 32, 38, 0.9) 0%, rgba(24, 29, 34, 0.9) 100%)",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
};

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
      <Text as="span" fontWeight={600} letterSpacing="0.04em" color="var(--cc-gold-light)">
        {parts.numeral}
      </Text>{" "}
      {parts.body}
    </Text>
  );
}

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
        fontSize={{ base: "13px", md: "14px" }}
        lineHeight="18px"
        fontWeight={500}
        letterSpacing="0.12em"
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
            <Stack as="ol" listStyleType="none" gap={{ base: 1.5, md: 2 }} w="full" justify="center" textAlign="center">
              {rules.map((rule) => (
                <Box as="li" key={rule}>
                  <LawRuleLine rule={rule} />
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export function CodexReferenceView() {
  return (
    <Stack gap={{ base: 6, md: 8 }} w="full">
      <Flex justify="center">
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

      <CodexPillarsScroll>
        <PillarColumn title="Core Law" rules={coreLaws} />
        <PillarColumn title="Execution Laws" rules={executionLaws} />
        <PillarColumn title="Mindset Laws" rules={mindsetLaws} />
      </CodexPillarsScroll>

      <Meta textAlign="center" maxW="lg" mx="auto">
        Diese Regeln bilden das Rückgrat deiner Arbeit im Institut. Halte sie jederzeit im Blick.
      </Meta>
    </Stack>
  );
}
