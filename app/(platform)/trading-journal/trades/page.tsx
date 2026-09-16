import { PageHeader } from "@/components/journal/PageHeader";
import { TradesView } from "@/components/journal/TradesView";

export default function JournalTradesPage() {
  return (
    <>
      <PageHeader title="Trades" subtitle="Jeder einzelne Trade, filterbar nach Instrument, Richtung und Ergebnis." />
      <TradesView />
    </>
  );
}
