"use client";

import { Box, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { Swords } from "lucide-react";
import {
  CLOSER_LABELS,
  CLOSERS,
  type CloserId,
  type PerCloserStats,
} from "./types";
import { DonutChart, eurFromCents, MiniStat, pctFmt, SectionCard } from "./primitives";

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
        <Text className="inter-semibold" fontSize="xs" color="#E8C547">
          {format(leftValue)}
        </Text>
        <Text
          fontSize="11px"
          letterSpacing="0.08em"
          textTransform="uppercase"
          color="#606068"
          className="inter"
        >
          {label}
        </Text>
        <Text className="inter-semibold" fontSize="xs" color="#E8C547">
          {format(rightValue)}
        </Text>
      </HStack>
      <HStack spacing={1} h="8px">
        <Box flex="1" display="flex" justifyContent="flex-end" bg="#1A1B1F" borderRadius="9999px" overflow="hidden">
          <Box
            h="full"
            w={`${leftPct.toFixed(1)}%`}
            background="linear-gradient(90deg, #7A5C00 0%, #D4AF37 100%)"
            borderRadius="9999px"
            transition="width 500ms ease"
          />
        </Box>
        <Box flex="1" bg="#1A1B1F" borderRadius="9999px" overflow="hidden">
          <Box
            h="full"
            w={`${rightPct.toFixed(1)}%`}
            background="linear-gradient(90deg, #D4AF37 0%, #7A5C00 100%)"
            borderRadius="9999px"
            transition="width 500ms ease"
          />
        </Box>
      </HStack>
    </Stack>
  );
}

function CloserCard({ stats }: { stats: PerCloserStats }) {
  return (
    <Box bg="#0C0D10" border="1px solid rgba(255,255,255,0.07)" borderRadius="16px" p={5}>
      <Text className="inter-semibold" fontSize="md" color="var(--color-accent-gold-light, #E8C547)" mb={4}>
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
        bg="rgba(255,255,255,0.03)"
        border="1px solid rgba(255,255,255,0.07)"
        borderRadius="10px"
        px={3}
        py={2}
      >
        <Text fontSize="xs" color="var(--color-text-secondary)" className="inter">
          Ø Zeit bis Abschluss
        </Text>
        <Text className="inter-semibold" fontSize="sm" color="var(--color-text-primary)">
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

        <Box bg="#0C0D10" border="1px solid rgba(255,255,255,0.07)" borderRadius="16px" p={5}>
          <HStack justify="space-between" mb={4}>
            <Text className="inter-semibold" fontSize="sm" color="var(--color-accent-gold-light, #E8C547)">
              {CLOSER_LABELS.kevin}
            </Text>
            <Text
              fontSize="11px"
              letterSpacing="0.1em"
              textTransform="uppercase"
              color="#606068"
              className="inter"
            >
              Direktvergleich
            </Text>
            <Text className="inter-semibold" fontSize="sm" color="var(--color-accent-gold-light, #E8C547)">
              {CLOSER_LABELS.simon}
            </Text>
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
