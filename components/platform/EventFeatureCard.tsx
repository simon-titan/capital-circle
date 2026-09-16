"use client";

import { Box, Button, Flex, HStack, Text } from "@chakra-ui/react";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { clampLines } from "@/components/platform/dashboard/primitives";
import { AppleBrandIcon, GoogleCalendarBrandIcon } from "@/components/platform/eventCalendarBrandIcons";

export type EventFeatureItem = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  event_type: string | null;
  color?: string | null;
  external_url?: string | null;
};

type EventFeatureCardProps = {
  event: EventFeatureItem;
  variant?: "featured" | "standard" | "compact";
  /** Eingebettet z. B. in Dashboard: weniger Padding */
  embedded?: boolean;
  /** Nächstes anstehendes Event: Hero-Karte + Badge (Events-Übersicht) */
  nextEventSpotlight?: boolean;
  /** If false: the current user is a Free member (not paid). Default: true */
  isPaid?: boolean;
};

/** Alle Zeitangaben in Berlin — gleiche Ausgabe auf Server und Client, passend zur Sonntags-Logik. */
const TZ = "Europe/Berlin";

function fmt(date: Date, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("de-DE", { ...opts, timeZone: TZ }).format(date);
}

type PillTone = "gold" | "neutral" | "muted";

const PILL_TONES: Record<PillTone, { color: string; borderColor: string; bg: string }> = {
  gold: { color: "var(--cc-gold-light)", borderColor: "rgba(212, 176, 128, 0.3)", bg: "rgba(212, 176, 128, 0.07)" },
  neutral: { color: "var(--cc-text-2)", borderColor: "var(--cc-line)", bg: "rgba(255, 255, 255, 0.03)" },
  muted: { color: "var(--cc-text-3)", borderColor: "var(--cc-line)", bg: "transparent" },
};

function Pill({ tone, icon, upper = false, children }: { tone: PillTone; icon?: ReactNode; upper?: boolean; children: ReactNode }) {
  return (
    <HStack
      as="span"
      display="inline-flex"
      spacing={1.5}
      px={2.5}
      py={1}
      borderRadius="full"
      borderWidth="1px"
      borderStyle="solid"
      fontSize={upper ? "11px" : "12px"}
      lineHeight="16px"
      fontWeight={500}
      whiteSpace="nowrap"
      {...PILL_TONES[tone]}
      {...(upper ? { letterSpacing: "0.12em", textTransform: "uppercase" as const } : null)}
    >
      {icon}
      <span>{children}</span>
    </HStack>
  );
}

/** Datums-Kachel: neutral wie die Icon-Kacheln im Kunden-Mockup. */
function DateTile({ day, month }: { day: string; month: string }) {
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      w="56px"
      h="56px"
      flexShrink={0}
      borderRadius="12px"
      border="1px solid var(--cc-line-strong)"
      bg="rgba(255, 255, 255, 0.02)"
      boxShadow="inset 0 1px 0 rgba(255, 255, 255, 0.05)"
    >
      <Text className="cc-num" fontSize="20px" fontWeight={600} lineHeight={1} letterSpacing="-0.02em" color="var(--cc-text)">
        {day}
      </Text>
      <Text fontSize="11px" fontWeight={500} lineHeight={1} letterSpacing="0.12em" textTransform="uppercase" color="var(--cc-text-2)" mt={1.5}>
        {month}
      </Text>
    </Flex>
  );
}

/** Einzelnes Event als Glas-Karte (`.cc-card`); das nächste Event trägt die Hero-Behandlung. */
export function EventFeatureCard({
  event,
  variant = "standard",
  embedded = false,
  nextEventSpotlight = false,
  isPaid = true,
}: EventFeatureCardProps) {
  const start = new Date(event.start_time);
  const end = event.end_time ? new Date(event.end_time) : null;

  const dayNum = fmt(start, { day: "2-digit" });
  const month = fmt(start, { month: "short" }).replace(".", "");
  const weekday = fmt(start, { weekday: "long" });
  const timeStart = fmt(start, { hour: "2-digit", minute: "2-digit" });
  const timeEnd = end ? fmt(end, { hour: "2-digit", minute: "2-digit" }) : null;
  const googleStart = toCalendarStamp(event.start_time);
  const googleEnd = toCalendarStamp(event.end_time ?? new Date(start.getTime() + 60 * 60 * 1000).toISOString());
  const detailsForGoogle = `${event.description ?? ""}${event.external_url ? `\n\nLink: ${event.external_url}` : ""}`;
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${googleStart}/${googleEnd}&details=${encodeURIComponent(detailsForGoogle)}`;
  const isFeatured = variant === "featured";
  const hero = nextEventSpotlight && isFeatured;

  const isSunday = weekday === "Sonntag";
  const lockedForFree = !isPaid && !isSunday;

  const exportIcs = () => {
    const ics = buildIcs(event);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFileName(event.title)}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const badges: ReactNode[] = [];
  if (hero) {
    badges.push(
      <Pill key="next" tone="gold" upper>
        Nächstes Event
      </Pill>,
    );
  }
  if (!isPaid) {
    badges.push(
      isSunday ? (
        <Pill key="free" tone="gold" upper>
          Free Call
        </Pill>
      ) : (
        <Pill key="premium" tone="muted" upper icon={<Lock size={11} strokeWidth={2} aria-hidden />}>
          Nur Premium
        </Pill>
      ),
    );
  }

  const titleSize = isFeatured
    ? { base: "18px", md: "20px" }
    : variant === "compact"
      ? { base: "16px", md: "17px" }
      : { base: "17px", md: "18px" };

  return (
    <Flex
      as="article"
      direction="column"
      className={["cc-card", hero ? "cc-card--hero" : null].filter(Boolean).join(" ")}
      h="100%"
      minW={0}
      p={embedded ? 4 : { base: 5, md: 6 }}
      // Free-Mitglieder: alles außer dem Sonntags-Call ist gesperrt — sichtbar, aber nicht bedienbar.
      sx={lockedForFree ? { opacity: 0.6, filter: "grayscale(60%)", pointerEvents: "none" } : undefined}
    >
      {badges.length > 0 ? (
        <Flex wrap="wrap" gap={2} mb={4}>
          {badges}
        </Flex>
      ) : null}

      <Flex gap={4} align="flex-start">
        <DateTile day={dayNum} month={month} />
        <Box flex="1" minW={0}>
          <Text
            as="h3"
            fontSize={titleSize}
            fontWeight={600}
            lineHeight={1.3}
            letterSpacing="-0.01em"
            color="var(--cc-text)"
            sx={clampLines(3)}
          >
            {event.title}
          </Text>
          <Text className="cc-num" fontSize="14px" lineHeight={1.5} color="var(--cc-text-soft)" mt={1}>
            {weekday} · {timeStart}
            {timeEnd ? ` – ${timeEnd}` : ""} Uhr
          </Text>
        </Box>
      </Flex>

      {event.event_type ? (
        <Box mt={4}>
          <Pill tone="neutral">{event.event_type}</Pill>
        </Box>
      ) : null}

      {event.description ? (
        <Text
          fontSize="14px"
          lineHeight={1.6}
          color="var(--cc-text-2)"
          mt={3}
          sx={clampLines(variant === "compact" || embedded ? 2 : 3)}
        >
          {event.description}
        </Text>
      ) : (
        <Text fontSize="14px" lineHeight={1.6} color="var(--cc-text-3)" mt={3}>
          Keine Beschreibung hinterlegt.
        </Text>
      )}

      <Flex wrap="wrap" gap={2} mt="auto" pt={5}>
        <Button
          as="a"
          href={isPaid ? googleUrl : undefined}
          target={isPaid ? "_blank" : undefined}
          rel={isPaid ? "noreferrer" : undefined}
          size="sm"
          variant="line"
          leftIcon={<GoogleCalendarBrandIcon boxSize="14px" />}
          isDisabled={!isPaid}
        >
          Google Kalender
        </Button>
        <Button
          type="button"
          onClick={isPaid ? exportIcs : undefined}
          size="sm"
          variant="line"
          leftIcon={<AppleBrandIcon boxSize="15px" />}
          isDisabled={!isPaid}
        >
          Apple Kalender
        </Button>
      </Flex>
    </Flex>
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

function buildIcs(event: EventFeatureItem): string {
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
