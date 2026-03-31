import { Grid, GridItem, Heading, Text } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { ModuleCard } from "@/components/platform/ModuleCard";
import { createClient } from "@/lib/supabase/server";
import { getAcademyModulesOverview } from "@/lib/server-data";

export default async function AusbildungPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/einsteig");

  const modules = await getAcademyModulesOverview(auth.user.id);

  return (
    <Grid gap={{ base: 6, md: 8 }}>
      <GridItem>
        <Heading as="h1" size="xl" className="radley-regular" fontWeight={400} mb={2}>
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
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" }} gap={6}>
            {modules.map((m) => (
              <GridItem key={m.id}>
                <ModuleCard module={m} />
              </GridItem>
            ))}
          </Grid>
        )}
      </GridItem>
    </Grid>
  );
}
