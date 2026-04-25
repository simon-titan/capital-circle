"use client";

import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import {
  TrendingUp,
  Users,
  DollarSign,
  Award,
  BookOpen,
  Brain,
  BarChart2,
  Layers,
  Target,
  ClipboardList,
  Zap,
} from "lucide-react";
import { landingConfig } from "@/config/landing-config";

// Colors aligned with HeroSection CARD_THEMES (warm gold family only)
const ACHIEVEMENT_CARDS = [
  {
    icon: Award,
    label: "Funded Status",
    value: "7-stellig",
    sub: "Nachgewiesen und gehalten",
    accent: "#D4AF37",
    glow: "rgba(212,175,55,0.18)",
    bg: "linear-gradient(135deg, rgba(212,175,55,0.13) 0%, rgba(8,8,8,0.62) 100%)",
    border: "rgba(212,175,55,0.38)",
  },
  {
    icon: DollarSign,
    label: "Verifizierte Payouts",
    value: "300.000 €",
    sub: "Ausgezahlte Gewinne",
    accent: "#FF9430",
    glow: "rgba(255,148,48,0.16)",
    bg: "linear-gradient(135deg, rgba(255,140,40,0.12) 0%, rgba(200,80,0,0.06) 50%, rgba(8,8,8,0.62) 100%)",
    border: "rgba(255,148,50,0.36)",
  },
  {
    icon: Users,
    label: "Ausgebildete Trader",
    value: "1.000+",
    sub: "Persönlich betreut",
    accent: "#F0DC82",
    glow: "rgba(240,220,130,0.16)",
    bg: "linear-gradient(135deg, rgba(240,220,130,0.12) 0%, rgba(212,175,55,0.06) 50%, rgba(8,8,8,0.62) 100%)",
    border: "rgba(240,220,130,0.38)",
  },
  {
    icon: TrendingUp,
    label: "Aktives Trading",
    value: "6 Jahre",
    sub: "An den Kapitalmärkten",
    accent: "#B4C8E8",
    glow: "rgba(180,200,232,0.14)",
    bg: "linear-gradient(135deg, rgba(180,200,230,0.10) 0%, rgba(212,175,55,0.05) 50%, rgba(8,8,8,0.62) 100%)",
    border: "rgba(190,210,240,0.30)",
  },
];

// Expertise mini-cards with fitting icons
const EXPERTISE_ITEMS = [
  { icon: BarChart2,     label: "Futures und Forex Trading" },
  { icon: Target,        label: "Risikomanagement und Positionsgrößen" },
  { icon: Brain,         label: "Mentale Stärke und Trading Psychologie" },
  { icon: Layers,        label: "Institutional Order Flow Analyse" },
  { icon: Zap,           label: "Funded Account Strategien und Skalierung" },
  { icon: TrendingUp,    label: "Liquiditätszonen und Smart Money Konzepte" },
  { icon: ClipboardList, label: "Journaling und Performance Tracking" },
  { icon: BookOpen,      label: "Marktstruktur und Multi Timeframe Analyse" },
];

export function FounderSection() {
  const { founder } = landingConfig;

  return (
    <Box
      as="section"
      w="100%"
      position="relative"
      // No overflow="hidden" — would block the mobile scroll slider
      py={{ base: 14, md: 20 }}
      sx={{
        backgroundImage: "url('/bg/landscape.png')",
        backgroundSize: "cover",
        backgroundPosition: "center 30%",
        backgroundRepeat: "no-repeat",
        // Dark overlay so text remains readable and brand identity is preserved
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(7,8,12,0.93) 0%, rgba(7,8,12,0.72) 35%, rgba(7,8,12,0.72) 65%, rgba(7,8,12,0.93) 100%)",
          zIndex: 0,
        },
      }}
    >
      {/* Background glow top-right */}
      <Box
        position="absolute"
        top="0"
        right="0"
        w={{ base: "280px", md: "560px" }}
        h={{ base: "280px", md: "560px" }}
        pointerEvents="none"
        zIndex={0}
        sx={{
          background:
            "radial-gradient(ellipse at top right, rgba(212,175,55,0.07) 0%, transparent 65%)",
          filter: "blur(40px)",
        }}
      />
      {/* Background glow bottom-left */}
      <Box
        position="absolute"
        bottom="0"
        left="0"
        w={{ base: "220px", md: "440px" }}
        h={{ base: "220px", md: "440px" }}
        pointerEvents="none"
        zIndex={0}
        sx={{
          background:
            "radial-gradient(ellipse at bottom left, rgba(212,175,55,0.05) 0%, transparent 65%)",
          filter: "blur(50px)",
        }}
      />

      {/* Inner padded container — px applied here, NOT on the section itself */}
      <Box
        maxW="980px"
        mx="auto"
        position="relative"
        zIndex={1}
        px={{ base: 4, md: 8, lg: 12 }}
      >
        {/* Section label */}
        <HStack mb={10} justify={{ base: "center", lg: "flex-start" }} gap={3}>
          <Box
            w="28px"
            h="1px"
            bg="linear-gradient(90deg, transparent, rgba(212,175,55,0.70))"
          />
          <Text
            fontSize="xs"
            letterSpacing="0.22em"
            textTransform="uppercase"
            color="var(--color-accent-gold, #D4AF37)"
            className="inter-semibold"
          >
            Meet the Founder
          </Text>
          <Box
            w="28px"
            h="1px"
            bg="linear-gradient(90deg, rgba(212,175,55,0.70), transparent)"
          />
        </HStack>

        <Stack
          direction={{ base: "column", lg: "row" }}
          gap={{ base: 10, lg: 14 }}
          align={{ base: "center", lg: "flex-start" }}
        >
          {/* ── LEFT: Photo + Social — sticky on desktop ── */}
          <Box
            flexShrink={0}
            textAlign="center"
            alignSelf={{ base: "center", lg: "flex-start" }}
            position={{ base: "relative", lg: "sticky" }}
            top={{ lg: "100px" }}
          >
            <Box position="relative" display="inline-block">
              {/* Decorative ring behind image */}
              <Box
                position="absolute"
                top="-10px"
                left="-10px"
                right="-10px"
                bottom="-10px"
                borderRadius="24px"
                pointerEvents="none"
                sx={{
                  background:
                    "linear-gradient(135deg, rgba(212,175,55,0.10), transparent 60%)",
                  border: "1px solid rgba(212,175,55,0.12)",
                }}
              />
              {/* Image container */}
              <Box
                w={{ base: "220px", md: "280px", lg: "320px" }}
                h={{ base: "290px", md: "360px", lg: "420px" }}
                borderRadius="20px"
                overflow="hidden"
                position="relative"
                mx="auto"
                sx={{
                  border: "1px solid rgba(212,175,55,0.32)",
                  boxShadow:
                    "0 20px 64px rgba(0,0,0,0.65), 0 0 48px rgba(212,175,55,0.08)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <Box
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                  h="2px"
                  background="linear-gradient(90deg, transparent, rgba(212,175,55,0.75), transparent)"
                  zIndex={1}
                />
                <Box
                  w="full"
                  h="full"
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  gap={3}
                >
                  <Box
                    w="64px"
                    h="64px"
                    borderRadius="full"
                    bg="rgba(212,175,55,0.10)"
                    border="1px solid rgba(212,175,55,0.32)"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    color="var(--color-accent-gold, #D4AF37)"
                    fontSize="26px"
                    className="radley-regular"
                  >
                    {founder.name[0]}
                  </Box>
                  <Text
                    fontSize="xs"
                    color="rgba(255,255,255,0.22)"
                    className="inter"
                  >
                    Foto folgt
                  </Text>
                </Box>
              </Box>
            </Box>

            {/* Social links */}
            <HStack justify="center" gap={3} mt={7}>
              <Box
                as="a"
                href={founder.socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                w="40px"
                h="40px"
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
                sx={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.45)",
                  transition: "all 220ms ease",
                  _hover: {
                    background: "rgba(212,175,55,0.12)",
                    borderColor: "rgba(212,175,55,0.40)",
                    color: "var(--color-accent-gold, #D4AF37)",
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
                </svg>
              </Box>
              <Box
                as="a"
                href={founder.socialLinks.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                w="40px"
                h="40px"
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
                sx={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.45)",
                  transition: "all 220ms ease",
                  _hover: {
                    background: "rgba(212,175,55,0.12)",
                    borderColor: "rgba(212,175,55,0.40)",
                    color: "var(--color-accent-gold, #D4AF37)",
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.77a8.16 8.16 0 0 0 4.77 1.52V6.82a4.85 4.85 0 0 1-1-.13z" />
                </svg>
              </Box>
            </HStack>
          </Box>

          {/* ── RIGHT: Content — minW=0 prevents flex overflow ── */}
          <Stack flex={1} minW="0" gap={7} w={{ base: "100%", lg: "auto" }}>
            {/* Name + subtitle */}
            <Stack gap={2}>
              <Text
                fontSize="xs"
                letterSpacing="0.18em"
                textTransform="uppercase"
                color="rgba(255,255,255,0.35)"
                className="inter-semibold"
              >
                {founder.subtitle}
              </Text>
              <Text
                as="h2"
                className="radley-regular"
                fontWeight={400}
                fontSize={{ base: "3xl", md: "4xl", lg: "4xl" }}
                color="var(--color-text-primary, #F0F0F2)"
                lineHeight="1.05"
                letterSpacing="-0.01em"
              >
                {founder.name}
              </Text>
              <Box
                w="44px"
                h="2px"
                bg="linear-gradient(90deg, var(--color-accent-gold, #D4AF37), transparent)"
                borderRadius="full"
              />
            </Stack>

            {/* ── Bio — 3 individually styled paragraphs ── */}
            <Stack gap={4}>
              {/* Paragraph 1: normal text with gold-highlighted keywords */}
              <Text
                fontSize={{ base: "sm", md: "md" }}
                color="rgba(255,255,255,0.68)"
                className="inter"
                lineHeight="1.82"
              >
                Ich trade seit über{" "}
                <Box
                  as="span"
                  color="var(--color-accent-gold, #D4AF37)"
                  className="inter-semibold"
                  sx={{ textShadow: "0 0 12px rgba(212,175,55,0.35)" }}
                >
                  6 Jahren
                </Box>
                . Nicht als Hobby. Nicht nebenbei.{" "}
                <Box
                  as="span"
                  color="rgba(255,255,255,0.90)"
                  className="inter-semibold"
                >
                  Vollzeit, an echten Märkten, mit echtem Geld.
                </Box>{" "}
                Ich habe den{" "}
                <Box
                  as="span"
                  color="var(--color-accent-gold, #D4AF37)"
                  className="inter-semibold"
                  sx={{ textShadow: "0 0 12px rgba(212,175,55,0.35)" }}
                >
                  siebenstelligen Funded Status
                </Box>{" "}
                erreicht und über{" "}
                <Box
                  as="span"
                  color="var(--color-accent-gold, #D4AF37)"
                  className="inter-semibold"
                  sx={{ textShadow: "0 0 12px rgba(212,175,55,0.35)" }}
                >
                  300.000 € in verifizierten Payouts
                </Box>{" "}
                ausgezahlt bekommen.
              </Text>

              {/* Paragraph 2: gold highlight box */}
              <Box
                px={4}
                py={4}
                borderRadius="12px"
                sx={{
                  background:
                    "linear-gradient(135deg, rgba(212,175,55,0.09) 0%, rgba(212,175,55,0.03) 100%)",
                  border: "1px solid rgba(212,175,55,0.22)",
                  borderLeft: "3px solid rgba(212,175,55,0.60)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                <Text
                  fontSize={{ base: "sm", md: "md" }}
                  color="rgba(255,255,255,0.75)"
                  className="inter"
                  lineHeight="1.82"
                >
                  Irgendwann war mir klar: Was ich aufgebaut habe, ist zu
                  wertvoll um es für mich zu behalten. Aber ich wollte{" "}
                  <Box
                    as="span"
                    color="rgba(255,255,255,0.95)"
                    className="inter-semibold"
                  >
                    keinen Massenkurs bauen, der jeden reinlässt.
                  </Box>{" "}
                  Deshalb habe ich{" "}
                  <Box
                    as="span"
                    color="var(--color-accent-gold, #D4AF37)"
                    className="inter-semibold"
                  >
                    Capital Circle
                  </Box>{" "}
                  gegründet. Eine Community, in der nur Trader landen, die es
                  wirklich ernst meinen.
                </Text>
              </Box>

              {/* Paragraph 3: italic personal statement */}
              <Text
                fontSize={{ base: "sm", md: "md" }}
                color="rgba(255,255,255,0.82)"
                className="inter"
                lineHeight="1.82"
                fontStyle="italic"
              >
                Kein Fluff. Kein Upsell.{" "}
                <Box as="span" color="var(--color-accent-gold, #D4AF37)" className="inter-semibold" fontStyle="normal">
                  Kein System das heute funktioniert und morgen nicht.
                </Box>{" "}
                Nur eine echte Methodik, ein echter Mentor und ein Umfeld das
                dich besser macht.
              </Text>
            </Stack>

            {/* ── Achievement Cards ── */}
            <Stack gap={3}>
              <Text
                fontSize="xs"
                letterSpacing="0.18em"
                textTransform="uppercase"
                color="rgba(255,255,255,0.35)"
                className="inter-semibold"
              >
                Nachgewiesene Ergebnisse
              </Text>

              {/*
                Mobile slider: breaks out of the px={4} padding of the inner container
                via negative margin, so cards run edge-to-edge to the screen border.
                First card gets pl=4 to still start with breathing room.
              */}
              <Box
                display={{ base: "flex", md: "none" }}
                mx={-4}
                gap={3}
                pb={2}
                sx={{
                  overflowX: "auto",
                  overflowY: "visible",
                  scrollSnapType: "x mandatory",
                  WebkitOverflowScrolling: "touch",
                  "&::-webkit-scrollbar": { display: "none" },
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  paddingLeft: "20px",
                  paddingRight: "20px",
                }}
              >
                {ACHIEVEMENT_CARDS.map((card) => (
                  <AchievementCard key={card.label} card={card} mobile />
                ))}
              </Box>

              {/* Desktop: 2x2 grid */}
              <Box
                display={{ base: "none", md: "grid" }}
                sx={{ gridTemplateColumns: "1fr 1fr", gap: "10px" }}
              >
                {ACHIEVEMENT_CARDS.map((card) => (
                  <AchievementCard key={card.label} card={card} />
                ))}
              </Box>
            </Stack>

            {/* ── Expertise Mini-Cards ── */}
            <Stack gap={4}>
              <Stack gap={0.5}>
                <Text
                  fontSize="xs"
                  letterSpacing="0.18em"
                  textTransform="uppercase"
                  color="rgba(255,255,255,0.35)"
                  className="inter-semibold"
                >
                  Expertise
                </Text>
                <Text
                  fontSize="xs"
                  color="rgba(255,255,255,0.28)"
                  className="inter"
                >
                  Was ich dir beibringen kann
                </Text>
              </Stack>

              <Box
                display="grid"
                sx={{
                  gridTemplateColumns: {
                    base: "1fr",
                    sm: "1fr 1fr",
                  },
                  gap: "8px",
                }}
              >
                {EXPERTISE_ITEMS.map((item) => (
                  <ExpertiseCard key={item.label} item={item} />
                ))}
              </Box>
            </Stack>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}

/* ── Achievement Card Sub-Component ── */
function AchievementCard({
  card,
  mobile = false,
}: {
  card: (typeof ACHIEVEMENT_CARDS)[number];
  mobile?: boolean;
}) {
  const Icon = card.icon;
  return (
    <Box
      flexShrink={0}
      w={mobile ? "68vw" : "auto"}
      maxW={mobile ? "240px" : undefined}
      p={4}
      borderRadius="14px"
      sx={{
        background: card.bg,
        border: `1px solid ${card.border}`,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: `0 4px 20px ${card.glow}, 0 0 0 1px rgba(255,255,255,0.03) inset`,
        scrollSnapAlign: "start",
        transition: "transform 220ms ease, box-shadow 220ms ease",
        _hover: {
          transform: "translateY(-3px)",
          boxShadow: `0 8px 32px ${card.glow}, 0 0 0 1px rgba(255,255,255,0.05) inset`,
        },
      }}
    >
      <Stack gap={3}>
        <Box
          w="34px"
          h="34px"
          borderRadius="9px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          sx={{
            background: `${card.accent}1A`,
            border: `1px solid ${card.accent}35`,
          }}
        >
          <Icon size={17} strokeWidth={1.75} style={{ color: card.accent }} />
        </Box>
        <Stack gap={0.5}>
          <Text
            fontSize={{ base: "lg", md: "xl" }}
            fontWeight={700}
            className="inter-bold"
            lineHeight="1.1"
            sx={{ color: card.accent }}
          >
            {card.value}
          </Text>
          <Text
            fontSize="xs"
            className="inter-semibold"
            color="rgba(255,255,255,0.75)"
            lineHeight="1.3"
          >
            {card.label}
          </Text>
          <Text
            fontSize="10px"
            className="inter"
            color="rgba(255,255,255,0.32)"
            lineHeight="1.3"
          >
            {card.sub}
          </Text>
        </Stack>
      </Stack>
    </Box>
  );
}

/* ── Expertise Mini-Card Sub-Component ── */
function ExpertiseCard({ item }: { item: (typeof EXPERTISE_ITEMS)[number] }) {
  const Icon = item.icon;
  return (
    <HStack
      gap={3}
      px={3}
      py={2.5}
      borderRadius="10px"
      sx={{
        background: "rgba(212,175,55,0.04)",
        border: "1px solid rgba(212,175,55,0.14)",
        transition: "all 200ms ease",
        _hover: {
          background: "rgba(212,175,55,0.08)",
          borderColor: "rgba(212,175,55,0.28)",
        },
      }}
    >
      <Box
        flexShrink={0}
        w="28px"
        h="28px"
        borderRadius="7px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        sx={{
          background: "rgba(212,175,55,0.12)",
          border: "1px solid rgba(212,175,55,0.22)",
        }}
      >
        <Icon size={13} strokeWidth={1.75} color="#D4AF37" />
      </Box>
      <Text
        fontSize="sm"
        color="rgba(255,255,255,0.72)"
        className="inter"
        lineHeight="1.4"
      >
        {item.label}
      </Text>
    </HStack>
  );
}
