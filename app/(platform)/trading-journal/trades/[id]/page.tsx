import { TradeDetailView } from "@/components/journal/detail/TradeDetailView";

/**
 * Ein Trade als eigener Journal-Eintrag. Zugang prüft das Journal-Layout, den
 * Trade selbst lädt die Client-Ansicht (aus dem Provider oder einzeln per RLS).
 */
export default async function JournalTradeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TradeDetailView key={id} tradeId={id} />;
}
