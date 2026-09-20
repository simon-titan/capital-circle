import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { ArrowLeft } from "lucide-react";
import { KontaktFormular } from "@/components/kontakt/KontaktFormular";
import { RechtsLinks } from "@/components/legal/RechtsFusszeile";
import { rechtsPfade } from "@/config/legal";
import { KONTAKT_EMAIL } from "@/lib/support/kontakt-shared";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kontakt · Capital Circle",
  description:
    "Schreib uns, auch wenn du dich nicht anmelden kannst. Wir antworten dir per E-Mail, ein Konto brauchst du dafür nicht.",
};

/**
 * Kontakt ohne Anmeldung (`/kontakt`).
 *
 * Verlinkt in der Fußzeile der Verkaufsseite und überall, wo `RechtsLinks`
 * steht, auch unter dem Login. Wer Zugang zur Plattform hat, wird zum
 * Ticketbereich `/support` geschickt, damit es ein System bleibt und der
 * Verlauf im Konto liegt. Alle anderen bekommen dieses Formular; ihr Ticket
 * landet in denselben Tabellen und in `/admin/tickets`.
 *
 * Öffentlich: `proxy.ts` führt die Adresse unter den offenen Pfaden und nimmt
 * sie vom Wartungsmodus aus, denn wer sich nicht anmelden kann, findet sonst
 * nicht einmal den Weg zu uns.
 */
export default async function KontaktPage() {
  let angemeldet = false;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    angemeldet = Boolean(data.user);
  } catch {
    // Kaputter Cookie oder nicht lesbare Sitzung: als Gast weiter.
  }
  if (angemeldet) redirect("/support");

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

      <Stack position="relative" zIndex={1} maxW="760px" mx="auto" gap={{ base: 8, md: 10 }}>
        <Stack gap={4} className="cc-rise">
          {/* `Link` außen herum statt als `as`-Prop: Server-Komponente. */}
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
              Kontakt
            </Text>
            <Box
              as="h1"
              fontSize={{ base: "30px", md: "40px" }}
              lineHeight={1.12}
              fontWeight={600}
              letterSpacing="-0.01em"
            >
              Schreib uns.
            </Box>
            <Text fontSize={{ base: "15px", md: "17px" }} lineHeight={1.6} color="var(--cc-text-2)" maxW="620px">
              Du kannst dich nicht anmelden, hast dein Passwort verloren oder eine Frage vor dem Beitritt? Hier
              erreichst du uns ohne Konto. Wir antworten dir per E-Mail.
            </Text>
          </Stack>
        </Stack>

        <KontaktFormular />

        <Stack gap={2}>
          <Text fontSize="13px" lineHeight={1.6} color="var(--cc-text-3)">
            Du hast bereits ein Konto? Dann{" "}
            <Link href="/einsteig" style={{ color: "var(--cc-text-2)", textDecoration: "underline" }}>
              melde dich an
            </Link>{" "}
            und schreib uns unter Support. Passwort vergessen? Das setzt du{" "}
            <Link href="/passwort-vergessen" style={{ color: "var(--cc-text-2)", textDecoration: "underline" }}>
              hier zurück
            </Link>
            .
          </Text>
          <Text fontSize="13px" lineHeight={1.6} color="var(--cc-text-3)">
            Du erreichst uns auch direkt unter{" "}
            <Box as="span" color="var(--cc-text-2)">
              {KONTAKT_EMAIL}
            </Box>
            . Wie wir mit deinen Angaben umgehen, steht in der{" "}
            <Link href={rechtsPfade.datenschutz} style={{ color: "var(--cc-text-2)", textDecoration: "underline" }}>
              Datenschutzerklärung
            </Link>
            .
          </Text>
        </Stack>

        <RechtsLinks maxW="720px" mx="auto" />
      </Stack>
    </Box>
  );
}
