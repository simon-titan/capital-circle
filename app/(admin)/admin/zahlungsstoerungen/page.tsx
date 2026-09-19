import { redirect } from "next/navigation";
import { Alert, AlertIcon, Box, Text } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { AdminPageHeader, adminAlertIconColor, adminAlertProps } from "@/components/admin/adminUi";
import { ZahlungsfallListe } from "@/components/admin/Zahlungsfaelle";
import { ladeZahlungsfaelle } from "@/lib/admin/zahlungsfaelle";

export const dynamic = "force-dynamic";

/**
 * Zahlungsstörungen — die Fallakte der gescheiterten Abbuchungen.
 *
 * Seit 19.09.2026 (Mahnsystem wie MoonTrading) eine Zeile je Rechnung mit
 * Frist, Erinnerungen, Aufschub und Verlauf statt einer Profilliste mit
 * Mail-Stempeln. Der Pfad bleibt, damit Navigation und Lesezeichen stimmen.
 */
export default async function AdminZahlungsstoerungenPage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  const stand = await ladeZahlungsfaelle();

  return (
    <Box maxW="1200px" mx="auto">
      <AdminPageHeader
        title="Zahlungsstörungen"
        subtitle="Jede gescheiterte Abbuchung ist ein Fall: erste Nachricht am Tag des Ausfalls, Erinnerungen an Tag 3 und 5, am siebten Tag ruht der Zugang und der Warteraum greift. Antworten des Kunden über den Discord-Knopf landen hier."
      />
      {stand.fehlt ? (
        <Alert status="warning" {...adminAlertProps("warning")}>
          <AlertIcon color={adminAlertIconColor("warning")} />
          <Text fontSize="14px">
            Die Tabelle <code>zahlungsfall</code> fehlt — Migration 080 ist noch nicht eingespielt. Solange steht dieser
            Bereich still; das ist kein leerer Bestand, sondern eine fehlende Einrichtung.
          </Text>
        </Alert>
      ) : stand.fehler ? (
        <Alert status="error" {...adminAlertProps("error")}>
          <AlertIcon color={adminAlertIconColor("error")} />
          <Text fontSize="14px">Zahlungsfälle nicht ladbar: {stand.fehler}</Text>
        </Alert>
      ) : (
        <ZahlungsfallListe faelle={stand.faelle} />
      )}
    </Box>
  );
}
