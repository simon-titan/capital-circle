"use client";

import { Box, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { PlayCircle } from "lucide-react";
import type { TopOfFunnelVideo, VideoEngagement, VideoSource } from "./types";
import { DistChart, MiniStat, pctFmt, SectionCard } from "./primitives";

const VIDEO_SOURCE_LABELS: Record<VideoSource, string> = {
  discord_funnel: "Discord-Funnel",
  termin_direct: "Termin direkt",
  video_only: "/video (anonym)",
  unknown: "Unbekannt",
};

export function VideoEngagementPanel({
  engagement,
  topOfFunnel,
}: {
  engagement?: VideoEngagement;
  topOfFunnel?: TopOfFunnelVideo;
}) {
  const e = engagement;
  const bySource = (e?.bySource ?? []).map((s) => ({
    option: VIDEO_SOURCE_LABELS[s.source] ?? s.source,
    count: s.views,
  }));

  const tof = topOfFunnel;
  const tofCompletionPct = tof && tof.views > 0 ? (tof.completed / tof.views) * 100 : 0;

  return (
    <SectionCard
      title="Video-Engagement"
      subtitle="Wie intensiv das VSL geschaut wird (alle Quellen) + Top-of-Funnel /video."
      icon={<PlayCircle size={16} />}
    >
      <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6}>
        <Box gridColumn={{ lg: "span 2" }}>
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} mb={5}>
            <MiniStat label="Views gesamt" value={String(e?.totalViews ?? 0)} sub={`${e?.uniqueSessions ?? 0} Sessions`} />
            <MiniStat label="Ø Views / Lead" value={(e?.avgViewsPerLead ?? 0).toFixed(2).replace(".", ",")} />
            <MiniStat label="Rewatch-Rate" value={pctFmt(e?.rewatchRatePct)} sub="mehrfach geschaut" />
            <MiniStat label="Completion" value={pctFmt(e?.completionRatePct)} sub="bis Ende geschaut" />
          </SimpleGrid>
          <DistChart title="Views nach Quelle" dist={{ options: bySource }} />
        </Box>

        <Box bg="#0C0D10" border="1px solid rgba(255,255,255,0.07)" borderRadius="16px" p={5}>
          <Text className="inter-semibold" fontSize="sm" color="var(--color-accent-gold-light, #E8C547)" mb={1}>
            Top-of-Funnel /video
          </Text>
          <Text fontSize="xs" color="var(--color-text-secondary)" className="inter" mb={4}>
            Anonyme VSL-Seite (vor Lead-Erfassung).
          </Text>
          <Stack spacing={3}>
            <TofRow label="Visits" value={tof?.visits ?? 0} />
            <TofRow label="Views (gestartet)" value={tof?.views ?? 0} />
            <TofRow label="Completed" value={tof?.completed ?? 0} />
            <HStack
              justify="space-between"
              bg="rgba(212,175,55,0.08)"
              border="1px solid rgba(212,175,55,0.20)"
              borderRadius="10px"
              px={3}
              py={2}
            >
              <Text fontSize="xs" color="var(--color-text-secondary)" className="inter">
                Completion-Rate
              </Text>
              <Text className="jetbrains-mono" fontSize="sm" color="#E8C547" fontWeight={700}>
                {pctFmt(tofCompletionPct)}
              </Text>
            </HStack>
          </Stack>
        </Box>
      </SimpleGrid>
    </SectionCard>
  );
}

function TofRow({ label, value }: { label: string; value: number }) {
  return (
    <HStack justify="space-between" py={1.5} borderBottom="1px solid rgba(255,255,255,0.05)">
      <Text fontSize="xs" color="var(--color-text-secondary)" className="inter">
        {label}
      </Text>
      <Text className="jetbrains-mono" fontSize="lg" color="var(--color-text-primary)" fontWeight={700}>
        {value}
      </Text>
    </HStack>
  );
}
