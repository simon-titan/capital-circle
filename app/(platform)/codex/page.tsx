import { Box } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/journal/PageHeader";
import { PageCodexReferenceView } from "@/components/platform/PageCards";
import { isFreeMember } from "@/lib/membership";
import { getCurrentUserAndProfile } from "@/lib/server-data";

export default async function CodexPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) {
    redirect("/einsteig");
  }
  // Schutz: Nutzer mit ausstehender Bewerbung dürfen die Codex-Referenz nicht sehen.
  // Zahlende nicht — für sie ist die Bewerbung erledigt (dieselbe Regel wie in `proxy.ts`).
  const appStatus = (profile as { application_status?: string | null } | null)
    ?.application_status;
  if ((appStatus === "pending" || appStatus === "rejected") && isFreeMember(profile)) {
    redirect("/pending-review");
  }

  return (
    <Box w="full">
      <PageHeader
        title="Codex"
        subtitle="Die verbindlichen Grundsätze für Trading und Zusammenarbeit in der Community."
      />

      {/* Der Codex ist das Herzstück der Seite: Hero-Glas (Gold-Rahmen, atmender Glow), ohne Anheben. */}
      <Box
        as="section"
        aria-label="Capital Circle Codex"
        className="cc-card cc-card--hero cc-card--still cc-rise"
        style={{ animationDelay: "80ms" }}
        p={{ base: 5, md: 6 }}
      >
        <PageCodexReferenceView />
      </Box>
    </Box>
  );
}
