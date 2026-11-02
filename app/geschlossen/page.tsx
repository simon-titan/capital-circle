import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Box, Button, Stack, Text } from "@chakra-ui/react";
import { RechtsLinks } from "@/components/legal/RechtsFusszeile";
import { VERKAUF_REWRITE_HEADER, ladeVerkaufsSchalter } from "@/lib/verkauf/schalter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Capital Circle · Trading-Community & Plattform",
  description: "Die Aufnahme in Capital Circle läuft über ein persönliches Gespräch.",
};

/**
 * Hinweisseite bei geschlossenem Verkauf (`lib/verkauf/schalter.ts`).
 *
 * Besucher sehen sie unter der Adresse `/` — `proxy.ts` schreibt die Anfrage
 * hierher um. Texte und Ziel des Knopfs kommen aus `/admin/verkauf`.
 *
 * Ist der Verkauf offen, geht es zurück auf `/`. Ausnahmen: `?vorschau=1`, oder die Anfrage kam
 * über den Rewrite. Dann hat der Proxy (15 s Cache) noch „geschlossen" im
 * Kopf, und eine Weiterleitung auf `/` liefe im Kreis, bis sein Cache abläuft.
 */
export default async function GeschlossenPage({
  searchParams,
}: {
  searchParams: Promise<{ vorschau?: string }>;
}) {
  const schalter = await ladeVerkaufsSchalter();
  const ueberRewrite = (await headers()).get(VERKAUF_REWRITE_HEADER) === "geschlossen";
  // `?vorschau=1` (Link aus `/admin/verkauf`): die Seite auch bei offenem
  // Verkauf ansehen, bevor man schließt.
  const vorschau = (await searchParams).vorschau === "1";
  if (!schalter.geschlossen && !ueberRewrite && !vorschau) redirect("/");

  return (
    <Box
      position="relative"
      minH="100vh"
      display="flex"
      flexDirection="column"
      gap={6}
      alignItems="center"
      justifyContent="center"
      bg="var(--cc-bg)"
      color="var(--cc-text)"
      px={{ base: 4, md: 6 }}
      py={10}
      overflowX="clip"
    >
      {/* Graphitgrund mit Sternenfeld und Champagner-Licht (DESIGN.md v3.2) */}
      <Box className="cc-stars" aria-hidden />
      <Box className="cc-goldlight" aria-hidden />

      <Stack
        as="main"
        className="cc-card cc-card--hero cc-rise"
        zIndex={1}
        w="full"
        maxW="560px"
        p={{ base: 7, md: 11 }}
        gap={6}
        textAlign="center"
        align="center"
      >
        <Box as="img" src="/logo/cc-wortmarke-weiss.png" alt="Capital Circle" h={{ base: "18px", md: "21px" }} w="auto" />

        <Box
          as="h1"
          fontSize={{ base: "26px", md: "34px" }}
          fontWeight={600}
          lineHeight={1.18}
          letterSpacing="-0.01em"
          color="var(--cc-text)"
          style={{ textWrap: "balance" }}
        >
          {schalter.ueberschrift}
        </Box>

        <Box
          aria-hidden
          h="1px"
          w="min(200px, 100%)"
          bg="linear-gradient(90deg, transparent, rgba(232, 192, 148, 0.7), transparent)"
        />

        <Text fontSize="15px" lineHeight={1.65} color="var(--cc-text-2)" whiteSpace="pre-line">
          {schalter.nachricht}
        </Text>

        {/* Bares <a>: Das Ziel kann extern sein, und interne Ziele wie `/call`
            sollen nicht vorab vom Router geladen werden. */}
        <Button
          as="a"
          href={schalter.zielUrl}
          variant="gold"
          h={{ base: "52px", md: "56px" }}
          px={{ base: 7, md: 9 }}
          fontSize={{ base: "16px", md: "17px" }}
          letterSpacing="0.01em"
          w={{ base: "full", sm: "auto" }}
        >
          {schalter.zielLabel} →
        </Button>

        <Text fontSize="14px" color="var(--cc-text-3)">
          Bereits Mitglied?{" "}
          <Box as="a" href="/login" color="var(--cc-gold-light)" fontWeight={500} _hover={{ textDecoration: "underline" }}>
            Anmelden
          </Box>
        </Text>
      </Stack>

      <RechtsLinks position="relative" zIndex={1} maxW="560px" />
    </Box>
  );
}
