"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Box,
  Grid,
  HStack,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
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
import { IconTile, clampLines } from "@/components/platform/dashboard/primitives";

// Fallback-Icons (rotierend wenn kein DB-Wert gesetzt)
const FALLBACK_ICONS = [TrendingUp, BarChart2, Layers, Target, Compass, Lightbulb, Shield, Star];

// Lucide-Icon-Map für DB-gespeicherte Icon-Namen
const LUCIDE_MAP: Record<string, LucideIcon> = {
  TrendingUp, BarChart2, Layers, Target, Compass, Lightbulb, Shield, Star,
  BookOpen, Lock,
};

/** Kleine Versal-Labels (Status, Trenner). */
const LABEL_STYLE = {
  fontSize: "12px",
  fontWeight: 500,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
} as const;

/** Gestaffelter Einstieg (80ms + 70ms je Schritt), gedeckelt, damit lange Listen nicht nachhinken. */
function riseDelay(i: number) {
  return { animationDelay: `${80 + Math.min(i, 10) * 70}ms` };
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
      courseUnlocked: first?.courseUnlocked ?? true,
      coursePremiumLocked,
      modules: mods,
    };
  });
}

type PillTone = "gold" | "neutral" | "muted" | "success";

const PILL_TONES: Record<PillTone, { color: string; borderColor: string; bg: string }> = {
  gold: { color: "var(--cc-gold-light)", borderColor: "rgba(212, 176, 128, 0.3)", bg: "rgba(212, 176, 128, 0.07)" },
  neutral: { color: "var(--cc-text-2)", borderColor: "var(--cc-line)", bg: "rgba(255, 255, 255, 0.03)" },
  muted: { color: "var(--cc-text-3)", borderColor: "var(--cc-line)", bg: "transparent" },
  success: { color: "var(--cc-success)", borderColor: "rgba(74, 222, 128, 0.3)", bg: "rgba(74, 222, 128, 0.07)" },
};

/** Kleine Pille für Meta (Videos, Dauer) und Status. */
function Pill({
  tone,
  icon,
  upper = false,
  className,
  children,
}: {
  tone: PillTone;
  icon?: ReactNode;
  upper?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <HStack
      as="span"
      display="inline-flex"
      spacing={1.5}
      px={2.5}
      py={1}
      borderRadius="full"
      borderWidth="1px"
      borderStyle="solid"
      fontSize="12px"
      lineHeight="16px"
      fontWeight={500}
      whiteSpace="nowrap"
      className={className}
      {...PILL_TONES[tone]}
      {...(upper ? { letterSpacing: "0.12em", textTransform: "uppercase" as const } : null)}
    >
      {icon}
      <span>{children}</span>
    </HStack>
  );
}

/** Fortschritt: Gold-Balken, füllt sich einmal beim Laden. Ohne Schein — siehe Dashboard. */
function GoldBar({ value, label, h = "6px" }: { value: number; label: string; h?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <Box
      role="progressbar"
      aria-label={label}
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      flex={1}
      minW={0}
      h={h}
      borderRadius="full"
      bg="rgba(255, 255, 255, 0.07)"
    >
      {v > 0 ? (
        <Box
          className="cc-fill"
          h="100%"
          w={`${v}%`}
          bg="var(--cc-gold-bar)"
          borderRadius="full"
        />
      ) : null}
    </Box>
  );
}

function CourseIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <IconTile>
      <Icon size={26} strokeWidth={1.75} />
    </IconTile>
  );
}

function FreeModuleCard({ m }: { m: AcademyModuleRow }) {
  const href = moduleHref({ id: m.id, slug: m.slug });
  const pct = m.completed ? 100 : m.progressPercent;
  const hasProgress = pct > 0;

  return (
    <Link href={href} style={{ textDecoration: "none", display: "block", height: "100%" }}>
      <Box className="cc-card cc-card--still" h="100%" cursor="pointer">
        <Box
          position="relative"
          w="100%"
          aspectRatio="16 / 9"
          borderTopRadius="11px"
          borderBottom="1px solid var(--cc-line)"
          bg="radial-gradient(ellipse 70% 65% at 50% 38%, rgba(212, 176, 128, 0.16), transparent 72%), var(--cc-surface-2)"
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
        <Box px={{ base: 4, md: 5 }} pt={4} pb={{ base: 4, md: 5 }}>
          <Text fontSize="17px" fontWeight={600} lineHeight={1.3} color="var(--cc-text)" sx={clampLines(1)} mb={3}>
            {m.title}
          </Text>
          <HStack spacing={3} align="center">
            <GoldBar value={pct} label={`Fortschritt ${m.title}`} />
            <Text
              className="cc-num"
              fontSize="12px"
              fontWeight={500}
              color={hasProgress ? "var(--cc-gold-light)" : "var(--cc-text-3)"}
              minW="3ch"
              textAlign="right"
            >
              {pct}%
            </Text>
          </HStack>
        </Box>
      </Box>
    </Link>
  );
}

/**
 * Modulkachel im Raster. Die Untermodule stehen immer offen — es gibt nichts
 * aufzuklappen, ein Klick auf die Karte führt direkt ins Modul.
 *
 * Feste Höhe, damit alle Kacheln im Raster gleich hoch sind; hat ein Modul
 * ungewöhnlich viele Untermodule, scrollt die Liste innen, statt die Karte
 * (und damit ihre ganze Rasterreihe) zu strecken.
 */
function ModuleTile({ m, mitCoverSpur }: { m: AcademyModuleRow; mitCoverSpur: boolean }) {
  const href = moduleHref({ id: m.id, slug: m.slug });
  /**
   * Ein Cover-Key kann auf eine Datei zeigen, die es nicht (mehr) gibt — die
   * alten Bilder lagen auf dem verschwundenen Hetzner-Bucket. Statt einen
   * kaputten Bildrahmen zu zeigen, fällt die Karte dann auf die normale
   * Ansicht zurück.
   */
  const [coverKaputt, setCoverKaputt] = useState(false);
  const coverUrl = !coverKaputt ? m.thumbnailSignedUrl : null;
  // Progression-/Admin-Sperre: kein Zugang moeglich.
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
  const statusTone: PillTone = progressionLocked
    ? "muted"
    : premiumLocked
      ? "gold"
      : m.completed
        ? "success"
        : m.progressPercent > 0
          ? "gold"
          : "neutral";

  const inhalt = (
    <Box
      h="100%"
      /**
       * Die Höhe richtet sich danach, ob im Raster überhaupt Cover vorkommen —
       * nicht danach, ob *diese* Karte eines hat. Sonst stünden Karten mit und
       * ohne Bild unterschiedlich hoch nebeneinander.
       */
      minH={{ base: "auto", md: mitCoverSpur ? "440px" : "300px" }}
      display="flex"
      flexDirection="column"
      borderRadius="10px"
      // Neutrale Kante wie im Dashboard: kein Gold, kein Schein — nur der
      // Hover hebt die Karte leicht hervor (Nutzerwunsch 16.09.2026).
      bg="rgba(255, 255, 255, 0.03)"
      border="1px solid var(--cc-line)"
      opacity={progressionLocked ? 0.7 : 1}
      overflow="hidden"
      transition="background-color 180ms var(--cc-ease), border-color 180ms var(--cc-ease)"
      _hover={
        progressionLocked
          ? undefined
          : { bg: "rgba(255, 255, 255, 0.05)", borderColor: "rgba(255, 255, 255, 0.24)" }
      }
    >
      {coverUrl ? (
        <Box
          flexShrink={0}
          position="relative"
          w="100%"
          // Volle Breite im 16:9-Format — dasselbe Verhältnis, das der Admin
          // beim Hochladen als Vorgabe angezeigt bekommt.
          aspectRatio="16 / 9"
          /**
           * Deckel gegen die feste Kartenhöhe: Auf breiten Schirmen wird eine
           * Spalte über 420 px breit, und 16:9 wäre dann höher als der Platz,
           * der für Titel, Kennzahlen und Knopf übrig bleibt. Das Bild wird
           * dann oben/unten stärker beschnitten statt die Karte zu sprengen.
           */
          maxH="240px"
          overflow="hidden"
          borderBottom="1px solid var(--cc-line)"
          bg="var(--cc-surface-2)"
        >
          {/* Kein next/image: Die signierte R2-URL ist kein in next.config.ts
              erlaubter Remote-Host, und ein Signatur-Token macht den
              Optimizer-Cache ohnehin wertlos. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt=""
            onError={() => setCoverKaputt(true)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </Box>
      ) : null}

      <Box flexShrink={0} py={3} px={{ base: 3, md: 4 }}>
        <Text
          fontSize="15px"
          fontWeight={600}
          lineHeight={1.35}
          color={progressionLocked ? "var(--cc-text-2)" : "var(--cc-text)"}
          sx={clampLines(2)}
        >
          {m.title}
        </Text>

        <HStack spacing={2} flexWrap="wrap" mt={2.5}>
          <Pill tone="neutral" icon={<BookOpen size={12} aria-hidden />}>
            {m.videoCount} {m.videoCount === 1 ? "Video" : "Videos"}
          </Pill>
          <Pill tone="neutral" icon={<Clock size={12} aria-hidden />} className="cc-num">
            {formatTotalDuration(m.totalDurationSeconds)}
          </Pill>
          <Pill tone={statusTone} upper icon={locked ? <Lock size={12} aria-hidden /> : undefined}>
            {statusLabel}
          </Pill>
        </HStack>

        {!locked && !m.completed && m.progressPercent > 0 ? (
          <HStack mt={3} spacing={3} align="center">
            <GoldBar value={m.progressPercent} label={`Fortschritt ${m.title}`} h="4px" />
            <Text className="cc-num" fontSize="12px" fontWeight={500} color="var(--cc-gold-light)">
              {m.progressPercent}%
            </Text>
          </HStack>
        ) : null}
      </Box>

      {/*
        Untermodule nur ohne Cover. Mit Bild trägt die Karte schon genug —
        Titel, Kennzahlen und Vorschau reichen, die Inhaltsliste würde sie
        überladen (Nutzerwunsch 16.09.2026).
        `minH={0}` ist in einer Flex-Spalte nötig, sonst ignoriert das Kind sein
        `overflow` und die Karte wächst doch über die feste Höhe hinaus.
      */}
      <Box flex="1" minH={0} overflowY="auto" px={{ base: 3, md: 4 }} pt={coverUrl ? 0 : 3} borderTop={coverUrl ? undefined : "1px solid var(--cc-line)"}>
        {coverUrl ? null : m.submodules.length > 0 ? (
          <VStack align="stretch" spacing={2}>
            {m.submodules.map((s, i) => {
              const fertig = s.videoCount > 0 && s.completedCount >= s.videoCount;
              return (
                <HStack key={s.id ?? `direkt-${i}`} spacing={2.5} align="center">
                  <Box
                    as={fertig ? CheckCircle2 : Layers}
                    boxSize="14px"
                    flexShrink={0}
                    aria-hidden
                    color={fertig ? "var(--cc-success)" : "var(--cc-text-3)"}
                  />
                  <Text fontSize="13px" color="var(--cc-text)" flex={1} minW={0} sx={clampLines(1)}>
                    {s.title}
                  </Text>
                  <Text fontSize="12px" color="var(--cc-text-3)" className="cc-num" flexShrink={0}>
                    {s.completedCount}/{s.videoCount}
                  </Text>
                </HStack>
              );
            })}
          </VStack>
        ) : (
          <Text fontSize="13px" color="var(--cc-text-3)">
            Alle Videos liegen direkt im Modul.
          </Text>
        )}
      </Box>

      {/*
        Sieht aus wie ein Knopf, ist aber nur Beschriftung: Die ganze Karte ist
        der Link. Ein echter Knopf darin wäre ein zweites klickbares Element im
        selben `<a>` — ungültiges Markup und für die Tastatur verwirrend.
      */}
      {!progressionLocked ? (
        <HStack
          as="span"
          flexShrink={0}
          mx={{ base: 3, md: 4 }}
          my={3}
          h="32px"
          px={3}
          spacing={1.5}
          justify="center"
          borderRadius="8px"
          bg="var(--cc-gold)"
          bgImage="var(--cc-gold-grad)"
          color="var(--cc-on-gold)"
          fontSize="14px"
          fontWeight={600}
        >
          <Box as="span">
            {premiumLocked ? "Modul ansehen" : m.progressPercent > 0 ? "Weiterlernen" : "Modul starten"}
          </Box>
          <ArrowRight size={14} aria-hidden />
        </HStack>
      ) : null}
    </Box>
  );

  // Gesperrt: sichtbar, aber nicht anklickbar.
  if (progressionLocked) return <Box h="100%">{inhalt}</Box>;

  return (
    <Link href={href} style={{ textDecoration: "none", display: "block", height: "100%" }}>
      {inhalt}
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
  const Icon = resolveIcon(g.courseIcon, idx);
  const moduleCount = g.modules.length;

  return (
    <Box className="cc-card cc-card--still" px={{ base: 4, md: 5 }} py={{ base: 4, md: 5 }}>
      <HStack textAlign="left" spacing={{ base: 4, md: 5 }}>
        <CourseIcon icon={Icon} />
        <Box flex={1} minW={0}>
          <HStack spacing={3} align="center" flexWrap="wrap" rowGap={1.5}>
            <Text fontSize={{ base: "17px", md: "18px" }} fontWeight={600} lineHeight={1.3} color="var(--cc-text)">
              {g.courseTitle}
            </Text>
            <Pill tone="gold" upper icon={<Lock size={12} aria-hidden />}>
              Nur für vollwertige Member
            </Pill>
          </HStack>
          <Text className="cc-num" fontSize="14px" color="var(--cc-text-2)" mt={1}>
            {moduleCount} {moduleCount === 1 ? "Modul" : "Module"}
          </Text>
        </Box>
      </HStack>
    </Box>
  );
}

/**
 * Alle Module am Stück, drei pro Reihe, ohne Kurs-Überschriften.
 *
 * Vorher lagen sie in aufklappbaren Kurs-Gruppen („Market Foundations“,
 * „Capital Circle Framework“ …). Auf Nutzerwunsch (16.09.2026) fällt diese
 * Ebene weg: Wer im Institut ist, will das nächste Modul sehen, nicht erst
 * einen Kurs aufklappen. Die Reihenfolge bleibt die der Kurskette — erst alle
 * Module des ersten Kurses, dann die des nächsten.
 *
 * `cc-neutral` nimmt Gold-Kante und Glow zurück, wie im Dashboard.
 */
function ModulRaster({ modules }: { modules: AcademyModuleRow[] }) {
  /**
   * Module ohne veröffentlichte Videos werden nicht gezeigt — dahinter liegt
   * nichts, was man ansehen könnte. Betrifft aktuell die Module, deren Dateien
   * mit dem Hetzner-Bucket verloren gegangen sind, sowie noch leere Neuanlagen.
   */
  const sichtbar = useMemo(() => modules.filter((m) => m.videoCount > 0), [modules]);

  /**
   * Hat irgendein Modul ein Cover? Dann bekommen **alle** Karten die größere
   * Höhe, damit die Reihen bündig bleiben. Ohne Cover im Bestand bleibt das
   * Raster kompakt.
   */
  const mitCoverSpur = useMemo(() => sichtbar.some((m) => Boolean(m.thumbnailSignedUrl)), [sichtbar]);

  if (sichtbar.length === 0) return null;

  return (
    <Box className="cc-neutral">
      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={{ base: 4, md: 5 }} alignItems="stretch">
        {sichtbar.map((m, i) => (
          <Box key={m.id} className="cc-rise" style={riseDelay(i)} minW={0}>
            <ModuleTile m={m} mitCoverSpur={mitCoverSpur} />
          </Box>
        ))}
      </SimpleGrid>
    </Box>
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
    return <ModulRaster modules={modules} />;
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
          {freeModules.map((m, i) => (
            <Box key={m.id} className="cc-rise" style={riseDelay(i)} minW={0}>
              <FreeModuleCard m={m} />
            </Box>
          ))}
        </Grid>
      )}

      {paidGroups.length > 0 && (
        <>
          <HStack my={{ base: 8, md: 10 }} align="center" spacing={4}>
            <Box
              flex={1}
              h="1px"
              bg="linear-gradient(90deg, transparent 0%, rgba(212, 176, 128, 0.55) 100%)"
              aria-hidden
            />
            <Text as="h2" {...LABEL_STYLE} color="var(--cc-gold-light)" whiteSpace="nowrap">
              Capital Circle Member
            </Text>
            <Box
              flex={1}
              h="1px"
              bg="linear-gradient(90deg, rgba(212, 176, 128, 0.55) 0%, transparent 100%)"
              aria-hidden
            />
          </HStack>
          <VStack align="stretch" spacing={4}>
            {paidGroups.map((g, idx) => (
              <Box key={g.courseId} className="cc-rise" style={riseDelay(freeModules.length + idx)}>
                <LockedCourseHeader g={g} idx={idx} />
              </Box>
            ))}
          </VStack>
        </>
      )}
    </Box>
  );
}
