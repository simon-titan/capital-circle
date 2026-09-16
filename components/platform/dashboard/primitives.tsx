"use client";

import { Box, Button, Flex, Heading, Stack, Text, type BoxProps, type TextProps } from "@chakra-ui/react";
import { Lock } from "lucide-react";
import NextLink from "next/link";
import type { ReactNode } from "react";

type DashCardProps = Omit<BoxProps, "title"> & {
  label: string;
  labelId: string;
  /** Aktion rechts neben Titel und Inhalt (ab `sm`), auf schmalen Screens darunter. */
  action?: ReactNode;
  /** Kleines Kennzeichen oben rechts auf Höhe des Kartentitels (z. B. Event-Art). */
  badge?: ReactNode;
  /**
   * Hero-Karte (`.cc-card--hero`). Im Dashboard bleibt davon nur der hellere
   * Titel: die Wrapper-Klasse `.cc-neutral` nimmt Gold-Rahmen, Schein und
   * atmenden Glow zurueck (Nutzerwunsch 16.09.2026, Regeln in globals.css).
   */
  hero?: boolean;
};

/** Glas-Karte (`.cc-card` in globals.css); der Versaltitel ist die Überschrift der Karte. */
export function DashCard({ label, labelId, action, badge, hero = false, children, className, ...rest }: DashCardProps) {
  const ueberschrift = (
    <Heading
      as="h2"
      id={labelId}
      fontSize="13px"
      lineHeight="18px"
      fontWeight={500}
      letterSpacing="0.12em"
      textTransform="uppercase"
      color={hero ? "var(--cc-gold-light)" : "var(--cc-text-soft)"}
      // Ohne Badge bleibt der bisherige Abstand; mit Badge sitzt er auf der Zeile.
      mb={badge ? 0 : 4}
    >
      {label}
    </Heading>
  );

  const body = (
    <Box flex="1" minW={0} display="flex" flexDirection="column">
      {badge ? (
        <Flex align="center" justify="space-between" gap={3} mb={4}>
          {ueberschrift}
          <Box flexShrink={0}>{badge}</Box>
        </Flex>
      ) : (
        ueberschrift
      )}
      {children}
    </Box>
  );

  return (
    <Box
      as="section"
      aria-labelledby={labelId}
      className={["cc-card", hero ? "cc-card--hero" : null, className].filter(Boolean).join(" ")}
      w="100%"
      // Volle Zellenhöhe: Im Raster stehen Fortschritt, Heute live und
      // Wochenaufgabe nebeneinander und sollen unten bündig abschließen.
      h="100%"
      minW={0}
      display="flex"
      flexDirection="column"
      p={{ base: 5, md: 6 }}
      {...rest}
    >
      {action ? (
        <Flex direction={{ base: "column", sm: "row" }} align={{ base: "stretch", sm: "center" }} gap={4}>
          {body}
          <Box flexShrink={0}>{action}</Box>
        </Flex>
      ) : (
        body
      )}
    </Box>
  );
}

/** Zeilen begrenzen, ohne Wörter zu zerhacken (Chakras `noOfLines` setzt `word-break: break-all`). */
export function clampLines(lines: number) {
  return {
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
    overflowWrap: "break-word" as const,
  };
}

/** Hauptwert einer Karte: Modul, Aufgabe, Termin. */
export function CardValue(props: TextProps) {
  return <Text fontSize={{ base: "17px", md: "18px" }} fontWeight={600} lineHeight={1.3} color="var(--cc-text)" {...props} />;
}

/**
 * „NYSE iFVG Momentum · Lektion 7 von 24“ in einer Zeile wie im Mockup. Reicht
 * der Platz nicht, rutscht die Meta sauber in die nächste Zeile, ohne
 * verwaisten Trennpunkt (siehe `.cc-meta-row` in globals.css).
 */
export function TitleWithMeta({ title, meta, metaLead }: { title: ReactNode; meta?: ReactNode; metaLead?: ReactNode }) {
  return (
    <Box overflow="hidden">
      <Flex className="cc-meta-row" wrap="wrap" align="baseline" rowGap={1}>
        <Box
          as="span"
          className="cc-meta-item"
          minW={0}
          fontSize={{ base: "17px", md: "18px" }}
          fontWeight={600}
          lineHeight={1.3}
          color="var(--cc-text)"
          overflowWrap="break-word"
        >
          {title}
        </Box>
        {meta ? (
          <Box
            as="span"
            className="cc-meta-item cc-num"
            display="inline-flex"
            alignItems="center"
            gap={2}
            fontSize="14px"
            lineHeight={1.3}
            color="var(--cc-text-2)"
            whiteSpace="nowrap"
          >
            {metaLead}
            {meta}
          </Box>
        ) : null}
      </Flex>
    </Box>
  );
}

export function Meta(props: TextProps) {
  return <Text fontSize="14px" lineHeight={1.5} color="var(--cc-text-2)" {...props} />;
}

/** Icon-Kachel: Haarlinie, helles Icon (wie im Kunden-Mockup). */
export function IconTile({ children }: { children: ReactNode }) {
  return (
    <Flex
      w="56px"
      h="56px"
      flexShrink={0}
      align="center"
      justify="center"
      border="1px solid var(--cc-line-strong)"
      bg="rgba(255, 255, 255, 0.02)"
      borderRadius="12px"
      color="var(--cc-text)"
      boxShadow="inset 0 1px 0 rgba(255, 255, 255, 0.05)"
      aria-hidden
    >
      {children}
    </Flex>
  );
}

/**
 * Fortschritt, füllt sich einmal beim Laden. `gold` = Gold-Verlauf,
 * `ink` = helle Datenfarbe wie im Kunden-Mockup (Dashboard).
 */
export function ProgressBar({
  value,
  label,
  tone = "gold",
  ...rest
}: Omit<BoxProps, "children"> & { value: number; label: string; tone?: "gold" | "ink" }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <Box
      role="progressbar"
      aria-label={label}
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      h="8px"
      w="100%"
      maxW="400px"
      borderRadius="full"
      bg="rgba(255, 255, 255, 0.07)"
      {...rest}
    >
      {v > 0 ? (
        <Box
          className="cc-fill"
          h="100%"
          w={`${v}%`}
          bg={tone === "ink" ? "var(--cc-ink)" : "var(--cc-gold-bar)"}
          borderRadius="full"
          // Kein Schein mehr: Das Dashboard laeuft auf der ruhigen Variante (.cc-neutral).
          boxShadow={undefined}
        />
      ) : null}
    </Box>
  );
}

/** Gesperrter Zustand für Free-Mitglieder: ehrlich benennen statt Inhalt zu verwischen. */
export function LockedNote({ text }: { text: string }) {
  return (
    <Stack spacing={3} flex="1">
      <Flex align="center" gap={2} color="var(--cc-text)">
        <Box color="var(--cc-gold-light)">
          <Lock size={15} strokeWidth={1.75} aria-hidden />
        </Box>
        <Text fontSize="16px" fontWeight={500}>
          Nur für Mitglieder
        </Text>
      </Flex>
      <Meta>{text}</Meta>
      <Box mt="auto" pt={2}>
        <Button as={NextLink} href="/bewerbung" variant="line" size="sm">
          Mitglied werden
        </Button>
      </Box>
    </Stack>
  );
}
