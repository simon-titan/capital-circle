"use client";

import { Box, Heading, HStack, IconButton, Text } from "@chakra-ui/react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { EventFeatureCard, type EventFeatureItem } from "@/components/platform/EventFeatureCard";
import type { EventRow } from "@/lib/server-data";
import { CalendarCheck2, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { keyframes } from "@emotion/react";

type UpcomingEventsCardProps = {
  events: EventRow[];
  spotlight?: boolean;
};

const eventSlideIn = keyframes`
  0% {
    opacity: 0;
    transform: translateY(8px) scale(0.992);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

function toFeatureItem(ev: EventRow): EventFeatureItem {
  return {
    id: ev.id,
    title: ev.title,
    description: ev.description,
    start_time: ev.start_time,
    end_time: ev.end_time,
    event_type: ev.event_type,
    color: ev.color ?? undefined,
    external_url: ev.external_url ?? undefined,
  };
}

/** Gleiche Inhalts-Struktur wie EventsUpcomingShowcase + EventFeatureCard, kompakter fürs Dashboard. */
export function UpcomingEventsCard({ events }: UpcomingEventsCardProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (events.length === 0) {
      setActiveIndex(0);
      return;
    }
    if (activeIndex > events.length - 1) {
      setActiveIndex(events.length - 1);
    }
  }, [activeIndex, events.length]);

  const activeEvent = events[activeIndex] ?? null;

  return (
    <GlassCard dashboard h="100%">
      <Box display="flex" alignItems="flex-start" gap={3} mb={{ base: 5, md: 6 }}>
        <Box color="var(--color-accent-gold)" aria-hidden flexShrink={0} mt={0.5}>
          <CalendarCheck2 size={24} strokeWidth={1.7} />
        </Box>
        <Box minW={0}>
          <Text
            className="inter-medium"
            fontSize="xs"
            textTransform="uppercase"
            letterSpacing="0.14em"
            color="rgba(255, 255, 255, 0.5)"
            mb={1.5}
          >
            Anstehend
          </Text>
          <Heading as="h2" size="md" className="inter-semibold" fontWeight={600} lineHeight="short">
            Nächste Termine
          </Heading>
          <Text
            className="radley-regular-italic"
            fontSize={{ base: "sm", md: "sm" }}
            color="rgba(245, 236, 210, 0.88)"
            lineHeight={1.35}
            mt={2}
          >
            Deine nächsten Termine im Blick.
          </Text>
          <Text className="inter" fontSize="xs" color="var(--color-text-muted)" mt={2} lineHeight="tall">
            Die nächsten Events inklusive Kalender-Export.
          </Text>
        </Box>
      </Box>

      {events.length === 0 ? (
        <Box
          py={8}
          px={3}
          textAlign="center"
          borderRadius="12px"
          border="1px dashed var(--color-border)"
          bg="rgba(255,255,255,0.02)"
        >
          <Text className="inter" color="var(--color-text-muted)" fontSize="sm">
            Aktuell sind keine anstehenden Events geplant.{" "}
            <Link href="/events" style={{ color: "var(--color-accent-gold-light)", textDecoration: "underline" }}>
              Zur Event-Übersicht
            </Link>
          </Text>
        </Box>
      ) : (
        <Box>
          {activeEvent ? (
            <Box key={activeEvent.id} animation={`${eventSlideIn} 280ms ease-out`}>
              <EventFeatureCard event={toFeatureItem(activeEvent)} variant="featured" embedded />
            </Box>
          ) : null}
          {events.length > 1 ? (
            <HStack justify="space-between" align="center" mt={3}>
              <IconButton
                aria-label="Vorheriger Termin"
                icon={<ChevronLeft size={16} />}
                size="sm"
                variant="ghost"
                onClick={() => setActiveIndex((prev) => (prev - 1 + events.length) % events.length)}
              />
              <Text className="jetbrains-mono" fontSize="xs" color="var(--color-text-muted)">
                {activeIndex + 1}/{events.length}
              </Text>
              <IconButton
                aria-label="Nächster Termin"
                icon={<ChevronRight size={16} />}
                size="sm"
                variant="ghost"
                onClick={() => setActiveIndex((prev) => (prev + 1) % events.length)}
              />
            </HStack>
          ) : null}
        </Box>
      )}

      {events.length > 0 ? (
        <Box mt={5}>
          <Link href="/events" className="inter-semibold" style={{ color: "var(--color-accent-gold-light)", fontSize: "0.875rem" }}>
            Alle Events →
          </Link>
        </Box>
      ) : null}
    </GlassCard>
  );
}
