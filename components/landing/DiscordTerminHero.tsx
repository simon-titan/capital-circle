"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import { Box, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { Lock, Video, TrendingUp, Users, BookOpen, Trophy } from "lucide-react";
import { GlassVideoPlayer } from "@/components/ui/GlassVideoPlayer";

/**
 * Discord-gebrandete Kopie der /bewerbung-Hero (isBewerbungLanding-Variante).
 * Schwarzer BG + Cyan/Lila-Glows, Action-Grün #16cc9b, Cyan-Akzente. Texte 1:1 wie /bewerbung.
 */

interface DiscordTerminHeroProps {
  onApply: () => void;
  videoSrc?: string;
  onVideoProgress?: (seconds: number) => void;
  onVideoEnded?: () => void;
}

const SUBHEADLINE =
  "Bewirb dich für einen der {exklusiven} Plätze bei {Capital Circle} nur ausgewählte {Trader} werden aufgenommen.";
const CTA_LABEL = "ZUGANG BEANTRAGEN";
const CTA_SECONDARY = "Bist du dir sicher dass du dir diese Möglichkeit verdient hast?";

interface Feature {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
}
const FEATURES: Feature[] = [
  { icon: BookOpen, label: "Von 0 zum ersten Setup – strukturiert" },
  { icon: Users, label: "Trader die dich pushen, nicht bremsen" },
  { icon: TrendingUp, label: "Bewährte Trading-Strategien" },
  { icon: Video, label: "Wöchentliche Zoom Calls direkt mit Emre" },
];

interface CardStyle {
  border: string;
  bg: string;
  iconBg: string;
  iconColor: string;
  topLine: string;
  shadow: string;
}
// Dezente Rotation: Weiß / Grau / minimal Blau
const CARD_STYLES: CardStyle[] = [
  {
    border: "rgba(255,255,255,0.16)",
    bg: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.06) 0%, rgba(8,8,10,0.66) 60%)",
    iconBg: "rgba(255,255,255,0.07)",
    iconColor: "rgba(255,255,255,0.92)",
    topLine: "linear-gradient(90deg, transparent 12%, rgba(255,255,255,0.40) 50%, transparent 88%)",
    shadow: "0 0 18px rgba(255,255,255,0.05), 0 3px 14px rgba(0,0,0,0.50)",
  },
  {
    border: "rgba(255,255,255,0.10)",
    bg: "radial-gradient(circle at 85% 15%, rgba(255,255,255,0.035) 0%, rgba(8,8,10,0.68) 60%)",
    iconBg: "rgba(255,255,255,0.04)",
    iconColor: "rgba(255,255,255,0.55)",
    topLine: "linear-gradient(90deg, transparent 15%, rgba(255,255,255,0.20) 55%, transparent 90%)",
    shadow: "0 2px 12px rgba(0,0,0,0.50)",
  },
  {
    border: "rgba(150,175,220,0.22)",
    bg: "radial-gradient(circle at 15% 85%, rgba(150,175,220,0.07) 0%, rgba(8,8,10,0.70) 60%)",
    iconBg: "rgba(150,175,220,0.10)",
    iconColor: "#A9C0E8",
    topLine: "linear-gradient(90deg, transparent 12%, rgba(150,175,220,0.35) 52%, transparent 90%)",
    shadow: "0 0 16px rgba(150,175,220,0.07), 0 2px 12px rgba(0,0,0,0.50)",
  },
];

const accentBtnSx = {
  background: "linear-gradient(135deg, #16cc9b 0%, #5FE6C6 100%)",
  boxShadow:
    "0 0 28px rgba(22,204,155,0.40), 0 4px 16px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.28)",
  border: "none",
  cursor: "pointer",
  transition: "all 220ms cubic-bezier(0.16, 1, 0.3, 1)",
  _hover: {
    background: "linear-gradient(135deg, #1AE0AC 0%, #82EFD6 100%)",
    boxShadow:
      "0 0 48px rgba(22,204,155,0.55), 0 6px 22px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.36)",
    transform: "translateY(-1px)",
  },
  _active: { transform: "translateY(0px)", boxShadow: "0 0 18px rgba(22,204,155,0.30)" },
};

// Animierter Cyan-Gradient-Shimmer für Headline-Highlights.
const headlineHighlightSx = {
  background: "linear-gradient(90deg, #8FFBEB 0%, #47F7DC 25%, #1FB9A6 50%, #47F7DC 75%, #8FFBEB 100%)",
  backgroundSize: "200% auto",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  color: "transparent",
  filter: "drop-shadow(0 0 18px rgba(71,247,220,0.50))",
  animation: "hlShimmer 4s linear infinite",
  "@keyframes hlShimmer": {
    "0%": { backgroundPosition: "0% center" },
    "100%": { backgroundPosition: "200% center" },
  },
} as const;

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const Icon = feature.icon;
  const style = CARD_STYLES[index % CARD_STYLES.length];
  return (
    <Box
      position="relative"
      borderRadius="14px"
      overflow="hidden"
      px={3}
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
        <Text fontSize="sm" fontWeight="500" color="var(--color-text-primary, #F0F0F2)" className="inter-medium" lineHeight="1.3">
          {feature.label}
        </Text>
      </Box>
    </Box>
  );
}

function StatementCard() {
  return (
    <Box
      w="full"
      position="relative"
      borderRadius="12px"
      overflow="hidden"
      px={{ base: 4, md: 5 }}
      py={{ base: 3.5, md: 3.5 }}
      sx={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.18)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: "0 4px 18px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.10)",
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
          bg="rgba(255,255,255,0.08)"
          border="1px solid rgba(255,255,255,0.14)"
          color="#FFFFFF"
        >
          <Trophy size={16} strokeWidth={2.2} />
        </Box>
        <Text as="div" fontSize="sm" color="rgba(255,255,255,0.92)" className="inter" fontWeight={500} lineHeight="1.4" textAlign="left">
          <Box as="span" fontWeight={700} className="inter-bold">Capital Circle</Box>
          {" ist kein "}
          <Box as="span" fontWeight={700} className="inter-bold">Kurs</Box>
          {". Es ist das "}
          <Box as="span" fontWeight={700} className="inter-bold">Umfeld</Box>
          {" das aus "}
          <Box as="span" fontWeight={700} className="inter-bold">inkonsistenten Tradern</Box>{" "}
          <Box as="span" fontWeight={700} className="inter-bold">profitable</Box>{" macht."}
        </Text>
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
          color="rgba(255,255,255,0.95)"
          fontWeight="600"
          sx={{ background: "rgba(255,255,255,0.07)", borderRadius: "4px", paddingInline: "4px" }}
        >
          {word}
        </Box>
      );
    }
    return seg;
  });
}

export function DiscordTerminHero({ onApply, videoSrc, onVideoProgress, onVideoEnded }: DiscordTerminHeroProps) {
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
    >
      {/* Cyan/Lila-Glows auf Schwarz */}
      <Box
        position="absolute"
        inset={0}
        zIndex={0}
        pointerEvents="none"
        sx={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 18%, rgba(71,247,220,0.12), transparent 60%), radial-gradient(circle at 86% 8%, rgba(88,101,242,0.14), transparent 52%), radial-gradient(circle at 10% 92%, rgba(71,247,220,0.07), transparent 55%)",
        }}
      />
      {/* Aqua top accent */}
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
            "linear-gradient(90deg, transparent 5%, rgba(71,247,220,0.55) 30%, rgba(71,247,220,0.55) 70%, transparent 95%)",
        }}
      />

      <Box maxW="960px" mx="auto" position="relative" zIndex={2}>
        <Stack spacing={{ base: 7, md: 8 }} align="center">
          {/* Überschrift (ersetzt das Logo) */}
          <Text
            as="h1"
            className="inter-bold"
            textTransform="uppercase"
            color="#FFFFFF"
            fontSize={{ base: "xl", sm: "2xl", md: "3xl", lg: "4xl" }}
            lineHeight="1.18"
            letterSpacing="0.005em"
            textAlign="center"
            maxW="900px"
          >
            Schau dieses Video — es zeigt warum{" "}
            <Box as="span" className="inter-bold" sx={headlineHighlightSx}>
              90% der Trader scheitern
            </Box>{" "}
            und wie das Capital Circle Framework{" "}
            <Box as="span" className="inter-bold" sx={headlineHighlightSx}>
              das ändert
            </Box>
            .
          </Text>

          {/* Video */}
          <Box w="full" maxW={{ base: "100%", md: "980px" }} position="relative">
            {videoSrc ? (
              <>
                <GlassVideoPlayer
                  src={videoSrc}
                  autoPlay
                  accent="#47F7DC"
                  accentRgb="71, 247, 220"
                  progressColor="#FFFFFF"
                  progressRgb="255, 255, 255"
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
                    sx={{
                      background: "radial-gradient(circle, rgba(0,0,0,0.93) 0%, rgba(0,0,0,0.82) 100%)",
                      backdropFilter: "blur(12px)",
                      WebkitBackdropFilter: "blur(12px)",
                    }}
                  >
                    <Text className="inter-semibold" color="var(--color-text-primary, #F0F0F2)" fontSize={{ base: "lg", md: "xl" }} textAlign="center" px={4}>
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
                      color="#000000"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      gap={2}
                      className="inter-semibold"
                      sx={accentBtnSx}
                    >
                      <Lock size={14} strokeWidth={2.5} />
                      {CTA_LABEL}
                    </Box>
                    <Text fontSize="xs" color="rgba(255,255,255,0.35)" className="inter" textAlign="center" mt={-1}>
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
                  border: "1px solid rgba(71,247,220,0.22)",
                  boxShadow: "0 16px 56px rgba(0,0,0,0.55), 0 0 0 1px rgba(71,247,220,0.08)",
                  background: "rgba(0,0,0,0.60)",
                }}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text className="inter" color="rgba(255,255,255,0.35)" fontSize="sm">
                  Vorstellungsvideo folgt in Kürze
                </Text>
              </Box>
            )}
          </Box>

          {/* Community banner */}
          <Box
            w="full"
            maxW={{ base: "100%", md: "980px" }}
            px={5}
            py={3}
            borderRadius="12px"
            sx={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(71,247,220,0.16)",
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
                    borderColor="rgba(0,0,0,0.9)"
                    boxShadow="0 2px 6px rgba(0,0,0,0.4)"
                    zIndex={10 - i}
                    ml={i === 0 ? 0 : { base: "-5px", md: "-10px" }}
                  />
                ))}
              </HStack>
              <Text fontSize="sm" color="rgba(255,255,255,0.58)" className="inter">
                <Box as="span" color="#47F7DC" fontWeight="500">1.000+</Box>{" "}
                Trader bereits auf ihrem Weg begleitet
              </Text>
            </HStack>
          </Box>

          {/* Desktop CTA */}
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
              color="#000000"
              display="flex"
              alignItems="center"
              justifyContent="center"
              gap={2}
              className="inter-semibold"
              sx={accentBtnSx}
            >
              <Lock size={15} strokeWidth={2.5} />
              {CTA_LABEL}
            </Box>
            <Text fontSize="xs" color="rgba(255,255,255,0.32)" className="inter" textAlign="center" lineHeight="1.55">
              {CTA_SECONDARY}
            </Text>
          </Stack>

          {/* Subheadline */}
          <Box w="full" maxW="600px">
            <Text fontSize={{ base: "md", md: "lg" }} color="rgba(255,255,255,0.52)" className="inter" lineHeight="1.75" textAlign="center">
              {parseSubheadline(SUBHEADLINE)}
            </Text>
          </Box>

          {/* Statement */}
          <Box w="full" maxW="700px">
            <StatementCard />
          </Box>

          {/* Feature Cards */}
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} w="full">
            {FEATURES.map((feature, i) => (
              <FeatureCard key={feature.label} feature={feature} index={i} />
            ))}
          </SimpleGrid>
        </Stack>
      </Box>
    </Box>
  );
}
