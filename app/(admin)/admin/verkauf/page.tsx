import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { AdminVerkaufManager, type AdminVerkaufFelder } from "@/components/admin/AdminVerkaufManager";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { VERKAUF_SCHLUESSEL, VERKAUF_STANDARD } from "@/lib/verkauf/schalter";

export const dynamic = "force-dynamic";

function text(roh: unknown): string {
  return typeof roh === "string" ? roh : "";
}

export default async function AdminVerkaufPage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  const { data } = await createServiceClient()
    .from("app_settings")
    .select("value, updated_at")
    .eq("key", VERKAUF_SCHLUESSEL)
    .maybeSingle();

  // Die gespeicherten Eingaben, nicht die wirksamen Werte: Ein leeres Feld
  // soll leer erscheinen (Platzhalter = Standardtext), nicht mit dem Standard
  // vorbefüllt — sonst würde der Standard beim Speichern festgeschrieben.
  const v = (data?.value ?? {}) as Record<string, unknown>;
  const initial: AdminVerkaufFelder = {
    geschlossen: v.geschlossen === true,
    ueberschrift: text(v.ueberschrift),
    nachricht: text(v.nachricht),
    zielUrl: text(v.zielUrl),
    zielLabel: text(v.zielLabel),
  };

  return (
    <Box maxW="760px" mx="auto">
      <AdminPageHeader
        title="Verkaufsseite"
        subtitle="Schließt den normalen Zugang über die Verkaufsseite. Neue Mitglieder kommen dann nur noch über den Funnel."
      />
      <AdminVerkaufManager
        initial={initial}
        standard={VERKAUF_STANDARD}
        updatedAt={(data?.updated_at as string | null) ?? null}
      />
    </Box>
  );
}
