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
  Divider,
  Grid,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";
import Image from "next/image";
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
    const mods = map.get(courseId)!;
    const first = mods[0];
    // Kurs-Ebene: Paid-Kurs, zu dem der Nutzer (noch) keinen Zugriff hat.
    // Wird ueber das courseIsFree-Flag am ersten Modul abgeleitet
    // (alle Module eines Kurses teilen denselben is_free-Wert).
    const coursePremiumLocked = !first?.courseIsFree && mods.every((m) => !m.hasAccess);
    return {
      courseId,
      courseSlug: first?.courseSlug ?? null,
      courseTitle: first?.courseTitle ?? "Kurs",
      courseIcon: first?.courseIcon ?? null,
      courseAccentColor: first?.courseAccentColor ?? null,
      courseUnlocked: first?.courseUnlocked ?? true,
      coursePremiumLocked,
      modules: mods,
    };
  });
}

function FreeModuleCard({ m }: { m: AcademyModuleRow }) {
  const href = moduleHref({ id: m.id, slug: m.slug });
  const pct = m.completed ? 100 : m.progressPercent;
  const hasProgress = pct > 0;

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <Box
        borderRadius="16px"
        overflow="hidden"
        bg="rgba(255,255,255,0.06)"
        borderWidth="1px"
        borderColor="rgba(255,255,255,0.08)"
        transition="border-color 0.2s ease, box-shadow 0.2s ease"
        _hover={{
          borderColor: "rgba(212,175,55,0.35)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
        }}
        cursor="pointer"
      >
        <Box
          position="relative"
          w="100%"
          aspectRatio="16 / 9"
          bg="#0a0a0a"
          display="flex"
          alignItems="center"
          justifyContent="center"
          overflow="hidden"
        >
          <Image
            src="/logo/logo-white.png"
            alt="Capital Circle"
            width={200}
            height={56}
            style={{
              objectFit: "contain",
              width: "60%",
              maxWidth: 180,
              height: "auto",
              mixBlendMode: "lighten",
            }}
          />
        </Box>
        <Box px={4} pt={3} pb={4}>
          <Text
            className="inter-semibold"
            fontSize="sm"
            color="var(--color-text-primary)"
            noOfLines={1}
            mb={3}
          >
            {m.title}
          </Text>
          <Box position="relative">
            <Box
              h="6px"
              borderRadius="full"
              bg="rgba(255,255,255,0.08)"
              overflow="hidden"
            >
              <Box
                h="full"
                w={`${pct}%`}
                borderRadius="full"
                bg={hasProgress ? "#22c55e" : "rgba(255,255,255,0.12)"}
                transition="width 0.3s ease"
              />
            </Box>
            <Text
              className="jetbrains-mono"
              fontSize="10px"
              color={hasProgress ? "#22c55e" : "var(--color-text-muted)"}
              mt={1.5}
            >
              {pct}%
            </Text>
          </Box>
        </Box>
      </Box>
    </Link>
  );
}

function ModuleListRow({ m }: { m: AcademyModuleRow }) {
  const href = moduleHref({ id: m.id, slug: m.slug });
  // Progression-/Admin-Sperre: kein Klick moeglich.
  const progressionLocked = !m.courseUnlocked || !m.unlocked || m.isLocked;
  // Premium-Sperre: Klick fuehrt zur Modul-Seite mit PaywallOverlay (kein harter Block hier).
  const premiumLocked = !progressionLocked && !m.hasAccess;
  const locked = progressionLocked || premiumLocked;
  const statusLabel = progressionLocked
    ? "Gesperrt"
    : premiumLocked
      ? "Nur für vollwertige Member"
      : m.completed
        ? "Abgeschlossen"
        : m.progressPercent > 0
          ? "In Arbeit"
          : "Neu";
  const statusColor = progressionLocked
    ? "rgba(240,240,242,0.45)"
    : premiumLocked
      ? "var(--color-accent-gold)"
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
      borderColor={premiumLocked ? "rgba(212,175,55,0.22)" : "rgba(255,255,255,0.08)"}
      bg={premiumLocked ? "rgba(212,175,55,0.04)" : "rgba(255,255,255,0.03)"}
      opacity={progressionLocked ? 0.72 : premiumLocked ? 0.9 : 1}
      transition="background 0.2s ease"
      _hover={
        progressionLocked
          ? undefined
          : { bg: "rgba(212,175,55,0.06)", borderColor: "rgba(212,175,55,0.25)" }
      }
      cursor={progressionLocked ? "not-allowed" : "pointer"}
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

  // Progression-Sperre: komplett nicht klickbar.
  if (progressionLocked) {
    return <Box pointerEvents="none">{inner}</Box>;
  }

  // Premium-Sperre: klickbar, landet auf Modul-Seite mit PaywallOverlay.
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      {inner}
    </Link>
  );
}

function LockedCourseHeader({
  g,
  idx,
}: {
  g: ReturnType<typeof groupModulesByCourse>[number];
  idx: number;
}) {
  const rawColor = g.courseAccentColor ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
  const accent = resolveAccent(rawColor);
  const CourseIcon = resolveIcon(g.courseIcon, idx);
  const moduleCount = g.modules.length;

  return (
    <Box
      borderRadius={{ base: "18px", md: "20px" }}
      px={{ base: 5, md: 6 }}
      py={{ base: 5, md: 6 }}
      minH={{ base: "76px", md: "88px" }}
      bg="rgba(255,255,255,0.04)"
      borderWidth="1px"
      borderColor={accent.border}
      borderLeftWidth="4px"
      mb={4}
      opacity={0.85}
    >
      <HStack textAlign="left" spacing={{ base: 4, md: 5 }}>
        <Box
          flexShrink={0}
          w={{ base: "48px", md: "56px" }}
          h={{ base: "48px", md: "56px" }}
          borderRadius="14px"
          bg="rgba(255,255,255,0.05)"
          borderWidth="1px"
          borderColor={accent.border}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <CourseIcon
            size={28}
            strokeWidth={1.75}
            style={{ color: "rgba(240,240,242,0.55)" }}
            aria-hidden
          />
        </Box>
        <Box flex={1} minW={0}>
          <HStack spacing={2} align="center" flexWrap="wrap">
            <Text
              className="inter-semibold"
              fontSize={{ base: "lg", md: "xl" }}
              lineHeight="1.25"
              color="var(--color-text-primary)"
            >
              {g.courseTitle}
            </Text>
            <HStack spacing={1.5} color="var(--color-accent-gold)">
              <Lock size={16} aria-hidden />
              <Text className="inter-medium" fontSize="11px" textTransform="uppercase" letterSpacing="0.06em">
                Nur für vollwertige Member
              </Text>
            </HStack>
          </HStack>
          <Text className="inter" fontSize={{ base: "sm", md: "md" }} color="var(--color-text-muted)" mt={1}>
            {moduleCount} {moduleCount === 1 ? "Modul" : "Module"}
          </Text>
        </Box>
      </HStack>
    </Box>
  );
}

function CourseAccordionGroup({
  groups,
}: {
  groups: ReturnType<typeof groupModulesByCourse>;
}) {
  const defaultIndex = useMemo(() => {
    if (typeof window === "undefined") return [0];
    const hash = window.location.hash.replace(/^#/, "").trim();
    if (!hash) return [0];
    const idx = groups.findIndex((g) => g.courseSlug === hash);
    return idx >= 0 ? [idx] : [0];
  }, [groups]);

  if (groups.length === 0) return null;

  return (
    <Accordion allowToggle defaultIndex={defaultIndex}>
      {groups.map((g, idx) => {
        const rawColor = g.courseAccentColor ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
        const accent = resolveAccent(rawColor);
        const CourseIcon = resolveIcon(g.courseIcon, idx);
        const courseLocked = !g.courseUnlocked;
        return (
          <AccordionItem key={g.courseId} id={g.courseSlug ?? undefined} border="none" mb={4} scrollMarginTop="96px">
            {({ isExpanded }: { isExpanded: boolean }) => (
              <>
                <AccordionButton
                  borderRadius={{ base: "18px", md: "20px" }}
                  px={{ base: 5, md: 6 }}
                  py={{ base: 5, md: 6 }}
                  minH={{ base: "76px", md: "88px" }}
                  bg="rgba(255,255,255,0.04)"
                  borderWidth="1px"
                  borderColor={isExpanded ? accent.borderExpanded : accent.border}
                  borderLeftWidth="4px"
                  _expanded={{ bg: accent.bg }}
                  _hover={{ bg: accent.bg }}
                  transition="border-color 0.2s ease, background 0.2s ease"
                  opacity={courseLocked ? 0.78 : 1}
                  cursor={courseLocked ? "not-allowed" : "pointer"}
                >
                  <HStack flex="1" textAlign="left" spacing={{ base: 4, md: 5 }}>
                    <Box
                      flexShrink={0}
                      w={{ base: "48px", md: "56px" }}
                      h={{ base: "48px", md: "56px" }}
                      borderRadius="14px"
                      bg={isExpanded ? accent.bg : "rgba(255,255,255,0.05)"}
                      borderWidth="1px"
                      borderColor={isExpanded ? accent.borderExpanded : accent.border}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      transition="all 0.2s ease"
                    >
                      <CourseIcon
                        size={28}
                        strokeWidth={1.75}
                        style={{ color: isExpanded ? accent.borderExpanded : "rgba(240,240,242,0.55)" }}
                        aria-hidden
                      />
                    </Box>
                    <Box flex={1} minW={0}>
                      <HStack spacing={2} align="center" flexWrap="wrap">
                        <Text
                          className="inter-semibold"
                          fontSize={{ base: "lg", md: "xl" }}
                          lineHeight="1.25"
                          color="var(--color-text-primary)"
                        >
                          {g.courseTitle}
                        </Text>
                        {courseLocked ? (
                          <HStack spacing={1.5} color="rgba(240,240,242,0.45)">
                            <Lock size={16} aria-hidden />
                            <Text className="inter-medium" fontSize="11px" textTransform="uppercase" letterSpacing="0.06em">
                              Kurs gesperrt
                            </Text>
                          </HStack>
                        ) : g.coursePremiumLocked ? (
                          <HStack spacing={1.5} color="var(--color-accent-gold)">
                            <Lock size={16} aria-hidden />
                            <Text className="inter-medium" fontSize="11px" textTransform="uppercase" letterSpacing="0.06em">
                              Nur für vollwertige Member
                            </Text>
                          </HStack>
                        ) : null}
                      </HStack>
                      <Text className="inter" fontSize={{ base: "sm", md: "md" }} color="var(--color-text-muted)" mt={1}>
                        {`${g.modules.length} ${g.modules.length === 1 ? "Modul" : "Module"}`}
                      </Text>
                    </Box>
                  </HStack>
                  <AccordionIcon
                    boxSize={{ base: "22px", md: "24px" }}
                    color={isExpanded ? accent.borderExpanded : "rgba(240,240,242,0.45)"}
                  />
                </AccordionButton>
                <AccordionPanel px={0} pt={3} pb={1}>
                  {courseLocked ? (
                    <Text className="inter" fontSize="sm" color="var(--color-text-muted)" px={{ base: 1, md: 2 }} py={2}>
                      Dieser Kurs wird freigeschaltet, sobald du den vorherigen Kurs vollständig abgeschlossen hast.
                    </Text>
                  ) : (
                    <VStack align="stretch" spacing={2}>
                      {g.modules.map((m) => (
                        <ModuleListRow key={m.id} m={m} />
                      ))}
                    </VStack>
                  )}
                </AccordionPanel>
              </>
            )}
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

export function InstitutAccordion({
  modules,
  isPaid = true,
}: {
  modules: AcademyModuleRow[];
  isPaid?: boolean;
}) {
  const groups = useMemo(() => groupModulesByCourse(modules), [modules]);

  if (groups.length === 0) return null;

  if (isPaid) {
    return <CourseAccordionGroup groups={groups} />;
  }

  const freeModules = modules.filter((m) => m.courseIsFree);
  const paidGroups = groups.filter((g) => !g.modules[0]?.courseIsFree);

  return (
    <Box>
      {freeModules.length > 0 && (
        <Grid
          templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
          gap={{ base: 4, md: 5 }}
        >
          {freeModules.map((m) => (
            <FreeModuleCard key={m.id} m={m} />
          ))}
        </Grid>
      )}

      {paidGroups.length > 0 && (
        <>
          <HStack my={8} align="center" spacing={4}>
            <Divider borderColor="rgba(212,175,55,0.3)" />
            <Text
              whiteSpace="nowrap"
              px={4}
              className="inter-semibold"
              color="var(--color-accent-gold)"
              fontSize="sm"
            >
              Capital Circle Member
            </Text>
            <Divider borderColor="rgba(212,175,55,0.3)" />
          </HStack>
          <VStack align="stretch" spacing={0}>
            {paidGroups.map((g, idx) => (
              <LockedCourseHeader key={g.courseId} g={g} idx={idx} />
            ))}
          </VStack>
        </>
      )}
    </Box>
  );
}
