"use client";

import { Box, Text } from "@chakra-ui/react";
import { useId } from "react";
import type { WelcomeDashboardMetrics } from "@/lib/welcome-metrics";

function GoldDonut({
  percent,
  label,
  subline,
  gradientId,
}: {
  percent: number;
  label: string;
  subline: string;
  gradientId: string;
}) {
  const p = Math.max(0, Math.min(100, percent));
  const size = 72;
  const stroke = 6;
  const r = (size - stroke) / 2 - 1;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - p / 100);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <Box textAlign="center" minW="0" flex="1">
      <Box position="relative" w={`${size}px`} h={`${size}px`} mx="auto">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0dc82" />
              <stop offset="45%" stopColor="#e8c547" />
              <stop offset="100%" stopColor="#8a7218" />
            </linearGradient>
          </defs>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <Text
          className="jetbrains-mono"
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          fontSize="lg"
          fontWeight={700}
          color="var(--color-accent-gold-light)"
          lineHeight={1}
        >
          {p}%
        </Text>
      </Box>
      <Text className="inter-medium" fontSize="10px" letterSpacing="0.06em" textTransform="uppercase" color="rgba(255,255,255,0.45)" mt={3} mb={0.5}>
        {label}
      </Text>
      <Text className="inter" fontSize="xs" color="rgba(245, 236, 210, 0.82)" noOfLines={2}>
        {subline}
      </Text>
    </Box>
  );
}

export function WelcomeModuleRings({ metrics }: { metrics: WelcomeDashboardMetrics }) {
  const uid = useId().replace(/:/g, "");
  const modPct = metrics.totalModules > 0 ? Math.round((metrics.completedModules / metrics.totalModules) * 100) : 0;
  const vidPct = metrics.totalVideos > 0 ? Math.round((metrics.completedVideos / metrics.totalVideos) * 100) : 0;

  return (
    <Box
      w="100%"
      minW={0}
      borderRadius="14px"
      border="1px solid rgba(212, 175, 55, 0.38)"
      bg="linear-gradient(165deg, rgba(212, 175, 55, 0.1) 0%, rgba(8, 8, 8, 0.55) 55%)"
      px={{ base: 3, md: 4 }}
      py={{ base: 2, md: 3 }}
      h="100%"
    >
      <Text className="inter-medium" fontSize="xs" letterSpacing="0.1em" textTransform="uppercase" color="rgba(255,255,255,0.5)" mb={4}>
        Institut
      </Text>
      <Box
        display="flex"
        flexDirection={{ base: "column", sm: "row" }}
        gap={{ base: 6, sm: 3, md: 4 }}
        justifyContent="space-between"
        alignItems="stretch"
        w="100%"
      >
        <GoldDonut
          percent={metrics.overallProgressPercent}
          gradientId={`${uid}-g`}
          label="Gesamt"
          subline="Fortschritt aller Inhalte"
        />
        <GoldDonut
          percent={modPct}
          gradientId={`${uid}-m`}
          label="Module"
          subline={`${metrics.completedModules} von ${metrics.totalModules}`}
        />
        <GoldDonut
          percent={vidPct}
          gradientId={`${uid}-v`}
          label="Videos"
          subline={`${metrics.completedVideos} von ${metrics.totalVideos}`}
        />
      </Box>
    </Box>
  );
}
