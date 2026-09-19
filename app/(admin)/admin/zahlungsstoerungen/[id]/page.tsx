import { notFound, redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { ZahlungsfallAkte } from "@/components/admin/Zahlungsfaelle";
import { GRENZE_ANTWORT, ladeZahlungsfall } from "@/lib/admin/zahlungsfaelle";

export const dynamic = "force-dynamic";

/**
 * Ein Zahlungsfall: Kennzahlen, Verlauf, und die drei Handlungen (antworten,
 * stunden, schliessen). Der Verlauf ist die Seite — ob jemand seit drei Wochen
 * schweigt oder erklärt hat, dass sein Gehalt am Fünften kommt, ist der ganze
 * Unterschied zwischen Sperre und Aufschub.
 */
export default async function AdminZahlungsfallPage({ params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const stand = await ladeZahlungsfall(id);
  if (!stand) notFound();

  return (
    <Box maxW="1100px" mx="auto">
      <ZahlungsfallAkte
        fall={stand.fall}
        nachrichten={stand.nachrichten}
        vorschlagBis={stand.vorschlagBis}
        heute={stand.heute}
        spaetestens={stand.spaetestens}
        grenze={GRENZE_ANTWORT}
      />
    </Box>
  );
}
