"use client";

import { useFunnel } from "@/components/admin/discord-funnel/DiscordFunnelShell";
import { LeadsSection } from "@/components/admin/discord-funnel/LeadsSection";

/** Leads: durchsuchbare Lead-Liste mit Inline-Edit (Closer/Close-Typ/…) + CSV-Export. */
export default function DiscordFunnelLeadsPage() {
  const { leads, search, setSearch, reload, patchLead, exportCsv } = useFunnel();

  return (
    <LeadsSection
      leads={leads}
      search={search}
      setSearch={setSearch}
      onSearchSubmit={reload}
      onPatch={patchLead}
      onExport={exportCsv}
    />
  );
}
