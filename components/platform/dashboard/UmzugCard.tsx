"use client";

import { Box, Button, Flex, Text, type BoxProps } from "@chakra-ui/react";
import { CalendarClock } from "lucide-react";
import NextLink from "next/link";
import { useId, useState } from "react";
import { UMZUG_TON } from "@/components/platform/umzug-ton";
import { useViewer } from "@/components/platform/shell/viewer";
import { umzugAnzeige, UMZUG_CTA_HREF } from "@/lib/whop-umzug/stand";
import { DashCard, Meta } from "./primitives";

/**
 * Derselbe Stand wie im Hinweisband, als Karte im Dashboard.
 *
 * Warum beides: Das Band steht über dem Inhalt und wird nach der dritten Seite
 * zum Rahmen, den man nicht mehr liest. Die Karte steht dort, wo jemand
 * nachsieht, was heute dran ist, und zwar in derselben Form wie alles andere
 * dort. Beide lesen denselben Stand aus derselben Abfrage
 * (`components/platform/shell/viewer.tsx`) und denselben Wortlaut aus
 * `lib/whop-umzug/stand.ts`; auseinanderlaufen können sie damit nicht.
 *
 * Die Karte steht im Dashboard unter `.cc-neutral` und bekommt Rahmen und
 * Schein dieser Ausnahme automatisch (Nutzerwunsch 16.09.2026). Farbe trägt
 * hier nur das Kennzeichen oben rechts, nicht die Karte selbst.
 */
export function UmzugCard(props: Omit<BoxProps, "title" | "children">) {
  const { umzug } = useViewer();
  const [offen, setOffen] = useState(false);
  const erklaerungId = useId();

  if (!umzug) return null;

  const a = umzugAnzeige(umzug);
  const ton = UMZUG_TON[a.stufe];

  return (
    <DashCard
      label="Mitgliedschaft"
      labelId="umzug-karte-titel"
      icon={<CalendarClock size={16} strokeWidth={1.75} />}
      badge={
        <Flex align="center" gap={2}>
          <Box w="7px" h="7px" flexShrink={0} borderRadius="full" bg={ton.punkt} aria-hidden />
          <Text
            className="cc-num"
            fontSize="12px"
            lineHeight="16px"
            fontWeight={500}
            letterSpacing="0.12em"
            textTransform="uppercase"
            color={ton.frist}
            whiteSpace="nowrap"
          >
            {a.frist}
          </Text>
        </Flex>
      }
      {...props}
    >
      <Text
        className="cc-num"
        fontSize={{ base: "17px", md: "18px" }}
        fontWeight={600}
        lineHeight={1.3}
        color="var(--cc-text)"
        overflowWrap="break-word"
      >
        {a.titel}
      </Text>
      <Meta mt={2} maxW="70ch">
        {a.text}
      </Meta>

      {offen ? (
        <Text
          id={erklaerungId}
          className="cc-num"
          fontSize="13px"
          lineHeight={1.6}
          color="var(--cc-text-2)"
          mt={4}
          pt={4}
          borderTop="1px solid var(--cc-line)"
          maxW="80ch"
          overflowWrap="break-word"
        >
          {a.erklaerung}
        </Text>
      ) : null}

      <Flex mt="auto" pt={5} align="center" gap={4} wrap="wrap">
        <Button as={NextLink} href={UMZUG_CTA_HREF} variant={a.stufe === "ruhig" ? "line" : "gold"} size="sm">
          {a.cta}
        </Button>
        <Box
          as="button"
          type="button"
          onClick={() => setOffen((o) => !o)}
          aria-expanded={offen}
          aria-controls={erklaerungId}
          fontSize="13px"
          color="var(--cc-text-3)"
          transition="color 150ms var(--cc-ease)"
          _hover={{ color: "var(--cc-text-2)" }}
          _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px", borderRadius: "4px" }}
        >
          {offen ? "Erklärung schließen" : "Warum sehe ich das?"}
        </Box>
      </Flex>
    </DashCard>
  );
}
