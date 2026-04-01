"use client";

import dynamic from "next/dynamic";

const EventsCalendar = dynamic(
  () => import("@/components/platform/EventsCalendar").then((m) => m.EventsCalendar),
  { ssr: false },
);

type EventItem = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  event_type: string | null;
  color?: string | null;
  external_url?: string | null;
};

export function EventsPageCalendar({ events }: { events: EventItem[] }) {
  return <EventsCalendar events={events} />;
}
