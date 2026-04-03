"use client";

import { useMemo } from "react";
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Badge,
  Box,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";
import Link from "next/link";
import {
  BookOpen,
  Lock,
  TrendingUp,
  BarChart2,
  Layers,
  Target,
  Compass,
  Lightbulb,
  Shield,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AcademyModuleRow } from "@/lib/server-data";
import { moduleHref } from "@/lib/module-route";

// Fallback-Farben (rotierend wenn kein DB-Wert gesetzt)
const FALLBACK_COLORS = [
  "rgba(212,175,55,1)",
  "rgba(99,179,237,1)",
  "rgba(154,117,255,1)",
  "rgba(74,222,128,1)",
  "rgba(251,146,60,1)",
];

// Fallback-Icons (rotierend wenn kein DB-Wert gesetzt)
const FALLBACK_ICONS = [TrendingUp, BarChart2, Layers, Target, Compass, Lightbulb, Shield, Star];

// Lucide-Icon-Map für DB-gespeicherte Icon-Namen
const LUCIDE_MAP: Record<string, LucideIcon> = {
  TrendingUp, BarChart2, Layers, Target, Compass, Lightbulb, Shield, Star,
  BookOpen, Lock,
};

function resolveAccent(color: string) {
  return {
    border: color.replace(",1)", ",0.35)"),
    borderExpanded: color.replace(",1)", ",0.6)"),
    bg: color.replace(",1)", ",0.06)"),
  };
}

function resolveIcon(iconName: string | null | undefined, idx: number): LucideIcon {
  if (iconName && LUCIDE_MAP[iconName]) return LUCIDE_MAP[iconName];
  return FALLBACK_ICONS[idx % FALLBACK_ICONS.length];
}

function formatTotalDuration(totalSeconds: number) {
  if (totalSeconds <= 0) return "—";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} Min.`;
}

function groupModulesByCourse(modules: AcademyModuleRow[]) {
  const order: string[] = [];
  const map = new Map<string, AcademyModuleRow[]>();
  for (const m of modules) {
    if (!map.has(m.courseId)) {
      order.push(m.courseId);
      map.set(m.courseId, []);
    }
    map.get(m.courseId)!.push(m);
  }
  return order.map((courseId) => {
    const first = map.get(courseId)![0];
    return {
      courseId,
      courseTitle: first?.courseTitle ?? "Kurs",
      courseIcon: first?.courseIcon ?? null,
      courseAccentColor: first?.courseAccentColor ?? null,
      modules: map.get(courseId)!,
    };
  });
}

function ModuleListRow({ m }: { m: AcademyModuleRow }) {
  const href = moduleHref({ id: m.id, slug: m.slug });
  const locked = !m.unlocked || m.isLocked;
  const statusLabel = locked ? "Gesperrt" : m.completed ? "Abgeschlossen" : m.progressPercent > 0 ? "In Arbeit" : "Neu";
  const statusColor = locked
    ? "rgba(240,240,242,0.45)"
    : m.completed
      ? "rgba(74, 222, 128, 0.9)"
      : m.progressPercent > 0
        ? "var(--color-accent-gold)"
        : "rgba(240,240,242,0.65)";

  const inner = (
    <HStack
      align="flex-start"
      spacing={4}
      py={3}
      px={{ base: 3, md: 4 }}
      borderRadius="12px"
      borderWidth="1px"
      borderColor="rgba(255,255,255,0.08)"
      bg="rgba(255,255,255,0.03)"
      opacity={locked ? 0.72 : 1}
      transition="background 0.2s ease"
      _hover={locked ? undefined : { bg: "rgba(212,175,55,0.06)", borderColor: "rgba(212,175,55,0.25)" }}
      cursor={locked ? "not-allowed" : "pointer"}
    >
      <Box flex={1} minW={0}>
        <Text className="inter-semibold" fontSize="sm" color="var(--color-text-primary)" noOfLines={2}>
          {m.title}
        </Text>
        <HStack spacing={2} flexWrap="wrap" mt={2}>
          <Badge
            borderRadius="md"
            px={2}
            py={0.5}
            bg="rgba(255,255,255,0.06)"
            color="rgba(240,240,242,0.75)"
            fontWeight={500}
            className="inter"
            fontSize="xs"
          >
            <HStack spacing={1}>
              <BookOpen size={12} aria-hidden />
              <span>
                {m.videoCount} {m.videoCount === 1 ? "Video" : "Videos"}
              </span>
            </HStack>
          </Badge>
          <Badge
            borderRadius="md"
            px={2}
            py={0.5}
            bg="rgba(212,175,55,0.12)"
            color="var(--color-accent-gold)"
            fontWeight={500}
            className="jetbrains-mono"
            fontSize="xs"
          >
            {formatTotalDuration(m.totalDurationSeconds)}
          </Badge>
          <HStack spacing={1} color={statusColor}>
            {locked ? <Lock size={12} aria-hidden /> : null}
            <Text className="inter-medium" fontSize="10px" textTransform="uppercase" letterSpacing="0.06em">
              {statusLabel}
            </Text>
          </HStack>
        </HStack>
        {!locked && !m.completed && m.progressPercent > 0 ? (
          <Box mt={2} h="3px" borderRadius="full" bg="rgba(255,255,255,0.08)" overflow="hidden">
            <Box
              h="full"
              w={`${m.progressPercent}%`}
              borderRadius="full"
              bg="linear-gradient(90deg, var(--color-accent-gold-dark), var(--color-accent-gold-light))"
              transition="width 0.3s ease"
            />
          </Box>
        ) : null}
      </Box>
    </HStack>
  );

  if (locked) {
    return <Box pointerEvents="none">{inner}</Box>;
  }

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      {inner}
    </Link>
  );
}

export function InstitutAccordion({ modules }: { modules: AcademyModuleRow[] }) {
  const groups = useMemo(() => groupModulesByCourse(modules), [modules]);

  if (groups.length === 0) return null;

  return (
    <Accordion allowToggle defaultIndex={[0]}>
      {groups.map((g, idx) => {
        const rawColor = g.courseAccentColor ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
        const accent = resolveAccent(rawColor);
        const CourseIcon = resolveIcon(g.courseIcon, idx);
        return (
          <AccordionItem key={g.courseId} border="none" mb={3}>
            {({ isExpanded }: { isExpanded: boolean }) => (
              <>
                <AccordionButton
                  borderRadius="16px"
                  px={{ base: 4, md: 5 }}
                  py={4}
                  bg="rgba(255,255,255,0.04)"
                  borderWidth="1px"
                  borderColor={isExpanded ? accent.borderExpanded : accent.border}
                  borderLeftWidth="3px"
                  _expanded={{ bg: accent.bg }}
                  _hover={{ bg: accent.bg }}
                  transition="border-color 0.2s ease, background 0.2s ease"
                >
                  <HStack flex="1" textAlign="left" spacing={3}>
                    <Box
                      flexShrink={0}
                      w="36px"
                      h="36px"
                      borderRadius="10px"
                      bg={isExpanded ? accent.bg : "rgba(255,255,255,0.05)"}
                      borderWidth="1px"
                      borderColor={isExpanded ? accent.borderExpanded : accent.border}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      transition="all 0.2s ease"
                    >
                      <CourseIcon
                        size={16}
                        style={{ color: isExpanded ? accent.borderExpanded : "rgba(240,240,242,0.55)" }}
                        aria-hidden
                      />
                    </Box>
                    <Box>
                      <Text className="inter-semibold" fontSize="md" color="var(--color-text-primary)">
                        {g.courseTitle}
                      </Text>
                      <Text className="inter" fontSize="xs" color="var(--color-text-muted)" mt={0.5}>
                        {g.modules.length} {g.modules.length === 1 ? "Modul" : "Module"}
                      </Text>
                    </Box>
                  </HStack>
                  <AccordionIcon color={isExpanded ? accent.borderExpanded : "rgba(240,240,242,0.45)"} />
                </AccordionButton>
                <AccordionPanel px={0} pt={3} pb={1}>
                  <VStack align="stretch" spacing={2}>
                    {g.modules.map((m) => (
                      <ModuleListRow key={m.id} m={m} />
                    ))}
                  </VStack>
                </AccordionPanel>
              </>
            )}
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
