import type { Metadata } from "next";
import Link from "next/link";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { ArrowLeft } from "lucide-react";
import { FunnelTrackerProvider } from "@/components/landing/FunnelTracker";
import { DiscordWand } from "@/components/landing/training/CommunityEinblicke";
import { RechtsLinks } from "@/components/legal/RechtsFusszeile";

export const metadata: Metadata = {
  title: "Ergebnisse aus der Community · Capital Circle",
  description:
    "Beiträge von Mitgliedern aus dem Capital-Circle-Discord: Auszahlungen, Funded Accounts und Dank, unverändert so, wie sie gepostet wurden.",
};

/**
 * Vitrine (`/ergebnisse`): die Discord-Wand aus `/training` und `/call`
 * (`DiscordWand`, `config/discord-beitraege.ts`), sonst nichts.
 *
 * Seit 17.11.2026 (Feedback) **nur noch die Discord-Beiträge** — die Blöcke
 * „Aus der Community", „Meine Auszahlungen" und „Bestandene Challenges"
 * (`NachweisGalerie`, Daten in `config/landing-membership.ts`) hängen hier
 * nicht mehr. Die Daten bleiben, die Verkaufsseite `/` zeigt die Auszahlungen weiter.
 *
 * Öffentlich: Eintrag in `PUBLIC_PATHS` in `proxy.ts`, der Bildordner
 * `public/community/` steht im Matcher unter den Ausnahmen.
 *
 * Nicht zu verwechseln mit `/erfolge`: Das ist die Galerie der von Mitgliedern
 * selbst eingereichten und freigegebenen Nachweise aus der Datenbank
 * (`certificates`).
 */
export default function ErgebnissePage() {
  return (
    /*
      Die Seite wird mitgemessen (Aufruf, Verweildauer, Scrolltiefe) — sie ist
      der Beleg-Teil des Kaufwegs, und ob er gelesen wird, ist genau die Frage.
      Ohne Cookie und ohne IP, siehe `components/landing/FunnelTracker.tsx`.
      Kauf-Knoepfe gibt es hier nicht, also auch keine Klick-Herkunft.
    */
    <FunnelTrackerProvider>
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
              Ergebnisse aus der Capital Circle Community
            </Box>
            <Text fontSize={{ base: "15px", md: "17px" }} color="var(--cc-text-2)" maxW="640px">
              Klick auf einen Beitrag, um ihn groß zu sehen.
            </Text>
          </Stack>
        </Stack>

        <DiscordWand />

        {/* Ehrlicher Nachsatz: Die Beiträge sind keine geprüften Belege. */}
        <Stack gap={5} borderTop="1px solid var(--cc-line)" pt={6}>
          <Text fontSize="13px" color="var(--cc-text-3)" maxW="720px">
            Die Beiträge stehen unverändert, so wie Mitglieder sie im Discord gepostet haben, und zeigen neben
            Auszahlungen auch Funded Accounts und Kontostände. Eine Kontogröße ist kein Verdienst.
          </Text>
          {/* Impressum · Datenschutz · AGB · Widerruf · Verträge hier kündigen */}
          <RechtsLinks justify="flex-start" />
        </Stack>
      </Stack>
    </Box>
    </FunnelTrackerProvider>
  );
}
