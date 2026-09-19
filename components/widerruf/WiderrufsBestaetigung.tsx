"use client";

import { Box, Button, Flex, Heading, Stack, Text } from "@chakra-ui/react";
import { Global } from "@emotion/react";
import { Printer } from "lucide-react";
import { useEffect, useRef } from "react";
import { CardLabel, SuccessMark } from "@/components/marketing/funnel-ui";
import { BETREIBER_EMAIL, belegZeilen, formatEingang, weiterText, type WiderrufsBeleg } from "@/lib/widerruf/shared";

/**
 * Bestätigungsseite nach „Widerruf bestätigen" (§ 356a Abs. 4 BGB): Inhalt
 * der Widerrufserklärung, Datum und Uhrzeit des Eingangs — speicher- und
 * druckbar. Die Eingangsbestätigung auf dauerhaftem Datenträger ist die Mail;
 * diese Seite ist der sofort sichtbare Beleg daneben.
 *
 * Druck wie beim Kündigungsbutton (`KuendigungsBestaetigung.tsx`): nur der
 * Beleg, schwarz auf weiß, ohne Himmel und Knöpfe.
 */
export function WiderrufsBestaetigung({ beleg }: { beleg: WiderrufsBeleg }) {
  const eingang = formatEingang(beleg.eingegangenAm);
  const zeilen = belegZeilen(beleg);
  const titelRef = useRef<HTMLHeadingElement>(null);

  // Fokus auf die Überschrift, damit Screenreader den Wechsel vom Formular
  // zur Bestätigung ansagen.
  useEffect(() => {
    titelRef.current?.focus();
  }, []);

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
            CAPITAL CIRCLE · EINGANGSBESTÄTIGUNG DES WIDERRUFS
          </Text>

          <Flex gap={5} align={{ base: "flex-start", sm: "center" }} direction={{ base: "column", sm: "row" }}>
            <Box data-druck="aus">
              <SuccessMark size={56} />
            </Box>
            <Stack spacing={2} minW={0}>
              <CardLabel hero>Widerruf eingegangen</CardLabel>
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
                Dein Widerruf ist bei uns eingegangen.
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
              {weiterText()}
            </Text>
          </Stack>

          <Stack spacing={3}>
            <CardLabel as="h3">Inhalt deines Widerrufs</CardLabel>
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
              Die Eingangsbestätigung haben wir an{" "}
              <Box as="span" color="var(--cc-text)" fontWeight={500}>
                {beleg.bestaetigungEmail}
              </Box>{" "}
              geschickt. Sie ist deine Bestätigung auf einem dauerhaften Datenträger.
            </Text>
          ) : (
            <Box
              p={4}
              borderRadius="10px"
              border="1px solid rgba(248, 113, 113, 0.32)"
              bg="rgba(248, 113, 113, 0.07)"
            >
              <Text fontSize="14px" lineHeight={1.6} color="var(--cc-text)">
                Die Eingangsbestätigung an {beleg.bestaetigungEmail} konnte gerade nicht verschickt werden. Dein
                Widerruf ist trotzdem eingegangen. Bitte speichere oder drucke diese Seite — sie ist dein Beleg. Bei
                Fragen erreichst du uns unter {BETREIBER_EMAIL}.
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
