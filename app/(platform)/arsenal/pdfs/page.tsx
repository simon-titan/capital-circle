import { Box } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/journal/PageHeader";
import { PageArsenalAttachmentsBrowser } from "@/components/platform/PageCards";
import { getArsenalAttachmentsByKind, getCurrentUserAndProfile } from "@/lib/server-data";

const TITLE = "PDFs";
const SUBTITLE =
  "Dokumente und PDFs aus dem Institut. Filtere nach Modul, Video und Kategorie oder nutze die Freitextsuche.";

export default async function ArsenalPdfsPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  const items = await getArsenalAttachmentsByKind("pdf");

  return (
    <Box>
      <PageHeader title={TITLE} subtitle={SUBTITLE} />
      <PageArsenalAttachmentsBrowser items={items} title={TITLE} subtitle={SUBTITLE} />
    </Box>
  );
}
