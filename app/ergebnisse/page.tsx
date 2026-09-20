import type { Metadata } from "next";
import Link from "next/link";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { ArrowLeft } from "lucide-react";
import { auszahlungenCommunity, auszahlungenEmre, challenges } from "@/config/landing-membership";
import { NachweisGalerie } from "@/components/landing/membership/NachweisGalerie";
import { RechtsLinks } from "@/components/legal/RechtsFusszeile";

export const metadata: Metadata = {
  title: "Belegte Auszahlungen · Capital Circle",
  description:
    "Alle dokumentierten Auszahlungen von Mitgliedern und von Emre Kopal, dazu die bestandenen Prop-Firm-Challenges. Jeder Nachweis einsehbar.",
};

/**
 * Alle belegten Auszahlungen (`/ergebnisse`).
 *
 * Hängt am Fusslink der Ergebnis-Section der Verkaufsseite und ist deshalb
 * öffentlich — der Eintrag steht in `PUBLIC_PATHS` in `proxy.ts`. Die Bilder
 * liegen unter `public/nachweise/`; dieser Ordner steht im Matcher desselben
 * Proxys unter den Ausnahmen, sonst käme dort Login-HTML statt Bild an.
 *
 * Nicht zu verwechseln mit `/erfolge`: Das ist die Galerie der von Mitgliedern
 * selbst eingereichten und freigegebenen Nachweise aus der Datenbank
 * (`certificates`), hängt an echten Konten und wird im Admin freigeschaltet.
 * Hier stehen die von Emre gesammelten Belege aus dem Discord.
 */
export default function ErgebnissePage() {
  return (
    <Box
      position="relative"
      minH="100vh"
      bg="var(--cc-bg)"
      color="var(--cc-text)"
      px={{ base: 4, md: 8 }}
      py={{ base: 10, md: 16 }}
      overflowX="clip"
    >
      <Box className="cc-stars" aria-hidden />
      <Box className="cc-goldlight" aria-hidden />

      <Stack position="relative" zIndex={1} maxW="1180px" mx="auto" gap={{ base: 10, md: 14 }}>
        <Stack gap={4} className="cc-rise">
          {/* `Link` umschliesst das `Flex` statt als `as`-Prop hineingereicht zu
              werden: Chakra-Komponenten sind Client-Komponenten, und eine
              Komponente als Prop waere eine Funktion ueber die Server-Grenze —
              der Build bricht dann beim Prerendern ab. */}
          <Link href="/" style={{ width: "fit-content" }}>
            <Flex
              align="center"
              gap={2}
              fontSize="14px"
              color="var(--cc-text-2)"
              transition="color 180ms var(--cc-ease)"
              _hover={{ color: "var(--cc-text)" }}
            >
              <ArrowLeft size={16} strokeWidth={1.75} />
              Zurück zur Startseite
            </Flex>
          </Link>

          <Stack gap={3}>
            <Text
              fontSize="13px"
              lineHeight="18px"
              fontWeight={500}
              letterSpacing="0.12em"
              textTransform="uppercase"
              color="var(--cc-gold-light)"
            >
              Ergebnisse
            </Text>
            <Box
              as="h1"
              fontSize={{ base: "30px", md: "44px" }}
              lineHeight={1.12}
              fontWeight={600}
              letterSpacing="-0.01em"
            >
              Belegt statt behauptet.
            </Box>
            {/* Zwei Versprechen, zwei Sätze. Der erste galt hier immer und darf
                nicht verwässern, seit die Challenges dazugekommen sind — also
                steht gleich im Vorspann, dass sie ein eigener Abschnitt sind. */}
            <Text fontSize={{ base: "15px", md: "17px" }} color="var(--cc-text-2)" maxW="640px">
              Oben die Auszahlungen: Jede Zeile dort ist Geld, das geflossen ist: Überweisung, Payout-Mail oder
              Payout-Zertifikat. Darunter, getrennt davon, die bestandenen Prop-Firm-Challenges. Klick auf einen
              Nachweis, um ihn groß zu sehen.
            </Text>
          </Stack>
        </Stack>

        <NachweisGalerie
          bloecke={[
            {
              titel: "Aus der Community",
              hinweis:
                "Nachweise von Mitgliedern, geteilt im Discord. Unverändert, so wie sie dort gepostet wurden.",
              zeilen: auszahlungenCommunity,
            },
            {
              titel: "Meine Auszahlungen",
              hinweis: "Payout-Zertifikate von Lucid Trading, ausgestellt auf Emre Kopal.",
              zeilen: auszahlungenEmre,
            },
            /* Eigener Block, eigene Überschrift — und der Unterschied steht im
               Hinweis, nicht im Kleingedruckten. Zwischen den Auszahlungen
               stünde ein 150.000-$-Zertifikat wie eine Auszahlung über
               150.000 $ da; genau deshalb ist es hier unten und heißt anders. */
            {
              titel: "Bestandene Challenges",
              art: "challenge",
              hinweis:
                "Zertifikate von Mitgliedern, die die Prüfung einer Prop-Firma bestanden haben. Die genannte Summe ist die Kontogröße, die sie ab da handeln. Keine Auszahlung.",
              zeilen: challenges,
            },
          ]}
        />

        {/* Der ehrliche Nachsatz: Es gibt mehr Material, aber nicht jedes Bild
            ist ein Nachweis. Kontostände und Tagesgewinne stehen hier bewusst
            nicht — sie sagen weder, dass Geld geflossen ist, noch, dass jemand
            eine Prüfung bestanden hat. */}
        <Stack gap={5} borderTop="1px solid var(--cc-line)" pt={6}>
          <Text fontSize="13px" color="var(--cc-text-3)" maxW="720px">
            Die beiden Abschnitte belegen Verschiedenes und bleiben deshalb getrennt: oben Geld, das ausgezahlt wurde,
            unten Prüfungen, die bestanden wurden. Eine Kontogröße ist kein Verdienst. Kontostände und Tagesgewinne sind
            gar nicht aufgeführt. Sie belegen keines von beidem.
          </Text>
          {/* Impressum · Datenschutz · AGB · Widerruf · Verträge hier kündigen */}
          <RechtsLinks justify="flex-start" />
        </Stack>
      </Stack>
    </Box>
  );
}
