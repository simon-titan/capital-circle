"use client";

import { Box, Flex, Grid, Heading, HStack, Stack, Text } from "@chakra-ui/react";
import { ArrowRight } from "lucide-react";
import { ergebnisse, type Auszahlung } from "@/config/landing-membership";
import { Reveal } from "../landing-ui";
import { Sektion, SektionsKopf } from "./membership-ui";

/**
 * Belegte Auszahlungen — der Beweisteil der Seite.
 *
 * Die Beträge stehen in Grün, und das ist hier keine zweite Akzentfarbe,
 * sondern die semantische Ausnahme aus DESIGN.md: Grün trägt Gewinn. Alles
 * andere im Abschnitt bleibt neutral, damit genau diese Zahlen tragen.
 *
 * Die Daten kommen aus `config/landing-membership.ts` und sind bis auf
 * Weiteres Platzhalter aus dem Kunden-Mockup. Der Abschnitt behauptet deshalb
 * nichts, was die Miniatur nicht zeigen kann: Solange kein echtes Zertifikat
 * hinterlegt ist, steht dort ein sichtbarer Platzhalter und kein fremdes Bild,
 * das als Zertifikat durchginge.
 */
export function ErgebnisseSection() {
  return (
    <Sektion id="ergebnisse" aria-labelledby="ergebnisse-titel">
      <SektionsKopf
        eyebrow={ergebnisse.eyebrow}
        headline={ergebnisse.headline}
        sublines={ergebnisse.sublines}
        id="ergebnisse-titel"
      />

      <Grid mt={{ base: 10, md: 14 }} templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={{ base: 5, md: 6 }}>
        {ergebnisse.spalten.map((spalte, i) => (
          <Reveal key={spalte.titel} delay={i * 80}>
            <Box className="cc-card cc-card--still" h="100%" p={{ base: 5, md: 6 }}>
              <Heading
                as="h3"
                fontSize="13px"
                lineHeight="18px"
                fontWeight={500}
                letterSpacing="0.14em"
                textTransform="uppercase"
                color="var(--cc-text-soft)"
                mb={5}
              >
                {spalte.titel}
              </Heading>

              <Stack as="ul" listStyleType="none" spacing={0}>
                {spalte.zeilen.map((zeile) => (
                  <AuszahlungsZeile key={`${spalte.titel}-${zeile.quelle}`} zeile={zeile} />
                ))}
              </Stack>
            </Box>
          </Reveal>
        ))}
      </Grid>

      <Reveal delay={160}>
        <Flex justify="center" mt={{ base: 8, md: 10 }}>
          {/*
            Interner Seitenwechsel, kein Anker — hier ist `next/link` unbedenklich.
            Bewusst trotzdem ein schlichtes `<a>`, damit auf dieser Seite genau
            eine Regel für Links gilt: `/go/` darf nie vorgeholt werden, und eine
            Ausnahme davon ist leichter zu übersehen als eine Einheitlichkeit.
          */}
          <HStack
            as="a"
            href={ergebnisse.fussLink.href}
            spacing={2}
            fontSize="16px"
            color="var(--cc-gold-light)"
            transition="gap 180ms var(--cc-ease)"
            _hover={{ textDecoration: "underline", textUnderlineOffset: "5px" }}
            _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "4px", borderRadius: "4px" }}
          >
            <Text as="span">{ergebnisse.fussLink.label}</Text>
            <ArrowRight size={16} strokeWidth={2} aria-hidden />
          </HStack>
        </Flex>
      </Reveal>
    </Sektion>
  );
}

function AuszahlungsZeile({ zeile }: { zeile: Auszahlung }) {
  return (
    <Flex
      as="li"
      align="center"
      gap={{ base: 3, md: 5 }}
      py={4}
      borderBottom="1px solid var(--cc-line)"
      _last={{ borderBottom: "none" }}
    >
      <ZertifikatMiniatur bild={zeile.bild} />

      <Grid
        flex={1}
        minW={0}
        templateColumns={{ base: "1fr auto", sm: "1fr auto auto" }}
        gap={{ base: 2, md: 4 }}
        alignItems="center"
      >
        <Feld label="Prop-Firma" wert={zeile.quelle} />
        <Feld label="Betrag" wert={zeile.betrag} gewinn />
        <Box display={{ base: "none", sm: "block" }}>
          <Feld label="Datum" wert={zeile.datum} gedimmt />
        </Box>
      </Grid>
    </Flex>
  );
}

function Feld({
  label,
  wert,
  gewinn = false,
  gedimmt = false,
}: {
  label: string;
  wert: string;
  gewinn?: boolean;
  gedimmt?: boolean;
}) {
  return (
    <Stack spacing={1} minW={0}>
      <Text fontSize="10px" letterSpacing="0.14em" textTransform="uppercase" color="var(--cc-text-3)">
        {label}
      </Text>
      <Text
        className="cc-num"
        fontSize={gewinn ? { base: "19px", md: "22px" } : "15px"}
        fontWeight={gewinn ? 600 : 400}
        lineHeight={1.2}
        letterSpacing={gewinn ? "-0.01em" : undefined}
        color={gewinn ? "var(--cc-success)" : gedimmt ? "var(--cc-text-2)" : "var(--cc-text)"}
        textShadow={gewinn ? "0 0 18px rgba(74, 222, 128, 0.35)" : undefined}
        noOfLines={1}
      >
        {wert}
      </Text>
    </Stack>
  );
}

/**
 * Vorschau des Auszahlungszertifikats.
 *
 * Ohne hinterlegtes Bild zeichnet die Komponente eine neutrale Urkunde als
 * Inline-SVG. Inline und nicht als Datei unter `public/`, weil `proxy.ts` für
 * unbekannte Pfade die Anmeldeseite ausliefert — ein neuer Bildordner käme beim
 * Besucher als Login-HTML an, bis jemand den Matcher nachzieht.
 */
function ZertifikatMiniatur({ bild }: { bild?: string }) {
  const rahmen = {
    w: { base: "78px", md: "112px" },
    h: { base: "56px", md: "78px" },
    flexShrink: 0,
    borderRadius: "6px",
    overflow: "hidden",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    boxShadow: "0 6px 18px rgba(0, 0, 0, 0.45)",
  } as const;

  if (bild) {
    return <Box {...rahmen} as="img" src={bild} alt="" objectFit="cover" />;
  }

  return (
    <Flex {...rahmen} align="center" justify="center" bg="linear-gradient(160deg, #efe9dd, #d9d1c1)">
      <Box as="svg" viewBox="0 0 112 78" w="100%" h="100%" aria-hidden>
        <rect x="5" y="5" width="102" height="68" fill="none" stroke="#b9ae97" strokeWidth="1" />
        <rect x="8" y="8" width="96" height="62" fill="none" stroke="#cfc6b3" strokeWidth="0.5" />
        <rect x="30" y="18" width="52" height="4" rx="2" fill="#8d8371" />
        <rect x="22" y="30" width="68" height="2.5" rx="1.25" fill="#b3a993" />
        <rect x="22" y="36" width="68" height="2.5" rx="1.25" fill="#b3a993" />
        <rect x="22" y="42" width="44" height="2.5" rx="1.25" fill="#b3a993" />
        <circle cx="86" cy="56" r="8" fill="none" stroke="#9c8f74" strokeWidth="1.5" />
        <circle cx="86" cy="56" r="4" fill="#b8935f" />
        <rect x="20" y="58" width="30" height="2" rx="1" fill="#9c9382" />
      </Box>
    </Flex>
  );
}
