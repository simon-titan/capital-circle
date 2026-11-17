import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { ShieldCheck, TriangleAlert } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { RechtsLinks } from "@/components/legal/RechtsFusszeile";
import { garantie } from "@/config/mentoring";

/*
  Solange die Bedingungen nicht freigegeben sind, gehört die Seite in keinen
  Suchindex — auch nicht als Vorschau. Danach darf sie gefunden werden: Wer mit
  einer Garantie wirbt, muss ihre Bedingungen leicht zugänglich machen.
*/
export const metadata: Metadata = {
  title: `${garantie.titel} · Capital Circle`,
  description: garantie.kurz,
  ...(garantie.freigegeben ? {} : { robots: { index: false, follow: false } }),
};

/**
 * Garantiebedingungen (`/garantie`), Inhalt aus `garantie` in `config/mentoring.ts`.
 *
 * **Antwortet mit 404, solange `garantie.freigegeben` false ist** — die
 * Bedingungen sind ein Entwurf, den Emre noch abnehmen muss. Mit `?vorschau=1`
 * ist der Entwurf trotzdem sichtbar, unter einem Banner, das ihn als solchen
 * kennzeichnet, damit Simon und Emre ihn auf dem echten Layout lesen können.
 * Verlinkt wird die Vorschau nirgends; Funnel und Kassenseite zeigen den
 * Garantiesatz erst nach der Freigabe.
 *
 * Öffentlich laut `PUBLIC_PREFIXES` in `proxy.ts`.
 */
export default async function GarantiePage({
  searchParams,
}: {
  searchParams: Promise<{ vorschau?: string | string[] }>;
}) {
  const { vorschau } = await searchParams;
  const istVorschau = (Array.isArray(vorschau) ? vorschau[0] : vorschau) === "1";
  const entwurf = !garantie.freigegeben;
  if (entwurf && !istVorschau) notFound();

  return (
    <Box position="relative" minH="100vh" w="full" bg="var(--cc-bg)" color="var(--cc-text)" overflowX="clip">
      <Box className="cc-stars" aria-hidden />
      <Box className="cc-goldlight" aria-hidden />

      <Flex position="relative" zIndex={1} justify="center" px={4} pt={{ base: 10, md: 16 }} pb={10}>
        <Stack spacing={{ base: 8, md: 10 }} w="full" maxW="720px">
          <Flex justify="center" className="cc-rise">
            <Box as="a" href="/" maxW="170px" aria-label="Capital Circle, zur Startseite">
              <Logo variant="onDark" />
            </Box>
          </Flex>

          {entwurf ? (
            <Flex
              role="note"
              gap={3}
              align="flex-start"
              px={4}
              py={3.5}
              bg="var(--cc-gold-wash)"
              border="1px solid rgba(212, 176, 128, 0.45)"
              borderRadius="10px"
              color="var(--cc-text)"
              fontSize="14px"
              lineHeight={1.55}
            >
              <Box color="var(--cc-gold-light)" mt="1px" flexShrink={0}>
                <TriangleAlert size={18} strokeWidth={1.75} />
              </Box>
              <Text>
                <Box as="strong" fontWeight={600}>
                  Entwurf – nicht veröffentlicht, wartet auf Freigabe durch Emre.
                </Box>{" "}
                Diese Seite ist ohne <code>?vorschau=1</code> nicht erreichbar, und weder Funnel noch Kassenseite
                verweisen auf sie. Die Bedingungen sind nicht anwaltlich geprüft.
              </Text>
            </Flex>
          ) : null}

          <Stack spacing={4} align="center" textAlign="center" className="cc-rise">
            <Flex
              w="52px"
              h="52px"
              align="center"
              justify="center"
              borderRadius="full"
              bg="var(--cc-gold-wash)"
              border="1px solid rgba(212, 176, 128, 0.32)"
              color="var(--cc-gold-light)"
              aria-hidden
            >
              <ShieldCheck size={24} strokeWidth={1.75} />
            </Flex>
            <Box as="h1" fontSize={{ base: "30px", md: "40px" }} fontWeight={600} lineHeight={1.12} letterSpacing="-0.01em">
              {garantie.titel}
            </Box>
            <Text fontSize={{ base: "16px", md: "18px" }} color="var(--cc-text-2)" lineHeight={1.6} maxW="60ch">
              {garantie.einleitung}
            </Text>
          </Stack>

          <Box className="cc-card cc-card--still cc-rise" p={{ base: 5, md: 7 }}>
            <Text
              as="h2"
              fontSize="13px"
              lineHeight="18px"
              fontWeight={500}
              letterSpacing="0.12em"
              textTransform="uppercase"
              color="var(--cc-text-soft)"
              mb={5}
            >
              Bedingungen
            </Text>
            <Stack as="ol" listStyleType="none" spacing={4}>
              {garantie.bedingungen.map((b, i) => (
                <Flex as="li" key={b} gap={4} align="flex-start">
                  <Flex
                    w="28px"
                    h="28px"
                    flexShrink={0}
                    align="center"
                    justify="center"
                    borderRadius="full"
                    border="1px solid var(--cc-line-strong)"
                    bg="rgba(255, 255, 255, 0.02)"
                    fontSize="13px"
                    fontWeight={600}
                    className="cc-num"
                    color="var(--cc-gold-light)"
                    aria-hidden
                  >
                    {i + 1}
                  </Flex>
                  <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text)" pt="3px">
                    {b}
                  </Text>
                </Flex>
              ))}
            </Stack>
          </Box>

          <Box className="cc-card cc-card--still cc-rise" p={{ base: 5, md: 7 }}>
            <Text
              as="h2"
              fontSize="13px"
              lineHeight="18px"
              fontWeight={500}
              letterSpacing="0.12em"
              textTransform="uppercase"
              color="var(--cc-text-soft)"
              mb={3}
            >
              Ablauf
            </Text>
            <Text fontSize="15px" lineHeight={1.65} color="var(--cc-text)">
              {garantie.ablauf}
            </Text>
          </Box>

          <Stack spacing={4} pt={2} align="center" textAlign="center">
            <Text fontSize="13px" color="var(--cc-text-3)" maxW="600px" lineHeight={1.7}>
              {garantie.hinweis}
            </Text>
            <RechtsLinks />
          </Stack>
        </Stack>
      </Flex>
    </Box>
  );
}
