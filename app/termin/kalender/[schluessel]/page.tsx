import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Box, Stack, Text } from "@chakra-ui/react";
import { FunnelHimmel } from "@/components/landing/FunnelHimmel";
import { CalendlyZweiKlick } from "@/components/marketing/CalendlyZweiKlick";
import { TEAM_POSTFACH } from "@/config/team";
import { calendlyUrlFuer, leadAusSchluessel } from "@/lib/mailsystem/termine";
import { createServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = { title: "Gesprächstermin wählen · Capital Circle", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * `/termin/kalender/<t|d>-<token>` — der Kalender zu einer **vorhandenen**
 * Gesprächsanfrage (Playbook: `qualified_calendar_url`). Ziel der Knöpfe in
 * B01, B03, R02, R03, N01, N02: keine neue Bewerbung, nur der Termin. Der
 * Token geht als `utm_content` an Calendly, der Webhook ordnet die Buchung zu.
 *
 * Nach dem zweiten bestätigten No-Show im selben Vorgang gibt es keinen
 * automatischen Kalender mehr (Playbook Regel 14) — dann der Weg zum Team.
 */
export default async function TerminKalenderPage({ params }: { params: Promise<{ schluessel: string }> }) {
  const { schluessel } = await params;
  const service = createServiceClient();
  const lead = await leadAusSchluessel(service, schluessel);
  if (!lead) notFound();

  const { data: noShows } = await service
    .from("termine")
    .select("id")
    .eq("vorgang", `${lead.art}:${lead.id}`)
    .not("no_show_am", "is", null);
  const gesperrt = (noShows ?? []).length >= 2;
  // Schon ein künftiger Termin? Dann verwalten statt parallel neu buchen.
  const { data: offen } = await service
    .from("termine")
    .select("start_am, umbuchen_url")
    .eq("vorgang", `${lead.art}:${lead.id}`)
    .eq("status", "gebucht")
    .gte("start_am", new Date().toISOString())
    .order("start_am", { ascending: true })
    .limit(1)
    .maybeSingle();
  const kommend = offen as { start_am: string; umbuchen_url: string | null } | null;

  return (
    <FunnelHimmel>
      <Box maxW="920px" mx="auto" px={5} py={{ base: 10, md: 16 }}>
        <Stack spacing={3} textAlign="center" mb={8}>
          <Text fontSize="12px" letterSpacing="0.18em" textTransform="uppercase" color="var(--cc-gold-light)" fontWeight={600}>
            Analysegespräch
          </Text>
          <Text as="h1" fontSize={{ base: "26px", md: "32px" }} fontWeight={600} color="var(--cc-text)">
            {gesperrt ? "Lass uns kurz persönlich klären, wie es weitergeht." : "Wähle deinen Gesprächstermin."}
          </Text>
          <Text fontSize="15px" color="var(--cc-text-2)" maxW="560px" mx="auto">
            {gesperrt
              ? `Antworte einfach auf unsere letzte E-Mail oder schreib an ${TEAM_POSTFACH} — wir finden gemeinsam einen Termin.`
              : "Deine Angaben liegen uns vor, du musst nichts erneut ausfüllen. Nimm ein Zeitfenster, das du dir wirklich freihalten kannst."}
          </Text>
        </Stack>
        {gesperrt ? null : kommend ? (
          <Stack className="cc-card" p={6} spacing={3} align="center" textAlign="center">
            <Text color="var(--cc-text)">
              Du hast schon einen Termin am{" "}
              {new Date(kommend.start_am).toLocaleString("de-DE", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Berlin" })} Uhr.
            </Text>
            {kommend.umbuchen_url ? (
              <Text as="a" href={kommend.umbuchen_url} color="var(--cc-gold-light)" textDecoration="underline">
                Termin verschieben oder absagen
              </Text>
            ) : null}
          </Stack>
        ) : (
          <Box className="cc-card" overflow="hidden">
            <CalendlyZweiKlick url={calendlyUrlFuer(lead)} />
          </Box>
        )}
      </Box>
    </FunnelHimmel>
  );
}
