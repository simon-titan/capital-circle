"use client";

import type { ReactNode } from "react";
import { Box, Button, Flex, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { BookOpen, Lock, Shield, Target, TrendingUp, Trophy, Users, Video, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { landingConfig } from "@/config/landing-config";
import type { LandingFeature } from "@/config/landing-config";
import { Accent, DisplayHeading, GoldIconTile, heroRise, VideoStage } from "./landing-ui";

interface CtaOverrides {
  primary?: string;
  secondary?: string;
  videoEndedLabel?: string;
  trustLine?: string | null;
  subheadline?: string;
}

interface HeroSectionProps {
  onApply: () => void;
  ctaOverrides?: CtaOverrides;
  landingSlug?: string;
  /**
   * Funnel-Video für diese Seite (z. B. /bewerbung aus NEXT_PUBLIC_STEP2_BEWERBUNG_VIDEO_URL).
   * Wenn leer/fehlend: NEXT_PUBLIC_FREE_FUNNEL_VIDEO_URL (erste Bewerbungsseite / Landing).
   */
  funnelVideoSrc?: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  VideoCamera: Video,
  ChartLineUp: TrendingUp,
  Users: Users,
  BookOpen: BookOpen,
  Trophy: Trophy,
  Target: Target,
  Shield: Shield,
};

const COMMUNITY_AVATARS = [
  "/client-pb/1765279404415.jpg",
  "/client-pb/393d1b15978eed96285cf196b2f51eda.avif",
  "/client-pb/4208db19763848b131989eadba9899aa.avif",
  "/client-pb/user_6819319_6ec853ff-5777-4398-8fcc-06e2621cbcf8.avif",
  "/client-pb/Screenshot 2026-03-03 071433.png",
];

const BEWERBUNG_FEATURES: LandingFeature[] = [
  { icon: "BookOpen", label: "Von 0 zum ersten Setup, strukturiert", detail: null },
  { icon: "Users", label: "Trader die dich pushen, nicht bremsen", detail: null },
  { icon: "ChartLineUp", label: "Bewährte Trading-Strategien", detail: null },
  { icon: "VideoCamera", label: "Wöchentliche Zoom Calls direkt mit Emre", detail: null },
];

/** Setzt ein Wort der Headline (den Markennamen) in Gold hell. */
function withAccent(text: string, word: string): ReactNode {
  const at = text.indexOf(word);
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <Accent>{word}</Accent>
      {text.slice(at + word.length)}
    </>
  );
}

/** `{Wort}` in der Subheadline wird Gold hell. */
function parseSubheadline(text: string): ReactNode[] {
  const segments = text.split(/(\{[^}]+\})/g);
  return segments.map((seg, i) => {
    if (seg.startsWith("{") && seg.endsWith("}")) {
      return (
        <Box key={i} as="span" color="var(--cc-gold-light)" fontWeight={500}>
          {seg.slice(1, -1)}
        </Box>
      );
    }
    return seg;
  });
}

function Strong({ children }: { children: ReactNode }) {
  return (
    <Box as="span" color="var(--cc-text)" fontWeight={600}>
      {children}
    </Box>
  );
}

/** Leistungen als ruhiges Datenblatt auf einer Glas-Karte statt als Kachel-Raster. */
function FeatureSpec({ items, columns }: { items: LandingFeature[]; columns: { base: number; md: number } }) {
  return (
    <Box className="cc-card cc-card--still" w="full" p={{ base: 2, md: 3 }}>
      <SimpleGrid as="ul" role="list" listStyleType="none" columns={columns} spacing={{ base: 1, md: 2 }}>
        {items.map((feature) => {
          const Icon = ICON_MAP[feature.icon] ?? Video;
          return (
            <Flex
              as="li"
              key={feature.label}
              direction="column"
              gap={3}
              p={{ base: 3, md: 4 }}
              borderRadius="10px"
              transition="background-color 200ms var(--cc-ease)"
              _hover={{ bg: "rgba(212, 176, 128, 0.05)" }}
            >
              <Flex
                w="36px"
                h="36px"
                align="center"
                justify="center"
                borderRadius="10px"
                bg="var(--cc-gold-wash)"
                border="1px solid rgba(212, 176, 128, 0.25)"
                color="var(--cc-gold-light)"
                aria-hidden
              >
                <Icon size={18} strokeWidth={1.75} />
              </Flex>
              <Box>
                <Text fontSize={{ base: "14px", md: "15px" }} fontWeight={600} lineHeight={1.35} color="var(--cc-text)">
                  {feature.label}
                </Text>
                {feature.detail ? (
                  <Text mt={1} fontSize="13px" lineHeight={1.45} color="var(--cc-text-2)">
                    {feature.detail}
                  </Text>
                ) : null}
              </Box>
            </Flex>
          );
        })}
      </SimpleGrid>
    </Box>
  );
}

/** Aussage mit Gold-Icon-Kachel auf Glas mit Gold-Rand. */
function StatementCard({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <Flex
      className="cc-card"
      w="full"
      maxW="720px"
      align="center"
      gap={4}
      px={{ base: 4, md: 6 }}
      py={{ base: 4, md: 5 }}
      style={{ borderColor: "rgba(212, 176, 128, 0.38)" }}
    >
      <GoldIconTile size={44}>
        <Icon size={20} strokeWidth={1.75} />
      </GoldIconTile>
      <Box minW={0} textAlign="left">
        {children}
      </Box>
    </Flex>
  );
}

export function HeroSection({ onApply, ctaOverrides, funnelVideoSrc, landingSlug }: HeroSectionProps) {
  const { product, features, communityCard, cta } = landingConfig;
  const ctaPrimary = ctaOverrides?.primary ?? cta.primary;
  const ctaSecondary = ctaOverrides?.secondary ?? cta.secondary;
  const videoEndedLabel = ctaOverrides?.videoEndedLabel ?? "Jetzt kostenlos bewerben";
  const subheadlineText = ctaOverrides?.subheadline ?? product.subheadline;
  const defaultFunnelVideo = process.env.NEXT_PUBLIC_FREE_FUNNEL_VIDEO_URL?.trim() ?? "";
  const override = funnelVideoSrc?.trim();
  const videoSrc = override && override.length > 0 ? override : defaultFunnelVideo;
  const isBewerbungLanding = landingSlug === "bewerbung";
  const CommunityIcon = ICON_MAP[communityCard.icon] ?? Trophy;

  return (
    <Box
      as="section"
      id="hero-section"
      aria-labelledby="hero-title"
      w="100%"
      position="relative"
      overflowX="clip"
      pt={{ base: 8, md: 12 }}
      pb={{ base: 14, md: 20 }}
      px={{ base: 4, md: 8, lg: 12 }}
    >
      {/* Lichtlinie oben + Champagner-Schein hinter dem Kopf */}
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

      <Stack maxW="980px" mx="auto" position="relative" zIndex={1} spacing={{ base: 7, md: 9 }} align="center">
        {/* ── Logo ── */}
        <Box lineHeight={1} {...heroRise(0)}>
          <Box display={{ base: "block", md: "none" }}>
            <Logo variant="onDark" width={210} height={59} priority />
          </Box>
          <Box display={{ base: "none", md: "block" }}>
            <Logo variant="onDark" width={260} height={73} priority />
          </Box>
        </Box>

        {/* ── Headline + gedämpfte zweite Zeile ── */}
        <Stack spacing={{ base: 3, md: 4 }} align="center" textAlign="center" maxW="780px" {...heroRise(1)}>
          <DisplayHeading as="h1" id="hero-title" tier="hero">
            {withAccent(product.headline, product.name)}
          </DisplayHeading>
          <Text fontSize={{ base: "16px", md: "18px" }} lineHeight={1.65} color="var(--cc-text-2)" maxW="620px">
            {parseSubheadline(subheadlineText)}
          </Text>
        </Stack>

        {/* ── Video ── */}
        <Box w="full" {...heroRise(2)}>
          <VideoStage src={videoSrc} endedLabel={videoEndedLabel} onApply={onApply} replayHint />
        </Box>

        {/* ── Community-Beleg ── */}
        <Flex
          align="center"
          justify="center"
          gap={3}
          px={{ base: 4, md: 5 }}
          py={{ base: 2.5, md: 3 }}
          maxW="100%"
          borderRadius={{ base: "12px", md: "full" }}
          border="1px solid var(--cc-line-strong)"
          bg="rgba(255, 255, 255, 0.02)"
          backdropFilter="blur(14px)"
          {...heroRise(3)}
        >
          <Flex flexShrink={0} align="center">
            {COMMUNITY_AVATARS.map((src, i) => (
              <Box
                key={src}
                as="img"
                src={src}
                alt=""
                w={{ base: "24px", md: "34px" }}
                h={{ base: "24px", md: "34px" }}
                ml={i === 0 ? 0 : { base: "-7px", md: "-10px" }}
                borderRadius="full"
                objectFit="cover"
                border="2px solid var(--cc-bg)"
                boxShadow="0 2px 6px rgba(0, 0, 0, 0.4)"
                position="relative"
                zIndex={COMMUNITY_AVATARS.length - i}
              />
            ))}
          </Flex>
          <Text fontSize={{ base: "13px", md: "14px" }} lineHeight={1.4} color="var(--cc-text-2)">
            <Box as="span" className="cc-num" color="var(--cc-gold-light)" fontWeight={600}>
              1.000+
            </Box>{" "}
            Trader bereits auf ihrem Weg begleitet
          </Text>
        </Flex>

        {/* ── CTA (Desktop; mobil übernimmt der feste Balken) ── */}
        <Stack spacing={3} align="center" w="full" maxW="560px" display={{ base: "none", md: "flex" }} {...heroRise(4)}>
          <Button
            variant="gold"
            size="lg"
            w="full"
            h="56px"
            fontSize="16px"
            letterSpacing="0.01em"
            leftIcon={<Lock size={16} strokeWidth={2.25} />}
            onClick={onApply}
            boxShadow="0 0 32px rgba(212, 176, 128, 0.3), 0 8px 22px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.35)"
          >
            {ctaPrimary}
          </Button>
          <Text fontSize="13px" lineHeight={1.55} color="var(--cc-text-2)" textAlign="center">
            {ctaSecondary}
          </Text>
        </Stack>

        {isBewerbungLanding ? (
          <>
            <Flex w="full" justify="center" {...heroRise(5)}>
              <StatementCard icon={Trophy}>
                <Text fontSize={{ base: "15px", md: "17px" }} lineHeight={1.5} color="var(--cc-text-2)">
                  <Strong>Capital Circle</Strong> ist kein <Strong>Kurs</Strong>. Es ist das{" "}
                  <Box as="span" color="var(--cc-gold-light)" fontWeight={600}>
                    Umfeld
                  </Box>{" "}
                  das aus <Strong>inkonsistenten Tradern</Strong> <Strong>profitable</Strong> macht.
                </Text>
              </StatementCard>
            </Flex>
            <Box w="full" {...heroRise(6)}>
              <FeatureSpec items={BEWERBUNG_FEATURES} columns={{ base: 2, md: 4 }} />
            </Box>
          </>
        ) : (
          <>
            <Box w="full" {...heroRise(5)}>
              <FeatureSpec items={features} columns={{ base: 2, md: 3 }} />
            </Box>
            <Flex w="full" justify="center" {...heroRise(6)}>
              <StatementCard icon={CommunityIcon}>
                <Text fontSize="16px" fontWeight={600} lineHeight={1.3} color="var(--cc-text)">
                  {communityCard.label}
                </Text>
                {communityCard.detail ? (
                  <Text mt={0.5} fontSize="14px" lineHeight={1.45} color="var(--cc-text-2)">
                    {communityCard.detail}
                  </Text>
                ) : null}
              </StatementCard>
            </Flex>
          </>
        )}
      </Stack>
    </Box>
  );
}
