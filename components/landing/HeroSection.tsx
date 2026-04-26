"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import { Box, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { Lock, Video, TrendingUp, Users, BookOpen, Trophy, Target, Shield } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { GlassVideoPlayer } from "@/components/ui/GlassVideoPlayer";
import { landingConfig } from "@/config/landing-config";
import type { LandingFeature } from "@/config/landing-config";

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
  /**
   * Funnel-Video für diese Seite (z. B. /bewerbung aus NEXT_PUBLIC_STEP2_BEWERBUNG_VIDEO_URL).
   * Wenn leer/fehlend: NEXT_PUBLIC_FREE_FUNNEL_VIDEO_URL (erste Bewerbungsseite / Landing).
   */
  funnelVideoSrc?: string;
}

const ICON_MAP: Record<string, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  VideoCamera: Video,
  ChartLineUp: TrendingUp,
  Users: Users,
  BookOpen: BookOpen,
  Trophy: Trophy,
  Target: Target,
  Shield: Shield,
};

// Bronze / Silver / Gold — rotating 3-color scheme
interface CardStyle {
  border: string;
  bg: string;
  iconBg: string;
  iconColor: string;
  topLine: string;
  shadow: string;
}

const CARD_STYLES: CardStyle[] = [
  {
    // Bronze (Kupfer-Bronze — deutlich rotstichig, klar von Gold getrennt)
    border: "rgba(184,94,48,0.48)",
    bg: "radial-gradient(circle at 85% 15%, rgba(184,94,48,0.18) 0%, rgba(8,8,8,0.70) 60%)",
    iconBg: "rgba(184,94,48,0.20)",
    iconColor: "#CD7F32",
    topLine: "linear-gradient(90deg, transparent 10%, rgba(184,94,48,0.62) 50%, transparent 90%)",
    shadow: "0 0 22px rgba(184,94,48,0.16), 0 3px 14px rgba(0,0,0,0.50)",
  },
  {
    // Silver
    border: "rgba(180,195,220,0.32)",
    bg: "radial-gradient(circle at 15% 85%, rgba(180,200,230,0.12) 0%, rgba(8,8,8,0.72) 60%)",
    iconBg: "rgba(180,195,220,0.14)",
    iconColor: "#AAC0D8",
    topLine: "linear-gradient(90deg, transparent 15%, rgba(160,180,210,0.48) 55%, transparent 90%)",
    shadow: "0 0 18px rgba(180,200,230,0.10), 0 2px 12px rgba(0,0,0,0.50)",
  },
  {
    // Gold
    border: "rgba(212,175,55,0.42)",
    bg: "radial-gradient(circle at 50% 0%, rgba(212,175,55,0.15) 0%, rgba(8,8,8,0.68) 60%)",
    iconBg: "rgba(212,175,55,0.18)",
    iconColor: "#D4AF37",
    topLine: "linear-gradient(90deg, transparent 8%, rgba(212,175,55,0.65) 45%, rgba(212,175,55,0.65) 55%, transparent 92%)",
    shadow: "0 0 24px rgba(212,175,55,0.14), 0 3px 14px rgba(0,0,0,0.48)",
  },
];

function FeatureCard({ feature, index, mobile }: { feature: LandingFeature; index: number; mobile?: boolean }) {
  const Icon = ICON_MAP[feature.icon] ?? Video;
  const style = CARD_STYLES[index % CARD_STYLES.length];

  return (
    <Box
      {...(mobile && {
        minW: "190px",
        maxW: "220px",
        flexShrink: 0,
        sx: { scrollSnapAlign: "start" },
      })}
      position="relative"
      borderRadius="14px"
      overflow="hidden"
      px={{ base: 3, md: 3 }}
      py={3}
      textAlign="center"
      sx={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: style.shadow,
        transition: "all 250ms cubic-bezier(0.16, 1, 0.3, 1)",
        _hover: { transform: "translateY(-3px) scale(1.015)" },
        _before: {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: style.topLine,
          zIndex: 1,
        },
        ...(mobile && { scrollSnapAlign: "start" }),
      }}
    >
      <Box position="relative" zIndex={1} display="flex" flexDirection="column" alignItems="center" gap={2}>
        <Box
          w="36px"
          h="36px"
          borderRadius="10px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          sx={{ background: style.iconBg, border: `1px solid ${style.border}` }}
          color={style.iconColor}
        >
          <Icon size={16} strokeWidth={1.75} />
        </Box>
        <Box>
          <Text fontSize="sm" fontWeight="500" color="var(--color-text-primary, #F0F0F2)" className="inter-medium" lineHeight="1.3">
            {feature.label}
          </Text>
          {feature.detail && (
            <Text fontSize="xs" color="rgba(255,255,255,0.38)" className="inter" fontWeight={400} lineHeight="1.4" mt="2px">
              {feature.detail}
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function CommunityCard({ feature }: { feature: LandingFeature }) {
  const Icon = ICON_MAP[feature.icon] ?? Trophy;

  return (
    <Box
      w="full"
      position="relative"
      borderRadius="12px"
      overflow="hidden"
      px={{ base: 4, md: 5 }}
      py={{ base: 3.5, md: 3.5 }}
      sx={{
        background: "linear-gradient(135deg, #E8C547 0%, #D4AF37 50%, #A67C00 100%)",
        boxShadow:
          "0 0 32px rgba(212,175,55,0.35), 0 4px 18px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.22)",
        transition: "all 220ms cubic-bezier(0.16, 1, 0.3, 1)",
        _hover: {
          background: "linear-gradient(135deg, #F0DC82 0%, #E8C547 50%, #D4AF37 100%)",
          boxShadow:
            "0 0 44px rgba(212,175,55,0.50), 0 6px 22px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.28)",
          transform: "translateY(-1px)",
        },
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="center" gap={3}>
        <Box
          w="34px"
          h="34px"
          borderRadius="10px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
          bg="rgba(7,8,10,0.18)"
          border="1px solid rgba(7,8,10,0.12)"
          color="#07080A"
        >
          <Icon size={16} strokeWidth={2.2} />
        </Box>
        <Box textAlign="left">
          <Text fontSize="sm" fontWeight="700" color="#07080A" className="inter-bold" lineHeight="1.2">
            {feature.label}
          </Text>
          {feature.detail && (
            <Text fontSize="xs" fontWeight="500" color="rgba(7,8,10,0.68)" className="inter-medium" lineHeight="1.4" mt="2px">
              {feature.detail}
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function parseSubheadline(text: string): ReactNode[] {
  const segments = text.split(/(\{[^}]+\})/g);
  return segments.map((seg, i) => {
    if (seg.startsWith("{") && seg.endsWith("}")) {
      const word = seg.slice(1, -1);
      return (
        <Box
          key={i}
          as="span"
          color="var(--color-accent-gold-light, #E8C547)"
          fontWeight="500"
          sx={{ background: "rgba(212,175,55,0.10)", borderRadius: "4px", paddingInline: "4px" }}
        >
          {word}
        </Box>
      );
    }
    return seg;
  });
}

export function HeroSection({ onApply, ctaOverrides, funnelVideoSrc }: HeroSectionProps) {
  const { product, features, communityCard, cta } = landingConfig;
  const ctaPrimary = ctaOverrides?.primary ?? cta.primary;
  const ctaSecondary = ctaOverrides?.secondary ?? cta.secondary;
  const videoEndedLabel = ctaOverrides?.videoEndedLabel ?? "Jetzt kostenlos bewerben";
  const subheadlineText = ctaOverrides?.subheadline ?? product.subheadline;
  const defaultFunnelVideo = process.env.NEXT_PUBLIC_FREE_FUNNEL_VIDEO_URL?.trim() ?? "";
  const override = funnelVideoSrc?.trim();
  const videoSrc = override && override.length > 0 ? override : defaultFunnelVideo;
  const [videoEnded, setVideoEnded] = useState(false);

  return (
    <Box
      as="section"
      id="hero-section"
      w="100%"
      position="relative"
      overflowX={{ base: "visible", md: "hidden" }}
      overflowY="visible"
      pt={{ base: 10, md: 14 }}
      pb={{ base: 14, md: 20 }}
      px={{ base: 4, md: 8, lg: 12 }}
      sx={{
        backgroundImage: "url('/bg/dashboard.png')",
        backgroundSize: "cover",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Radial dark vignette */}
      <Box
        position="absolute"
        inset={0}
        zIndex={0}
        pointerEvents="none"
        sx={{
          background:
            "radial-gradient(ellipse 88% 92% at 50% 50%, rgba(7,8,10,0.95) 0%, rgba(7,8,10,0.84) 28%, rgba(7,8,10,0.60) 52%, rgba(7,8,10,0.28) 72%, rgba(7,8,10,0.06) 100%)",
        }}
      />

      {/* Gold top border */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        h="2px"
        zIndex={1}
        pointerEvents="none"
        sx={{
          background:
            "linear-gradient(90deg, transparent 5%, rgba(212,175,55,0.45) 30%, rgba(212,175,55,0.45) 70%, transparent 95%)",
        }}
      />

      <Box maxW="960px" mx="auto" position="relative" zIndex={2}>
        <Stack spacing={{ base: 7, md: 8 }} align="center">

          {/* ── 1. Logo ───────────────────────────────────────────── */}
          <Box lineHeight={1}>
            <Box display={{ base: "block", md: "none" }}>
              <Logo variant="onDark" width={260} height={73} priority />
            </Box>
            <Box display={{ base: "none", md: "block" }}>
              <Logo variant="onDark" width={330} height={93} priority />
            </Box>
          </Box>

          {/* ── 2. Video player (GlassVideoPlayer) ─────────────────── */}
          <Box w="full" maxW={{ base: "100%", md: "980px" }} position="relative">
            {videoSrc ? (
              <>
                <GlassVideoPlayer
                  src={videoSrc}
                  autoPlay
                  onEnded={() => setVideoEnded(true)}
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
                    sx={{
                      background: "radial-gradient(circle, rgba(7,8,10,0.93) 0%, rgba(7,8,10,0.82) 100%)",
                      backdropFilter: "blur(12px)",
                      WebkitBackdropFilter: "blur(12px)",
                    }}
                  >
                    <Text
                      className="inter-semibold"
                      color="var(--color-text-primary, #F0F0F2)"
                      fontSize={{ base: "lg", md: "xl" }}
                      textAlign="center"
                      px={4}
                    >
                      Bereit für den nächsten Schritt?
                    </Text>
                    <Box
                      as="button"
                      onClick={() => { setVideoEnded(false); onApply(); }}
                      minH="48px"
                      px={8}
                      borderRadius="12px"
                      fontWeight="600"
                      fontSize="15px"
                      letterSpacing="0.02em"
                      color="#07080A"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      gap={2}
                      className="inter-semibold"
                      sx={{
                        background: "linear-gradient(135deg, #E8C547 0%, #D4AF37 50%, #A67C00 100%)",
                        boxShadow:
                          "0 0 28px rgba(212,175,55,0.35), 0 4px 16px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.22)",
                        border: "none",
                        cursor: "pointer",
                        transition: "all 220ms cubic-bezier(0.16, 1, 0.3, 1)",
                        _hover: {
                          background: "linear-gradient(135deg, #F0DC82 0%, #E8C547 50%, #D4AF37 100%)",
                          boxShadow:
                            "0 0 44px rgba(212,175,55,0.50), 0 6px 22px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.28)",
                          transform: "translateY(-1px)",
                        },
                        _active: {
                          transform: "translateY(0px)",
                          boxShadow: "0 0 16px rgba(212,175,55,0.20)",
                        },
                      }}
                    >
                      <Lock size={14} strokeWidth={2.5} />
                      {videoEndedLabel}
                    </Box>
                    <Text
                      fontSize="xs"
                      color="rgba(255,255,255,0.35)"
                      className="inter"
                      fontWeight={400}
                      textAlign="center"
                      mt={-1}
                    >
                      Klicke um das Video erneut abzuspielen
                    </Text>
                  </Box>
                )}
              </>
            ) : (
              <Box
                borderRadius="16px"
                overflow="hidden"
                sx={{
                  aspectRatio: "16 / 9",
                  border: "1px solid rgba(212,175,55,0.22)",
                  boxShadow: "0 16px 56px rgba(0,0,0,0.55), 0 0 0 1px rgba(212,175,55,0.08)",
                  background: "rgba(0,0,0,0.60)",
                }}
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                gap={3}
              >
                <Box
                  w="56px"
                  h="56px"
                  borderRadius="full"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  bg="rgba(212,175,55,0.12)"
                  border="1px solid rgba(212,175,55,0.35)"
                  color="var(--color-accent-gold, #D4AF37)"
                  fontSize="22px"
                >
                  ▶
                </Box>
                <Text className="inter" color="rgba(255,255,255,0.35)" fontSize="sm" fontWeight={400}>
                  Vorstellungsvideo folgt in Kürze
                </Text>
              </Box>
            )}
          </Box>

          {/* ── 3. Community banner ───────────────────────────────── */}
          <Box
            w="full"
            maxW={{ base: "100%", md: "980px" }}
            px={5}
            py={3}
            borderRadius="12px"
            sx={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(212,175,55,0.16)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            <HStack spacing={3} justify="center">
              <HStack spacing="-10px" flexShrink={0} align="center">
                {[
                  "/client-pb/1765279404415.jpg",
                  "/client-pb/393d1b15978eed96285cf196b2f51eda.avif",
                  "/client-pb/4208db19763848b131989eadba9899aa.avif",
                  "/client-pb/user_6819319_6ec853ff-5777-4398-8fcc-06e2621cbcf8.avif",
                  "/client-pb/Screenshot 2026-03-03 071433.png",
                ].map((src, i) => (
                  <Box
                    key={i}
                    as="img"
                    src={src}
                    alt={`Trader ${i + 1}`}
                    w={{ base: "22px", md: "36px" }}
                    h={{ base: "22px", md: "36px" }}
                    borderRadius="full"
                    objectFit="cover"
                    borderWidth={{ base: "1.5px", md: "2px" }}
                    borderStyle="solid"
                    borderColor="rgba(7,8,10,0.9)"
                    boxShadow="0 2px 6px rgba(0,0,0,0.4)"
                    zIndex={10 - i}
                    sx={{
                      transform: `translateX(${i * -3}px)`,
                      "@media screen and (min-width: 48em)": {
                        transform: `translateX(${i * -6}px)`,
                      },
                    }}
                    ml={i === 0 ? 0 : { base: "-5px", md: "-10px" }}
                  />
                ))}
              </HStack>
              <Text fontSize="sm" color="rgba(255,255,255,0.58)" className="inter" fontWeight={400}>
                <Box as="span" color="var(--color-accent-gold, #D4AF37)" fontWeight="500">
                  1.000+
                </Box>{" "}
                Trader bereits auf ihrem Weg begleitet
              </Text>
            </HStack>
          </Box>

          {/* ── 4. Stars ──────────────────────────────────────────── */}
          <Box w="full" maxW="700px" display="flex" justifyContent="center">
            <HStack spacing={3} align="center" justify="center">
              <HStack spacing="3px">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Box key={s} color="var(--color-accent-gold, #D4AF37)" fontSize="22px" lineHeight={1}>
                    ★
                  </Box>
                ))}
              </HStack>
              <Text
                fontFamily="var(--font-mono, 'JetBrains Mono'), monospace"
                fontSize="xl"
                fontWeight={600}
                color="var(--color-accent-gold, #D4AF37)"
                lineHeight={1}
              >
                4.8
              </Text>
            </HStack>
          </Box>

          {/* ── 5. CTA — Desktop only ─────────────────────────────── */}
          <Stack spacing={2} align="center" w="full" maxW="700px" display={{ base: "none", md: "flex" }}>
            <Box
              as="button"
              onClick={onApply}
              w="full"
              minH="52px"
              borderRadius="12px"
              fontWeight="600"
              fontSize="16px"
              letterSpacing="0.02em"
              color="#07080A"
              display="flex"
              alignItems="center"
              justifyContent="center"
              gap={2}
              className="inter-semibold"
              sx={{
                background: "linear-gradient(135deg, #E8C547 0%, #D4AF37 50%, #A67C00 100%)",
                boxShadow:
                  "0 0 28px rgba(212,175,55,0.30), 0 4px 16px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.22)",
                border: "none",
                cursor: "pointer",
                transition: "all 220ms cubic-bezier(0.16, 1, 0.3, 1)",
                _hover: {
                  background: "linear-gradient(135deg, #F0DC82 0%, #E8C547 50%, #D4AF37 100%)",
                  boxShadow:
                    "0 0 44px rgba(212,175,55,0.50), 0 6px 22px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.28)",
                  transform: "translateY(-1px)",
                },
                _active: {
                  transform: "translateY(0px)",
                  boxShadow: "0 0 16px rgba(212,175,55,0.20)",
                },
              }}
            >
              <Lock size={15} strokeWidth={2.5} />
              {ctaPrimary}
            </Box>
            <Text
              fontSize="xs"
              color="rgba(255,255,255,0.32)"
              className="inter"
              fontWeight={400}
              textAlign="center"
              lineHeight="1.55"
            >
              {ctaSecondary}
            </Text>
          </Stack>

          {/* ── 6. Short subtext ──────────────────────────────────── */}
          <Box w="full" maxW="600px">
            <Text
              fontSize={{ base: "md", md: "lg" }}
              color="rgba(255,255,255,0.52)"
              className="inter"
              fontWeight={400}
              lineHeight="1.75"
              textAlign="center"
            >
              {parseSubheadline(subheadlineText)}
            </Text>
          </Box>

          {/* ── 7. Feature Cards ──────────────────────────────────── */}

          {/* Mobile: 2x3 grid */}
          <SimpleGrid
            display={{ base: "grid", md: "none" }}
            columns={2}
            spacing={3}
            w="full"
            px={{ base: 0 }}
          >
            {features.slice(0, 6).map((feature, i) => (
              <FeatureCard key={feature.label} feature={feature} index={i} mobile />
            ))}
          </SimpleGrid>

          {/* Desktop: 6-column grid */}
          <SimpleGrid
            display={{ base: "none", md: "grid" }}
            columns={6}
            spacing={3}
            w="full"
          >
            {features.map((feature, i) => (
              <FeatureCard key={feature.label} feature={feature} index={i} />
            ))}
          </SimpleGrid>

          {/* ── 8. Handverlesene Community — full-width card below ── */}
          <Box w="full" maxW="700px">
            <CommunityCard feature={communityCard} />
          </Box>

        </Stack>
      </Box>
    </Box>
  );
}
