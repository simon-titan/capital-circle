import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { AdminKassenlinks } from "@/components/admin/AdminKassenlinks";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { requireAdmin } from "@/lib/supabase/admin-auth";

export const dynamic = "force-dynamic";

/**
 * `/admin/kassenlinks` — Kassenlinks nach dem Closing-Call und die daraus
 * entstandenen Mentoring-Käufe (`config/mentoring.ts`, Migration 108).
 *
 * Der Closer legt hier ein Angebot an (Produkt, Zahlweise, E-Mail) und schickt
 * dem Kunden `/kasse/<token>`. Darunter stehen alle Links und die Käufe mit
 * ihrem Ratenstand, damit eine geplatzte Rate nicht erst am Monatsende auffällt.
 */
export default async function AdminKassenlinksPage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  return (
    <Box maxW="1400px" mx="auto">
      <AdminPageHeader
        title="Kassenlinks"
        subtitle="Nach dem Closing-Call: Programm und Zahlweise wählen, Link anlegen und dem Kunden schicken. Der Preis steht fest, Raten laufen ohne Aufschlag und enden nach der letzten Rate von selbst."
      />
      <AdminKassenlinks />
    </Box>
  );
}
