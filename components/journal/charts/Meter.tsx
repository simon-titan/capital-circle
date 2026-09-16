"use client";

import { Box, HStack, Stack, Text } from "@chakra-ui/react";

export type MeterTone = "accent" | "profit" | "loss" | "neutral";

const TONE_COLOR: Record<MeterTone, string> = {
  accent: "var(--cc-gold-bar)",
  profit: "var(--color-profit)",
  loss: "var(--color-loss)",
  neutral: "var(--cc-text-2)",
};

/**
 * Wert plus schlanke Füllstandsleiste.
 *
 * Ersetzt den halbrunden Doughnut-Gauge: ein zweigeteilter Ring ist ein
 * Zwei-Segment-Tortendiagramm und trägt keine Information, die die Zahl nicht
 * schon trägt. Die Leiste zeigt dieselbe Relation, kostet keine Chart-Instanz
 * und bleibt auf 375 px lesbar.
 */
export function Meter({
  label,
  value,
  caption,
  fillPercent,
  tone = "accent",
}: {
  label: string;
  value: string;
  caption?: string;
  /** Gefüllter Anteil in Prozent (0–100). */
  fillPercent: number;
  tone?: MeterTone;
}) {
  const filled = Math.max(0, Math.min(100, fillPercent));
  const color = TONE_COLOR[tone];

  return (
    <Stack gap={2.5} h="100%" justify="space-between">
      <Text fontSize="xs" color="var(--cc-text-2)" className="inter-medium" lineHeight="1.3">
        {label}
      </Text>

      <Stack gap={2}>
        <HStack align="baseline" justify="space-between" gap={2}>
          <Text
            className="cc-num"
            fontSize={{ base: "xl", md: "2xl" }}
            color="var(--cc-text)"
            lineHeight="1"
            letterSpacing="-0.02em"
            whiteSpace="nowrap"
          >
            {value}
          </Text>
          {caption && (
            <Text fontSize="10px" color="var(--cc-text-3)" className="cc-num" whiteSpace="nowrap">
              {caption}
            </Text>
          )}
        </HStack>

        <Box
          role="meter"
          aria-label={label}
          aria-valuenow={Math.round(filled)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={value}
          h="4px"
          w="100%"
          borderRadius="full"
          bg="rgba(255,255,255,0.07)"
        >
          <Box
            h="100%"
            w={`${filled}%`}
            borderRadius="full"
            bg={color}
            boxShadow={tone === "accent" ? "0 0 10px rgba(212, 176, 128, 0.45)" : undefined}
            transition="width 0.5s cubic-bezier(0.16, 1, 0.3, 1)"
            sx={{ "@media (prefers-reduced-motion: reduce)": { transition: "none" } }}
          />
        </Box>
      </Stack>
    </Stack>
  );
}
