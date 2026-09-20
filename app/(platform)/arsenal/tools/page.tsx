import { Box } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/journal/PageHeader";
import { PageArsenalCardsSection } from "@/components/platform/PageCards";
import { getArsenalCards, getCurrentUserAndProfile } from "@/lib/server-data";

export default async function ArsenalToolsPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  const cards = await getArsenalCards("tools");

  return (
    <Box>
      <PageHeader
        title="Tools & Software"
        subtitle="Empfohlene Werkzeuge und Software rund um dein Trading, kuratiert vom Capital Circle Team."
      />
      <PageArsenalCardsSection cards={cards} />
    </Box>
  );
}
