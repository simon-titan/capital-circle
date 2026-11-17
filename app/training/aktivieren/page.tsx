import type { Metadata } from "next";
import { Box, Stack, Text } from "@chakra-ui/react";
import { FunnelHimmel } from "@/components/landing/FunnelHimmel";
import { AktivierenKnopf } from "@/components/landing/training/AktivierenKnopf";
import { verifyReaktivierungToken } from "@/lib/email/unsubscribe-token";
import { createServiceClient } from "@/lib/supabase/service";
import { pruefeReaktivierung, type ReaktivierungStand } from "@/lib/training/reaktivierung";
import { vornameAus } from "@/lib/training/zugang";

export const metadata: Metadata = { title: "Kostenlosen Zugang aktivieren · Capital Circle", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * `/training/aktivieren?t=…` — Ziel der Retargeting-Mail RT01 (15.11.2026).
 *
 * Bewusst eine Seite mit Knopf statt Freischaltung beim Aufruf: Mailprogramme
 * und Virenscanner rufen Links vorab auf, und die 30 Tage sollen erst mit dem
 * echten Klick beginnen. Öffentlich (`proxy.ts`, PUBLIC_PATHS), weil die
 * meisten Empfänger nicht angemeldet sind; der Knopf meldet sie per Link an.
 */
export default async function TrainingAktivierenPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const token = typeof t === "string" ? t : "";
  const geprueft = token ? verifyReaktivierungToken(token) : null;

  let stand: ReaktivierungStand | null = null;
  let vorname = "";
  if (geprueft) {
    const service = createServiceClient();
    stand = await pruefeReaktivierung(service, geprueft.userId);
    const { data } = await service.from("profiles").select("full_name").eq("id", geprueft.userId).maybeSingle();
    vorname = vornameAus((data as { full_name?: string | null } | null)?.full_name ?? null);
  }

  const inhalt = ((): { dach: string; titel: string; text: string; knopf: string | null } => {
    if (!geprueft || !stand) {
      return {
        dach: "Link ungültig",
        titel: "Dieser Link funktioniert leider nicht.",
        text: "Bitte öffne den Link direkt aus der E-Mail. Hast du schon ein Konto, kannst du dich auch einfach anmelden.",
        knopf: null,
      };
    }
    switch (stand.art) {
      case "bezahlt":
      case "aktiv":
        return {
          dach: "Kostenloser Kurs",
          titel: "Dein Zugang ist bereits freigeschaltet.",
          text: "Du kannst direkt weitermachen.",
          knopf: "Zum Kurs",
        };
      case "abgelehnt":
        return {
          dach: "Kostenloser Kurs",
          titel: "Für dieses Konto ist kein kostenloser Zugang möglich.",
          text: "Bei Fragen antworte einfach auf die E-Mail, mein Team meldet sich.",
          knopf: null,
        };
      case "abgelaufen":
        return {
          dach: "Kostenloser Kurs",
          titel: "Dein kostenloser Zugang ist bereits abgelaufen.",
          text: "Der Link schaltet den Kurs einmal frei. Bei Fragen antworte einfach auf die E-Mail, mein Team meldet sich.",
          knopf: null,
        };
      default:
        return {
          dach: "Kostenloser Kurs · Capital Circle",
          titel: vorname ? `${vorname}, dein Zugang ist vorbereitet.` : "Dein Zugang ist vorbereitet.",
          text: "Mit einem Klick schaltest du die überarbeitete Ausbildung für 30 Tage frei, vollständig kostenlos. Den Trading Blueprint bekommst du dazu.",
          knopf: "Zugang jetzt aktivieren",
        };
    }
  })();

  return (
    <FunnelHimmel>
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" px={5} py={16}>
        <Stack className="cc-card cc-card--hero" maxW="560px" w="full" p={{ base: 6, md: 10 }} spacing={5} textAlign="center" align="center">
          <Text fontSize="12px" letterSpacing="0.18em" textTransform="uppercase" color="var(--cc-gold-light)" fontWeight={600}>
            {inhalt.dach}
          </Text>
          <Text as="h1" fontSize={{ base: "24px", md: "30px" }} fontWeight={600} lineHeight={1.25} color="var(--cc-text)">
            {inhalt.titel}
          </Text>
          <Text fontSize="15px" lineHeight={1.7} color="var(--cc-text-2)">
            {inhalt.text}
          </Text>
          {inhalt.knopf ? <AktivierenKnopf token={token}>{inhalt.knopf}</AktivierenKnopf> : null}
        </Stack>
      </Box>
    </FunnelHimmel>
  );
}
