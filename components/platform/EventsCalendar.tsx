"use client";

import {
  Box,
  Button,
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
import { useMemo, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { ChakraLinkButton } from "@/components/platform/ChakraLinkButton";
import { AppleBrandIcon, GoogleCalendarBrandIcon } from "@/components/platform/eventCalendarBrandIcons";
import { CalendarDays, Radio } from "lucide-react";
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
};

export function EventsCalendar({ events }: EventsCalendarProps) {
  const [selected, setSelected] = useState<EventItem | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const calendarEvents = useMemo(
    () =>
      events.map((event) => ({
        id: event.id,
        title: event.title,
        start: event.start_time,
        end: event.end_time ?? undefined,
        backgroundColor: resolveEventColor(event.color),
        borderColor: resolveEventColor(event.color),
        textColor: isLightColor(resolveEventColor(event.color)) ? "#0a0a0a" : "#f0f0f2",
      })),
    [events],
  );

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

  return (
    <GlassCard p={{ base: 5, md: 8 }}>
      <Box display="flex" alignItems="flex-start" gap={3} mb={6} flexWrap="wrap">
        <Box color="var(--color-accent-gold)" mt={0.5}>
          <CalendarDays size={28} strokeWidth={1.5} />
        </Box>
        <Box flex="1" minW={0}>
          <Text
            className="inter-medium"
            fontSize="xs"
            textTransform="uppercase"
            letterSpacing="0.14em"
            color="rgba(255, 255, 255, 0.5)"
            mb={2}
          >
            Übersicht
          </Text>
          <Heading as="h2" size="lg" className="inter-semibold" fontWeight={600} mt={0.5}>
            Kalender
          </Heading>
          <Text className="radley-regular-italic" fontSize={{ base: "sm", md: "md" }} color="rgba(245, 236, 210, 0.88)" lineHeight={1.35} mt={2}>
            Termine im Blick — Woche, Monat oder Liste, mit einem Klick in deinen Kalender.
          </Text>
          <Text className="inter" fontSize="sm" color="var(--color-text-muted)" mt={2}>
            Klick auf ein Event für Details, Links und Export.
          </Text>
        </Box>
      </Box>

      <Box className="events-calendar-root">
        <FullCalendar
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
            setSelected(event);
            onOpen();
          }}
        />
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} isCentered motionPreset="slideInBottom">
        <ModalOverlay bg="rgba(7, 8, 10, 0.75)" backdropFilter="blur(8px)" />
        <ModalContent
          className="glass-card"
          bg="rgba(12, 13, 16, 0.96)"
          backdropFilter="blur(24px)"
          borderWidth="1px"
          borderColor="rgba(255, 255, 255, 0.1)"
          borderRadius="16px"
          boxShadow="0 8px 32px rgba(0, 0, 0, 0.5)"
          color="var(--color-text-primary)"
          mx={4}
        >
          <ModalCloseButton
            color="var(--color-text-muted)"
            _hover={{ color: "var(--color-accent-gold-light)", bg: "rgba(255,255,255,0.06)" }}
          />
          <ModalHeader
            className="inter-semibold"
            fontWeight={600}
            fontSize="xl"
            pr={10}
            pb={3}
            borderBottomWidth="1px"
            borderBottomColor="rgba(255, 255, 255, 0.08)"
            color="var(--color-text-primary)"
          >
            <Text className="inter-medium" fontSize="xs" textTransform="uppercase" letterSpacing="0.14em" color="rgba(255, 255, 255, 0.5)" mb={1}>
              Termin
            </Text>
            <Text as="span" display="block" color="var(--color-text-primary)">
              {selected?.title}
            </Text>
          </ModalHeader>
          <ModalBody pb={6} pt={5} color="var(--color-text-primary)">
            {selected?.event_type ? (
              <Text className="inter-medium" fontSize="xs" color="var(--color-accent-gold-light)" mb={3} textTransform="uppercase" letterSpacing="0.06em">
                {selected.event_type}
              </Text>
            ) : null}
            <Text className="jetbrains-mono" fontSize="sm" color="var(--color-accent-gold-light)" mb={4}>
              {selected ? formatEventDateRange(selected.start_time, selected.end_time) : ""}
            </Text>
            <Text className="inter" fontSize="sm" color="rgba(240, 240, 242, 0.88)" mb={6} whiteSpace="pre-wrap" lineHeight="tall">
              {selected?.description || "Keine Beschreibung hinterlegt."}
            </Text>
            {selected?.live_session_id ? (
              <Box
                mb={4}
                p={3}
                borderRadius="12px"
                borderWidth="1px"
                borderColor="rgba(100, 170, 240, 0.5)"
                bg="rgba(74, 144, 217, 0.12)"
                boxShadow="0 0 20px rgba(74, 144, 217, 0.1)"
              >
                <Text
                  className="inter-semibold"
                  fontSize="xs"
                  textTransform="uppercase"
                  letterSpacing="0.1em"
                  color="rgba(147, 197, 253, 0.9)"
                  mb={2}
                >
                  Aufzeichnung verfügbar
                </Text>
                <ChakraLinkButton
                  href={`/live-session/${selected.live_session_id}`}
                  onClick={onClose}
                  size="sm"
                  colorScheme="blue"
                  variant="solid"
                  leftIcon={<Radio size={16} aria-hidden />}
                >
                  Recap ansehen
                </ChakraLinkButton>
              </Box>
            ) : null}
            {selected?.external_url ? (
              <Button
                as="a"
                href={selected.external_url}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                borderColor="rgba(255,255,255,0.3)"
                color="var(--color-text-primary)"
                size="sm"
                mb={3}
              >
                Zum Event-Link
              </Button>
            ) : null}
            {process.env.NEXT_PUBLIC_DISCORD_COMMUNITY_URL ? (
              <Button
                as="a"
                href={process.env.NEXT_PUBLIC_DISCORD_COMMUNITY_URL}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                borderColor="rgba(255,255,255,0.3)"
                color="var(--color-text-primary)"
                size="sm"
                mb={4}
                ml={selected?.external_url ? 2 : 0}
              >
                Zum Discord-Server
              </Button>
            ) : null}
            <Box display="flex" gap={3} flexWrap="wrap" flexDir="column">
              <Box display="flex" gap={3} flexWrap="wrap">
                <Button
                  as="a"
                  href={googleUrl}
                  target="_blank"
                  rel="noreferrer"
                  leftIcon={<GoogleCalendarBrandIcon />}
                  bg="linear-gradient(135deg, var(--color-accent-gold-light), var(--color-accent-gold))"
                  color="#0a0a0a"
                  fontWeight={600}
                  _hover={{ boxShadow: "0 0 24px var(--color-accent-glow)" }}
                  size="md"
                >
                  Google Kalender
                </Button>
                <Button
                  onClick={exportIcs}
                  leftIcon={<AppleBrandIcon />}
                  variant="outline"
                  borderColor="rgba(255,255,255,0.3)"
                  color="var(--color-text-primary)"
                  _hover={{ bg: "rgba(255,255,255,0.08)" }}
                  size="md"
                >
                  Apple Kalender (.ics)
                </Button>
              </Box>
              <Text className="inter" fontSize="xs" color="var(--color-text-muted)" lineHeight="1.5" maxW="md">
                Google öffnet eine vorausgefüllte Terminerstellung. Apple lädt eine .ics-Datei zum Import in den Apple Kalender herunter.
              </Text>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </GlassCard>
  );
}

const EVENT_COLORS = new Set(["#D4AF37", "#4A90D9", "#4ADE80", "#F87171", "#A78BFA"]);

function resolveEventColor(color?: string | null): string {
  if (!color) return "#D4AF37";
  const normalized = color.trim().toUpperCase();
  return EVENT_COLORS.has(normalized) ? normalized : "#D4AF37";
}

function isLightColor(hexColor: string): boolean {
  const hex = hexColor.replace("#", "");
  const num = Number.parseInt(hex, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.62;
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
  return `${date} ${startTime}${endTime ? ` - ${endTime}` : ""}`;
}
