import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Box, Stack, Text } from "@chakra-ui/react";
import { FunnelHimmel } from "@/components/landing/FunnelHimmel";
import { GlassVideoPlayer } from "@/components/ui/GlassVideoPlayer";
import { vorbereitungsVideo } from "@/config/training";
import { buildManifestUrl } from "@/lib/cloudflare-stream";
import { leadAusSchluessel } from "@/lib/mailsystem/termine";
import { createServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = { title: "Vor deinem Gespräch · Capital Circle", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * `/termin/vorbereitung/<t|d>-<token>` — das Vorbereitungsvideo („Warum meine
 * Schüler nicht meine Trades kopieren", `vorbereitungsVideo`) für alle mit einer
 * Gesprächsanfrage, auch ohne Free-Bewerbung (Playbook: `appointment_video_5_url`,
 * Ziel von T02). Seit 17.11.2026 nicht mehr Teil des kostenlosen Kurses. Die Wiedergabe-Adresse ist signiert und
 * gilt vier Stunden; die Seite holt bei jedem Aufruf eine frische.
 */
export default async function TerminVorbereitungPage({ params }: { params: Promise<{ schluessel: string }> }) {
  const { schluessel } = await params;
  const service = createServiceClient();
  const lead = await leadAusSchluessel(service, schluessel);
  if (!lead) notFound();

  let src: string | null = null;
  if (vorbereitungsVideo.uid) {
    try {
      src = buildManifestUrl(vorbereitungsVideo.uid, { signed: true, ttlSeconds: 4 * 60 * 60 });
    } catch (err) {
      console.error("[termin/vorbereitung] Signatur fehlgeschlagen:", err);
    }
  }
  const titel = vorbereitungsVideo.titel;
  const vorname = (lead.name ?? "").trim().split(/\s+/)[0];

  return (
    <FunnelHimmel>
      <Box maxW="960px" mx="auto" px={5} py={{ base: 10, md: 16 }}>
        <Stack spacing={3} textAlign="center" mb={8}>
          <Text fontSize="12px" letterSpacing="0.18em" textTransform="uppercase" color="var(--cc-gold-light)" fontWeight={600}>
            Vor deinem Analysegespräch
          </Text>
          <Text as="h1" fontSize={{ base: "26px", md: "32px" }} fontWeight={600} color="var(--cc-text)">
            {titel}
          </Text>
          <Text fontSize="15px" color="var(--cc-text-2)" maxW="620px" mx="auto">
            {vorname ? `${vorname}, schau` : "Schau"} dir das Video mit einer Frage im Kopf an: Was möchtest du an deinem eigenen
            Trading verändern — und wobei würdest du dir persönliche Rückmeldung wünschen?
          </Text>
        </Stack>
        {src ? (
          <Box className="cc-card cc-card--hero" overflow="hidden" p={0}>
            <GlassVideoPlayer src={src} />
          </Box>
        ) : (
          <Text textAlign="center" color="var(--cc-text-2)">
            Das Video ist gerade nicht verfügbar. Bitte versuch es später noch einmal.
          </Text>
        )}
      </Box>
    </FunnelHimmel>
  );
}
