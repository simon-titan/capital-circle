"use client";

import type { ReactNode } from "react";
import { Box, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import {
  TrendingUp,
  Trophy,
  BookOpen,
  Clock,
  HelpCircle,
  XCircle,
  BarChart3,
  Flame,
  FileX,
  Dumbbell,
  Rocket,
  Brain,
  ArrowRight,
} from "lucide-react";
import { landingConfig } from "@/config/landing-config";

const CARD_HEADER_ICONS: Record<string, ReactNode> = {
  Student: <BookOpen size={22} strokeWidth={1.5} />,
  TrendUp: <TrendingUp size={22} strokeWidth={1.5} />,
  Trophy: <Trophy size={22} strokeWidth={1.5} />,
};

const BULLET_ICONS: Record<string, ReactNode> = {
  Clock: <Clock size={16} strokeWidth={2} />,
  HelpCircle: <HelpCircle size={16} strokeWidth={2} />,
  XCircle: <XCircle size={16} strokeWidth={2} />,
  BarChart3: <BarChart3 size={16} strokeWidth={2} />,
  Flame: <Flame size={16} strokeWidth={2} />,
  FileX: <FileX size={16} strokeWidth={2} />,
  Dumbbell: <Dumbbell size={16} strokeWidth={2} />,
  Rocket: <Rocket size={16} strokeWidth={2} />,
  Brain: <Brain size={16} strokeWidth={2} />,
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
    // Amber/Bronze
    border: "rgba(255,148,50,0.50)",
    borderHover: "rgba(255,148,50,0.75)",
    bg: "radial-gradient(circle at 90% 90%, rgba(255,148,50,0.20) 0%, rgba(8,8,8,0.70) 60%)",
    bgHover: "radial-gradient(circle at 90% 90%, rgba(255,148,50,0.28) 0%, rgba(8,8,8,0.70) 60%)",
    iconBg: "rgba(255,148,50,0.20)",
    iconColor: "rgba(255,148,50,1)",
    topLine: "linear-gradient(90deg, transparent 30%, rgba(255,148,50,0.70) 70%, transparent 95%)",
    shadow: "0 0 28px rgba(255,148,50,0.18), 0 4px 16px rgba(0,0,0,0.50)",
    shadowHover: "0 0 40px rgba(255,148,50,0.28), 0 8px 32px rgba(0,0,0,0.60)",
    bulletBg: "rgba(255,148,50,0.10)",
  },
  {
    // Silber / Platin
    border: "rgba(180,195,220,0.32)",
    borderHover: "rgba(180,195,220,0.55)",
    bg: "radial-gradient(circle at 50% 10%, rgba(180,195,220,0.14) 0%, rgba(8,8,8,0.74) 65%)",
    bgHover: "radial-gradient(circle at 50% 10%, rgba(180,195,220,0.22) 0%, rgba(8,8,8,0.74) 65%)",
    iconBg: "rgba(180,195,220,0.14)",
    iconColor: "#AAC0D8",
    topLine: "linear-gradient(90deg, transparent 10%, rgba(160,180,210,0.65) 50%, transparent 90%)",
    shadow: "0 4px 24px rgba(0,0,0,0.50), 0 0 20px rgba(160,180,210,0.08)",
    shadowHover: "0 12px 40px rgba(0,0,0,0.60), 0 0 32px rgba(160,180,210,0.18)",
    bulletBg: "rgba(180,195,220,0.08)",
  },
  {
    // Gold
    border: "rgba(212,175,55,0.45)",
    borderHover: "rgba(212,175,55,0.72)",
    bg: "radial-gradient(circle at 85% 15%, rgba(212,175,55,0.18) 0%, rgba(8,8,8,0.72) 65%)",
    bgHover: "radial-gradient(circle at 85% 15%, rgba(212,175,55,0.26) 0%, rgba(8,8,8,0.72) 65%)",
    iconBg: "rgba(212,175,55,0.16)",
    iconColor: "#D4AF37",
    topLine: "linear-gradient(90deg, transparent 30%, rgba(212,175,55,0.70) 70%, rgba(212,175,55,0.30) 100%)",
    shadow: "0 4px 24px rgba(0,0,0,0.50), 0 0 20px rgba(212,175,55,0.12)",
    shadowHover: "0 12px 40px rgba(0,0,0,0.60), 0 0 36px rgba(212,175,55,0.24)",
    bulletBg: "rgba(212,175,55,0.08)",
  },
];

function TargetCard({
  group,
  index,
  onApply,
}: {
  group: (typeof landingConfig.targetGroups)[number];
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
      minH={{ base: "auto", md: "400px" }}
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
        // Top accent line via pseudo-element
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
      {/* Card header icon */}
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
        {CARD_HEADER_ICONS[group.iconName] ?? <TrendingUp size={22} strokeWidth={1.5} />}
      </Box>

      {/* Title + Description — fixed height so divider is always at same position */}
      <Stack spacing={2} mb={5} minH={{ base: "auto", md: "108px" }}>
        <Text
          fontSize={{ base: "lg", md: "xl" }}
          color="var(--color-text-primary, #F0F0F2)"
          className="inter-bold"
          lineHeight="1.25"
        >
          {group.title}
        </Text>
        <Text
          fontSize="sm"
          color="rgba(255,255,255,0.52)"
          className="inter"
          lineHeight="1.65"
        >
          {group.description}
        </Text>
      </Stack>

      {/* Divider */}
      <Box
        h="1px"
        mb={5}
        sx={{ background: `linear-gradient(90deg, ${theme.border} 0%, transparent 100%)` }}
      />

      {/* Bullets — prominent mini badges */}
      <Stack spacing={3} flex={1}>
        {group.bullets.map((bullet) => (
          <Box
            key={bullet.text}
            display="flex"
            alignItems="center"
            gap={3}
            px={3}
            py={2}
            borderRadius="10px"
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
              {BULLET_ICONS[bullet.icon] ?? <ArrowRight size={16} strokeWidth={2} />}
            </Box>
            <Text
              fontSize="sm"
              color="rgba(255,255,255,0.82)"
              className="inter-semibold"
              lineHeight="1.4"
            >
              {bullet.text}
            </Text>
          </Box>
        ))}
      </Stack>

      {/* CTA link */}
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
          _hover: { opacity: 0.80, gap: "10px" },
        }}
      >
        {group.cta}
        <ArrowRight size={14} strokeWidth={2.5} />
      </Box>
    </Box>
  );
}

export function StatsAndTargetSection({ onApply }: { onApply: () => void }) {
  const { targetGroups, product } = landingConfig;

  return (
    <Box
      as="section"
      w="100%"
      bg="var(--color-bg-primary, #07080A)"
      py={{ base: 14, md: 20 }}
      px={{ base: 4, md: 8, lg: 12 }}
    >
      <Box maxW="1200px" mx="auto">

        {/* Section header */}
        <Stack spacing={3} textAlign="center" mb={12}>
          <Text
            fontSize="xs"
            letterSpacing="0.22em"
            textTransform="uppercase"
            color="rgba(255,255,255,0.40)"
            className="inter-semibold"
          >
            Wen wählen wir aus?
          </Text>
          <Text
            as="h2"
            className="inter-bold"
            fontSize={{ base: "2xl", md: "3xl", lg: "4xl" }}
            color="var(--color-text-primary, #F0F0F2)"
            lineHeight="1.2"
          >
            <Box as="span" color="#7EB6FF">
              Wen
            </Box>{" "}
            wählen wir für den{" "}
            <Box as="br" display={{ base: "none", md: "block" }} />
            <Box
              as="span"
              px={2}
              py={0.5}
              borderRadius="6px"
              sx={{
                background: "linear-gradient(90deg, rgba(126,182,255,0.16), transparent 95%)",
                border: "1px solid rgba(126,182,255,0.22)",
                display: "inline-block",
              }}
            >
              {product.name}
            </Box>{" "}
            aus?
          </Text>
          <Text
            fontSize={{ base: "sm", md: "md" }}
            color="rgba(255,255,255,0.45)"
            className="inter"
            maxW="540px"
            mx="auto"
            lineHeight="1.7"
          >
            Nicht jeder bekommt einen Platz. Wir schauen genau hin und entscheiden bewusst.
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
          {targetGroups.map((group, i) => (
            <Box key={group.title} flexShrink={0} w="82vw" sx={{ scrollSnapAlign: "start" }}>
              <TargetCard group={group} index={i} onApply={onApply} />
            </Box>
          ))}
        </Box>

        <SimpleGrid display={{ base: "none", md: "grid" }} columns={3} spacing={6}>
          {targetGroups.map((group, i) => (
            <TargetCard key={group.title} group={group} index={i} onApply={onApply} />
          ))}
        </SimpleGrid>

        {/* CTA Block */}
        <Box
          mt={16}
          borderRadius="24px"
          overflow="hidden"
          position="relative"
          sx={{
            background:
              "linear-gradient(135deg, rgba(212,175,55,0.07) 0%, rgba(10,10,14,0.95) 50%, rgba(180,195,220,0.05) 100%)",
            border: "1px solid rgba(212,175,55,0.18)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            boxShadow: "0 8px 48px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Blue top accent */}
          <Box
            h="2px"
            sx={{
              background:
                "linear-gradient(90deg, transparent 10%, rgba(126,182,255,0.65) 40%, rgba(126,182,255,0.65) 60%, transparent 90%)",
            }}
          />

          <Box px={{ base: 6, md: 12 }} py={{ base: 8, md: 12 }} textAlign="center">
            {/* Tag */}
            <Box
              display="inline-flex"
              alignItems="center"
              px={3}
              py={1}
              borderRadius="full"
              mb={5}
              sx={{
                background: "rgba(126,182,255,0.10)",
                border: "1px solid rgba(126,182,255,0.30)",
              }}
            >
              <Text
                fontSize="xs"
                letterSpacing="0.18em"
                textTransform="uppercase"
                color="rgba(126,182,255,0.90)"
                className="inter-semibold"
              >
                Deine Chance
              </Text>
            </Box>

            {/* Headline */}
            <Text
              as="h3"
              className="inter-bold"
              fontSize={{ base: "xl", md: "2xl", lg: "3xl" }}
              color="var(--color-text-primary, #F0F0F2)"
              mb={5}
              lineHeight="1.25"
            >
              Denkst du, du hast dir den{" "}
              <Box as="span" color="#7EB6FF">
                Platz verdient?
              </Box>
            </Text>

            {/* Body text */}
            <Text
              fontSize={{ base: "sm", md: "md" }}
              color="rgba(255,255,255,0.58)"
              className="inter"
              maxW="600px"
              mx="auto"
              mb={4}
              lineHeight="1.80"
            >
              Jeder hat eine{" "}
              <Box as="span" color="rgba(126,182,255,0.90)" className="inter-semibold">
                Chance.
              </Box>{" "}
              Es kommt darauf an, wer du bist, was du erreichen willst und welches{" "}
              <Box as="span" color="var(--color-accent-gold, #D4AF37)" className="inter-semibold">
                Potenzial
              </Box>{" "}
              wir in dir sehen.
            </Text>
            <Text
              fontSize={{ base: "sm", md: "md" }}
              color="rgba(255,255,255,0.58)"
              className="inter"
              maxW="560px"
              mx="auto"
              mb={{ base: 0, md: 8 }}
              lineHeight="1.80"
            >
              Deine Erfahrung ist uns vollkommen egal. Wer du wirklich bist, zählt!
            </Text>

            {/* Button — Desktop only */}
            <Box
              as="button"
              display={{ base: "none", md: "inline-flex" }}
              alignItems="center"
              gap={2}
              px={8}
              py={3}
              borderRadius="12px"
              fontSize="sm"
              className="inter-semibold"
              letterSpacing="0.05em"
              color="#07080A"
              onClick={onApply}
              sx={{
                background: "linear-gradient(135deg, #E8C547 0%, #D4AF37 55%, #A67C00 100%)",
                boxShadow: "0 4px 22px rgba(212,175,55,0.38)",
                transition: "all 220ms cubic-bezier(0.16,1,0.3,1)",
                _hover: {
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 32px rgba(212,175,55,0.55)",
                },
                _active: { transform: "translateY(0)" },
              }}
            >
              Jetzt bewerben
              <ArrowRight size={15} strokeWidth={2.5} />
            </Box>
          </Box>
        </Box>

      </Box>
    </Box>
  );
}
