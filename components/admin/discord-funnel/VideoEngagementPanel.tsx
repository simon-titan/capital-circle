"use client";

import { Box, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { PlayCircle } from "lucide-react";
import { adminInsetProps } from "@/components/admin/adminUi";
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

        <Box {...adminInsetProps} p={5}>
          <Text fontSize="14px" fontWeight={600} color="var(--cc-text)" mb={1}>
            Top-of-Funnel /video
          </Text>
          <Text fontSize="12px" color="var(--cc-text-2)" mb={4}>
            Anonyme VSL-Seite (vor Lead-Erfassung).
          </Text>
          <Stack spacing={3}>
            <TofRow label="Visits" value={tof?.visits ?? 0} />
            <TofRow label="Views (gestartet)" value={tof?.views ?? 0} />
            <TofRow label="Completed" value={tof?.completed ?? 0} />
            <HStack
              justify="space-between"
              bg="rgba(255, 255, 255, 0.03)"
              border="1px solid var(--cc-line)"
              borderRadius="8px"
              px={3}
              py={2}
            >
              <Text fontSize="12px" color="var(--cc-text-2)">
                Completion-Rate
              </Text>
              <Text className="cc-num" fontSize="14px" fontWeight={600} color="var(--cc-text)">
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
    <HStack justify="space-between" py={1.5} borderBottom="1px solid var(--cc-line)">
      <Text fontSize="12px" color="var(--cc-text-2)">
        {label}
      </Text>
      <Text className="cc-num" fontSize="18px" fontWeight={600} color="var(--cc-text)">
        {value}
      </Text>
    </HStack>
  );
}
