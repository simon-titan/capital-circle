import { DayView } from "@/components/journal/DayView";
import { PageHeader } from "@/components/journal/PageHeader";

export default function JournalDayViewPage() {
  return (
    <>
      <PageHeader
        title="Tages Ansicht"
        subtitle="Jeder Handelstag einzeln — mit Intraday-Verlauf und denselben Kennzahlen wie im Dashboard."
      />
      <DayView />
    </>
  );
}
