import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsDashboardPage() {
  const { error } = await requireAdmin();
  if (error) {
    redirect("/dashboard");
  }

  return (
    <Box maxW="1440px" mx="auto">
      <AdminPageHeader
        title="Analytics-Dashboard"
        subtitle="Live-Kennzahlen für Funnel, Revenue, Churn und Email-Performance. Daten werden bei jedem Aufruf frisch aus Supabase geladen."
      />
      <AnalyticsDashboard />
    </Box>
  );
}
