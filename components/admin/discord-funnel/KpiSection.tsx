"use client";

import { SimpleGrid } from "@chakra-ui/react";
import {
  Activity,
  CalendarCheck,
  PercentCircle,
  PlayCircle,
  Share2,
  Users,
  Wallet,
} from "lucide-react";
import type { AnalyticsKpis } from "./types";
import { eurFromCents, pctFmt, StatWidget } from "./primitives";

export function KpiSection({
  kpis,
  joined,
  closingReady,
}: {
  kpis: AnalyticsKpis;
  joined: number;
  closingReady: number;
}) {
  return (
    <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={4}>
      <StatWidget icon={<Users size={18} />} label="Traffic gesamt" value={String(kpis.traffic)} />
      <StatWidget icon={<Users size={18} />} label="Leads gesamt" value={String(kpis.leads)} />
      <StatWidget
        icon={<Share2 size={18} />}
        label="Discord beigetreten"
        value={String(joined)}
        sublabel="Leads mit Server-Join"
      />
      <StatWidget
        icon={<CalendarCheck size={18} />}
        label="Bereit fürs Closing"
        value={String(closingReady)}
        sublabel="Beigetreten + gebucht + offen"
      />
      <StatWidget
        icon={<PercentCircle size={18} />}
        label="Landing-CVR"
        value={pctFmt(kpis.landingCvrPct)}
        sublabel="Leads / Traffic"
      />
      <StatWidget
        icon={<PlayCircle size={18} />}
        label="Video-Completion"
        value={pctFmt(kpis.videoCompletionRatePct)}
        sublabel="Video fertig / Leads"
      />
      <StatWidget
        icon={<Activity size={18} />}
        label="Application-Rate"
        value={pctFmt(kpis.applicationRatePct)}
        sublabel="Fragen ausgefüllt / Leads"
      />
      <StatWidget
        icon={<CalendarCheck size={18} />}
        label="Booking-Rate"
        value={pctFmt(kpis.bookingRatePct)}
        sublabel="Calls gebucht / Leads"
      />
      <StatWidget
        icon={<PercentCircle size={18} />}
        label="Close-Rate"
        value={pctFmt(kpis.closeRatePct)}
        sublabel="Closed Won / gebuchte Calls"
      />
      <StatWidget
        icon={<Wallet size={18} />}
        label="Revenue gesamt"
        value={eurFromCents(kpis.revenueCents)}
        accent="green"
      />
    </SimpleGrid>
  );
}
