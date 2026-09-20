import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { KaufwegDashboard } from "@/components/admin/KaufwegDashboard";
import { requireAdmin } from "@/lib/supabase/admin-auth";

export const dynamic = "force-dynamic";

/**
 * `/admin/kaufweg` — der gesamte Weg vom Besuch bis zur Zahlung.
 *
 * Abgegrenzt von `/admin/dashboard` („Analytics"): Dort steht das Geschäft
 * (MRR, Umsatz, Churn, Mail-Statistik), hier steht der Weg dorthin. Die beiden
 * teilen sich keine Zahl — wer sie zusammenlegt, bekommt eine Seite, auf der
 * niemand mehr weiß, worauf sich eine Quote bezieht.
 */
export default async function AdminKaufwegPage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  return (
    <Box maxW="1400px" mx="auto">
      <AdminPageHeader
        title="Kaufweg"
        subtitle="Besuch → Klick → Kasse → Zahlung. Eigene Messung der Verkaufsseite (ohne Cookies, ohne IP) zusammen mit den Zahlen aus der Stripe-Kasse. Jede Kennzahl trägt einen Satz, der sagt, woher sie kommt."
      />
      <KaufwegDashboard />
    </Box>
  );
}
