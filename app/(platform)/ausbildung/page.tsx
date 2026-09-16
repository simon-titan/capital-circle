import { Box, Text } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/journal/PageHeader";
import { InstitutAccordion } from "@/components/platform/InstitutAccordion";
import { createClient } from "@/lib/supabase/server";
import { getAcademyModulesOverview } from "@/lib/server-data";

export default async function AusbildungPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/einsteig");

  const [modules, { data: profile }] = await Promise.all([
    getAcademyModulesOverview(auth.user.id),
    supabase.from("profiles").select("is_paid").eq("id", auth.user.id).maybeSingle(),
  ]);
  const isPaid = Boolean(profile?.is_paid);

  return (
    <Box>
      <PageHeader
        title="Institut"
        subtitle="Deine Module und Lernvideos — ein Modul anklicken zeigt die Untermodule darin. Starte dort, wo du stehengeblieben bist, oder arbeite die Reihenfolge ab."
      />
      {modules.length === 0 ? (
        <Box className="cc-card cc-card--still cc-rise" px={{ base: 5, md: 6 }} py={{ base: 5, md: 6 }}>
          <Text fontSize="15px" lineHeight={1.5} color="var(--cc-text-2)">
            Noch keine veröffentlichten Module.
          </Text>
        </Box>
      ) : (
        <InstitutAccordion modules={modules} isPaid={isPaid} />
      )}
    </Box>
  );
}
