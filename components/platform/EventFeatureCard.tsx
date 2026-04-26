"use client";

import { Badge, Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
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
  /** Eingebettet z. B. in Dashboard: weniger Padding */
  embedded?: boolean;
  /** Nächstes anstehendes Event: Gold-Ring + Badge (Dashboard / Events-Übersicht) */
  nextEventSpotlight?: boolean;
  /** If false: the current user is a Free member (not paid). Default: true */
  isPaid?: boolean;
};

/** Einzelnes Event als hervorgehobene Glass-Card (DESIGN.json: Radley, Inter, Mono, Accent Blue). */
export function EventFeatureCard({
  event,
  variant = "standard",
  embedded = false,
  nextEventSpotlight = false,
  isPaid = true,
}: EventFeatureCardProps) {
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
  const pad = embedded ? { base: 2.5, md: isFeatured ? 3.5 : 2.5 } : { base: 3, md: isFeatured ? 4 : 3 };
  const spotlightShadow =
    nextEventSpotlight && isFeatured
      ? embedded
        ? "0 0 36px rgba(212, 175, 55, 0.35), 0 0 0 1px rgba(232, 197, 71, 0.5)"
        : "0 0 40px rgba(212, 175, 55, 0.3), 0 0 0 1px rgba(232, 197, 71, 0.48)"
      : undefined;

  const berlinWeekday = new Intl.DateTimeFormat("de-DE", { weekday: "long", timeZone: "Europe/Berlin" }).format(start);
  const isSunday = berlinWeekday === "Sonntag";
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

  const glassCard = (
    <GlassCard
      position="relative"
      overflow="hidden"
      h="100%"
      display="flex"
      flexDirection="column"
      p={pad}
      borderRadius={embedded ? "12px" : "16px"}
      className={isFeatured ? "glass-card-highlight" : undefined}
      boxShadow={
        spotlightShadow ??
        (isFeatured && !embedded ? "0 0 32px rgba(212, 175, 55, 0.22), 0 0 0 1px rgba(212, 175, 55, 0.35)" : undefined)
      }
      transition="transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease"
      _hover={
        embedded
          ? { borderColor: "rgba(212, 175, 55, 0.55)" }
          : isFeatured
            ? {
                transform: "translateY(-3px)",
                boxShadow:
                  "0 0 40px rgba(212, 175, 55, 0.32), 0 16px 40px rgba(0, 0, 0, 0.38), 0 0 0 1px rgba(212, 175, 55, 0.42)",
              }
            : {
                transform: "translateY(-3px)",
                boxShadow: "0 12px 36px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(212, 175, 55, 0.24)",
              }
      }
      // If the user is a free member and this is not the Sunday Free Call, visually de-emphasize and disable interactions.
      sx={
        lockedForFree
          ? {
              filter: "grayscale(70%)",
              opacity: 0.55,
              pointerEvents: "none",
            }
          : undefined
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

      {nextEventSpotlight && isFeatured ? (
        <Badge
          position="absolute"
          top={embedded ? 2 : 3}
          right={embedded ? 2 : 3}
          zIndex={3}
          px={2.5}
          py={1}
          borderRadius="full"
          bg="rgba(212, 175, 55, 0.22)"
          color="var(--color-accent-gold-light)"
          borderWidth="1px"
          borderColor="rgba(232, 197, 71, 0.45)"
          className="inter-medium"
          fontSize="10px"
          textTransform="uppercase"
          letterSpacing="0.14em"
          pointerEvents="none"
        >
          Nächstes Event
        </Badge>
      ) : null}
      {/* If this is the Free Call (Sunday) show a distinguishing badge. If locked for free members, show a Premium badge. */}
      {(() => {
        if (!isPaid && !isSunday) {
          return (
            <Badge
              position="absolute"
              top={embedded ? 2 : 3}
              left={embedded ? 2 : 3}
              zIndex={3}
              px={2}
              py={1}
              borderRadius="full"
              bg="rgba(255,255,255,0.04)"
              color="rgba(255,255,255,0.6)"
              borderWidth="1px"
              borderColor="rgba(255,255,255,0.06)"
              className="inter-medium"
              fontSize="10px"
              textTransform="uppercase"
              letterSpacing="0.12em"
              pointerEvents="none"
            >
              Nur Premium
            </Badge>
          );
        }
        if (!isPaid && isSunday) {
          return (
            <Badge
              position="absolute"
              top={embedded ? 2 : 3}
              left={embedded ? 2 : 3}
              zIndex={3}
              px={2}
              py={1}
              borderRadius="full"
              bg="rgba(212, 175, 55, 0.24)"
              color="var(--color-accent-gold-light)"
              borderWidth="1px"
              borderColor="rgba(232, 197, 71, 0.45)"
              className="inter-medium"
              fontSize="10px"
              textTransform="uppercase"
              letterSpacing="0.12em"
              pointerEvents="none"
            >
              Free Call
            </Badge>
          );
        }
        return null;
      })()}

      <Box display="flex" gap={embedded ? 1.5 : 2.5} flex="1" flexDir="column" alignItems="center" textAlign="center">
        <HStack
          spacing={embedded ? 1.5 : 2}
          py={embedded ? 1 : 1.5}
          px={embedded ? 2 : 2.5}
          borderRadius="10px"
          bg="rgba(212, 175, 55, 0.1)"
          border="1px solid rgba(212, 175, 55, 0.28)"
          minW={embedded ? "108px" : "128px"}
          justify="center"
        >
          <Text
            className="jetbrains-mono"
            fontSize={embedded ? (isFeatured ? "md" : "sm") : isFeatured ? "lg" : "md"}
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

        <Text
          className="inter-semibold"
          fontSize={embedded ? "sm" : "md"}
          letterSpacing="0.02em"
          color="var(--color-accent-gold-light)"
        >
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
                href={isPaid ? googleUrl : "#"}
                target={isPaid ? "_blank" : undefined}
                rel={isPaid ? "noreferrer" : undefined}
                size="xs"
                variant="ghost"
                leftIcon={<GoogleCalendarBrandIcon boxSize="16px" />}
                border="1px solid rgba(212, 175, 55, 0.28)"
                color="var(--color-accent-gold-light)"
                _hover={isPaid ? { bg: "rgba(212, 175, 55, 0.12)" } : undefined}
                aria-disabled={!isPaid}
              >
                Google Kalender
              </Button>
              <Button
                onClick={isPaid ? exportIcs : undefined}
                size="xs"
                variant="ghost"
                leftIcon={<AppleBrandIcon boxSize="16px" />}
                border="1px solid rgba(255, 255, 255, 0.2)"
                color="var(--color-text-primary)"
                _hover={isPaid ? { bg: "rgba(255,255,255,0.08)" } : undefined}
                aria-disabled={!isPaid}
              >
                Apple Kalender
              </Button>
            </HStack>
        </VStack>
      </Box>
    </GlassCard>
  );

  if (nextEventSpotlight && isFeatured) {
    return (
      <Box
        className={embedded ? "event-next-spotlight-ring event-next-spotlight-ring--embedded" : "event-next-spotlight-ring"}
        position="relative"
        h="100%"
      >
        {glassCard}
      </Box>
    );
  }

  return glassCard;
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
