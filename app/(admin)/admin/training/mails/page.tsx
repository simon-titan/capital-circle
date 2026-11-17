import { redirect } from "next/navigation";
import { Box, Grid, Stack, Text } from "@chakra-ui/react";
import { AdminPageHeader, ADMIN_CARD_CLASS } from "@/components/admin/adminUi";
import { ALLE_PLAYBOOK_IDS, beispielMail } from "@/lib/email/templates/playbook/vorschau";
import { VORLAGEN } from "@/lib/mailsystem/vorlagen";
import { requireAdmin } from "@/lib/supabase/admin-auth";

export const dynamic = "force-dynamic";

/**
 * `/admin/training/mails` — alle 36 Vorlagen aus Emres E-Mail-Playbook 1.0 mit
 * Beispieldaten, zur Abnahme. Betreff, Vorschauzeile, Klasse, Absender und
 * darunter die Mail, wie sie verschickt wird.
 */
export default async function AdminTrainingMailsPage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  return (
    <Box>
      <AdminPageHeader
        title="Playbook-Mails"
        subtitle="Alle Vorlagen A01–Q02 aus Emres E-Mail-Playbook 1.0 mit Beispieldaten. Texte unverändert aus dem Playbook (lib/email/templates/playbook/). W01 und Q01 sind der obere Teil der Kaufbestätigung."
      />
      <Stack gap={8}>
        {ALLE_PLAYBOOK_IDS.map((id) => {
          const meta = VORLAGEN[id];
          const m = beispielMail(id);
          return (
            <Grid key={id} templateColumns={{ base: "1fr", xl: "280px 1fr" }} gap={5} alignItems="start">
              <Stack gap={1.5} className={ADMIN_CARD_CLASS} p={4}>
                <Text fontWeight={600} color="var(--cc-text)">
                  {id} · {meta.titel}
                </Text>
                <Text fontSize="xs" color="var(--cc-text-3)">
                  Klasse {meta.klasse} · Absender {meta.absender === "emre" ? "Emre | Capital Circle" : "Berater | Capital Circle"}
                </Text>
                <Text fontSize="sm" color="var(--cc-text)">
                  <strong>Betreff:</strong> {m.betreff}
                </Text>
                <Text fontSize="sm" color="var(--cc-text-2)">
                  <strong>Vorschau:</strong> {m.vorschau}
                </Text>
              </Stack>
              <Box
                as="iframe"
                src={`/api/admin/training/mail-vorschau?id=${id}`}
                title={`${id} ${meta.titel}`}
                w="full"
                h="720px"
                border="1px solid var(--cc-line)"
                borderRadius="12px"
                bg="#0f1317"
              />
            </Grid>
          );
        })}
      </Stack>
    </Box>
  );
}
