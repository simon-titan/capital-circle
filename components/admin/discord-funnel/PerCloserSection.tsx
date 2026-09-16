"use client";

import { Box, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { Swords } from "lucide-react";
import { ADMIN_CHART, adminInsetProps } from "@/components/admin/adminUi";
import {
  CLOSER_LABELS,
  CLOSERS,
  type CloserId,
  type PerCloserStats,
} from "./types";
import { DonutChart, eurFromCents, MiniStat, pctFmt, SectionCard } from "./primitives";

/** Closer-Farben im Direktvergleich: links Champagner (Kevin), rechts Tinte (Simon). */
const LEFT_COLOR = ADMIN_CHART.gold;
const RIGHT_COLOR = ADMIN_CHART.ink;

/** Gegenüberliegender Vergleichsbalken (links = Kevin, rechts = Simon). */
function VersusBar({
  label,
  leftValue,
  rightValue,
  format,
}: {
  label: string;
  leftValue: number;
  rightValue: number;
  format: (v: number) => string;
}) {
  const total = leftValue + rightValue;
  const leftPct = total > 0 ? (leftValue / total) * 100 : 50;
  const rightPct = 100 - leftPct;
  return (
    <Stack spacing={1.5}>
      <HStack justify="space-between">
        <Text className="cc-num" fontSize="12px" fontWeight={600} color="var(--cc-text)">
          {format(leftValue)}
        </Text>
        <Text fontSize="11px" letterSpacing="0.06em" textTransform="uppercase" color="var(--cc-text-2)">
          {label}
        </Text>
        <Text className="cc-num" fontSize="12px" fontWeight={600} color="var(--cc-text)">
          {format(rightValue)}
        </Text>
      </HStack>
      <HStack spacing={1} h="8px">
        <Box flex="1" display="flex" justifyContent="flex-end" bg={ADMIN_CHART.track} borderRadius="full" overflow="hidden">
          <Box
            h="full"
            w={`${leftPct.toFixed(1)}%`}
            bg={LEFT_COLOR}
            borderRadius="full"
            transition="width 500ms var(--cc-ease)"
          />
        </Box>
        <Box flex="1" bg={ADMIN_CHART.track} borderRadius="full" overflow="hidden">
          <Box
            h="full"
            w={`${rightPct.toFixed(1)}%`}
            bg={RIGHT_COLOR}
            borderRadius="full"
            transition="width 500ms var(--cc-ease)"
          />
        </Box>
      </HStack>
    </Stack>
  );
}

function CloserName({ closer, color }: { closer: CloserId; color: string }) {
  return (
    <HStack spacing={2}>
      <Box w="8px" h="8px" borderRadius="2px" bg={color} flexShrink={0} aria-hidden />
      <Text fontSize="14px" fontWeight={600} color="var(--cc-text)">
        {CLOSER_LABELS[closer]}
      </Text>
    </HStack>
  );
}

function CloserCard({ stats }: { stats: PerCloserStats }) {
  return (
    <Box {...adminInsetProps} p={5}>
      <Text fontSize="15px" fontWeight={600} color="var(--cc-text)" mb={4}>
        {CLOSER_LABELS[stats.closer]}
      </Text>
      <SimpleGrid columns={2} spacing={3} mb={5}>
        <MiniStat label="Calls" value={String(stats.calls)} />
        <MiniStat label="Show-Up" value={pctFmt(stats.showUpRatePct)} sub={`${stats.showUps} erschienen`} />
        <MiniStat
          label="Close-Rate"
          value={pctFmt(stats.closeRatePct)}
          sub={`${stats.closedWon} won · ${stats.closedLost} lost`}
        />
        <MiniStat label="Revenue" value={eurFromCents(stats.revenueCents)} sub={`Ø ${eurFromCents(stats.avgDealSizeCents)}`} />
      </SimpleGrid>
      <SimpleGrid columns={2} spacing={4} mb={4}>
        <DonutChart
          title="Close-Typ"
          segments={[
            { label: "1:1", value: stats.closeTypeSplit?.one_to_one ?? 0 },
            { label: "Mitgliedschaft", value: stats.closeTypeSplit?.membership ?? 0 },
          ]}
        />
        <DonutChart
          title="Raten (Membership)"
          segments={[
            { label: "1 Rate", value: stats.installmentSplit?.["1"] ?? 0 },
            { label: "2 Raten", value: stats.installmentSplit?.["2"] ?? 0 },
            { label: "4 Raten", value: stats.installmentSplit?.["4"] ?? 0 },
          ]}
        />
      </SimpleGrid>
      <HStack
        justify="space-between"
        bg="rgba(255, 255, 255, 0.03)"
        border="1px solid var(--cc-line)"
        borderRadius="8px"
        px={3}
        py={2}
      >
        <Text fontSize="12px" color="var(--cc-text-2)">
          Ø Zeit bis Abschluss
        </Text>
        <Text className="cc-num" fontSize="14px" fontWeight={600} color="var(--cc-text)">
          {stats.timeToCloseAvgDays != null ? `${stats.timeToCloseAvgDays.toFixed(1)} Tage` : "—"}
        </Text>
      </HStack>
    </Box>
  );
}

const EMPTY: Omit<PerCloserStats, "closer"> = {
  calls: 0,
  showUps: 0,
  showUpRatePct: 0,
  closeRatePct: 0,
  closedWon: 0,
  closedLost: 0,
  revenueCents: 0,
  avgDealSizeCents: 0,
  closeTypeSplit: { one_to_one: 0, membership: 0 },
  installmentSplit: { "1": 0, "2": 0, "4": 0 },
  timeToCloseAvgDays: null,
};

export function PerCloserSection({ perCloser }: { perCloser?: PerCloserStats[] }) {
  const list = perCloser ?? [];
  const byId = new Map<CloserId, PerCloserStats>();
  for (const c of list) byId.set(c.closer, c);

  const get = (id: CloserId): PerCloserStats => byId.get(id) ?? { closer: id, ...EMPTY };
  const kevin = get("kevin");
  const simon = get("simon");

  return (
    <SectionCard
      title="Closer-Vergleich: Kevin vs. Simon"
      subtitle="Show-Up, Close-Rate, Revenue & Deal-Mix pro Closer."
      icon={<Swords size={16} />}
    >
      <Stack spacing={6}>
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
          {CLOSERS.map((c) => (
            <CloserCard key={c} stats={get(c)} />
          ))}
        </SimpleGrid>

        <Box {...adminInsetProps} p={5}>
          <HStack justify="space-between" mb={4}>
            <CloserName closer="kevin" color={LEFT_COLOR} />
            <Text fontSize="11px" letterSpacing="0.06em" textTransform="uppercase" color="var(--cc-text-2)">
              Direktvergleich
            </Text>
            <CloserName closer="simon" color={RIGHT_COLOR} />
          </HStack>
          <Stack spacing={4}>
            <VersusBar
              label="Show-Up-Rate"
              leftValue={kevin.showUpRatePct}
              rightValue={simon.showUpRatePct}
              format={(v) => pctFmt(v)}
            />
            <VersusBar
              label="Close-Rate"
              leftValue={kevin.closeRatePct}
              rightValue={simon.closeRatePct}
              format={(v) => pctFmt(v)}
            />
            <VersusBar
              label="Revenue"
              leftValue={kevin.revenueCents}
              rightValue={simon.revenueCents}
              format={(v) => eurFromCents(v)}
            />
            <VersusBar
              label="Ø Deal-Größe"
              leftValue={kevin.avgDealSizeCents}
              rightValue={simon.avgDealSizeCents}
              format={(v) => eurFromCents(v)}
            />
          </Stack>
        </Box>
      </Stack>
    </SectionCard>
  );
}
