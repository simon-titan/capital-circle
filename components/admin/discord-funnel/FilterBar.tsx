"use client";

import { Button, HStack, Input, Select, Stack, Text } from "@chakra-ui/react";
import { RefreshCw } from "lucide-react";
import {
  CLOSERS,
  CLOSER_LABELS,
  SOURCE_ORIGINS,
  SOURCE_ORIGIN_LABELS,
  type FunnelFilterState,
  type RangeId,
} from "./types";
import { FieldLabel } from "./primitives";

const RANGE_OPTIONS: { id: RangeId; label: string }[] = [
  { id: "today", label: "Heute" },
  { id: "week", label: "Diese Woche" },
  { id: "month", label: "Dieser Monat" },
  { id: "last_month", label: "Letzter Monat" },
  { id: "custom", label: "Custom Range" },
];

const STATUS_OPTIONS: { id: string; label: string }[] = [
  { id: "all", label: "Alle Status" },
  { id: "open", label: "Offen" },
  { id: "qualified", label: "Qualifiziert" },
  { id: "calls", label: "Calls" },
  { id: "closing", label: "Bereit fürs Closing" },
  { id: "won", label: "Closed Won" },
  { id: "lost", label: "Closed Lost" },
];

const selectSx = {
  bg: "rgba(255,255,255,0.04)",
  borderColor: "rgba(255,255,255,0.12)",
  color: "var(--color-text-primary)",
} as const;

export function FilterBar({
  filter,
  setFilter,
  channels,
  loading,
  onApply,
}: {
  filter: FunnelFilterState;
  setFilter: (patch: Partial<FunnelFilterState>) => void;
  /** verfügbare utm_source-Slugs für den Kanal-Filter. */
  channels: string[];
  loading: boolean;
  onApply: () => void;
}) {
  return (
    <Stack
      spacing={4}
      bg="rgba(20, 21, 25, 0.82)"
      backdropFilter="blur(20px) saturate(1.6)"
      border="1px solid rgba(255,255,255,0.09)"
      borderRadius="20px"
      p={{ base: 4, md: 5 }}
      boxShadow="0 8px 32px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.06)"
    >
      {/* Range-Pills + Refresh */}
      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <HStack spacing={1} flexWrap="wrap">
          {RANGE_OPTIONS.map((r) => {
            const active = filter.range === r.id;
            return (
              <Button
                key={r.id}
                size="sm"
                onClick={() => setFilter({ range: r.id })}
                bg={active ? "rgba(212,175,55,0.16)" : "transparent"}
                color={active ? "var(--color-accent-gold-light, #E8C547)" : "var(--color-text-secondary)"}
                border="1px solid"
                borderColor={active ? "rgba(212,175,55,0.45)" : "rgba(255,255,255,0.10)"}
                _hover={{ bg: "rgba(255,255,255,0.06)" }}
                className="inter"
              >
                {r.label}
              </Button>
            );
          })}
        </HStack>
        <Button
          size="sm"
          variant="outline"
          leftIcon={<RefreshCw size={14} />}
          onClick={onApply}
          isLoading={loading}
          borderColor="rgba(212,175,55,0.45)"
          color="var(--color-accent-gold-light, #E8C547)"
          _hover={{ bg: "rgba(212,175,55,0.10)" }}
          className="inter"
        >
          Aktualisieren
        </Button>
      </HStack>

      {/* Custom-Datum */}
      {filter.range === "custom" ? (
        <HStack spacing={3} flexWrap="wrap" align="flex-end">
          <Stack spacing={1}>
            <FieldLabel>Von</FieldLabel>
            <Input
              type="date"
              size="sm"
              value={filter.from}
              onChange={(e) => setFilter({ from: e.target.value })}
              maxW="180px"
              className="inter"
              {...selectSx}
            />
          </Stack>
          <Stack spacing={1}>
            <FieldLabel>Bis</FieldLabel>
            <Input
              type="date"
              size="sm"
              value={filter.to}
              onChange={(e) => setFilter({ to: e.target.value })}
              maxW="180px"
              className="inter"
              {...selectSx}
            />
          </Stack>
          <Button
            size="sm"
            onClick={onApply}
            bg="rgba(212,175,55,0.16)"
            color="var(--color-accent-gold-light, #E8C547)"
            border="1px solid rgba(212,175,55,0.45)"
            _hover={{ bg: "rgba(212,175,55,0.24)" }}
            className="inter"
          >
            Anwenden
          </Button>
        </HStack>
      ) : null}

      {/* Segment-Filter */}
      <HStack spacing={3} flexWrap="wrap" align="flex-end">
        <Stack spacing={1} flex="1" minW="160px">
          <FieldLabel>Herkunft</FieldLabel>
          <Select
            size="sm"
            value={filter.sourceOrigin}
            onChange={(e) =>
              setFilter({ sourceOrigin: e.target.value as FunnelFilterState["sourceOrigin"] })
            }
            className="inter"
            {...selectSx}
          >
            <option value="all">Alle Quellen</option>
            {SOURCE_ORIGINS.map((o) => (
              <option key={o} value={o}>
                {SOURCE_ORIGIN_LABELS[o]}
              </option>
            ))}
          </Select>
        </Stack>

        <Stack spacing={1} flex="1" minW="140px">
          <FieldLabel>Closer</FieldLabel>
          <Select
            size="sm"
            value={filter.closer}
            onChange={(e) => setFilter({ closer: e.target.value as FunnelFilterState["closer"] })}
            className="inter"
            {...selectSx}
          >
            <option value="all">Alle Closer</option>
            {CLOSERS.map((c) => (
              <option key={c} value={c}>
                {CLOSER_LABELS[c]}
              </option>
            ))}
          </Select>
        </Stack>

        <Stack spacing={1} flex="1" minW="160px">
          <FieldLabel>Kanal (utm_source)</FieldLabel>
          <Select
            size="sm"
            value={filter.channel}
            onChange={(e) => setFilter({ channel: e.target.value })}
            className="inter"
            {...selectSx}
          >
            <option value="all">Alle Kanäle</option>
            {channels.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Stack>

        <Stack spacing={1} flex="1" minW="160px">
          <FieldLabel>Lead-Status</FieldLabel>
          <Select
            size="sm"
            value={filter.status}
            onChange={(e) => setFilter({ status: e.target.value })}
            className="inter"
            {...selectSx}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Stack>
      </HStack>

      <Text fontSize="11px" color="#606068" className="inter">
        Filter wirken auf alle Sektionen, Panels und Lead-Liste sowie auf die Exporte.
      </Text>
    </Stack>
  );
}
