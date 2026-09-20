import { DashboardView } from "@/components/journal/dashboard/DashboardView";
import { PageHeader } from "@/components/journal/PageHeader";

export default function JournalDashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Deine gesamte Performance auf einen Blick: Kennzahlen, Verlauf, Drawdown und Kalender."
      />
      <DashboardView />
    </>
  );
}
