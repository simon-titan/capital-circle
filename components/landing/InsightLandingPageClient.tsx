"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { Box, Button, Flex, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Lock, TrendingUp, Trophy, BarChart3, CalendarDays, LineChart, Users, Crown } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { PlatformBackground } from "@/components/layout/PlatformBackground";
import { MobileCTAFooter } from "./MobileCTAFooter";
import { landingConfig } from "@/config/landing-config";
import {
  Accent,
  CardRail,
  DisplayHeading,
  Eyebrow,
  heroRise,
  LandingChromeStyles,
  LandingFooter,
  LandingSplash,
  OfferCard,
  Reveal,
  VideoStage,
} from "./landing-ui";

const FreeApplicationModal = dynamic(
  () =>
    import("@/components/marketing/FreeApplicationModal").then((m) => ({
      default: m.FreeApplicationModal,
    })),
  { ssr: false },
);

/* ── Inhalts-Karten ──────────────────────────────────────── */

interface InsightCard {
  iconName: string;
  title: string;
  description: string;
  bullet: string;
}

const INSIGHT_CARDS: InsightCard[] = [
  {
    iconName: "TrendingUp",
    title: "Warum du mit Retail-Strategien nie konsistent wirst",
    description:
      "Dieser Free Kurs ist nicht dafür gedacht, dir einfach nur kostenlose Inhalte zu geben.",
    bullet:
      "Ein klarer Einblick in professionelles Trading jenseits von oberflächlichem Social-Media-Wissen",
  },
  {
    iconName: "BarChart3",
    title: "Wie institutionelle Trader den Markt lesen – und du es auch kannst",
    description:
      "Lerne die Methodik, die institutionelle Trader verwenden — nicht das, was auf Social Media kursiert.",
    bullet:
      "Mein Ansatz auf Basis von Auction Market Theory, Volumen und institutionellem Kontext",
  },
  {
    iconName: "CalendarDays",
    title: "Jede Woche vorbereitet in den Markt – nie wieder blind traden",
    description:
      "Bereite dich jede Woche strukturiert auf die kommende Handelswoche vor.",
    bullet:
      "Kostenloser Einblick in meinen sonntäglichen Framework Call zur Vorbereitung auf die Handelswoche",
  },
];

const CARD_HEADER_ICONS: Record<string, ReactNode> = {
  TrendingUp: <TrendingUp size={22} strokeWidth={1.5} />,
  BarChart3: <BarChart3 size={22} strokeWidth={1.5} />,
  CalendarDays: <CalendarDays size={22} strokeWidth={1.5} />,
};

/* ── Seitenkarte: Belege + Bewerbung ─────────────────────── */

const SIDEBAR_HIGHLIGHT_ROWS: { text: string; icon: ReactNode }[] = [
  { text: "5 Jahren Trading-Erfahrung", icon: <LineChart size={16} strokeWidth={1.75} /> },
  { text: "Mehrfach 6-stellige Payouts erzielt", icon: <Trophy size={16} strokeWidth={1.75} /> },
  { text: "1000+ Trader ausgebildet", icon: <Users size={16} strokeWidth={1.75} /> },
  { text: "Vollzeit Trader", icon: <Crown size={16} strokeWidth={1.75} /> },
];

function SidebarCard({ onApply }: { onApply: () => void }) {
  const { cta } = landingConfig;

  return (
    // Sticky am Wrapper: `.cc-card` setzt `position: relative` und würde sonst gewinnen.
    <Box position="sticky" top="24px">
    <Box className="cc-card cc-card--hero" p={{ base: 5, md: 6 }}>
      <Stack spacing={5}>
        <Stack spacing={4} align="center" textAlign="center">
          <Flex justify="center">
            <Logo variant="onDark" width={180} height={50} />
          </Flex>
          <Text fontSize="15px" fontWeight={500} lineHeight={1.6} color="var(--cc-text-soft)">
            Der Capital Circle hat bisher
          </Text>
          <SimpleGrid as="ul" role="list" listStyleType="none" columns={2} spacing={3} w="full">
            {SIDEBAR_HIGHLIGHT_ROWS.map((row) => (
              <Flex
                as="li"
                key={row.text}
                direction="column"
                align="center"
                justify="center"
                textAlign="center"
                gap={2.5}
                px={2}
                py={4}
                minH="108px"
                borderRadius="10px"
                bg="var(--cc-gold-wash)"
                border="1px solid rgba(212, 176, 128, 0.2)"
                boxShadow="inset 0 1px 0 rgba(255, 255, 255, 0.04)"
              >
                <Flex
                  w="34px"
                  h="34px"
                  flexShrink={0}
                  align="center"
                  justify="center"
                  borderRadius="full"
                  bg="rgba(212, 176, 128, 0.12)"
                  border="1px solid rgba(212, 176, 128, 0.3)"
                  color="var(--cc-gold-light)"
                  aria-hidden
                >
                  {row.icon}
                </Flex>
                <Text fontSize="13px" fontWeight={600} lineHeight={1.35} color="var(--cc-text)">
                  {row.text}
                </Text>
              </Flex>
            ))}
          </SimpleGrid>
        </Stack>

        {/* CTA — nur Desktop (mobil: fester Balken unten) */}
        <Button
          variant="gold"
          w="full"
          h="52px"
          fontSize="16px"
          display={{ base: "none", md: "inline-flex" }}
          leftIcon={<Lock size={15} strokeWidth={2.25} />}
          onClick={onApply}
        >
          {cta.primary}
        </Button>

        <Text fontSize="14px" fontWeight={500} lineHeight={1.6} color="var(--cc-text-2)" textAlign="center">
          {cta.secondary}
        </Text>
      </Stack>
    </Box>
    </Box>
  );
}

/* ── Tracking Helpers ────────────────────────────────────── */

function getOrCreateSessionId(): string {
  try {
    const existing = sessionStorage.getItem("cc_tracking_sid");
    if (existing) return existing;
    const newId = crypto.randomUUID();
    sessionStorage.setItem("cc_tracking_sid", newId);
    return newId;
  } catch {
    return "unknown";
  }
}

function fireTrackingEvent(slug: string, type: "visit" | "application") {
  try {
    const session_id = getOrCreateSessionId();
    fetch("/api/tracking/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, type, session_id }),
    }).catch(() => undefined);
  } catch {
    // Tracking-Fehler still ignorieren
  }
}

/* ── Main Component ──────────────────────────────────────── */

export function InsightLandingPageClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Tracking: ref-Param aus URL lesen, in sessionStorage speichern, Visit feuern
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) {
        sessionStorage.setItem("cc_tracking_ref", ref);
        fireTrackingEvent(ref, "visit");
      }
    } catch {
      // sessionStorage nicht verfügbar
    }
  }, []);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const videoSrc =
    process.env.NEXT_PUBLIC_FREE_FUNNEL_VIDEO_URL;

  return (
    <>
      <LandingSplash loading={loading} />

      <LandingChromeStyles />

      {/* Mobile CTA Footer */}
      <MobileCTAFooter onApply={openModal} trustLine="" />

      <PlatformBackground>
        <Box color="var(--cc-text)">
          {/* ── Kopf: Headline, Video, Seitenkarte ─────────────── */}
          <Box
            as="section"
            aria-labelledby="insight-title"
            w="100%"
            position="relative"
            overflowX="clip"
            pt={{ base: 8, md: 12 }}
            pb={{ base: 8, md: 14 }}
            px={{ base: 4, md: 8, lg: 12 }}
          >
            <Box
              aria-hidden
              position="absolute"
              top={0}
              left="12%"
              right="12%"
              h="1px"
              bg="linear-gradient(90deg, transparent, rgba(232, 192, 148, 0.6), transparent)"
            />
            <Box
              aria-hidden
              position="absolute"
              top="-160px"
              left="50%"
              w="1100px"
              maxW="160%"
              h="560px"
              transform="translateX(-50%)"
              pointerEvents="none"
              bg="radial-gradient(ellipse 50% 50% at 50% 42%, rgba(212, 176, 128, 0.14), transparent 70%)"
            />

            <Box maxW="1200px" mx="auto" position="relative" zIndex={1}>
              <Box mb={{ base: 8, md: 10 }} textAlign="center" {...heroRise(0)}>
                <DisplayHeading as="h1" id="insight-title" tier="hero" maxW="900px" mx="auto">
                  Du hast nur diese <Accent>EINE EINZIGE CHANCE.</Accent>
                </DisplayHeading>
              </Box>

              {/* ── Zwei Spalten: Video + Seitenkarte ─────────── */}
              <Box
                display={{ base: "flex", md: "grid" }}
                flexDirection="column"
                gridTemplateColumns={{ md: "minmax(0, 1fr) 340px" }}
                gap={{ base: 6, md: 8 }}
              >
                <Box minW={0} {...heroRise(1)}>
                  <VideoStage src={videoSrc} endedLabel="Jetzt kostenlos bewerben" onApply={openModal} />
                </Box>

                {/* Seitenkarte (Desktop) */}
                <Box display={{ base: "none", md: "block" }} {...heroRise(2)}>
                  <SidebarCard onApply={openModal} />
                </Box>
              </Box>

              {/* Mobil: Seitenkarte unter dem Video */}
              <Box display={{ base: "block", md: "none" }} mt={6} {...heroRise(2)}>
                <SidebarCard onApply={openModal} />
              </Box>
            </Box>
          </Box>

          {/* ── Inhalts-Karten ──────────────────────────────────── */}
          <Box as="section" aria-labelledby="insight-cards-title" w="100%" py={{ base: 12, md: 20 }} px={{ base: 4, md: 8, lg: 12 }}>
            <Box maxW="1200px" mx="auto">
              <Reveal>
                <Stack spacing={4} align="center" textAlign="center" mb={{ base: 10, md: 14 }}>
                  <Eyebrow>Capital Circle</Eyebrow>
                  <DisplayHeading id="insight-cards-title" maxW="880px">
                    Warum 93% aller Trader nie einen Payout sehen – und wie du zu den <Accent>7%</Accent> gehörst.
                  </DisplayHeading>
                  <Text fontSize={{ base: "16px", md: "17px" }} lineHeight={1.65} color="var(--cc-text-2)" maxW="580px">
                    Dieser Free Kurs ist nicht dafür gedacht, dir einfach nur
                    kostenlose Inhalte zu geben. Er soll dir zeigen, was
                    möglich ist.
                  </Text>
                </Stack>
              </Reveal>

              <Reveal delay={80}>
                <CardRail label="Inhalte des Free Kurses">
                  {INSIGHT_CARDS.map((card, i) => (
                    <OfferCard
                      key={card.title}
                      index={i}
                      icon={CARD_HEADER_ICONS[card.iconName] ?? <TrendingUp size={22} strokeWidth={1.5} />}
                      title={card.title}
                      description={card.description}
                      bullets={[{ text: card.bullet, icon: <Trophy size={15} strokeWidth={1.75} /> }]}
                      ctaLabel="Jetzt bewerben"
                      onApply={openModal}
                    />
                  ))}
                </CardRail>
              </Reveal>
            </Box>
          </Box>

          <LandingFooter />
        </Box>
      </PlatformBackground>

      {isModalOpen && (
        <FreeApplicationModal isOpen={isModalOpen} onClose={closeModal} />
      )}
    </>
  );
}
