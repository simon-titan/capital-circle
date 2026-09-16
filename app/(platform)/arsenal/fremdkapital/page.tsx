import { Box } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/journal/PageHeader";
import { PageArsenalCardsSection } from "@/components/platform/PageCards";
import { getArsenalCards, getCurrentUserAndProfile } from "@/lib/server-data";

export default async function ArsenalFremdkapitalPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  const cards = await getArsenalCards("fremdkapital");

  return (
    <Box>
      <PageHeader
        title="Fremdkapital"
        subtitle="Übersicht zu Partnern, Finanzierungsoptionen und relevanten Ressourcen."
      />
      <PageArsenalCardsSection cards={cards} />
    </Box>
  );
}
