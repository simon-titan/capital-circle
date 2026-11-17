import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Box, Stack, Text } from "@chakra-ui/react";
import { CrmRahmen } from "@/components/crm/CrmRahmen";
import { ladeCrmNutzer } from "@/lib/crm/zugang";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "CRM · Capital Circle", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * `/crm` — Arbeitsbereich der Closer (Migration 112). Eigener Bereich ohne
 * Adminrechte: Zugang haben Admins und aktive Mitglieder von `crm_team`
 * (eingetragen unter `/crm/team`). Alle sehen alle Kontakte, gefiltert wird
 * in den Ansichten.
 */
export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const nutzer = await ladeCrmNutzer();
  if (!nutzer) {
    const { data } = await (await createClient()).auth.getUser();
    if (!data.user) redirect("/login?next=/crm");
    return (
      <Box minH="100vh" bg="var(--cc-bg)" display="flex" alignItems="center" justifyContent="center" px={5}>
        <Stack className="cc-card" p={8} maxW="460px" spacing={3} textAlign="center">
          <Text fontSize="20px" fontWeight={600} color="var(--cc-text)">
            Kein Zugang zum CRM
          </Text>
          <Text fontSize="14px" color="var(--cc-text-2)">
            Dein Konto ist nicht im Vertriebsteam eingetragen. Ein Admin kann dich unter /crm/team hinzufügen.
          </Text>
        </Stack>
      </Box>
    );
  }
  return (
    <CrmRahmen ichId={nutzer.team?.user_id ?? null} istAdmin={nutzer.istAdmin} name={nutzer.team?.name ?? nutzer.user.email ?? ""}>
      {children}
    </CrmRahmen>
  );
}
