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
  live_session_id?: string | null;
};

export function EventsPageCalendar({ events, isPaid = true }: { events: EventItem[]; isPaid?: boolean }) {
  return <EventsCalendar events={events} isPaid={isPaid} />;
}
