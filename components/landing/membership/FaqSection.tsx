"use client";

import { Box, Flex, Grid, Heading, Stack, Text } from "@chakra-ui/react";
import { useId, useState } from "react";
import { faq } from "@/config/landing-membership";
import { Reveal } from "../landing-ui";
import { Sektion, SektionsEyebrow } from "./membership-ui";

/**
 * Häufige Fragen.
 *
 * ── Warum ein eigenes Akkordeon und nicht Chakras `Accordion` ──────────────
 * Es wird genau ein Verhalten gebraucht: aufklappen, zuklappen, immer nur eine
 * Frage offen. Chakras Accordion bringt dafür sein eigenes Markup mit, das
 * anschließend Zeile für Zeile auf das Schema v3.2 zurückgestylt werden müsste
 * — mehr Aufwand als die dreißig Zeilen hier, und ein Stilupdate weniger, das
 * irgendwann danebengreift.
 *
 * Nur eine Frage offen zu lassen ist Absicht: Der Abschnitt ist die letzte
 * Station vor dem Abschluss, und sieben gleichzeitig ausgeklappte Antworten
 * würden den Schlusssatz hundert Pixel weit nach unten schieben.
 *
 * Die Antwort bleibt im DOM und wird nur ausgeblendet (`display: none`), damit
 * die Seitensuche des Browsers sie findet.
 */
export function FaqSection() {
  const [offen, setOffen] = useState<number | null>(null);
  const idPrefix = useId();

  return (
    <Sektion id="faq" aria-labelledby="faq-titel">
      <Grid templateColumns={{ base: "1fr", lg: "minmax(0, 360px) 1fr" }} gap={{ base: 10, lg: 16 }}>
        <Reveal>
          <Stack spacing={4} position={{ lg: "sticky" }} top={{ lg: "120px" }}>
            <SektionsEyebrow>{faq.eyebrow}</SektionsEyebrow>
            <Heading
              as="h2"
              id="faq-titel"
              fontSize="clamp(30px, 4.6vw, 52px)"
              fontWeight={700}
              lineHeight={1.08}
              letterSpacing="-0.03em"
              color="var(--cc-text)"
            >
              {faq.headline}
            </Heading>
          </Stack>
        </Reveal>

        <Reveal delay={80}>
          <Box className="cc-card cc-card--still" p={0} overflow="hidden">
            <Stack as="ul" listStyleType="none" spacing={0}>
              {faq.eintraege.map((eintrag, i) => {
                const istOffen = offen === i;
                const panelId = `${idPrefix}-antwort-${i}`;
                const knopfId = `${idPrefix}-frage-${i}`;
                return (
                  <Box as="li" key={eintrag.frage} borderBottom="1px solid var(--cc-line)" _last={{ borderBottom: "none" }}>
                    <Flex
                      as="button"
                      type="button"
                      id={knopfId}
                      aria-expanded={istOffen}
                      aria-controls={panelId}
                      onClick={() => setOffen(istOffen ? null : i)}
                      w="100%"
                      align="center"
                      gap={{ base: 4, md: 6 }}
                      px={{ base: 5, md: 7 }}
                      py={{ base: 5, md: 6 }}
                      textAlign="left"
                      bg="transparent"
                      transition="background-color 180ms var(--cc-ease)"
                      _hover={{ bg: "rgba(212, 176, 128, 0.05)" }}
                      _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "-2px" }}
                    >
                      <Text
                        className="cc-num"
                        flexShrink={0}
                        fontSize="13px"
                        fontWeight={500}
                        letterSpacing="0.12em"
                        color={istOffen ? "var(--cc-gold-light)" : "var(--cc-text-3)"}
                        aria-hidden
                      >
                        {String(i + 1).padStart(2, "0")}
                      </Text>

                      <Text flex={1} fontSize={{ base: "16px", md: "18px" }} fontWeight={500} color="var(--cc-text)">
                        {eintrag.frage}
                      </Text>

                      {/* Plus, das sich zum Minus dreht — zwei Striche, kein Icon-Import. */}
                      <Box
                        aria-hidden
                        position="relative"
                        flexShrink={0}
                        w="18px"
                        h="18px"
                        color={istOffen ? "var(--cc-gold-light)" : "var(--cc-text-2)"}
                      >
                        <Box position="absolute" top="8px" left={0} w="18px" h="1.5px" bg="currentColor" />
                        <Box
                          position="absolute"
                          top="8px"
                          left={0}
                          w="18px"
                          h="1.5px"
                          bg="currentColor"
                          transform={istOffen ? "rotate(0deg)" : "rotate(90deg)"}
                          transition="transform 220ms var(--cc-ease)"
                        />
                      </Box>
                    </Flex>

                    <Box
                      id={panelId}
                      role="region"
                      aria-labelledby={knopfId}
                      display={istOffen ? "block" : "none"}
                      px={{ base: 5, md: 7 }}
                      pb={{ base: 6, md: 7 }}
                      pl={{ base: 5, md: "calc(28px + 32px)" }}
                    >
                      <Text fontSize={{ base: "15px", md: "16px" }} lineHeight={1.7} color="var(--cc-text-2)" maxW="62ch">
                        {eintrag.antwort}
                      </Text>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </Reveal>
      </Grid>
    </Sektion>
  );
}
