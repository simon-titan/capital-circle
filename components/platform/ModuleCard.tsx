import { Box, Text, Badge, HStack } from "@chakra-ui/react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import type { AcademyModuleRow } from "@/lib/server-data";
import { moduleHref } from "@/lib/module-route";
import { BookOpen, Lock } from "lucide-react";

function formatTotalDuration(totalSeconds: number) {
  if (totalSeconds <= 0) return "—";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} Min.`;
}

type ModuleCardProps = {
  module: AcademyModuleRow;
};

export function ModuleCard({ module: m }: ModuleCardProps) {
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
    <GlassCard
      highlight
      h="100%"
      display="flex"
      flexDirection="column"
      overflow="hidden"
      opacity={locked ? 0.72 : 1}
      cursor={locked ? "not-allowed" : "pointer"}
      transition="transform 0.2s ease, box-shadow 0.2s ease"
      _hover={
        locked
          ? undefined
          : {
              transform: "translateY(-2px)",
              boxShadow: "0 20px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(212, 175, 55, 0.2)",
            }
      }
    >
      <Box position="relative" w="full" pt="56.25%" bg="rgba(0,0,0,0.35)">
        {m.thumbnailSignedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={m.thumbnailSignedUrl}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <Box
            position="absolute"
            inset={0}
            bg="linear-gradient(145deg, rgba(212,175,55,0.12) 0%, rgba(15,23,42,0.85) 55%, rgba(8,10,14,0.95) 100%)"
          />
        )}
        <Box
          position="absolute"
          top={3}
          right={3}
          px={2}
          py={1}
          borderRadius="full"
          bg="rgba(8,10,14,0.72)"
          borderWidth="1px"
          borderColor="rgba(255,255,255,0.1)"
          backdropFilter="blur(10px)"
        >
          <HStack spacing={1} color={statusColor}>
            {locked ? <Lock size={12} aria-hidden /> : null}
            <Text className="inter-medium" fontSize="10px" textTransform="uppercase" letterSpacing="0.06em">
              {statusLabel}
            </Text>
          </HStack>
        </Box>
      </Box>

      <Box p={5} flex={1} display="flex" flexDirection="column" gap={2}>
        <Text className="inter-semibold" fontSize="md" color="var(--color-text-primary)" noOfLines={2}>
          {m.title}
        </Text>
        {m.courseTitle ? (
          <Text className="inter" fontSize="xs" color="var(--color-text-muted)" noOfLines={1}>
            {m.courseTitle}
          </Text>
        ) : null}
        <HStack spacing={2} flexWrap="wrap" mt={1}>
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
        </HStack>
        {!locked && !m.completed && m.progressPercent > 0 ? (
          <Box mt={2} h="4px" borderRadius="full" bg="rgba(255,255,255,0.08)" overflow="hidden">
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
    </GlassCard>
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
