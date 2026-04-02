"use client";

import { Box, Button, Checkbox, FormLabel, HStack, Input, Select, Stack, Text, Textarea } from "@chakra-ui/react";
import { useState } from "react";

const EVENT_COLORS = ["#D4AF37", "#4A90D9", "#4ADE80", "#F87171", "#A78BFA"] as const;

type EventItem = {
  id: string;
  title: string;
  start_time: string;
  event_type: string | null;
  color?: string | null;
  external_url?: string | null;
  is_recurring?: boolean | null;
  recurrence_group_id?: string | null;
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
  const [weeklyRepeat, setWeeklyRepeat] = useState(false);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
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
        is_recurring: weeklyRepeat,
        recurrence_end_date: weeklyRepeat && recurrenceEndDate.trim() ? recurrenceEndDate.trim() : null,
      }),
    });
    const json = (await res.json()) as {
      ok?: boolean;
      item?: EventItem;
      items?: EventItem[];
      error?: string;
    };
    setLoading(false);
    if (!json.ok || !json.item) {
      setStatus(json.error || "Event konnte nicht angelegt werden.");
      return;
    }
    const added = json.items && json.items.length > 0 ? json.items : [json.item];
    setEvents((prev) => [...prev, ...added].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
    setStatus(weeklyRepeat ? `${added.length} Termine angelegt (wöchentlich).` : "Event angelegt.");
    setTitle("");
    setDescription("");
    setStartTime("");
    setEndTime("");
    setExternalUrl("");
    setWeeklyRepeat(false);
    setRecurrenceEndDate("");
  };

  const deleteEvent = async (id: string) => {
    const ev = events.find((e) => e.id === id);
    let deleteMode: "single" | "future" = "single";

    if (ev?.recurrence_group_id) {
      const allFuture = window.confirm(
        "Alle zukünftigen Termine dieser Serie löschen?\n\nOK = alle ab diesem Datum\nAbbrechen = nur diesen einen Termin wählen",
      );
      if (allFuture) {
        deleteMode = "future";
      } else {
        const onlyThis = window.confirm("Nur diesen einen Termin löschen?");
        if (!onlyThis) return;
        deleteMode = "single";
      }
    } else {
      const confirmed = window.confirm("Dieses Event wirklich loeschen?");
      if (!confirmed) return;
    }

    setLoading(true);
    setStatus(null);
    const q = new URLSearchParams({ id });
    if (deleteMode === "future") q.set("deleteMode", "future");
    const res = await fetch(`/api/admin/events?${q.toString()}`, {
      method: "DELETE",
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    setLoading(false);

    if (!json.ok) {
      setStatus(json.error || "Event konnte nicht geloescht werden.");
      return;
    }

    if (deleteMode === "future" && ev?.recurrence_group_id) {
      const cut = new Date(ev.start_time).getTime();
      setEvents((prev) =>
        prev.filter((e) => {
          if (e.recurrence_group_id !== ev.recurrence_group_id) return true;
          return new Date(e.start_time).getTime() < cut;
        }),
      );
      setStatus("Zukünftige Termine der Serie gelöscht.");
      return;
    }

    setEvents((prev) => prev.filter((event) => event.id !== id));
    setStatus("Event geloescht.");
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
      <Checkbox isChecked={weeklyRepeat} onChange={(e) => setWeeklyRepeat(e.target.checked)}>
        Wöchentlich wiederholen (bis zu 9 Termine; optional mit Enddatum begrenzen)
      </Checkbox>
      {weeklyRepeat ? (
        <Box>
          <FormLabel fontSize="sm">Wiederholung endet am (optional)</FormLabel>
          <Input
            type="date"
            value={recurrenceEndDate}
            onChange={(e) => setRecurrenceEndDate(e.target.value)}
            maxW="280px"
          />
        </Box>
      ) : null}
      <Button onClick={createEvent} isLoading={loading} isDisabled={!title || !startTime}>
        Event erstellen
      </Button>
      {status ? <Text fontSize="sm">{status}</Text> : null}

      <Text mt={4} fontSize="lg">
        Vorhandene Events
      </Text>
      {events.map((event) => (
        <HStack key={event.id} justify="space-between" align="center">
          <Text>
            {event.title} - {new Date(event.start_time).toLocaleString("de-DE")} ({event.event_type}
            {event.recurrence_group_id ? ", Serie" : ""})
          </Text>
          <Button size="sm" colorScheme="red" variant="outline" onClick={() => deleteEvent(event.id)} isLoading={loading}>
            Loeschen
          </Button>
        </HStack>
      ))}
    </Stack>
  );
}
