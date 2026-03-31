"use client";

import { Box, Button, Flex, Heading, Progress, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { InstitutMediaArea } from "@/components/platform/InstitutMediaArea";
import { GlassCard } from "@/components/ui/GlassCard";
import type { LastWatchedModuleData, RecommendedModuleData } from "@/lib/server-data";
import { moduleHref } from "@/lib/module-route";
import { Clock, Play } from "lucide-react";

type LastVideoCardProps = {
  lastWatched: LastWatchedModuleData | null;
  recommended: RecommendedModuleData | null;
};

function formatLessonDurationSeconds(sec: number): string {
  if (!sec || sec <= 0) return "—";
  const m = Math.max(1, Math.round(sec / 60));
  return `${m} Min.`;
}

/** Lektion: orange-gold wie Streak-Balken */
const progressSxLesson = {
  h: "8px",
  borderRadius: "full",
  bg: "rgba(0,0,0,0.42)",
  border: "1px solid rgba(255, 160, 80, 0.28)",
  "& > div": {
    borderRadius: "full",
    background: "linear-gradient(90deg, #ff8a3c 0%, #ffb454 45%, #e8c547 100%)",
    boxShadow: "0 0 14px rgba(255, 150, 60, 0.5)",
  },
};

/** Modul: stärker Gold */
const progressSxModule = {
  h: "8px",
  borderRadius: "full",
  bg: "rgba(0,0,0,0.42)",
  border: "1px solid rgba(212, 175, 55, 0.28)",
  "& > div": {
    borderRadius: "full",
    background: "linear-gradient(90deg, var(--color-accent-gold-dark) 0%, var(--color-accent-gold-light) 100%)",
    boxShadow: "0 0 12px rgba(212, 175, 55, 0.4)",
  },
};

function ProgressLabeled({
  label,
  value,
  sx,
}: {
  label: string;
  value: number;
  sx: typeof progressSxLesson;
}) {
  return (
    <Box w="100%">
      <Flex justify="space-between" align="center" mb={1.5} gap={3}>
        <Text className="inter-medium" fontSize="sm" color="rgba(245, 236, 210, 0.88)" noOfLines={1}>
          {label}
        </Text>
        <Text className="jetbrains-mono" fontSize="sm" fontWeight={600} color="rgba(232, 197, 71, 0.95)" flexShrink={0}>
          {value}%
        </Text>
      </Flex>
      <Progress value={value} size="sm" sx={sx} />
    </Box>
  );
}

export function LastVideoCard({ lastWatched, recommended }: LastVideoCardProps) {
  if (lastWatched) {
    const {
      module,
      videoProgressSeconds,
      lastVideoDurationSeconds,
      progressPercent,
      durationSecondsTotal,
      lastVideoTitle,
      thumbnailSignedUrl,
      lastVideoStorageKey,
    } = lastWatched;
    const href = moduleHref({ id: module.id, slug: module.slug });
    const modulePct = durationSecondsTotal > 0 ? Math.min(100, Math.max(0, progressPercent ?? 0)) : 0;
    const lessonPct =
      lastVideoDurationSeconds > 0
        ? Math.min(100, Math.round((Math.min(videoProgressSeconds, lastVideoDurationSeconds) / lastVideoDurationSeconds) * 100))
        : 0;

    const title = lastVideoTitle || module.title;
    const moduleLine = module.title.startsWith("Modul") ? module.title : `Modul: ${module.title}`;
    const startAtSeconds =
      lastVideoDurationSeconds > 0
        ? Math.min(Math.max(0, videoProgressSeconds), lastVideoDurationSeconds - 0.25)
        : Math.max(0, videoProgressSeconds);

    return (
      <GlassCard dashboard h="100%" overflow="hidden" p={0}>
        <Box className="institut-card-media" position="relative">
          <Box
            position="absolute"
            top={3}
            right={3}
            zIndex={2}
            px={3}
            py={1.5}
            borderRadius="md"
            bg="linear-gradient(135deg, #f0dc82 0%, var(--color-accent-gold) 48%, #a67c00 100%)"
            color="#0a0a0a"
            boxShadow="0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.35)"
          >
            <Text className="inter-semibold" fontSize="xs" letterSpacing="0.06em" textTransform="uppercase">
              Zuletzt angesehen
            </Text>
          </Box>

          <Box position="relative" w="100%" mx="auto">
            <InstitutMediaArea
              videoStorageKey={lastVideoStorageKey}
              thumbnailUrl={thumbnailSignedUrl}
              startAtSeconds={startAtSeconds}
            >
              <Box as={NextLink} href={href} aria-label="Video fortsetzen">
                <Box
                  display="flex"
                  w={{ base: "68px", sm: "76px" }}
                  h={{ base: "68px", sm: "76px" }}
                  borderRadius="full"
                  alignItems="center"
                  justifyContent="center"
                  bg="linear-gradient(145deg, rgba(255, 160, 90, 0.95) 0%, rgba(232, 197, 71, 0.92) 42%, rgba(180, 130, 20, 0.98) 100%)"
                  border="2px solid rgba(255, 220, 190, 0.45)"
                  boxShadow="0 0 48px rgba(255, 130, 60, 0.55), 0 8px 24px rgba(0,0,0,0.45), inset 0 2px 0 rgba(255,255,255,0.35)"
                  transition="transform 0.2s ease, box-shadow 0.2s ease"
                  _hover={{
                    transform: "scale(1.06)",
                    boxShadow: "0 0 56px rgba(255, 170, 80, 0.65), 0 10px 28px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.4)",
                  }}
                >
                  <Play size={34} fill="#0a0a0a" color="#0a0a0a" strokeWidth={1.2} style={{ marginLeft: 4 }} />
                </Box>
              </Box>
            </InstitutMediaArea>
          </Box>
        </Box>

        <Box className="institut-card-body" px={{ base: 4, md: 5 }} py={{ base: 4, md: 5 }}>
          <Text className="inter-medium" fontSize="xs" letterSpacing="0.12em" textTransform="uppercase" color="rgba(255,255,255,0.42)" mb={2}>
            Institut
          </Text>
          <Text className="inter" fontSize="sm" color="rgba(245, 236, 210, 0.72)" lineHeight="snug" noOfLines={2} mb={2}>
            {moduleLine}
          </Text>
          <Heading as="h2" size="lg" className="inter-semibold" fontWeight={600} color="var(--color-text-primary)" lineHeight="short" mb={3}>
            {title}
          </Heading>
          <Flex align="center" gap={2} mb={5} color="rgba(255,255,255,0.5)">
            <Clock size={16} strokeWidth={2} aria-hidden />
            <Text className="inter" fontSize="sm">
              {formatLessonDurationSeconds(lastVideoDurationSeconds)}
            </Text>
          </Flex>

          <Box display="flex" flexDirection="column" gap={5} mb={5}>
            <ProgressLabeled label="Lektion Fortschritt" value={lessonPct} sx={progressSxLesson} />
            <ProgressLabeled label="Modul Fortschritt" value={modulePct} sx={progressSxModule} />
          </Box>

          <Button
            as={NextLink}
            href={href}
            size="md"
            width={{ base: "full", sm: "auto" }}
            borderRadius="10px"
            bg="linear-gradient(135deg, var(--color-accent-gold-light) 0%, var(--color-accent-gold) 45%, var(--color-accent-gold-dark) 100%)"
            color="#0a0a0a"
            fontWeight={600}
            _hover={{ boxShadow: "0 0 24px var(--color-accent-glow)" }}
          >
            Weitermachen
          </Button>
        </Box>
      </GlassCard>
    );
  }

  if (recommended) {
    const { module, thumbnailSignedUrl, videoCount, durationSecondsTotal, progressPercent, previewVideoStorageKey } = recommended;
    const href = moduleHref({ id: module.id, slug: module.slug });
    const modulePct = Math.max(0, Math.min(100, progressPercent ?? 0));
    const formatTotal = (s: number) => {
      if (s <= 0) return "—";
      const m = Math.floor(s / 60);
      return `${m} Min.`;
    };
    return (
      <GlassCard dashboard h="100%" overflow="hidden" p={0}>
        <Box className="institut-card-media" position="relative">
          <Box
            position="absolute"
            top={3}
            right={3}
            zIndex={2}
            px={3}
            py={1.5}
            borderRadius="md"
            bg="linear-gradient(135deg, #f0dc82 0%, var(--color-accent-gold) 48%, #a67c00 100%)"
            color="#0a0a0a"
            boxShadow="0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.35)"
          >
            <Text className="inter-semibold" fontSize="xs" letterSpacing="0.06em" textTransform="uppercase">
              Nächste Lektion
            </Text>
          </Box>

          <Box position="relative" w="100%" mx="auto">
            <InstitutMediaArea videoStorageKey={previewVideoStorageKey} thumbnailUrl={thumbnailSignedUrl} startAtSeconds={0}>
              <Box as={NextLink} href={href} aria-label="Modul starten">
                <Box
                  display="flex"
                  w={{ base: "68px", sm: "76px" }}
                  h={{ base: "68px", sm: "76px" }}
                  borderRadius="full"
                  alignItems="center"
                  justifyContent="center"
                  bg="linear-gradient(145deg, rgba(255, 160, 90, 0.95) 0%, rgba(232, 197, 71, 0.92) 42%, rgba(180, 130, 20, 0.98) 100%)"
                  border="2px solid rgba(255, 220, 190, 0.45)"
                  boxShadow="0 0 48px rgba(255, 130, 60, 0.55), 0 8px 24px rgba(0,0,0,0.45), inset 0 2px 0 rgba(255,255,255,0.35)"
                  transition="transform 0.2s ease, box-shadow 0.2s ease"
                  _hover={{
                    transform: "scale(1.06)",
                    boxShadow: "0 0 56px rgba(255, 170, 80, 0.65), 0 10px 28px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.4)",
                  }}
                >
                  <Play size={34} fill="#0a0a0a" color="#0a0a0a" strokeWidth={1.2} style={{ marginLeft: 4 }} />
                </Box>
              </Box>
            </InstitutMediaArea>
          </Box>
        </Box>

        <Box className="institut-card-body" px={{ base: 4, md: 5 }} py={{ base: 4, md: 5 }}>
          <Text className="inter-medium" fontSize="xs" letterSpacing="0.12em" textTransform="uppercase" color="rgba(255,255,255,0.42)" mb={2}>
            Institut
          </Text>
          <Text className="inter" fontSize="sm" color="rgba(245, 236, 210, 0.72)" lineHeight="snug" noOfLines={2} mb={2}>
            {module.courseTitle ? module.courseTitle : `Modul: ${module.title}`}
          </Text>
          <Heading as="h2" size="lg" className="inter-semibold" fontWeight={600} color="var(--color-text-primary)" lineHeight="short" mb={3}>
            {module.title}
          </Heading>
          <Flex align="center" gap={2} mb={5} color="rgba(255,255,255,0.5)">
            <Clock size={16} strokeWidth={2} aria-hidden />
            <Text className="inter" fontSize="sm">
              {videoCount} {videoCount === 1 ? "Video" : "Videos"}
              {durationSecondsTotal > 0 ? ` · ${formatTotal(durationSecondsTotal)}` : ""}
            </Text>
          </Flex>

          <Box display="flex" flexDirection="column" gap={5} mb={5}>
            <ProgressLabeled label="Lektion Fortschritt" value={0} sx={progressSxLesson} />
            <ProgressLabeled label="Modul Fortschritt" value={modulePct} sx={progressSxModule} />
          </Box>

          <Button
            as={NextLink}
            href={href}
            size="md"
            width={{ base: "full", sm: "auto" }}
            borderRadius="10px"
            bg="linear-gradient(135deg, var(--color-accent-gold-light) 0%, var(--color-accent-gold) 45%, var(--color-accent-gold-dark) 100%)"
            color="#0a0a0a"
            fontWeight={600}
            _hover={{ boxShadow: "0 0 24px var(--color-accent-glow)" }}
          >
            Jetzt starten
          </Button>
        </Box>
      </GlassCard>
    );
  }

  return (
    <GlassCard dashboard h="100%">
      <Text className="inter-medium" fontSize="xs" letterSpacing="0.1em" textTransform="uppercase" color="rgba(255, 255, 255, 0.5)" mb={2}>
        Institut
      </Text>
      <Heading as="h2" size="md" className="inter-semibold" fontWeight={600} color="var(--color-text-primary)" mb={2}>
        Noch keine Inhalte
      </Heading>
      <Text className="inter" color="var(--color-text-muted)" fontSize="sm" mb={6}>
        Derzeit sind keine Module verfügbar. Schau später wieder vorbei.
      </Text>
      <Button
        as={NextLink}
        href="/ausbildung"
        size="md"
        width={{ base: "full", sm: "auto" }}
        borderRadius="10px"
        bg="linear-gradient(135deg, var(--color-accent-gold-light) 0%, var(--color-accent-gold) 45%, var(--color-accent-gold-dark) 100%)"
        color="#0a0a0a"
        fontWeight={600}
        _hover={{ boxShadow: "0 0 24px var(--color-accent-glow)" }}
      >
        Zum Institut
      </Button>
    </GlassCard>
  );
}
