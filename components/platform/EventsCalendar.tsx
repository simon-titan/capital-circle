"use client";

import {
  Box,
  Button,
  Flex,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import deLocale from "@fullcalendar/core/locales/de";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChakraLinkButton } from "@/components/platform/ChakraLinkButton";
import { AppleBrandIcon, GoogleCalendarBrandIcon } from "@/components/platform/eventCalendarBrandIcons";
import { Radio } from "lucide-react";
import { resolveEventColor } from "@/config/event-colors";
import "./eventsCalendar.theme.css";

type EventItem = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  event_type: string | null;
  color?: string | null;
  external_url?: string | null;
  /** ID der verknüpften Live Session (falls vorhanden) */
  live_session_id?: string | null;
};

type EventsCalendarProps = {
  events: EventItem[];
  /** Wenn false: aktueller Nutzer ist Free (nicht bezahlt) */
  isPaid?: boolean;
};

/** Kartentitel: Label-Schnitt (13px, versal, gesperrt). */
const LABEL = {
  fontSize: "13px",
  lineHeight: "18px",
  fontWeight: 500,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "var(--cc-text-soft)",
};

/** Sonntag in Berlin = Free Call (für Free-Mitglieder das einzige offene Event). */
function isBerlinSunday(iso: string): boolean {
  return (
    new Intl.DateTimeFormat("de-DE", { weekday: "long", timeZone: "Europe/Berlin" }).format(new Date(iso)) === "Sonntag"
  );
}

export function EventsCalendar({ events, isPaid = true }: EventsCalendarProps) {
  const [selected, setSelected] = useState<EventItem | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  /*
   * Chip-Farbe = Admin-Farbe, abgebildet auf die Markenpalette (config/event-colors.ts,
   * Klassen `ev-tone-*` in eventsCalendar.theme.css). Free-Mitglieder: Sonntags-Call
   * hervorgehoben, alle übrigen Events gesperrt — das überschreibt den Ton.
   */
  const calendarEvents = useMemo(
    () =>
      events.map((event) => {
        const isSunday = isBerlinSunday(event.start_time);
        const tone = `ev-tone-${resolveEventColor(event.color).key}`;
        return {
          id: event.id,
          title: event.title,
          start: event.start_time,
          end: event.end_time ?? undefined,
          classNames: isPaid ? [tone] : [tone, isSunday ? "fc-event--free-call" : "fc-event--premium-locked"],
        };
      }),
    [events, isPaid],
  );

  // Auf dem Handy startet der Kalender in der Liste — die sieben Wochenspalten sind dort zu schmal für Titel.
  const calendarRef = useRef<FullCalendar>(null);
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) calendarRef.current?.getApi().changeView("listMonth");
  }, []);

  const exportIcs = () => {
    if (!selected) return;
    const ics = buildIcs(selected);
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFileName(selected.title)}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const googleUrl = selected ? buildGoogleUrl(selected) : "#";
  const discordUrl = process.env.NEXT_PUBLIC_DISCORD_COMMUNITY_URL;

  return (
    <Box
      as="section"
      aria-labelledby="events-calendar-title"
      className="cc-card cc-card--still cc-rise"
      style={{ animationDelay: "150ms" }}
      p={{ base: 4, md: 6 }}
      minW={0}
    >
      <Heading as="h2" id="events-calendar-title" {...LABEL}>
        Kalender
      </Heading>
      <Text fontSize={{ base: "15px", md: "16px" }} lineHeight={1.5} color="var(--cc-text-soft)" mt={3}>
        Termine im Blick — Woche, Monat oder Liste, mit einem Klick in deinen Kalender.
      </Text>
      <Text fontSize="14px" lineHeight={1.5} color="var(--cc-text-2)" mt={1}>
        Klick auf ein Event für Details, Links und Export.
      </Text>

      <Box className="events-calendar-root" mt={6}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale={deLocale}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,listMonth",
          }}
          buttonText={{
            today: "Heute",
            month: "Monat",
            week: "Woche",
            list: "Liste",
            prev: "‹",
            next: "›",
          }}
          height="auto"
          contentHeight="auto"
          allDaySlot={false}
          /* Etwas höher als Default (15px), damit Titel in der Wochenansicht nicht aus dem sichtbaren Bereich rutschen */
          eventMinHeight={20}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          slotDuration="01:00:00"
          slotLabelInterval="02:00:00"
          dayMaxEventRows={3}
          eventTimeFormat={{
            hour: "2-digit",
            minute: "2-digit",
            meridiem: false,
          }}
          events={calendarEvents}
          eventClick={(info) => {
            const event = events.find((item) => item.id === info.event.id);
            if (!event) return;
            // For free members, only allow opening the Sunday Free Call
            if (!isPaid && !isBerlinSunday(event.start_time)) return;
            setSelected(event);
            onOpen();
          }}
        />
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} isCentered motionPreset="slideInBottom">
        <ModalOverlay bg="rgba(8, 10, 12, 0.72)" backdropFilter="blur(6px)" />
        <ModalContent
          position="relative"
          bg="var(--cc-panel-solid)"
          border="1px solid var(--cc-line)"
          borderRadius="12px"
          boxShadow="0 24px 60px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
          color="var(--cc-text)"
          mx={4}
        >
          {/* Gold-Lichtkante wie auf den Glas-Karten */}
          <Box
            aria-hidden
            position="absolute"
            top="-1px"
            left="16%"
            right="16%"
            h="1px"
            bg="linear-gradient(90deg, transparent, rgba(232, 192, 148, 0.7), transparent)"
            pointerEvents="none"
          />
          <ModalCloseButton
            top={4}
            right={4}
            color="var(--cc-text-2)"
            borderRadius="8px"
            _hover={{ color: "var(--cc-gold-light)", bg: "rgba(255, 255, 255, 0.06)" }}
          />
          <ModalHeader pt={6} pb={4} pr={14} borderBottom="1px solid var(--cc-line)">
            <Text {...LABEL} mb={1.5}>
              Termin
            </Text>
            <Text
              as="span"
              display="block"
              fontSize={{ base: "18px", md: "20px" }}
              fontWeight={600}
              lineHeight={1.3}
              letterSpacing="-0.01em"
              color="var(--cc-text)"
            >
              {selected?.title}
            </Text>
          </ModalHeader>
          <ModalBody pt={5} pb={6}>
            {selected?.event_type ? (
              <Text
                fontSize="12px"
                fontWeight={500}
                letterSpacing="0.12em"
                textTransform="uppercase"
                color="var(--cc-gold-light)"
                mb={2}
              >
                {selected.event_type}
              </Text>
            ) : null}
            <Text className="cc-num" fontSize="14px" fontWeight={500} color="var(--cc-text-soft)" mb={4}>
              {selected ? formatEventDateRange(selected.start_time, selected.end_time) : ""}
            </Text>
            <Text fontSize="14px" lineHeight={1.7} color="var(--cc-text-2)" mb={6} whiteSpace="pre-wrap">
              {selected?.description || "Keine Beschreibung hinterlegt."}
            </Text>

            {selected?.live_session_id ? (
              <Flex
                mb={5}
                p={3}
                gap={3}
                direction={{ base: "column", sm: "row" }}
                align={{ base: "stretch", sm: "center" }}
                justify="space-between"
                borderRadius="10px"
                border="1px solid var(--cc-line)"
                bg="rgba(255, 255, 255, 0.03)"
              >
                <Text fontSize="12px" fontWeight={500} letterSpacing="0.12em" textTransform="uppercase" color="var(--cc-text-2)">
                  Aufzeichnung verfügbar
                </Text>
                <ChakraLinkButton
                  href={`/live-session/${selected.live_session_id}`}
                  onClick={onClose}
                  size="sm"
                  variant="line"
                  leftIcon={<Radio size={15} strokeWidth={1.75} aria-hidden />}
                >
                  Recap ansehen
                </ChakraLinkButton>
              </Flex>
            ) : null}

            {selected?.external_url || discordUrl ? (
              <Flex wrap="wrap" gap={2} mb={5}>
                {selected?.external_url ? (
                  <Button as="a" href={selected.external_url} target="_blank" rel="noopener noreferrer" variant="line" size="sm">
                    Zum Event-Link
                  </Button>
                ) : null}
                {discordUrl ? (
                  <Button as="a" href={discordUrl} target="_blank" rel="noopener noreferrer" variant="line" size="sm">
                    Zum Discord-Server
                  </Button>
                ) : null}
              </Flex>
            ) : null}

            <Box pt={5} borderTop="1px solid var(--cc-line)">
              <Flex wrap="wrap" gap={3}>
                <Button
                  as="a"
                  href={googleUrl}
                  target="_blank"
                  rel="noreferrer"
                  variant="gold"
                  leftIcon={<GoogleCalendarBrandIcon boxSize="15px" />}
                >
                  Google Kalender
                </Button>
                <Button type="button" onClick={exportIcs} variant="line" leftIcon={<AppleBrandIcon boxSize="16px" />}>
                  Apple Kalender (.ics)
                </Button>
              </Flex>
              <Text fontSize="12px" lineHeight={1.5} color="var(--cc-text-3)" maxW="md" mt={3}>
                Google öffnet eine vorausgefüllte Terminerstellung. Apple lädt eine .ics-Datei zum Import in den Apple Kalender herunter.
              </Text>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}

function toCalendarStamp(isoDate: string): string {
  return new Date(isoDate).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function safeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]+/g, "").trim() || "event";
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function buildIcs(event: EventItem): string {
  const start = toCalendarStamp(event.start_time);
  const end = toCalendarStamp(event.end_time ?? new Date(new Date(event.start_time).getTime() + 60 * 60 * 1000).toISOString());
  const stamp = toCalendarStamp(new Date().toISOString());
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Capital Circle//Events//DE
BEGIN:VEVENT
UID:${escapeIcsText(event.id)}
DTSTAMP:${stamp}
DTSTART:${start}
DTEND:${end}
SUMMARY:${escapeIcsText(event.title)}
DESCRIPTION:${escapeIcsText(`${event.description ?? ""}${event.external_url ? `\\nLink: ${event.external_url}` : ""}`)}
END:VEVENT
END:VCALENDAR`;
}

function buildGoogleUrl(event: EventItem): string {
  const start = toCalendarStamp(event.start_time);
  const end = toCalendarStamp(event.end_time ?? new Date(new Date(event.start_time).getTime() + 60 * 60 * 1000).toISOString());
  const details = `${event.description ?? ""}${event.external_url ? `\n\nLink: ${event.external_url}` : ""}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${start}/${end}&details=${encodeURIComponent(details)}`;
}

function formatEventDateRange(startIso: string, endIso: string | null): string {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : null;
  const date = start.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
  const startTime = start.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const endTime = end ? end.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : null;
  return `${date} · ${startTime}${endTime ? ` – ${endTime}` : ""} Uhr`;
}
