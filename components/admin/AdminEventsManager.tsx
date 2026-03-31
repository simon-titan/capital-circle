"use client";

import { Box, Button, HStack, Input, Select, Stack, Text, Textarea } from "@chakra-ui/react";
import { useState } from "react";

const EVENT_COLORS = ["#D4AF37", "#4A90D9", "#4ADE80", "#F87171", "#A78BFA"] as const;

type EventItem = {
  id: string;
  title: string;
  start_time: string;
  event_type: string | null;
  color?: string | null;
  external_url?: string | null;
};

export function AdminEventsManager({ initialEvents }: { initialEvents: EventItem[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [eventType, setEventType] = useState("webinar");
  const [eventColor, setEventColor] = useState<string>("#D4AF37");
  const [externalUrl, setExternalUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const createEvent = async () => {
    setLoading(true);
    setStatus(null);
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        start_time: new Date(startTime).toISOString(),
        end_time: endTime ? new Date(endTime).toISOString() : undefined,
        event_type: eventType,
        color: eventColor,
        external_url: externalUrl.trim() || undefined,
      }),
    });
    const json = (await res.json()) as { ok?: boolean; item?: EventItem; error?: string };
    setLoading(false);
    if (!json.ok || !json.item) {
      setStatus(json.error || "Event konnte nicht angelegt werden.");
      return;
    }
    setEvents((prev) => [...prev, json.item!]);
    setStatus("Event angelegt.");
    setTitle("");
    setDescription("");
    setStartTime("");
    setEndTime("");
    setExternalUrl("");
  };

  return (
    <Stack gap={4}>
      <Text fontSize="xl">Event anlegen</Text>
      <Input placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea placeholder="Beschreibung" value={description} onChange={(e) => setDescription(e.target.value)} />
      <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
      <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
      <Input placeholder="Externer Link (optional)" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} />
      <Select value={eventType} onChange={(e) => setEventType(e.target.value)}>
        <option value="live_session">live_session</option>
        <option value="webinar">webinar</option>
        <option value="deadline">deadline</option>
      </Select>
      <Stack spacing={2}>
        <Text fontSize="sm">Event-Farbe</Text>
        <HStack spacing={2}>
          {EVENT_COLORS.map((color) => (
            <Box
              key={color}
              as="button"
              type="button"
              onClick={() => setEventColor(color)}
              w="30px"
              h="30px"
              borderRadius="full"
              border={eventColor === color ? "2px solid #fff" : "1px solid rgba(255,255,255,0.22)"}
              boxShadow={eventColor === color ? "0 0 0 2px rgba(212, 175, 55, 0.28)" : "none"}
              bg={color}
            />
          ))}
        </HStack>
      </Stack>
      <Button onClick={createEvent} isLoading={loading} isDisabled={!title || !startTime}>
        Event erstellen
      </Button>
      {status ? <Text fontSize="sm">{status}</Text> : null}

      <Text mt={4} fontSize="lg">
        Vorhandene Events
      </Text>
      {events.map((event) => (
        <Text key={event.id}>
          {event.title} - {new Date(event.start_time).toLocaleString("de-DE")} ({event.event_type})
        </Text>
      ))}
    </Stack>
  );
}
