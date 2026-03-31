import { Box, Heading, Text, VStack } from "@chakra-ui/react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { EventFeatureCard, type EventFeatureItem } from "@/components/platform/EventFeatureCard";
import type { EventRow } from "@/lib/server-data";
import { CalendarCheck2 } from "lucide-react";

type UpcomingEventsCardProps = {
  events: EventRow[];
  spotlight?: boolean;
};

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
        <VStack spacing={{ base: 3, md: 4 }} align="stretch" w="100%">
          {events.map((ev, index) => (
            <EventFeatureCard
              key={ev.id}
              event={toFeatureItem(ev)}
              variant={index === 0 ? "featured" : index === 2 ? "compact" : "standard"}
              embedded
            />
          ))}
        </VStack>
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
