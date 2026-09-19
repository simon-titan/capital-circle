import type { Metadata } from "next";
import Link from "next/link";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { ArrowLeft } from "lucide-react";
import { WiderrufsFormular, type Vorbelegung } from "@/components/widerruf/WiderrufsFormular";
import { rechtsPfade } from "@/config/legal";
import { ladeAboKontext } from "@/lib/stripe/abo-kontext";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { BESCHRIFTUNG, BETREIBER_EMAIL } from "@/lib/widerruf/shared";
import { vertraegeAus, vertragsBezeichnung } from "@/lib/widerruf/verarbeiten";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vertrag widerrufen — Capital Circle",
  description:
    "Hier widerrufst du deinen Vertrag mit Capital Circle — ohne Anmeldung und ohne Angabe von Gründen. Du erhältst sofort eine Eingangsbestätigung mit Datum und Uhrzeit.",
};

/**
 * Elektronische Widerrufsfunktion nach § 356a BGB (`/widerrufen`).
 *
 * Erreichbar ohne Anmeldung über „Vertrag widerrufen" in der Fußzeile (Link
 * aus `widerrufsfunktionPfad` in `config/legal.ts`) und aus der
 * Widerrufsbelehrung; `proxy.ts` führt die Adresse unter den öffentlichen
 * Rechtspfaden und nimmt sie vom Wartungsmodus aus — die Funktion muss
 * während der Widerrufsfrist „ständig verfügbar" sein (§ 356a Abs. 1 Satz 3).
 *
 * Nicht verwechseln mit `/widerruf` (Widerrufsbelehrung, Text) und
 * `/kuendigen` (Kündigungsbutton, § 312k BGB).
 *
 * Ist jemand eingeloggt, sind Name und E-Mail vorbelegt und der neueste
 * Vertrag wird genannt — der Verbraucher „bestätigt" die Angaben dann nur
 * noch (Abs. 2). Mehr nicht: keine Halte-Angebote, keine Umwege.
 */
export default async function WiderrufenPage() {
  const vorbelegung = await ladeVorbelegung();

  return (
    <Box
      position="relative"
      minH="100vh"
      bg="var(--cc-bg)"
      color="var(--cc-text)"
      px={{ base: 4, md: 8 }}
      py={{ base: 10, md: 16 }}
      overflowX="clip"
      sx={{
        "@media print": {
          background: "#fff !important",
          padding: "0 !important",
          minHeight: "0 !important",
          "& .cc-stars, & .cc-goldlight, & [data-druck='aus']": { display: "none !important" },
        },
      }}
    >
      <Box className="cc-stars" aria-hidden />
      <Box className="cc-goldlight" aria-hidden />

      <Stack position="relative" zIndex={1} maxW="760px" mx="auto" gap={{ base: 8, md: 10 }}>
        <Stack gap={4} className="cc-rise" data-druck="aus">
          {/* `Link` außen herum statt als `as`-Prop: Server-Komponente (siehe `app/kuendigen/page.tsx`). */}
          <Link href={vorbelegung ? "/dashboard" : "/"} style={{ width: "fit-content" }}>
            <Flex
              align="center"
              gap={2}
              fontSize="14px"
              color="var(--cc-text-2)"
              transition="color 180ms var(--cc-ease)"
              _hover={{ color: "var(--cc-text)" }}
            >
              <ArrowLeft size={16} strokeWidth={1.75} />
              {vorbelegung ? "Zurück zur Plattform" : "Zurück zur Startseite"}
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
              Widerruf
            </Text>
            <Box
              as="h1"
              fontSize={{ base: "30px", md: "40px" }}
              lineHeight={1.12}
              fontWeight={600}
              letterSpacing="-0.01em"
            >
              {BESCHRIFTUNG.funktion}
            </Box>
            <Text fontSize={{ base: "15px", md: "17px" }} lineHeight={1.6} color="var(--cc-text-2)" maxW="620px">
              Hier widerrufst du deinen Vertrag mit Capital Circle — ohne Anmeldung und ohne Angabe von Gründen. Nach
              dem Klick auf „{BESCHRIFTUNG.bestaetigen}“ bekommst du sofort eine Eingangsbestätigung mit Datum und
              Uhrzeit, auf dieser Seite und per E-Mail.
            </Text>
          </Stack>
        </Stack>

        <WiderrufsFormular vorbelegung={vorbelegung} />

        <Stack gap={2} data-druck="aus">
          <Text fontSize="13px" lineHeight={1.6} color="var(--cc-text-3)">
            Frist und Folgen des Widerrufs stehen in der{" "}
            <Link href={rechtsPfade.widerruf} style={{ color: "var(--cc-text-2)", textDecoration: "underline" }}>
              Widerrufsbelehrung
            </Link>
            . Du willst nicht widerrufen, sondern zum Ende der Laufzeit kündigen? Das geht über{" "}
            <Link href={rechtsPfade.kuendigen} style={{ color: "var(--cc-text-2)", textDecoration: "underline" }}>
              „Verträge hier kündigen“
            </Link>
            .
          </Text>
          <Text fontSize="13px" lineHeight={1.6} color="var(--cc-text-3)">
            Fragen zum Widerruf? Schreib uns an{" "}
            <Box as="span" color="var(--cc-text-2)">
              {BETREIBER_EMAIL}
            </Box>
            .
          </Text>
        </Stack>
      </Stack>
    </Box>
  );
}

/**
 * Vorbelegung für Eingeloggte. Fällt still auf `null` zurück — die Seite muss
 * auch dann funktionieren, wenn Sitzung, Profil oder Vertrag nicht lesbar sind.
 */
async function ladeVorbelegung(): Promise<Vorbelegung | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user?.email) return null;

    const { data: profil } = await createServiceClient()
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const kontext = await ladeAboKontext(user.id);
    const neuester = kontext ? (vertraegeAus(kontext)[0] ?? null) : null;

    return {
      name: ((profil as { full_name?: string | null } | null)?.full_name ?? "").trim(),
      email: user.email,
      vertrag: neuester ? vertragsBezeichnung(neuester) : null,
    };
  } catch (err) {
    console.error("[widerrufen] Vorbelegung nicht ladbar:", err);
    return null;
  }
}
