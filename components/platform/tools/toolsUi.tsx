"use client";

import { Box, Button, HStack, Stack, Text, useClipboard, type BoxProps } from "@chakra-ui/react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Gemeinsame Bausteine der Tools-Seiten (`/tools/*`). Graphit-Karten mit
 * Gold-Kante wie überall außerhalb des Dashboards; Gold nur für Aktion,
 * Code und Eyebrow.
 */

export const FELD_SX = {
  bg: "rgba(255, 255, 255, 0.03)",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  color: "var(--cc-text)",
  _placeholder: { color: "var(--cc-text-3)" },
  _hover: { borderColor: "rgba(212, 176, 128, 0.4)" },
  _focusVisible: { borderColor: "var(--cc-gold)", boxShadow: "0 0 0 1px var(--cc-gold)" },
};

export function Eyebrow({ children, ...rest }: { children: ReactNode } & BoxProps) {
  return (
    <Box
      fontSize="12px"
      lineHeight="16px"
      fontWeight={500}
      letterSpacing="0.14em"
      textTransform="uppercase"
      color="var(--cc-gold-light)"
      {...rest}
    >
      {children}
    </Box>
  );
}

/** Gestaffelter Einstieg wie im Dashboard — zusammen mit der Klasse `cc-rise`. */
export const rise = (i: number) => ({ style: { animationDelay: `${80 + i * 70}ms` } });

/**
 * Vorteilskarte: Rabatt, Code zum Kopieren, Affiliate-Button.
 * Der Link trägt `sponsored` — es ist ein Partnerlink, und so gehört er markiert.
 */
export function CodeKarte({
  titel,
  rabatt,
  code,
  url,
  ctaLabel,
  hinweis,
}: {
  titel: string;
  rabatt: string;
  code: string;
  url: string;
  ctaLabel: string;
  hinweis?: string;
}) {
  const { onCopy, hasCopied } = useClipboard(code);
  return (
    <Box className="cc-card cc-card--hero" p={{ base: 5, md: 7 }}>
      <Stack spacing={5}>
        <Eyebrow>{titel}</Eyebrow>
        <Text fontSize={{ base: "20px", md: "24px" }} fontWeight={600} lineHeight={1.3} color="var(--cc-text)">
          Spare{" "}
          <Box as="span" color="var(--cc-gold-light)">
            {rabatt}
          </Box>{" "}
          mit dem Code
        </Text>
        <Box
          alignSelf="flex-start"
          px={5}
          py={3}
          borderRadius="10px"
          border="1px dashed var(--cc-gold-line)"
          bg="var(--cc-gold-wash)"
          fontSize={{ base: "22px", md: "26px" }}
          fontWeight={600}
          letterSpacing="0.12em"
          color="var(--cc-gold-light)"
          className="cc-num"
        >
          {code}
        </Box>
        <HStack spacing={3} flexWrap="wrap">
          <Button
            onClick={onCopy}
            variant="line"
            color="var(--cc-gold-light)"
            borderColor="var(--cc-gold-line)"
            leftIcon={hasCopied ? <Check size={15} /> : <Copy size={15} />}
            w={{ base: "100%", sm: "fit-content" }}
          >
            {hasCopied ? "Kopiert" : "Code kopieren"}
          </Button>
          <Button
            as="a"
            href={url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            variant="gold"
            rightIcon={<ArrowUpRight size={16} />}
            w={{ base: "100%", sm: "fit-content" }}
          >
            {ctaLabel}
          </Button>
        </HStack>
        {hinweis ? (
          <Text fontSize="13px" color="var(--cc-text-3)" lineHeight={1.5}>
            {hinweis}
          </Text>
        ) : null}
      </Stack>
    </Box>
  );
}
