"use client";

import { Button, HStack, Input, Select, Stack, Text } from "@chakra-ui/react";
import { RefreshCw } from "lucide-react";
import {
  ADMIN_CARD_CLASS,
  adminCardPadding,
  adminChipProps,
  adminInputProps,
  adminOptionStyle,
} from "@/components/admin/adminUi";
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
    <Stack spacing={4} className={ADMIN_CARD_CLASS} p={adminCardPadding}>
      {/* Range-Pills + Refresh */}
      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <HStack spacing={2} flexWrap="wrap">
          {RANGE_OPTIONS.map((r) => {
            const active = filter.range === r.id;
            return (
              <Button key={r.id} {...adminChipProps(active)} onClick={() => setFilter({ range: r.id })}>
                {r.label}
              </Button>
            );
          })}
        </HStack>
        <Button
          size="sm"
          variant="line"
          leftIcon={<RefreshCw size={14} />}
          onClick={onApply}
          isLoading={loading}
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
              className="cc-num"
              {...adminInputProps}
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
              className="cc-num"
              {...adminInputProps}
            />
          </Stack>
          <Button size="sm" variant="gold" onClick={onApply}>
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
            {...adminInputProps}
          >
            <option value="all" style={adminOptionStyle}>
              Alle Quellen
            </option>
            {SOURCE_ORIGINS.map((o) => (
              <option key={o} value={o} style={adminOptionStyle}>
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
            {...adminInputProps}
          >
            <option value="all" style={adminOptionStyle}>
              Alle Closer
            </option>
            {CLOSERS.map((c) => (
              <option key={c} value={c} style={adminOptionStyle}>
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
            {...adminInputProps}
          >
            <option value="all" style={adminOptionStyle}>
              Alle Kanäle
            </option>
            {channels.map((c) => (
              <option key={c} value={c} style={adminOptionStyle}>
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
            {...adminInputProps}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.id} value={s.id} style={adminOptionStyle}>
                {s.label}
              </option>
            ))}
          </Select>
        </Stack>
      </HStack>

      <Text fontSize="12px" color="var(--cc-text-3)">
        Filter wirken auf alle Sektionen, Panels und Lead-Liste sowie auf die Exporte.
      </Text>
    </Stack>
  );
}
