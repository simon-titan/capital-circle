"use client";

import { Box, Checkbox, Stack, Text } from "@chakra-ui/react";

/**
 * Kopf der Onboarding-Schritte (DESIGN.md v3.2): gesperrte Wortmarke in Gold hell
 * über dem Titel in Inter 600. Ersetzt die früheren Serif-Bildtitel.
 */
export function OnboardingHeading({ title, id }: { title: string; id?: string }) {
  return (
    <Stack spacing={4} align="center" textAlign="center">
      <Box as="h1" id={id} m={0}>
        <Box
          as="span"
          display="block"
          fontSize="13px"
          lineHeight={1}
          fontWeight={400}
          letterSpacing="0.32em"
          // gleicht die Sperrung nach dem letzten Buchstaben aus, damit die Wortmarke optisch mittig steht
          pl="0.32em"
          textTransform="uppercase"
          color="var(--cc-gold-light)"
          mb={3}
        >
          Capital Circle
        </Box>
        <Box
          as="span"
          display="block"
          fontSize={{ base: "28px", md: "36px" }}
          fontWeight={600}
          lineHeight={1.15}
          letterSpacing="-0.01em"
          color="var(--cc-text)"
        >
          {title}
        </Box>
      </Box>
      <Box
        aria-hidden
        h="1px"
        w="140px"
        maxW="60%"
        bg="linear-gradient(90deg, transparent, rgba(232, 192, 148, 0.7), transparent)"
      />
    </Stack>
  );
}

const acceptCheckboxSx = {
  ".chakra-checkbox__label": {
    marginInlineStart: "0 !important",
    width: "100%",
    textAlign: "center",
  },
  ".chakra-checkbox__control": {
    w: "28px",
    h: "28px",
    borderWidth: "1.5px",
    borderRadius: "8px",
    borderColor: "var(--cc-line-strong)",
    bg: "rgba(255, 255, 255, 0.03)",
    transition: "background-color 180ms var(--cc-ease), border-color 180ms var(--cc-ease), box-shadow 180ms var(--cc-ease)",
  },
  ".chakra-checkbox__control[data-hover]": {
    borderColor: "var(--cc-gold-line)",
  },
  ".chakra-checkbox__control[data-checked], .chakra-checkbox__control[data-checked][data-hover]": {
    bg: "var(--cc-gold)",
    bgImage: "var(--cc-gold-grad)",
    borderColor: "var(--cc-gold)",
    color: "var(--cc-on-gold)",
    boxShadow: "0 0 14px rgba(212, 176, 128, 0.35)",
  },
  ".chakra-checkbox__control[data-focus-visible]": {
    boxShadow: "0 0 0 2px var(--cc-bg), 0 0 0 4px var(--cc-gold-line)",
  },
};

type AcceptanceCheckProps = {
  isChecked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  text: string;
};

/** Zustimmungs-Feld (Codex, Vereinbarung): Haarlinie; angehakt mit Gold-Haarlinie, Gold-Hauch und weichem Glow. */
export function AcceptanceCheck({ isChecked, onChange, title, text }: AcceptanceCheckProps) {
  return (
    <Box
      borderRadius="12px"
      p={{ base: 5, md: 6 }}
      border="1px solid"
      borderColor={isChecked ? "var(--cc-gold-line)" : "var(--cc-line-strong)"}
      bg={isChecked ? "var(--cc-gold-wash)" : "rgba(255, 255, 255, 0.02)"}
      boxShadow={
        isChecked
          ? "0 0 28px rgba(212, 176, 128, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.06)"
          : "inset 0 1px 0 rgba(255, 255, 255, 0.04)"
      }
      transition="border-color 220ms var(--cc-ease), background-color 220ms var(--cc-ease), box-shadow 220ms var(--cc-ease)"
    >
      <Checkbox
        isChecked={isChecked}
        onChange={(e) => onChange(e.target.checked)}
        colorScheme="brand"
        size="lg"
        w="full"
        flexDirection="column"
        alignItems="center"
        gap={4}
        sx={acceptCheckboxSx}
      >
        <Stack spacing={2} align="center" maxW="lg" mx="auto">
          <Text fontSize={{ base: "16px", md: "18px" }} fontWeight={600} lineHeight={1.3} color="var(--cc-text)">
            {title}
          </Text>
          <Text fontSize="14px" color="var(--cc-text-2)" lineHeight="1.55">
            {text}
          </Text>
        </Stack>
      </Checkbox>
    </Box>
  );
}
