"use client";

import { Box, Flex } from "@chakra-ui/react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { rechtsPfade } from "@/config/legal";

const TEXTE = [
  { href: rechtsPfade.impressum, label: "Impressum" },
  { href: rechtsPfade.datenschutz, label: "Datenschutz" },
  { href: rechtsPfade.agb, label: "AGB" },
  { href: rechtsPfade.widerruf, label: "Widerruf" },
] as const;

/**
 * Umschalter zwischen den vier Rechtstexten, oben auf jeder Rechtstext-Seite.
 * Aktiv wie ein Nav-Punkt der Plattform: Gold-Haarlinie, Gold-Hauch, Text in
 * Gold hell. Kein `<nav>` — siehe `RechtsFusszeile.tsx` (Funnel-Styles blenden
 * `nav[aria-label]` aus).
 */
export function RechtsNav() {
  const pathname = usePathname() ?? "";
  return (
    <Flex role="navigation" aria-label="Rechtstexte" wrap="wrap" gap={2}>
      {TEXTE.map((t) => {
        const aktiv = pathname === t.href;
        return (
          <Box
            key={t.href}
            as={NextLink}
            href={t.href}
            aria-current={aktiv ? "page" : undefined}
            px={3}
            h="32px"
            display="inline-flex"
            alignItems="center"
            borderRadius="var(--cc-radius)"
            border="1px solid"
            borderColor={aktiv ? "var(--cc-gold-line)" : "var(--cc-line-strong)"}
            bg={aktiv ? "var(--cc-gold-wash)" : "rgba(255, 255, 255, 0.02)"}
            color={aktiv ? "var(--cc-gold-light)" : "var(--cc-text-2)"}
            fontSize="13px"
            fontWeight={500}
            transition="color 150ms var(--cc-ease), border-color 150ms var(--cc-ease)"
            _hover={aktiv ? undefined : { color: "var(--cc-text)", borderColor: "var(--cc-gold-line)" }}
            _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px" }}
          >
            {t.label}
          </Box>
        );
      })}
    </Flex>
  );
}
