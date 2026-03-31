"use client";

import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import { GlassCard } from "@/components/ui/GlassCard";
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
  /** Eingebettet z. B. in Dashboard: weniger Padding, keine Kalender-Hilfetext-Zeile */
  embedded?: boolean;
};

/** Einzelnes Event als hervorgehobene Glass-Card (DESIGN.json: Radley, Inter, Mono, Accent Blue). */
export function EventFeatureCard({ event, variant = "standard", embedded = false }: EventFeatureCardProps) {
  const start = new Date(event.start_time);
  const end = event.end_time ? new Date(event.end_time) : null;

  const dayNum = start.toLocaleDateString("de-DE", { day: "2-digit" });
  const month = start.toLocaleDateString("de-DE", { month: "short" });
  const weekday = start.toLocaleDateString("de-DE", { weekday: "long" });
  const timeStart = start.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const timeEnd = end
    ? end.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
    : null;
  const googleStart = toCalendarStamp(event.start_time);
  const googleEnd = toCalendarStamp(event.end_time ?? new Date(start.getTime() + 60 * 60 * 1000).toISOString());
  const detailsForGoogle = `${event.description ?? ""}${event.external_url ? `\n\nLink: ${event.external_url}` : ""}`;
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${googleStart}/${googleEnd}&details=${encodeURIComponent(detailsForGoogle)}`;
  const isFeatured = variant === "featured";
  const pad = embedded ? { base: 3, md: isFeatured ? 4 : 3 } : { base: 4, md: isFeatured ? 5 : 4 };

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

  return (
    <GlassCard
      position="relative"
      overflow="hidden"
      h="100%"
      display="flex"
      flexDirection="column"
      p={pad}
      borderRadius={embedded ? "12px" : "16px"}
      className={isFeatured ? "glass-card-highlight" : undefined}
      transition="transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease"
      _hover={
        embedded
          ? { borderColor: "rgba(212, 175, 55, 0.55)" }
          : {
              transform: "translateY(-4px)",
              boxShadow: "0 16px 48px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(212, 175, 55, 0.28)",
            }
      }
    >
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        h="3px"
        bgGradient="linear(to-r, #E8C547, rgba(212, 175, 55, 0.2))"
        pointerEvents="none"
      />

      <Box display="flex" gap={embedded ? 2 : 3} flex="1" flexDir="column" alignItems="center" textAlign="center">
        <HStack
          spacing={embedded ? 2 : 3}
          py={embedded ? 1.5 : 2}
          px={embedded ? 2.5 : 3}
          borderRadius="12px"
          bg="rgba(212, 175, 55, 0.12)"
          border="1px solid rgba(212, 175, 55, 0.32)"
          minW={embedded ? "120px" : "140px"}
          justify="center"
        >
          <Text
            className="jetbrains-mono"
            fontSize={embedded ? (isFeatured ? "lg" : "md") : isFeatured ? "xl" : "lg"}
            fontWeight={500}
            lineHeight={1}
            color="var(--color-text-primary)"
          >
            {dayNum}
          </Text>
          <Text className="inter-medium" fontSize="xs" textTransform="uppercase" letterSpacing="0.14em" color="var(--color-accent-gold-light)">
            {month}
          </Text>
        </HStack>

        <Text className="inter" fontSize="xs" color="var(--color-text-muted)" textTransform="uppercase" letterSpacing="0.08em">
          {weekday}
        </Text>

        <Text
          as="h3"
          className={isFeatured ? "radley-regular" : "inter-semibold"}
          fontSize={
            embedded
              ? isFeatured
                ? "lg"
                : variant === "compact"
                  ? "sm"
                  : "md"
              : isFeatured
                ? "xl"
                : variant === "compact"
                  ? "md"
                  : "lg"
          }
          fontWeight={isFeatured ? 400 : 600}
          lineHeight="short"
          noOfLines={3}
          color="var(--color-text-primary)"
        >
          {event.title}
        </Text>

        {event.event_type ? (
          <Box
            as="span"
            display="inline-block"
            px={2.5}
            py={1}
            borderRadius="md"
            bg="rgba(212, 175, 55, 0.14)"
            border="1px solid rgba(212, 175, 55, 0.32)"
          >
            <Text className="inter-medium" fontSize="xs" color="var(--color-accent-gold-light)">
              {event.event_type}
            </Text>
          </Box>
        ) : null}

        <Text className="jetbrains-mono" fontSize="sm" color="var(--color-text-muted)">
          {timeStart}
          {timeEnd ? ` – ${timeEnd}` : ""}
        </Text>

        {event.description ? (
          <Text
            className="inter"
            fontSize={embedded ? "xs" : "sm"}
            color="rgba(240, 240, 242, 0.72)"
            lineHeight="tall"
            noOfLines={variant === "compact" || embedded ? 2 : 3}
            flex="1"
          >
            {event.description}
          </Text>
        ) : (
          <Text className="inter" fontSize={embedded ? "xs" : "sm"} fontStyle="italic" color="var(--color-text-muted)">
            Keine Beschreibung hinterlegt.
          </Text>
        )}

        <VStack spacing={embedded ? 1.5 : 2} pt={embedded ? 0 : 1} align="center" w="100%">
          <HStack spacing={embedded ? 2 : 3} justify="center" flexWrap="wrap">
            <Button
              as="a"
              href={googleUrl}
              target="_blank"
              rel="noreferrer"
              size="xs"
              variant="ghost"
              leftIcon={<GoogleCalendarBrandIcon boxSize="16px" />}
              border="1px solid rgba(212, 175, 55, 0.28)"
              color="var(--color-accent-gold-light)"
              _hover={{ bg: "rgba(212, 175, 55, 0.12)" }}
            >
              Google Kalender
            </Button>
            <Button
              onClick={exportIcs}
              size="xs"
              variant="ghost"
              leftIcon={<AppleBrandIcon boxSize="16px" />}
              border="1px solid rgba(255, 255, 255, 0.2)"
              color="var(--color-text-primary)"
              _hover={{ bg: "rgba(255,255,255,0.08)" }}
            >
              Apple Kalender
            </Button>
          </HStack>
          {embedded ? null : (
            <Text className="inter" fontSize="xs" color="var(--color-text-muted)" textAlign="center" lineHeight="1.5" maxW="280px" px={1}>
              Google öffnet eine vorausgefüllte Terminerstellung. Apple lädt eine .ics-Datei zum Import in den Apple Kalender herunter.
            </Text>
          )}
        </VStack>
      </Box>
    </GlassCard>
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
