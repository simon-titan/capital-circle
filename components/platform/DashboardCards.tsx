"use client";

import dynamic from "next/dynamic";
import type { LastWatchedModuleData, RecommendedModuleData, HomeworkRow, EventRow } from "@/lib/server-data";
import type { HomeworkCustomTaskRow } from "@/lib/server-data";

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
}: {
  homework: HomeworkRow | null;
  initialOfficialDone: boolean;
  initialCustomTasks: HomeworkCustomTaskRow[];
}) {
  return (
    <HomeworkCard
      homework={homework}
      initialOfficialDone={initialOfficialDone}
      initialCustomTasks={initialCustomTasks}
      spotlight
    />
  );
}

export function DashboardEventsCard({ events }: { events: EventRow[] }) {
  return <UpcomingEventsCard events={events} spotlight />;
}
