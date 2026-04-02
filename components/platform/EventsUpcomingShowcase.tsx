import { Box, Grid, Heading, Text } from "@chakra-ui/react";
import { GlassCard } from "@/components/ui/GlassCard";
import { EventFeatureCard, type EventFeatureItem } from "@/components/platform/EventFeatureCard";
import { CalendarCheck2 } from "lucide-react";

type EventsUpcomingShowcaseProps = {
  events: EventFeatureItem[];
};

/** Obere Sektion: die drei nächsten anstehenden Events als Karten-Showcase. */
export function EventsUpcomingShowcase({ events }: EventsUpcomingShowcaseProps) {
  return (
    <GlassCard p={{ base: 4, md: 5 }}>
      <Box display="flex" alignItems="center" gap={3} mb={6}>
        <Box color="var(--color-accent-gold)" aria-hidden>
          <CalendarCheck2 size={26} strokeWidth={1.7} />
        </Box>
        <Box>
          <Text
            className="inter-medium"
            fontSize="xs"
            textTransform="uppercase"
            letterSpacing="0.14em"
            color="rgba(255, 255, 255, 0.5)"
            mb={2}
          >
            Anstehend
          </Text>
          <Heading as="h1" size="lg" className="inter-semibold" fontWeight={600} mt={0.5}>
            Nächste Termine
          </Heading>
          <Text className="radley-regular-italic" fontSize={{ base: "sm", md: "md" }} color="rgba(245, 236, 210, 0.88)" lineHeight={1.35} mt={2}>
            Deine nächsten Termine im Blick.
          </Text>
        </Box>
      </Box>

      {events.length === 0 ? (
        <Box
          py={12}
          px={4}
          textAlign="center"
          borderRadius="12px"
          border="1px dashed var(--color-border)"
          bg="rgba(255,255,255,0.02)"
        >
          <Text className="inter" color="var(--color-text-muted)">
            Aktuell sind keine anstehenden Events geplant.
          </Text>
        </Box>
      ) : (
        <Grid templateColumns={{ base: "1fr", md: "2fr 1fr", xl: "2fr 1fr 1fr" }} gap={{ base: 4, md: 5 }} alignItems="stretch">
          {events.map((ev, index) => (
            <EventFeatureCard
              key={ev.id}
              event={ev}
              variant={index === 0 ? "featured" : index === 2 ? "compact" : "standard"}
              nextEventSpotlight={index === 0}
            />
          ))}
        </Grid>
      )}
    </GlassCard>
  );
}
