import type { Metadata } from "next";
import Link from "next/link";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { ArrowLeft } from "lucide-react";
import { formatDate, istAbo, TIER_LABEL, type Tier } from "@/components/billing/format";
import { KuendigungsFormular, type Vorbelegung } from "@/components/kuendigung/KuendigungsFormular";
import { BETREIBER_EMAIL } from "@/lib/kuendigung/shared";
import { ladeAboKontext } from "@/lib/stripe/abo-kontext";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verträge kündigen — Capital Circle",
  description:
    "Hier kündigst du deine Capital-Circle-Mitgliedschaft — ohne Anmeldung. Du erhältst sofort eine Bestätigung mit Datum und Uhrzeit des Eingangs.",
};

/**
 * Kündigungsbutton nach § 312k BGB (`/kuendigen`).
 *
 * Erreichbar ohne Anmeldung über den Link „Verträge hier kündigen" in der
 * Fußzeile; `proxy.ts` führt die Adresse unter `PUBLIC_PATHS` und nimmt sie
 * vom Wartungsmodus aus. Die Seite ist die „Bestätigungsseite" im Sinne des
 * Gesetzes, der Knopf „Jetzt kündigen" gibt die Erklärung ab
 * (`/api/kuendigung`).
 *
 * Ist jemand eingeloggt, sind Name und E-Mail vorbelegt und der Vertrag wird
 * genannt — mehr nicht. Keine Halte-Angebote, keine Umwege: Die gibt es nur im
 * Komfortweg unter `/einstellungen/abonnement`.
 */
export default async function KuendigenPage() {
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
          {/* `Link` außen herum statt als `as`-Prop: Die Seite ist eine
              Server-Komponente, eine Komponente als Prop wäre eine Funktion
              über die Server-Grenze (siehe `app/ergebnisse/page.tsx`). */}
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
              Kündigung
            </Text>
            <Box
              as="h1"
              fontSize={{ base: "30px", md: "40px" }}
              lineHeight={1.12}
              fontWeight={600}
              letterSpacing="-0.01em"
            >
              Mitgliedschaft kündigen
            </Box>
            <Text fontSize={{ base: "15px", md: "17px" }} lineHeight={1.6} color="var(--cc-text-2)" maxW="620px">
              Hier kündigst du deinen Vertrag mit Capital Circle — ohne Anmeldung. Nach dem Klick auf „Jetzt
              kündigen“ bekommst du sofort eine Bestätigung mit Datum und Uhrzeit des Eingangs, auf dieser Seite
              und per E-Mail.
            </Text>
          </Stack>
        </Stack>

        <KuendigungsFormular vorbelegung={vorbelegung} />

        <Text fontSize="13px" lineHeight={1.6} color="var(--cc-text-3)" data-druck="aus">
          Fragen zur Kündigung? Schreib uns an{" "}
          <Box as="span" color="var(--cc-text-2)">
            {BETREIBER_EMAIL}
          </Box>
          .
        </Text>
      </Stack>
    </Box>
  );
}

/**
 * Vorbelegung für Eingeloggte. Fällt still auf `null` zurück — die Seite muss
 * auch dann funktionieren, wenn Sitzung, Profil oder Abo nicht lesbar sind.
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
    const tier = (kontext?.tier ?? "free") as Tier;

    let vertrag: Vorbelegung["vertrag"] = null;
    if (tier !== "free") {
      const bezeichnung = istAbo(tier) ? `Mitgliedschaft · ${TIER_LABEL[tier]}` : (TIER_LABEL[tier] ?? tier);
      const abo = kontext?.abo ?? null;
      const ende = abo ? formatDate(abo.currentPeriodEnd) : null;
      vertrag = {
        bezeichnung,
        hinweis:
          abo && istAbo(tier)
            ? abo.cancelAtPeriodEnd
              ? `Bereits gekündigt zum ${ende}.`
              : `Laufende Abrechnungsperiode bis ${ende}.`
            : "Ohne wiederkehrende Abbuchung über Stripe — wir bearbeiten die Kündigung von Hand.",
      };
    }

    return {
      name: ((profil as { full_name?: string | null } | null)?.full_name ?? "").trim(),
      email: user.email,
      vertrag,
    };
  } catch (err) {
    console.error("[kuendigen] Vorbelegung nicht ladbar:", err);
    return null;
  }
}
