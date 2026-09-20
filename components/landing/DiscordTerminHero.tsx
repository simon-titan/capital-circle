"use client";

import { useState, type ReactNode } from "react";
import { Box, Button, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { Lock, Video, TrendingUp, Users, BookOpen, Trophy, type LucideIcon } from "lucide-react";
import { GlassVideoPlayer } from "@/components/ui/GlassVideoPlayer";
import { FunnelHeroGlow, FunnelVideoHeadline, FunnelVideoPlaceholder, GoldIconTile } from "./DiscordFunnelChrome";

/**
 * Hero der Funnel-Seiten /discord/termin und /termin (Struktur wie die /bewerbung-Hero).
 * Look nach DESIGN.md v3.2: Champagner-Schein, Gold-Verlauf für „Zugang beantragen“,
 * Glas-Karten mit Gold-Icon-Kacheln. Texte 1:1 wie /bewerbung.
 */

interface DiscordTerminHeroProps {
  onApply: () => void;
  videoSrc?: string;
  videoPoster?: string;
  onVideoProgress?: (seconds: number) => void;
  onVideoEnded?: () => void;
}

const SUBHEADLINE =
  "Bewirb dich für einen der {exklusiven} Plätze bei {Capital Circle} nur ausgewählte {Trader} werden aufgenommen.";
const CTA_LABEL = "ZUGANG BEANTRAGEN";

interface Feature {
  icon: LucideIcon;
  label: string;
}
const FEATURES: Feature[] = [
  { icon: BookOpen, label: "Von 0 zum ersten Setup, strukturiert" },
  { icon: Users, label: "Trader die dich pushen, nicht bremsen" },
  { icon: TrendingUp, label: "Bewährte Trading-Strategien" },
  { icon: Video, label: "Wöchentliche Zoom Calls direkt mit Emre" },
];

function Strong({ children }: { children: ReactNode }) {
  return (
    <Box as="strong" color="var(--cc-text)" fontWeight={600}>
      {children}
    </Box>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;
  return (
    <Box className="cc-card" h="full" px={3} py={4} textAlign="center">
      <Stack spacing={2.5} align="center">
        <GoldIconTile size={36}>
          <Icon size={16} strokeWidth={1.75} />
        </GoldIconTile>
        <Text fontSize="14px" fontWeight={500} lineHeight="1.3" color="var(--cc-text)">
          {feature.label}
        </Text>
      </Stack>
    </Box>
  );
}

function StatementCard() {
  return (
    <Box className="cc-card cc-card--still" w="full" px={{ base: 4, md: 5 }} py={3.5}>
      <Box display="flex" alignItems="center" justifyContent="center" gap={3}>
        <GoldIconTile size={34}>
          <Trophy size={16} strokeWidth={1.75} />
        </GoldIconTile>
        <Text as="div" fontSize="14px" color="var(--cc-text-soft)" lineHeight="1.45" textAlign="left">
          <Strong>Capital Circle</Strong>
          {" ist kein "}
          <Strong>Kurs</Strong>
          {". Es ist das "}
          <Strong>Umfeld</Strong>
          {" das aus "}
          <Strong>inkonsistenten Tradern</Strong>{" "}
          <Strong>profitable</Strong>
          {" macht."}
        </Text>
      </Box>
    </Box>
  );
}

function parseSubheadline(text: string): ReactNode[] {
  const segments = text.split(/(\{[^}]+\})/g);
  return segments.map((seg, i) => {
    if (seg.startsWith("{") && seg.endsWith("}")) {
      return <Strong key={i}>{seg.slice(1, -1)}</Strong>;
    }
    return seg;
  });
}

export function DiscordTerminHero({ onApply, videoSrc, videoPoster, onVideoProgress, onVideoEnded }: DiscordTerminHeroProps) {
  const [videoEnded, setVideoEnded] = useState(false);

  return (
    <Box
      as="section"
      id="hero-section"
      w="100%"
      position="relative"
      overflowX={{ base: "visible", md: "hidden" }}
      overflowY="visible"
      pt={{ base: 8, md: 10 }}
      pb={{ base: 10, md: 14 }}
      px={{ base: 4, md: 8, lg: 12 }}
    >
      <FunnelHeroGlow />

      <Box maxW="820px" mx="auto" position="relative" zIndex={2}>
        <Stack spacing={6} align="center">
          <Box className="cc-rise">
            <FunnelVideoHeadline />
          </Box>

          {/* Video (Player-Akzent = Champagner, Standard des GlassVideoPlayer) */}
          <Box w="full" maxW={{ base: "100%", md: "720px" }} position="relative">
            {videoSrc ? (
              <>
                <GlassVideoPlayer
                  src={videoSrc}
                  poster={videoPoster}
                  autoPlay
                  onProgress={onVideoProgress}
                  onEnded={() => {
                    setVideoEnded(true);
                    onVideoEnded?.();
                  }}
                />
                {videoEnded && (
                  <Box
                    position="absolute"
                    inset={0}
                    zIndex={5}
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    gap={4}
                    borderRadius="16px"
                    bg="rgba(8, 10, 12, 0.82)"
                    backdropFilter="blur(12px)"
                    sx={{ WebkitBackdropFilter: "blur(12px)" }}
                  >
                    <Text
                      fontSize={{ base: "18px", md: "20px" }}
                      fontWeight={600}
                      color="var(--cc-text)"
                      textAlign="center"
                      px={4}
                    >
                      Bereit für den nächsten Schritt?
                    </Text>
                    <Button
                      variant="gold"
                      h="48px"
                      px={8}
                      fontSize="15px"
                      letterSpacing="0.02em"
                      leftIcon={<Lock size={14} strokeWidth={2.25} aria-hidden />}
                      onClick={() => {
                        setVideoEnded(false);
                        onApply();
                      }}
                    >
                      {CTA_LABEL}
                    </Button>
                    <Text fontSize="12px" color="var(--cc-text-2)" textAlign="center" mt={-1}>
                      Klicke um das Video erneut abzuspielen
                    </Text>
                  </Box>
                )}
              </>
            ) : (
              <FunnelVideoPlaceholder />
            )}
          </Box>

          {/* Desktop CTA */}
          <Box w="full" maxW="700px" display={{ base: "none", md: "block" }}>
            <Button
              variant="gold"
              w="full"
              h="52px"
              fontSize="16px"
              letterSpacing="0.02em"
              leftIcon={<Lock size={15} strokeWidth={2.25} aria-hidden />}
              onClick={onApply}
            >
              {CTA_LABEL}
            </Button>
          </Box>

          {/* Subheadline */}
          <Box w="full" maxW="600px">
            <Text fontSize={{ base: "16px", md: "18px" }} color="var(--cc-text-2)" lineHeight="1.7" textAlign="center">
              {parseSubheadline(SUBHEADLINE)}
            </Text>
          </Box>

          {/* Statement */}
          <Box w="full" maxW="700px">
            <StatementCard />
          </Box>

          {/* Feature Cards */}
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} w="full">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.label} feature={feature} />
            ))}
          </SimpleGrid>
        </Stack>
      </Box>
    </Box>
  );
}
