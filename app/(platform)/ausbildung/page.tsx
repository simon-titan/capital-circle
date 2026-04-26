import { Grid, GridItem, Heading, Text } from "@chakra-ui/react";
import { redirect } from "next/navigation";
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
    <Grid gap={{ base: 6, md: 8 }}>
      <GridItem>
        <Heading as="h1" size="xl" className="inter-bold" fontWeight={700} mb={2}>
          Institut
        </Heading>
        <Text className="inter" color="var(--color-text-muted)" fontSize="sm" maxW="640px">
          Deine Module und Lernvideos — starte dort, wo du stehengeblieben bist, oder arbeite die Reihenfolge
          ab.
        </Text>
      </GridItem>
      <GridItem>
        {modules.length === 0 ? (
          <Text className="inter" color="var(--color-text-muted)" fontSize="sm">
            Noch keine veröffentlichten Module.
          </Text>
        ) : (
          <InstitutAccordion modules={modules} isPaid={isPaid} />
        )}
      </GridItem>
    </Grid>
  );
}
