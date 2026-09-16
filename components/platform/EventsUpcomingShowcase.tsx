import { Box, Grid, Heading, Text } from "@chakra-ui/react";
import { EventFeatureCard, type EventFeatureItem } from "@/components/platform/EventFeatureCard";

type EventsUpcomingShowcaseProps = {
  events: EventFeatureItem[];
  /** Wenn false: aktueller Nutzer ist Free (nicht bezahlt) */
  isPaid?: boolean;
};

/** Gestaffelter Einstieg (80ms + 70ms je Schritt). */
function riseDelay(i: number) {
  return { animationDelay: `${80 + Math.min(i, 10) * 70}ms` };
}

/** Obere Sektion: die drei nächsten anstehenden Events; das nächste ist die Hero-Karte. */
export function EventsUpcomingShowcase({ events, isPaid = true }: EventsUpcomingShowcaseProps) {
  return (
    <Box as="section" aria-labelledby="events-upcoming-title">
      <Heading
        as="h2"
        id="events-upcoming-title"
        fontSize="13px"
        lineHeight="18px"
        fontWeight={500}
        letterSpacing="0.12em"
        textTransform="uppercase"
        color="var(--cc-text-soft)"
        mb={4}
        className="cc-rise"
        style={riseDelay(0)}
      >
        Nächste Termine
      </Heading>

      {events.length === 0 ? (
        <Box className="cc-card cc-card--still cc-rise" style={riseDelay(1)} p={{ base: 5, md: 6 }}>
          <Text fontSize="15px" lineHeight={1.5} color="var(--cc-text-2)">
            Aktuell sind keine anstehenden Events geplant.
          </Text>
        </Box>
      ) : (
        <Grid
          templateColumns={{
            base: "minmax(0, 1fr)",
            md: "minmax(0, 2fr) minmax(0, 1fr)",
            xl: "minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr)",
          }}
          gap={5}
          alignItems="stretch"
        >
          {events.map((ev, index) => (
            <Box key={ev.id} className="cc-rise" style={riseDelay(index + 1)} minW={0} h="100%">
              <EventFeatureCard
                event={ev}
                variant={index === 0 ? "featured" : index === 2 ? "compact" : "standard"}
                nextEventSpotlight={index === 0}
                isPaid={isPaid}
              />
            </Box>
          ))}
        </Grid>
      )}
    </Box>
  );
}
