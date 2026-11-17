"use client";

import { Box, Button, Flex, HStack, Spinner, Stack, Text } from "@chakra-ui/react";
import { ArrowRight, CalendarDays, CalendarPlus, PlayCircle } from "lucide-react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { freeDashboard } from "@/config/free-bereich";
import type { TerminKarteDaten } from "@/lib/training/nach-buchung";
import { DashCard } from "./primitives";

const t = freeDashboard.termin;
const WARTEN_MS = 3000;
const WARTEN_VERSUCHE = 10;

/**
 * Gebuchtes Analysegespräch ganz oben im Free-Dashboard (Feedback 17.11.2026).
 * Daten aus `termine` (`ladeNaechstenTermin`). Kommt das Konto direkt aus der
 * Buchung (`?termin=neu`) und der Calendly-Webhook ist noch nicht da, wartet die
 * Karte und lädt die Seite alle 3 s neu (höchstens 30 s).
 */
export function TerminKarte({ termin, neu }: { termin: TerminKarteDaten | null; neu: boolean }) {
  const router = useRouter();
  const [versuche, setVersuche] = useState(0);
  const wartet = !termin && neu;

  useEffect(() => {
    if (!wartet || versuche >= WARTEN_VERSUCHE) return;
    const timer = setTimeout(() => {
      router.refresh();
      setVersuche((v) => v + 1);
    }, WARTEN_MS);
    return () => clearTimeout(timer);
  }, [wartet, versuche, router]);

  // Ist der Termin da, verschwindet `?termin=neu` aus der Adresse (Neuladen wartet nicht erneut).
  useEffect(() => {
    if (termin && neu) router.replace("/dashboard", { scroll: false });
  }, [termin, neu, router]);

  if (!termin && !neu) return null;

  return (
    <DashCard label={t.label} labelId="free-termin" icon={<CalendarDays size={17} strokeWidth={1.6} />} className="cc-card--smaragd">
      {termin ? <TerminInhalt termin={termin} /> : <Warten spaet={versuche >= WARTEN_VERSUCHE} />}
    </DashCard>
  );
}

function Warten({ spaet }: { spaet: boolean }) {
  return (
    <HStack spacing={4} align="center">
      {spaet ? null : <Spinner size="sm" color="var(--cc-smaragd-hell)" thickness="2px" speed="0.8s" />}
      <Box>
        <Text fontSize={{ base: "18px", md: "20px" }} fontWeight={600} color="var(--cc-text)">
          {t.wartetTitel}
        </Text>
        <Text fontSize="14px" color="var(--cc-text-2)" mt={1}>
          {spaet ? t.wartetSpaet : t.wartetText}
        </Text>
      </Box>
    </HStack>
  );
}

function TerminInhalt({ termin }: { termin: TerminKarteDaten }) {
  return (
    <Flex direction={{ base: "column", md: "row" }} gap={{ base: 5, md: 6 }} align={{ base: "stretch", md: "center" }} justify="space-between">
      <Stack spacing={1.5} minW={0}>
        <Text fontSize={{ base: "20px", md: "24px" }} fontWeight={600} lineHeight={1.25} color="var(--cc-text)">
          {termin.tag}
        </Text>
        <Text className="cc-num" fontSize={{ base: "15px", md: "16px" }} color="var(--cc-text-soft)">
          {termin.spanne}
        </Text>
        {termin.berater ? (
          <Text fontSize="14px" color="var(--cc-text-2)">
            {t.mit(termin.berater)}
          </Text>
        ) : null}
        <HStack spacing={4} pt={2} flexWrap="wrap" rowGap={1.5} fontSize="14px">
          {termin.umbuchenUrl ? <TextLink href={termin.umbuchenUrl}>{t.umbuchen}</TextLink> : null}
          {termin.absageUrl ? <TextLink href={termin.absageUrl}>{t.absagen}</TextLink> : null}
          {termin.vorbereitungUrl ? (
            <Box as={NextLink} href={termin.vorbereitungUrl} display="inline-flex" alignItems="center" gap={1.5} color="var(--cc-text-2)" _hover={{ color: "var(--cc-text)" }}>
              <PlayCircle size={15} strokeWidth={1.75} aria-hidden />
              {t.vorbereitung}
            </Box>
          ) : null}
        </HStack>
      </Stack>

      <Stack spacing={2.5} flexShrink={0} w={{ base: "full", md: "auto" }} minW={{ md: "260px" }}>
        {termin.joinUrl ? (
          <Button
            as="a"
            href={termin.joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            // Smaragd ohne Glow: das Dashboard läuft auf `.cc-neutral`.
            variant="smaragd"
            boxShadow="none"
            _hover={{ boxShadow: "none", filter: "brightness(1.1)" }}
            rightIcon={<ArrowRight size={17} strokeWidth={2} />}
          >
            {t.beitreten}
          </Button>
        ) : null}
        {termin.kalenderUrl ? (
          <Button as="a" href={termin.kalenderUrl} variant="line" leftIcon={<CalendarPlus size={17} strokeWidth={1.8} />}>
            {t.kalender}
          </Button>
        ) : null}
        {!termin.joinUrl ? (
          <Text fontSize="13px" color="var(--cc-text-3)" maxW="300px">
            {t.hinweis}
          </Text>
        ) : null}
      </Stack>
    </Flex>
  );
}

function TextLink({ href, children }: { href: string; children: string }) {
  return (
    <Box as="a" href={href} target="_blank" rel="noopener noreferrer" color="var(--cc-text-2)" textDecoration="underline" textUnderlineOffset="3px" _hover={{ color: "var(--cc-text)" }}>
      {children}
    </Box>
  );
}
