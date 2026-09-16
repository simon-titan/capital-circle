"use client";

import { Box, Button, Checkbox, FormLabel, HStack, Input, Select, Stack, Text, Textarea, Tooltip } from "@chakra-ui/react";
import { Check } from "lucide-react";
import { useState } from "react";
import { DEFAULT_EVENT_COLOR, EVENT_COLORS, resolveEventColor } from "@/config/event-colors";

const fieldSx = {
  bg: "rgba(255, 255, 255, 0.03)",
  border: "1px solid",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  color: "var(--cc-text)",
  _placeholder: { color: "var(--cc-text-3)" },
  _hover: { borderColor: "rgba(255, 255, 255, 0.22)" },
  _focusVisible: { borderColor: "var(--cc-gold-line)", boxShadow: "0 0 0 1px var(--cc-gold-line)" },
} as const;

const optionStyle = { background: "var(--cc-panel-solid)" };

const checkboxSx = {
  ".chakra-checkbox__control": { borderColor: "var(--cc-line-strong)", bg: "rgba(255, 255, 255, 0.03)" },
  ".chakra-checkbox__control[data-checked]": {
    bg: "var(--cc-gold)",
    borderColor: "var(--cc-gold)",
    color: "var(--cc-on-gold)",
  },
  ".chakra-checkbox__control[data-checked]:hover": { bg: "var(--cc-gold-hover)", borderColor: "var(--cc-gold-hover)" },
  ".chakra-checkbox__label": { fontSize: "14px", color: "var(--cc-text-soft)" },
} as const;

const dangerButton = {
  variant: "line",
  color: "var(--cc-danger)",
  _hover: { bg: "rgba(248, 113, 113, 0.08)", borderColor: "rgba(248, 113, 113, 0.45)", boxShadow: "none" },
} as const;

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
  const [eventType, setEventType] = useState("Q&A");
  const [eventColor, setEventColor] = useState<string>(DEFAULT_EVENT_COLOR.value);
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
      const confirmed = window.confirm("Dieses Event wirklich löschen?");
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
      setStatus(json.error || "Event konnte nicht gelöscht werden.");
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
    setStatus("Event gelöscht.");
  };

  return (
    <Stack gap={6}>
      <Stack gap={4} className="cc-card cc-card--still" p={{ base: 4, md: 5 }}>
        <Text fontSize="18px" fontWeight={600} color="var(--cc-text)">
          Event anlegen
        </Text>
        <Input placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} {...fieldSx} />
        <Textarea placeholder="Beschreibung" value={description} onChange={(e) => setDescription(e.target.value)} {...fieldSx} />
        <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="cc-num" {...fieldSx} />
        <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="cc-num" {...fieldSx} />
        <Input placeholder="Externer Link (optional)" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} {...fieldSx} />
        <Select value={eventType} onChange={(e) => setEventType(e.target.value)} {...fieldSx}>
          <option value="Q&A" style={optionStyle}>Q&A</option>
          <option value="Livetrading" style={optionStyle}>Livetrading</option>
          <option value="BIAS" style={optionStyle}>BIAS</option>
        </Select>
        <Stack spacing={2}>
          <Text id="event-color-label" fontSize="13px" fontWeight={500} color="var(--cc-text-2)">
            Event-Farbe im Kalender:{" "}
            <Text as="span" color="var(--cc-text)">
              {resolveEventColor(eventColor).label}
            </Text>
          </Text>
          {/* Nur Markentöne (config/event-colors.ts) — der Mitglieder-Kalender färbt die Chips damit. */}
          <HStack spacing={3} role="radiogroup" aria-labelledby="event-color-label" flexWrap="wrap">
            {EVENT_COLORS.map((c) => {
              const active = eventColor === c.value;
              return (
                <Tooltip key={c.key} label={c.label} placement="top" openDelay={200}>
                  <Box
                    as="button"
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={c.label}
                    onClick={() => setEventColor(c.value)}
                    w="32px"
                    h="32px"
                    borderRadius="full"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    bg={c.value}
                    color="var(--cc-on-gold)"
                    border="1px solid rgba(255, 255, 255, 0.18)"
                    boxShadow={active ? "0 0 0 2px var(--cc-panel-solid), 0 0 0 4px var(--cc-gold-line)" : "none"}
                    transition="box-shadow 150ms var(--cc-ease), transform 150ms var(--cc-ease)"
                    _hover={{ transform: "scale(1.08)" }}
                    _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "4px" }}
                  >
                    {active ? <Check size={15} strokeWidth={2.5} aria-hidden /> : null}
                  </Box>
                </Tooltip>
              );
            })}
          </HStack>
        </Stack>
        <Checkbox isChecked={weeklyRepeat} onChange={(e) => setWeeklyRepeat(e.target.checked)} sx={checkboxSx}>
          Wöchentlich wiederholen (bis zu 9 Termine; optional mit Enddatum begrenzen)
        </Checkbox>
        {weeklyRepeat ? (
          <Box>
            <FormLabel fontSize="13px" fontWeight={500} color="var(--cc-text-2)">
              Wiederholung endet am (optional)
            </FormLabel>
            <Input
              type="date"
              value={recurrenceEndDate}
              onChange={(e) => setRecurrenceEndDate(e.target.value)}
              maxW="280px"
              className="cc-num"
              {...fieldSx}
            />
          </Box>
        ) : null}
        <Button variant="gold" alignSelf="flex-start" onClick={createEvent} isLoading={loading} isDisabled={!title || !startTime}>
          Event erstellen
        </Button>
        {status ? (
          <Text fontSize="14px" color="var(--cc-text-2)">
            {status}
          </Text>
        ) : null}
      </Stack>

      <Stack gap={0} className="cc-card cc-card--still" p={{ base: 4, md: 5 }}>
        <Text fontSize="18px" fontWeight={600} color="var(--cc-text)" mb={2}>
          Vorhandene Events
        </Text>
        {events.map((event) => (
          <HStack
            key={event.id}
            justify="space-between"
            align="center"
            spacing={4}
            py={3}
            borderBottom="1px solid var(--cc-line)"
            _last={{ borderBottom: "none" }}
          >
            <Text fontSize="14px" color="var(--cc-text)">
              <Box
                as="span"
                display="inline-block"
                w="10px"
                h="10px"
                mr={2.5}
                borderRadius="full"
                verticalAlign="middle"
                bg={resolveEventColor(event.color).value}
                title={resolveEventColor(event.color).label}
                aria-hidden
              />
              {event.title}{" "}
              <Text as="span" color="var(--cc-text-2)">
                - <Text as="span" className="cc-num">{new Date(event.start_time).toLocaleString("de-DE")}</Text> ({event.event_type}
                {event.recurrence_group_id ? ", Serie" : ""})
              </Text>
            </Text>
            <Button size="sm" flexShrink={0} {...dangerButton} onClick={() => deleteEvent(event.id)} isLoading={loading}>
              Löschen
            </Button>
          </HStack>
        ))}
      </Stack>
    </Stack>
  );
}
