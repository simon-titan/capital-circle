import type { Metadata } from "next";
import { Box, Button, HStack, Stack, Text } from "@chakra-ui/react";
import { Check } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import {
  CardLabel,
  FunnelEyebrow,
  FunnelFinePrint,
  FunnelHeadline,
  FunnelLead,
  FunnelVideoFrame,
  GoldWord,
  rise,
} from "@/components/marketing/funnel-ui";

export const metadata: Metadata = {
  title: "Du hast bestanden — Mitgliedschaft · Capital Circle",
  description:
    "Du erfüllst alle Voraussetzungen für die Capital Circle Mitgliedschaft. Wähle deinen Plan und starte sofort.",
  robots: { index: false, follow: false },
};

const EXPECTATIONS = [
  "Sofortiger Zugriff auf alle Module & Live-Analysen",
  "Trading-Journal mit datengetriebenem Edge-Tracking",
  "Aktive Community von ambitionierten Tradern",
];

export default function ThanksMembershipPage() {
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL?.trim() || "";
  const videoSrc = process.env.NEXT_PUBLIC_MEMBERSHIP_THANKS_VIDEO_URL?.trim() || "";
  const videoPoster =
    process.env.NEXT_PUBLIC_MEMBERSHIP_THANKS_VIDEO_POSTER?.trim() || "";

  return (
    <Box as="main" minH="100vh" w="full" py={{ base: 10, md: 16 }} px={{ base: 4, md: 8 }}>
      <Stack spacing={{ base: 8, md: 10 }} maxW="780px" mx="auto">
        <Box maxW="180px" mx="auto" {...rise(0)}>
          <Logo variant="onDark" priority />
        </Box>

        {videoSrc ? (
          <Box w="full" {...rise(1)}>
            <FunnelVideoFrame>
              <Box
                as="video"
                src={videoSrc}
                poster={videoPoster || undefined}
                controls
                playsInline
                autoPlay
                preload="metadata"
                w="full"
                h="full"
                sx={{ objectFit: "cover" }}
              />
            </FunnelVideoFrame>
          </Box>
        ) : null}

        {/* Nächster Schritt: Hero-Karte (Gold-Rahmen, Gold-Schein, atmender Glow) */}
        <Box w="full" {...rise(2)}>
          <Stack
            className="cc-card cc-card--hero"
            spacing={6}
            textAlign="center"
            align="center"
            p={{ base: 6, md: 10 }}
          >
            <Stack spacing={4} align="center">
              <FunnelEyebrow>Voraussetzungen erfüllt</FunnelEyebrow>
              <FunnelHeadline scale="lg">
                Du hast <GoldWord>alle Voraussetzungen</GoldWord> erfüllt!
              </FunnelHeadline>
            </Stack>

            <FunnelLead maxW="560px" lineHeight={1.7}>
              Du bist bereit für Capital Circle. Auf der Plattform findest du das
              komplette Curriculum, tägliche Live-Analysen, das Trading-Journal mit
              datengetriebenem Edge-Tracking — und eine Community, die dasselbe Ziel
              verfolgt wie du. Wähle deinen Einstieg.
            </FunnelLead>

            <Stack spacing={4} w="full" maxW="520px" pt={2}>
              {/*
                Ein Knopf statt zweier Preisknöpfe: Die Laufzeiten stehen seit
                dem Umbau auf der Startseite (Abschnitt „Angebot"), und `/pricing`
                gibt es nicht mehr. Bares `<a>`, weil das Ziel ein Anker auf einer
                anderen Seite ist.
              */}
              <Button as="a" href="/#angebot" variant="gold" size="lg" h="52px" w="full" fontSize="16px">
                <Box as="span" className="cc-num">
                  Ab 99 € / Monat — Laufzeit wählen →
                </Box>
              </Button>
              <FunnelFinePrint color="var(--cc-text-2)">
                Monatlich, vierteljährlich oder jährlich — der Monatsplan ist monatlich kündbar.
              </FunnelFinePrint>
            </Stack>

            {calendlyUrl ? (
              <Box pt={2}>
                <Box
                  as="a"
                  href={calendlyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  color="var(--cc-text-2)"
                  fontSize="14px"
                  textDecoration="underline"
                  textUnderlineOffset="3px"
                  transition="color 180ms var(--cc-ease)"
                  _hover={{ color: "var(--cc-gold-light)" }}
                >
                  Doch lieber Fragen? Kostenloses Erstgespräch buchen →
                </Box>
              </Box>
            ) : null}
          </Stack>
        </Box>

        <Stack spacing={4} maxW="640px" mx="auto" align="center" textAlign="center" {...rise(3)}>
          <CardLabel as="h2">Was dich erwartet</CardLabel>
          <Stack as="ul" spacing={2.5} listStyleType="none" align="flex-start">
            {EXPECTATIONS.map((item) => (
              <HStack as="li" key={item} spacing={3} align="flex-start">
                <Box color="var(--cc-gold-light)" pt="3px" flexShrink={0} aria-hidden>
                  <Check size={15} strokeWidth={2} />
                </Box>
                <Text fontSize="14px" color="var(--cc-text-soft)" textAlign="left" lineHeight={1.6}>
                  {item}
                </Text>
              </HStack>
            ))}
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}
