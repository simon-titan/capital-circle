"use client";

import { Box, Button, Flex, Heading, Stack, Text } from "@chakra-ui/react";
import { Global } from "@emotion/react";
import { Printer } from "lucide-react";
import { useEffect, useRef } from "react";
import { CardLabel, SuccessMark } from "@/components/marketing/funnel-ui";
import {
  ART_LABEL,
  BETREIBER_EMAIL,
  ergebnisText,
  formatEingang,
  PLAN_LABEL,
  planVon,
  zeitpunktText,
  type KuendigungsBeleg,
} from "@/lib/kuendigung/shared";

/**
 * Bestätigungsseite nach dem Absenden (§ 312k Abs. 4 BGB): Inhalt der
 * Kündigung, Datum und Uhrzeit des Eingangs, Zeitpunkt der Beendigung —
 * speicher- und druckbar.
 *
 * Druck: Auf Papier (und im PDF) steht nur der Beleg, schwarz auf weiß. Der
 * Himmel, die Kopfzeile der Seite und die Knöpfe fallen weg (`data-druck`),
 * Graphit-Flächen und helle Schrift werden umgekehrt — sonst käme hellgraue
 * Schrift auf weißem Papier heraus.
 */
export function KuendigungsBestaetigung({ beleg }: { beleg: KuendigungsBeleg }) {
  const eingang = formatEingang(beleg.eingegangenAm);
  const e = beleg.ergebnis;
  const plan = planVon(e);
  const vertrag = plan ? (PLAN_LABEL[plan] ?? plan) : null;
  const titelRef = useRef<HTMLHeadingElement>(null);

  // Fokus auf die Überschrift, damit Screenreader den Wechsel vom Formular
  // zur Bestätigung ansagen.
  useEffect(() => {
    titelRef.current?.focus();
  }, []);

  const zeilen: [string, string][] = [
    ["Eingangsnummer", beleg.referenz],
    ["Eingegangen am", eingang.komplett],
    ["Art der Kündigung", ART_LABEL[beleg.art]],
    ...(beleg.grund ? ([["Grund", beleg.grund]] as [string, string][]) : []),
    ["Name", beleg.name],
    ["E-Mail-Adresse des Kontos", beleg.email],
    ["Angaben zum Vertrag", beleg.vertragAngabe ?? "—"],
    ...(vertrag ? ([["Zugeordneter Vertrag", vertrag]] as [string, string][]) : []),
    ["Gewünschter Zeitpunkt", zeitpunktText(beleg.zeitpunktWunsch)],
    ["Bestätigung an", beleg.bestaetigungEmail],
  ];

  return (
    <>
      <Global
        styles={{
          "@media print": {
            "html, body": { background: "#fff !important", color: "#111 !important" },
          },
        }}
      />

      <Box
        data-druck="beleg"
        className="cc-card cc-card--still cc-rise"
        p={{ base: 5, md: 8 }}
        sx={{
          "@media print": {
            background: "none !important",
            border: "none !important",
            boxShadow: "none !important",
            backdropFilter: "none !important",
            animation: "none !important",
            padding: "0 !important",
            "&::before": { display: "none !important" },
            "& [data-druck='aus']": { display: "none !important" },
            "& *": {
              color: "#111 !important",
              background: "none !important",
              boxShadow: "none !important",
              borderColor: "#bbb !important",
            },
          },
        }}
      >
        <Stack spacing={7}>
          <Text display="none" sx={{ "@media print": { display: "block" } }} fontSize="12px" letterSpacing="0.2em">
            CAPITAL CIRCLE · BESTÄTIGUNG DER KÜNDIGUNG
          </Text>

          <Flex gap={5} align={{ base: "flex-start", sm: "center" }} direction={{ base: "column", sm: "row" }}>
            <Box data-druck="aus">
              <SuccessMark size={56} />
            </Box>
            <Stack spacing={2} minW={0}>
              <CardLabel hero>Kündigung eingegangen</CardLabel>
              <Heading
                as="h2"
                ref={titelRef}
                tabIndex={-1}
                fontWeight={600}
                fontSize={{ base: "22px", md: "28px" }}
                lineHeight={1.25}
                letterSpacing="-0.01em"
                color="var(--cc-text)"
                _focus={{ outline: "none" }}
              >
                Deine Kündigung ist bei uns eingegangen.
              </Heading>
            </Stack>
          </Flex>

          <Box
            p={{ base: 4, md: 5 }}
            borderRadius="10px"
            border="1px solid rgba(232, 192, 148, 0.35)"
            bg="var(--cc-gold-wash)"
          >
            <Text fontSize="13px" color="var(--cc-text-2)">
              Eingegangen am
            </Text>
            <Text className="cc-num" fontSize={{ base: "19px", md: "22px" }} fontWeight={600} color="var(--cc-text)">
              {eingang.datum} um {eingang.uhrzeit}
            </Text>
            <Text className="cc-num" fontSize="13px" color="var(--cc-text-2)" mt={1}>
              Eingangsnummer {beleg.referenz}
            </Text>
          </Box>

          <Stack spacing={3}>
            <CardLabel as="h3">Wie es weitergeht</CardLabel>
            <Text fontSize="15px" lineHeight={1.65} color="var(--cc-text-soft)">
              {ergebnisText(beleg)}
            </Text>
          </Stack>

          <Stack spacing={3}>
            <CardLabel as="h3">Inhalt deiner Kündigung</CardLabel>
            <Box as="dl" borderRadius="10px" border="1px solid var(--cc-line-strong)" overflow="hidden">
              {zeilen.map(([label, wert], i) => (
                <Flex
                  key={label}
                  direction={{ base: "column", sm: "row" }}
                  gap={{ base: 0.5, sm: 4 }}
                  px={4}
                  py={3}
                  borderTop={i === 0 ? "none" : "1px solid var(--cc-line)"}
                  sx={{ breakInside: "avoid" }}
                >
                  <Box as="dt" flex={{ sm: "0 0 38%" }} fontSize="13px" color="var(--cc-text-2)">
                    {label}
                  </Box>
                  <Box
                    as="dd"
                    flex="1"
                    minW={0}
                    fontSize="15px"
                    color="var(--cc-text)"
                    whiteSpace="pre-wrap"
                    wordBreak="break-word"
                  >
                    {wert}
                  </Box>
                </Flex>
              ))}
            </Box>
          </Stack>

          {beleg.bestaetigungVersendet ? (
            <Text fontSize="14px" lineHeight={1.6} color="var(--cc-text-2)">
              Eine Bestätigung dieser Kündigung haben wir an{" "}
              <Box as="span" color="var(--cc-text)" fontWeight={500}>
                {beleg.bestaetigungEmail}
              </Box>{" "}
              geschickt. Sie ist deine Bestätigung in Textform.
            </Text>
          ) : (
            <Box
              p={4}
              borderRadius="10px"
              border="1px solid rgba(248, 113, 113, 0.32)"
              bg="rgba(248, 113, 113, 0.07)"
            >
              <Text fontSize="14px" lineHeight={1.6} color="var(--cc-text)">
                Die Bestätigungs-E-Mail an {beleg.bestaetigungEmail} konnte gerade nicht verschickt werden. Deine
                Kündigung ist trotzdem eingegangen. Bitte speichere oder drucke diese Seite — sie ist deine
                Bestätigung. Bei Fragen erreichst du uns unter {BETREIBER_EMAIL}.
              </Text>
            </Box>
          )}

          <Flex data-druck="aus" gap={3} wrap="wrap" align="center">
            <Button variant="line" leftIcon={<Printer size={16} strokeWidth={1.75} />} onClick={() => window.print()}>
              Drucken oder als PDF speichern
            </Button>
            <Text fontSize="13px" color="var(--cc-text-3)">
              Im Druckdialog „Als PDF speichern“ wählen, um die Bestätigung als Datei abzulegen.
            </Text>
          </Flex>

          <Text display="none" sx={{ "@media print": { display: "block" } }} fontSize="12px">
            Capital Circle · {BETREIBER_EMAIL}
          </Text>
        </Stack>
      </Box>
    </>
  );
}
