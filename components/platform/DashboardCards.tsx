"use client";

import dynamic from "next/dynamic";
import type { LastWatchedModuleData, RecommendedModuleData, HomeworkRow, EventRow } from "@/lib/server-data";
import type { HomeworkCustomTaskRow } from "@/lib/server-data";
import { CardLockOverlay } from "@/components/ui/CardLockOverlay";

const LastVideoCard = dynamic(
  () => import("@/components/platform/LastVideoCard").then((m) => m.LastVideoCard),
  { ssr: false },
);

const HomeworkCard = dynamic(
  () => import("@/components/platform/HomeworkCard").then((m) => m.HomeworkCard),
  { ssr: false },
);

const UpcomingEventsCard = dynamic(
  () => import("@/components/platform/UpcomingEventsCard").then((m) => m.UpcomingEventsCard),
  { ssr: false },
);

export function DashboardLastVideoCard({
  lastWatched,
  recommended,
}: {
  lastWatched: LastWatchedModuleData | null;
  recommended: RecommendedModuleData | null;
}) {
  return <LastVideoCard lastWatched={lastWatched} recommended={recommended} />;
}

export function DashboardHomeworkCard({
  homework,
  initialOfficialDone,
  initialCustomTasks,
  isPaid = true,
}: {
  homework: HomeworkRow | null;
  initialOfficialDone: boolean;
  initialCustomTasks: HomeworkCustomTaskRow[];
  isPaid?: boolean;
}) {
  return (
    <CardLockOverlay
      locked={!isPaid}
      description="Hausaufgaben und persönliche Checklisten stehen vollwertigen Capital Circle Mitgliedern zur Verfügung."
    >
      <HomeworkCard
        homework={homework}
        initialOfficialDone={initialOfficialDone}
        initialCustomTasks={initialCustomTasks}
        spotlight={false}
      />
    </CardLockOverlay>
  );
}

export function DashboardEventsCard({
  events,
  isPaid = true,
}: {
  events: EventRow[];
  isPaid?: boolean;
}) {
  return (
    <CardLockOverlay
      locked={!isPaid}
      description="Bevorstehende Events und Live-Termine sind exklusiv für vollwertige Capital Circle Mitglieder."
    >
      <UpcomingEventsCard events={events} spotlight />
    </CardLockOverlay>
  );
}
