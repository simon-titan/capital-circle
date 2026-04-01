"use client";

import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import Image from "next/image";
import { motion } from "framer-motion";
import { coreLaws, executionLaws, mindsetLaws } from "@/components/onboarding/codexLaws";
const MotionBox = motion(Box);

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

function PillarColumn({ title, rules }: { title: string; rules: string[] }) {
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

export function CodexReferenceView() {
  return (
    <Stack gap={{ base: 6, md: 8 }} w="full">
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

      <Box
        display={{ base: "flex", lg: "grid" }}
        gridTemplateColumns={{ lg: "repeat(3, minmax(0, 1fr))" }}
        overflowX={{ base: "auto", lg: "visible" }}
        overflowY={{ base: "visible", lg: "visible" }}
        scrollSnapType={{ base: "x mandatory", lg: "none" }}
        gap={{ base: 6, lg: 6 }}
        alignItems="flex-start"
        pb={2}
        mx={{ base: -2, lg: 0 }}
        px={{ base: 2, lg: 0 }}
        sx={{
          "&::-webkit-scrollbar": { height: "8px" },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(255,255,255,0.18)",
            borderRadius: "999px",
          },
        }}
      >
        <PillarColumn title="Core Law" rules={coreLaws} />
        <PillarColumn title="Execution Laws" rules={executionLaws} />
        <PillarColumn title="Mindset Laws" rules={mindsetLaws} />
      </Box>

      <Text fontSize="sm" className="inter" color="var(--color-text-muted)" textAlign="center" maxW="lg" mx="auto">
        Diese Regeln bilden das Rückgrat deiner Arbeit im Institut. Halte sie jederzeit im Blick.
      </Text>
    </Stack>
  );
}
