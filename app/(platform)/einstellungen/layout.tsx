import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Box, Flex, Stack } from "@chakra-ui/react";
import { PageHeader } from "@/components/journal/PageHeader";
import { SettingsNav } from "@/components/billing/SettingsNav";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Einstellungen · Capital Circle",
};

export const dynamic = "force-dynamic";

/**
 * Konto-Bereich: Profil, Abonnement, Zahlungsmethode und Rechnungen unter einem
 * Dach. Vorher lagen Profil (`/settings`) und Abrechnung (`/billing`) an zwei
 * Adressen, von denen die zweite nirgends verlinkt war.
 *
 * Der Login-Check steht hier im Layout und nicht in jeder Unterseite: Alle vier
 * Seiten zeigen Kontodaten, keine davon darf einem Gast antworten.
 */
export default async function EinstellungenLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?next=/einstellungen/profil");

  return (
    <Box maxW="1080px" mx="auto" w="full">
      <PageHeader title="Einstellungen" />

      <Flex direction={{ base: "column", lg: "row" }} gap={{ base: 4, lg: 6 }} align="flex-start">
        <SettingsNav />
        <Stack flex="1" minW={0} spacing={5} w="full">
          {children}
        </Stack>
      </Flex>
    </Box>
  );
}
