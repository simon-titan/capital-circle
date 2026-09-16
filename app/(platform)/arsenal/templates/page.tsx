import { Box } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/journal/PageHeader";
import { PageArsenalAttachmentsBrowser } from "@/components/platform/PageCards";
import { getArsenalAttachmentsByKind, getCurrentUserAndProfile } from "@/lib/server-data";

const TITLE = "Templates";
const SUBTITLE =
  "Vorlagen für Trading-Software und Arbeitsabläufe. Filtere nach Modul, Video und Kategorie oder nutze die Suche.";

export default async function ArsenalTemplatesPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  const items = await getArsenalAttachmentsByKind("template");

  return (
    <Box>
      <PageHeader title={TITLE} subtitle={SUBTITLE} />
      <PageArsenalAttachmentsBrowser items={items} title={TITLE} subtitle={SUBTITLE} />
    </Box>
  );
}
