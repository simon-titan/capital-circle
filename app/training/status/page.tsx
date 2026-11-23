import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Box, Stack, Text } from "@chakra-ui/react";
import { FunnelHimmel } from "@/components/landing/FunnelHimmel";
import { AbmeldenKnopf } from "@/components/landing/training/AbmeldenKnopf";
import { TRAINING_VIDEOS_PFAD, bewerbungStatus } from "@/config/training";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { bewerbungEingegangen } from "@/lib/training/bewerbung";
import { ladeTrainingFreigabe } from "@/lib/training/zugang";

export const metadata: Metadata = { title: "Deine Bewerbung · Capital Circle", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * `/training/status` — Stand der Free-Kurs-Bewerbung (E-Mail-Playbook 1.0).
 *
 * Hierher führt der Bestätigungslink aus der Bewerbung, und hierher schickt
 * `proxy.ts` Free-Konten mit offener oder abgelehnter Bewerbung: Bis Emre
 * entschieden hat, gibt es keinen Lernzugang (Playbook: „Kein Lernzugang durch
 * bloßes Absenden"). Angenommene und alle mit Zugang gehen weiter zum Training.
 *
 * Ohne Navigation, im Look der Landingpage — es gibt hier nichts zu tun außer
 * zu warten. Abgelehnt heißt endgültig (A03), deshalb auch kein neuer Anlauf.
 */
export default async function TrainingStatusPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const service = createServiceClient();
  let freigabe = await ladeTrainingFreigabe(service, user.id);

  // Offene Bewerbung, die noch nicht bei Emre eingegangen ist (Altbestand) — nachholen.
  if (freigabe.art === "bewerbung" && freigabe.bewerbung.status === "offen" && !freigabe.bewerbung.adresse_bestaetigt_am) {
    await bewerbungEingegangen(service, user.id);
    freigabe = await ladeTrainingFreigabe(service, user.id);
  }

  if (freigabe.art !== "bewerbung" || freigabe.bewerbung.status === "angenommen") redirect(TRAINING_VIDEOS_PFAD);

  const b = freigabe.bewerbung;
  const text = b.status === "abgelehnt" ? bewerbungStatus.abgelehnt : bewerbungStatus.offen;

  return (
    <FunnelHimmel>
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" px={5} py={16}>
        <Stack className="cc-card cc-card--hero" maxW="560px" w="full" p={{ base: 6, md: 10 }} spacing={5} textAlign="center" align="center">
          <Text fontSize="12px" letterSpacing="0.18em" textTransform="uppercase" color="var(--cc-gold-light)" fontWeight={600}>
            Bewerbung · Capital Circle
          </Text>
          <Text as="h1" fontSize={{ base: "24px", md: "30px" }} fontWeight={600} lineHeight={1.25} color="var(--cc-text)">
            {text.titel}
          </Text>
          <Text fontSize="15px" lineHeight={1.7} color="var(--cc-text-2)">
            {text.text}
          </Text>
          <AbmeldenKnopf>{bewerbungStatus.abmelden}</AbmeldenKnopf>
        </Stack>
      </Box>
    </FunnelHimmel>
  );
}
