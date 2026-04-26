"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { Box, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import {
  Lock,
  TrendingUp,
  Trophy,
  BarChart3,
  CalendarDays,
  ArrowRight,
  LineChart,
  Users,
  Crown,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { GlassVideoPlayer } from "@/components/ui/GlassVideoPlayer";
import { MobileCTAFooter } from "./MobileCTAFooter";
import { landingConfig } from "@/config/landing-config";

const FreeApplicationModal = dynamic(
  () =>
    import("@/components/marketing/FreeApplicationModal").then((m) => ({
      default: m.FreeApplicationModal,
    })),
  { ssr: false },
);

const goldCtaSx = {
  background:
    "linear-gradient(135deg, #E8C547 0%, #D4AF37 50%, #A67C00 100%)",
  boxShadow:
    "0 0 28px rgba(212,175,55,0.30), 0 4px 16px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.22)",
  border: "none",
  cursor: "pointer",
  transition: "all 220ms cubic-bezier(0.16, 1, 0.3, 1)",
  _hover: {
    background:
      "linear-gradient(135deg, #F0DC82 0%, #E8C547 50%, #D4AF37 100%)",
    boxShadow:
      "0 0 44px rgba(212,175,55,0.50), 0 6px 22px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.28)",
    transform: "translateY(-1px)",
  },
  _active: {
    transform: "translateY(0px)",
    boxShadow: "0 0 16px rgba(212,175,55,0.20)",
  },
};

/* ── Insight Content Cards (TargetCard-Stil) ─────────────── */

interface InsightCard {
  iconName: string;
  title: string;
  description: string;
  bullet: string;
}

const INSIGHT_CARDS: InsightCard[] = [
  {
    iconName: "TrendingUp",
    title: "Professionelles Trading",
    description:
      "Dieser Free Kurs ist nicht dafür gedacht, dir einfach nur kostenlose Inhalte zu geben.",
    bullet:
      "Ein klarer Einblick in professionelles Trading jenseits von oberflächlichem Social-Media-Wissen",
  },
  {
    iconName: "BarChart3",
    title: "Auction Market Theory",
    description:
      "Lerne die Methodik, die institutionelle Trader verwenden — nicht das, was auf Social Media kursiert.",
    bullet:
      "Mein Ansatz auf Basis von Auction Market Theory, Volumen und institutionellem Kontext",
  },
  {
    iconName: "CalendarDays",
    title: "Framework Call",
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

interface CardTheme {
  border: string;
  borderHover: string;
  bg: string;
  bgHover: string;
  iconBg: string;
  iconColor: string;
  topLine: string;
  shadow: string;
  shadowHover: string;
  bulletBg: string;
}

const CARD_THEMES: CardTheme[] = [
  {
    border: "rgba(255,148,50,0.50)",
    borderHover: "rgba(255,148,50,0.75)",
    bg: "radial-gradient(circle at 90% 90%, rgba(255,148,50,0.20) 0%, rgba(8,8,8,0.70) 60%)",
    bgHover:
      "radial-gradient(circle at 90% 90%, rgba(255,148,50,0.28) 0%, rgba(8,8,8,0.70) 60%)",
    iconBg: "rgba(255,148,50,0.20)",
    iconColor: "rgba(255,148,50,1)",
    topLine:
      "linear-gradient(90deg, transparent 30%, rgba(255,148,50,0.70) 70%, transparent 95%)",
    shadow: "0 0 28px rgba(255,148,50,0.18), 0 4px 16px rgba(0,0,0,0.50)",
    shadowHover:
      "0 0 40px rgba(255,148,50,0.28), 0 8px 32px rgba(0,0,0,0.60)",
    bulletBg: "rgba(255,148,50,0.10)",
  },
  {
    border: "rgba(180,195,220,0.32)",
    borderHover: "rgba(180,195,220,0.55)",
    bg: "radial-gradient(circle at 50% 10%, rgba(180,195,220,0.14) 0%, rgba(8,8,8,0.74) 65%)",
    bgHover:
      "radial-gradient(circle at 50% 10%, rgba(180,195,220,0.22) 0%, rgba(8,8,8,0.74) 65%)",
    iconBg: "rgba(180,195,220,0.14)",
    iconColor: "#AAC0D8",
    topLine:
      "linear-gradient(90deg, transparent 10%, rgba(160,180,210,0.65) 50%, transparent 90%)",
    shadow: "0 4px 24px rgba(0,0,0,0.50), 0 0 20px rgba(160,180,210,0.08)",
    shadowHover:
      "0 12px 40px rgba(0,0,0,0.60), 0 0 32px rgba(160,180,210,0.18)",
    bulletBg: "rgba(180,195,220,0.08)",
  },
  {
    border: "rgba(212,175,55,0.45)",
    borderHover: "rgba(212,175,55,0.72)",
    bg: "radial-gradient(circle at 85% 15%, rgba(212,175,55,0.18) 0%, rgba(8,8,8,0.72) 65%)",
    bgHover:
      "radial-gradient(circle at 85% 15%, rgba(212,175,55,0.26) 0%, rgba(8,8,8,0.72) 65%)",
    iconBg: "rgba(212,175,55,0.16)",
    iconColor: "#D4AF37",
    topLine:
      "linear-gradient(90deg, transparent 30%, rgba(212,175,55,0.70) 70%, rgba(212,175,55,0.30) 100%)",
    shadow: "0 4px 24px rgba(0,0,0,0.50), 0 0 20px rgba(212,175,55,0.12)",
    shadowHover:
      "0 12px 40px rgba(0,0,0,0.60), 0 0 36px rgba(212,175,55,0.24)",
    bulletBg: "rgba(212,175,55,0.08)",
  },
];

function InsightContentCard({
  card,
  index,
  onApply,
}: {
  card: InsightCard;
  index: number;
  onApply: () => void;
}) {
  const theme = CARD_THEMES[index % CARD_THEMES.length];

  return (
    <Box
      position="relative"
      p={{ base: 5, md: 6 }}
      borderRadius="20px"
      display="flex"
      flexDirection="column"
      minH={{ base: "auto", md: "320px" }}
      overflow="hidden"
      sx={{
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        boxShadow: theme.shadow,
        transition: "all 260ms cubic-bezier(0.16,1,0.3,1)",
        _hover: {
          borderColor: theme.borderHover,
          background: theme.bgHover,
          transform: "translateY(-4px)",
          boxShadow: theme.shadowHover,
        },
        _before: {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          h: "2px",
          background: theme.topLine,
          borderRadius: "20px 20px 0 0",
        },
      }}
    >
      <Box
        w="48px"
        h="48px"
        borderRadius="14px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        mb={5}
        flexShrink={0}
        sx={{
          background: theme.iconBg,
          border: `1px solid ${theme.border}`,
          color: theme.iconColor,
          boxShadow: `0 0 18px ${theme.iconBg}`,
        }}
      >
        {CARD_HEADER_ICONS[card.iconName] ?? (
          <TrendingUp size={22} strokeWidth={1.5} />
        )}
      </Box>

      <Stack spacing={2} mb={5}>
        <Text
          fontSize={{ base: "lg", md: "xl" }}
          color="var(--color-text-primary, #F0F0F2)"
          className="inter-bold"
          lineHeight="1.25"
        >
          {card.title}
        </Text>
        <Text
          fontSize="sm"
          color="rgba(255,255,255,0.52)"
          className="inter"
          lineHeight="1.65"
        >
          {card.description}
        </Text>
      </Stack>

      <Box
        h="1px"
        mb={5}
        sx={{
          background: `linear-gradient(90deg, ${theme.border} 0%, transparent 100%)`,
        }}
      />

      <Box
        display="flex"
        alignItems="center"
        gap={3}
        px={3}
        py={2}
        borderRadius="10px"
        flex={1}
        sx={{
          background: theme.bulletBg,
          border: `1px solid ${theme.border}`,
        }}
      >
        <Box
          flexShrink={0}
          w="28px"
          h="28px"
          borderRadius="8px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          sx={{
            background: theme.iconBg,
            color: theme.iconColor,
          }}
        >
          <Trophy size={16} strokeWidth={2} />
        </Box>
        <Text
          fontSize="sm"
          color="rgba(255,255,255,0.82)"
          className="inter-semibold"
          lineHeight="1.4"
        >
          {card.bullet}
        </Text>
      </Box>

      <Box
        as="button"
        mt={6}
        fontSize="sm"
        className="inter-semibold"
        letterSpacing="0.02em"
        display="flex"
        alignItems="center"
        gap={2}
        bg="transparent"
        border="none"
        cursor="pointer"
        p={0}
        onClick={onApply}
        sx={{
          color: theme.iconColor,
          transition: "all 160ms ease",
          _hover: { opacity: 0.8, gap: "10px" },
        }}
      >
        Jetzt bewerben
        <ArrowRight size={14} strokeWidth={2.5} />
      </Box>
    </Box>
  );
}

/** Seitenleiste 2×2: Gold | Silber | Silber | Gold (Zeilen: 6 Jahre, 1 Mio+, 1000+ Trader, Funded-Status). */
const SIDEBAR_THEME_GOLD = CARD_THEMES[2];
const SIDEBAR_THEME_SILVER = CARD_THEMES[1];

const SIDEBAR_HIGHLIGHT_ROWS: { text: string; icon: ReactNode }[] = [
  { text: "6 Jahre Trading-Erfahrung", icon: <LineChart size={16} strokeWidth={2} /> },
  { text: "1 Mio+ Payouts erzielt", icon: <Trophy size={16} strokeWidth={2} /> },
  { text: "1000+ Trader ausgebildet", icon: <Users size={16} strokeWidth={2} /> },
  { text: "8-stelliger Funded-Status", icon: <Crown size={16} strokeWidth={2} /> },
];

const SIDEBAR_CELL_THEMES = [
  SIDEBAR_THEME_GOLD,
  SIDEBAR_THEME_SILVER,
  SIDEBAR_THEME_SILVER,
  SIDEBAR_THEME_GOLD,
] as const;

function sidebarCellTheme(i: number) {
  return SIDEBAR_CELL_THEMES[i] ?? SIDEBAR_THEME_GOLD;
}

/* ── Sidebar Card ────────────────────────────────────────── */

function SidebarCard({ onApply }: { onApply: () => void }) {
  const { cta } = landingConfig;

  return (
    <Box
      position="sticky"
      top="24px"
      borderRadius="20px"
      overflow="hidden"
      sx={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(212,175,55,0.25)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow:
          "0 8px 40px rgba(0,0,0,0.50), 0 0 0 1px rgba(212,175,55,0.08)",
      }}
    >
      {/* Gold top accent */}
      <Box
        h="2px"
        sx={{
          background:
            "linear-gradient(90deg, transparent 5%, rgba(212,175,55,0.55) 30%, rgba(212,175,55,0.55) 70%, transparent 95%)",
        }}
      />

      <Stack spacing={5} p={5}>
        {/* Branding */}
        <Stack spacing={4} align="center" textAlign="center">
          <Box display="flex" justifyContent="center">
            <Logo variant="onDark" width={180} height={50} />
          </Box>
          <Text
            fontSize="sm"
            color="rgba(255,255,255,0.62)"
            className="inter"
            lineHeight="1.65"
            fontWeight={500}
          >
            Der Capital Circle hat bisher
          </Text>
          <SimpleGrid columns={2} spacing={3} w="full">
            {SIDEBAR_HIGHLIGHT_ROWS.map((row, i) => {
              const theme = sidebarCellTheme(i);
              return (
                <Box
                  key={row.text}
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  textAlign="center"
                  gap={2}
                  px={2}
                  py={3}
                  borderRadius="12px"
                  minH="108px"
                  justifyContent="center"
                  sx={{
                    background: theme.bulletBg,
                    border: `1px solid ${theme.border}`,
                    boxShadow: theme.shadow,
                  }}
                >
                  <Box
                    flexShrink={0}
                    w="36px"
                    h="36px"
                    borderRadius="10px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    sx={{
                      background: theme.iconBg,
                      color: theme.iconColor,
                      border: `1px solid ${theme.border}`,
                    }}
                  >
                    {row.icon}
                  </Box>
                  <Text
                    fontSize="xs"
                    className="inter-semibold"
                    lineHeight="1.35"
                    sx={{ color: theme.iconColor }}
                  >
                    {row.text}
                  </Text>
                </Box>
              );
            })}
          </SimpleGrid>
        </Stack>

        {/* CTA – nur Desktop (Mobile: fester Balken unten) */}
        <Box
          as="button"
          onClick={onApply}
          w="full"
          minH="48px"
          borderRadius="12px"
          fontWeight="600"
          fontSize="15px"
          letterSpacing="0.02em"
          color="#07080A"
          display={{ base: "none", md: "flex" }}
          alignItems="center"
          justifyContent="center"
          gap={2}
          className="inter-semibold"
          sx={goldCtaSx}
        >
          <Lock size={15} strokeWidth={2.5} />
          {cta.primary}
        </Box>

        {/* Trust text — gleiche Tonality wie „Der Capital Circle hat bisher“ */}
        <Text
          fontSize="sm"
          color="rgba(255,255,255,0.62)"
          className="inter"
          fontWeight={500}
          textAlign="center"
          lineHeight="1.65"
        >
          {cta.secondary}
        </Text>
      </Stack>
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
  const [videoEnded, setVideoEnded] = useState(false);

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
      {/* Splash overlay */}
      <Box
        position="fixed"
        inset={0}
        zIndex={9999}
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        gap={5}
        bg="#07080A"
        pointerEvents={loading ? "auto" : "none"}
        sx={{
          transition:
            "transform 450ms cubic-bezier(0.4, 0, 0.2, 1), opacity 350ms ease",
          transform: loading ? "translateY(0)" : "translateY(-100%)",
          opacity: loading ? 1 : 0,
        }}
      >
        <Logo variant="onDark" width={200} height={56} priority />
        <Box
          w="120px"
          h="3px"
          borderRadius="full"
          bg="rgba(255,255,255,0.06)"
          overflow="hidden"
        >
          <Box
            h="full"
            borderRadius="full"
            sx={{
              background: "linear-gradient(90deg, #A67C00, #D4AF37, #E8C547)",
              animation: "splashProgress 300ms linear forwards",
              "@keyframes splashProgress": {
                "0%": { width: "0%" },
                "100%": { width: "100%" },
              },
            }}
          />
        </Box>
      </Box>

      <style>{`
        nav[aria-label], header[role="banner"], [data-platform-nav], [data-topbar] {
          display: none !important;
        }
        body {
          padding-top: 0 !important;
          margin-top: 0 !important;
          padding-bottom: 120px;
        }
        @media (min-width: 768px) {
          body { padding-bottom: 0; }
        }
      `}</style>

      {/* Mobile CTA Footer */}
      <MobileCTAFooter onApply={openModal} />

      <Box
        minH="100vh"
        w="full"
        bg="var(--color-bg-primary, #07080A)"
        color="var(--color-text-primary, #F0F0F2)"
        position="relative"
        overflowX="hidden"
        _before={{
          content: '""',
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 80% -10%, rgba(212,175,55,0.12), transparent 60%), radial-gradient(ellipse 60% 50% at 10% 100%, rgba(212,175,55,0.06), transparent 65%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <Box position="relative" zIndex={1}>
          {/* ── Main Section ─────────────────────────────────────── */}
          <Box
            as="section"
            w="100%"
            position="relative"
            pt={{ base: 8, md: 12 }}
            pb={{ base: 6, md: 12 }}
            px={{ base: 4, md: 8, lg: 12 }}
            sx={{
              backgroundImage: "url('/bg/dashboard.png')",
              backgroundSize: "cover",
              backgroundPosition: "center center",
              backgroundRepeat: "no-repeat",
            }}
          >
            {/* Overlay */}
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
            {/* Gold top accent */}
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

            <Box maxW="1200px" mx="auto" position="relative" zIndex={2}>
              {/* ── Page Title with red highlight ─────────────── */}
              <Stack spacing={3} align="center" mb={{ base: 8, md: 10 }}>
                <Text
                  as="h1"
                  className="inter-bold"
                  fontSize={{ base: "lg", sm: "xl", md: "2xl", lg: "3xl" }}
                  textTransform="uppercase"
                  letterSpacing="0.06em"
                  color="var(--color-text-primary, #F0F0F2)"
                  textAlign="center"
                  lineHeight="1.2"
                >
                  Du hast nur diese{" "}
                  <Box
                    as="span"
                    px={2}
                    py={0.5}
                    borderRadius="6px"
                    sx={{
                      background: "rgba(229,62,62,0.18)",
                      border: "1px solid rgba(229,62,62,0.30)",
                      display: "inline-block",
                    }}
                  >
                    EINE EINZIGE CHANCE.
                  </Box>
                </Text>
              </Stack>

              {/* ── 2-Column Grid: Video + Sidebar ───────────── */}
              <Box
                display={{ base: "flex", md: "grid" }}
                flexDirection="column"
                sx={{
                  "@media (min-width: 48em)": {
                    gridTemplateColumns: "1fr 340px",
                    gap: "32px",
                  },
                }}
                gap={{ base: 6, md: 0 }}
              >
                {/* Left: Video */}
                <Box position="relative">
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
                            background:
                              "radial-gradient(circle, rgba(7,8,10,0.93) 0%, rgba(7,8,10,0.82) 100%)",
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
                            onClick={() => {
                              setVideoEnded(false);
                              openModal();
                            }}
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
                            sx={goldCtaSx}
                          >
                            <Lock size={14} strokeWidth={2.5} />
                            Jetzt kostenlos bewerben
                          </Box>
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
                        boxShadow:
                          "0 16px 56px rgba(0,0,0,0.55), 0 0 0 1px rgba(212,175,55,0.08)",
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
                      <Text
                        className="inter"
                        color="rgba(255,255,255,0.35)"
                        fontSize="sm"
                        fontWeight={400}
                      >
                        Vorstellungsvideo folgt in Kürze
                      </Text>
                    </Box>
                  )}
                </Box>

                {/* Right: Sidebar (Desktop) */}
                <Box display={{ base: "none", md: "block" }}>
                  <SidebarCard onApply={openModal} />
                </Box>
              </Box>

              {/* Mobile: Sidebar content inline below video */}
              <Box display={{ base: "block", md: "none" }} mt={6}>
                <SidebarCard onApply={openModal} />
              </Box>
            </Box>
          </Box>

          {/* ── Content Cards Section ────────────────────────── */}
          <Box
            as="section"
            w="100%"
            py={{ base: 10, md: 16 }}
            px={{ base: 4, md: 8, lg: 12 }}
          >
            <Box maxW="1200px" mx="auto">
              {/* Section header */}
              <Stack spacing={3} textAlign="center" mb={{ base: 8, md: 12 }}>
                <Text
                  fontSize="xs"
                  letterSpacing="0.22em"
                  textTransform="uppercase"
                  color="rgba(255,255,255,0.40)"
                  className="inter-semibold"
                >
                  Capital Circle
                </Text>
                <Text
                  as="h2"
                  className="inter-bold"
                  fontSize={{ base: "xl", md: "2xl", lg: "3xl" }}
                  color="var(--color-text-primary, #F0F0F2)"
                  lineHeight="1.2"
                >
                  Was dich im Free Kurs erwartet
                </Text>
                <Text
                  fontSize={{ base: "sm", md: "md" }}
                  color="rgba(255,255,255,0.45)"
                  className="inter"
                  maxW="580px"
                  mx="auto"
                  lineHeight="1.7"
                >
                  Dieser Free Kurs ist nicht dafür gedacht, dir einfach nur
                  kostenlose Inhalte zu geben. Er soll dir zeigen, was
                  möglich ist.
                </Text>
              </Stack>

              {/* Cards — horizontal scroll on mobile, grid on desktop */}
              <Box
                display={{ base: "flex", md: "none" }}
                gap={4}
                pb={4}
                sx={{
                  overflowX: "auto",
                  scrollSnapType: "x mandatory",
                  WebkitOverflowScrolling: "touch",
                  scrollbarWidth: "none",
                  "&::-webkit-scrollbar": { display: "none" },
                }}
              >
                {INSIGHT_CARDS.map((card, i) => (
                  <Box
                    key={card.title}
                    flexShrink={0}
                    w="82vw"
                    sx={{ scrollSnapAlign: "start" }}
                  >
                    <InsightContentCard
                      card={card}
                      index={i}
                      onApply={openModal}
                    />
                  </Box>
                ))}
              </Box>

              <SimpleGrid
                display={{ base: "none", md: "grid" }}
                columns={3}
                spacing={6}
              >
                {INSIGHT_CARDS.map((card, i) => (
                  <InsightContentCard
                    key={card.title}
                    card={card}
                    index={i}
                    onApply={openModal}
                  />
                ))}
              </SimpleGrid>
            </Box>
          </Box>

          {/* ── Footer ───────────────────────────────────────── */}
          <Box
            py={10}
            px={{ base: 4, md: 8 }}
            textAlign="center"
            borderTop="1px solid rgba(255,255,255,0.05)"
          >
            <Stack spacing={2}>
              <Text
                fontSize="xs"
                color="rgba(255,255,255,0.22)"
                className="inter"
                maxW="560px"
                mx="auto"
                lineHeight="1.7"
              >
                Mit dem Abschicken der Bewerbung stimmst du unserer{" "}
                <Box
                  as="a"
                  href="/datenschutz"
                  color="rgba(212,175,55,0.55)"
                  textDecoration="underline"
                >
                  Datenschutzerklärung
                </Box>{" "}
                zu. Trading und Investitionen sind mit erheblichen
                Verlustrisiken verbunden. Frühere Ergebnisse sind keine
                Garantie für zukünftige Gewinne.
              </Text>
              <Text
                fontSize="xs"
                color="rgba(255,255,255,0.15)"
                className="inter"
              >
                © {new Date().getFullYear()} Capital Circle Institut
              </Text>
            </Stack>
          </Box>
        </Box>
      </Box>

      {isModalOpen && (
        <FreeApplicationModal isOpen={isModalOpen} onClose={closeModal} />
      )}
    </>
  );
}
