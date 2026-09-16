"use client";

import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import {
  ADMIN_CARD_CLASS,
  ADMIN_CHART,
  adminCardPadding,
  adminInsetProps,
  StatusPill,
} from "@/components/admin/adminUi";
import type { ClosedValue, OptionDistribution } from "./types";

/* ── Formatters ───────────────────────────────────────────────────────────── */

export const eurFmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const dateTimeFmt = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

const dateOnlyFmt = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
});

/** Cent-Betrag → "€" formatiert. */
export function eurFromCents(cents: number | null | undefined): string {
  return eurFmt.format((cents ?? 0) / 100);
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return dateTimeFmt.format(new Date(iso));
  } catch {
    return iso;
  }
}

export function fmtDateOnly(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return dateOnlyFmt.format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Prozent-Wert (0–100) → "12,3 %". */
export function pctFmt(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(1).replace(".", ",")} %`;
}

/** ISO-Datum → "YYYY-MM-DD" für <input type="date">. */
export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

/* ── Section Card ─────────────────────────────────────────────────────────── */

/** Glas-Karte einer Sektion; Titelzeile mit neutralem Icon, Aktion rechts. */
export function SectionCard(props: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Stack as="section" spacing={4} className={ADMIN_CARD_CLASS} p={adminCardPadding}>
      <HStack justify="space-between" flexWrap="wrap" gap={2}>
        <Stack spacing={0.5}>
          <HStack spacing={2}>
            {props.icon ? (
              <Box color="var(--cc-text-2)" aria-hidden>
                {props.icon}
              </Box>
            ) : null}
            <Text as="h2" fontSize="16px" fontWeight={600} lineHeight={1.3} color="var(--cc-text)">
              {props.title}
            </Text>
          </HStack>
          {props.subtitle ? (
            <Text fontSize="13px" color="var(--cc-text-2)">
              {props.subtitle}
            </Text>
          ) : null}
        </Stack>
        {props.right}
      </HStack>
      <Box>{props.children}</Box>
    </Stack>
  );
}

/* ── Stat widgets ─────────────────────────────────────────────────────────── */

export function StatWidget(props: {
  icon: ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  accent?: "gold" | "green" | "red";
}) {
  const { icon, label, value, sublabel, accent = "gold" } = props;
  // Icons neutral; Grün/Rot nur, wo der Wert Bedeutung trägt (Revenue, Verlust).
  const iconColor =
    accent === "green" ? "var(--cc-success)" : accent === "red" ? "var(--cc-danger)" : "var(--cc-text-2)";
  return (
    <Box className={ADMIN_CARD_CLASS} p={adminCardPadding}>
      <Stack spacing={3}>
        <HStack spacing={2} color={iconColor}>
          {icon}
          <Text
            fontSize="12px"
            fontWeight={500}
            letterSpacing="0.06em"
            textTransform="uppercase"
            color="var(--cc-text-2)"
          >
            {label}
          </Text>
        </HStack>
        <Text className="cc-num" fontSize="26px" fontWeight={600} letterSpacing="-0.01em" lineHeight="1" color="var(--cc-text)">
          {value}
        </Text>
        {sublabel ? (
          <Text fontSize="12px" color="var(--cc-text-3)">
            {sublabel}
          </Text>
        ) : null}
      </Stack>
    </Box>
  );
}

export function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Box {...adminInsetProps} p={4}>
      <Text
        fontSize="11px"
        fontWeight={500}
        letterSpacing="0.06em"
        textTransform="uppercase"
        color="var(--cc-text-2)"
        mb={2}
      >
        {label}
      </Text>
      <Text className="cc-num" fontSize="20px" fontWeight={600} color="var(--cc-text)" lineHeight="1">
        {value}
      </Text>
      {sub ? (
        <Text fontSize="12px" color="var(--cc-text-3)" mt={2} className="cc-num">
          {sub}
        </Text>
      ) : null}
    </Box>
  );
}

/* ── Distribution bar chart ───────────────────────────────────────────────── */

export function DistChart({
  title,
  dist,
  accent,
}: {
  title: string;
  dist: OptionDistribution | { options: { option: string; count: number }[] };
  accent?: boolean;
}) {
  const options = dist.options ?? [];
  const total = options.reduce((acc, o) => acc + o.count, 0);
  const max = Math.max(1, ...options.map((o) => o.count));
  return (
    <Box {...adminInsetProps} p={4}>
      <Text fontSize="14px" fontWeight={500} color="var(--cc-text)" mb={3}>
        {title}
      </Text>
      <Stack spacing={3}>
        {options.map((o) => {
          const pct = max > 0 ? o.count / max : 0;
          return (
            <Stack key={o.option} spacing={1}>
              <HStack justify="space-between" align="flex-start" gap={2}>
                <Text fontSize="12px" color="var(--cc-text-2)" noOfLines={2}>
                  {o.option}
                </Text>
                <Text className="cc-num" fontSize="12px" fontWeight={600} color="var(--cc-text)" flexShrink={0}>
                  {o.count}
                </Text>
              </HStack>
              <Box bg={ADMIN_CHART.track} borderRadius="full" overflow="hidden" h="6px">
                <Box
                  h="full"
                  w={`${(pct * 100).toFixed(2)}%`}
                  bg={accent ? ADMIN_CHART.success : ADMIN_CHART.gold}
                  borderRadius="full"
                  transition="width 500ms var(--cc-ease)"
                />
              </Box>
            </Stack>
          );
        })}
        {total === 0 ? (
          <Text fontSize="12px" color="var(--cc-text-3)">
            Keine Daten im Zeitraum.
          </Text>
        ) : null}
      </Stack>
    </Box>
  );
}

/* ── Donut chart (Champagner + Tinte) ─────────────────────────────────────── */

const DONUT_PALETTE = ADMIN_CHART.series;

export function DonutChart({
  title,
  segments,
  size = 116,
  thickness = 16,
}: {
  title?: string;
  segments: { label: string; value: number }[];
  size?: number;
  thickness?: number;
}) {
  const total = segments.reduce((acc, s) => acc + s.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let offsetAccum = 0;

  return (
    <Stack spacing={3} align="center">
      {title ? (
        <Text fontSize="12px" fontWeight={500} color="var(--cc-text-2)" textAlign="center">
          {title}
        </Text>
      ) : null}
      <Box position="relative" w={`${size}px`} h={`${size}px`}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={ADMIN_CHART.track}
            strokeWidth={thickness}
          />
          {total > 0
            ? segments.map((seg, i) => {
                if (seg.value <= 0) return null;
                const frac = seg.value / total;
                const dash = frac * circumference;
                const gap = circumference - dash;
                const dashoffset = -offsetAccum * circumference;
                offsetAccum += frac;
                return (
                  <circle
                    key={seg.label}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={DONUT_PALETTE[i % DONUT_PALETTE.length]}
                    strokeWidth={thickness}
                    strokeDasharray={`${dash} ${gap}`}
                    strokeDashoffset={dashoffset}
                    strokeLinecap="butt"
                    transform={`rotate(-90 ${center} ${center})`}
                    style={{ transition: "stroke-dasharray 500ms ease" }}
                  />
                );
              })
            : null}
        </svg>
        <Stack
          position="absolute"
          inset={0}
          align="center"
          justify="center"
          spacing={0}
          pointerEvents="none"
        >
          <Text className="cc-num" fontSize="18px" fontWeight={600} color="var(--cc-text)" lineHeight="1">
            {total}
          </Text>
          <Text fontSize="10px" color="var(--cc-text-3)" textTransform="uppercase" letterSpacing="0.06em">
            gesamt
          </Text>
        </Stack>
      </Box>
      <Stack spacing={1} w="full">
        {segments.map((seg, i) => {
          const frac = total > 0 ? seg.value / total : 0;
          return (
            <HStack key={seg.label} justify="space-between" spacing={2}>
              <HStack spacing={2} minW={0}>
                <Box
                  w="8px"
                  h="8px"
                  borderRadius="2px"
                  bg={DONUT_PALETTE[i % DONUT_PALETTE.length]}
                  flexShrink={0}
                />
                <Text fontSize="12px" color="var(--cc-text-2)" noOfLines={1}>
                  {seg.label}
                </Text>
              </HStack>
              <Text className="cc-num" fontSize="12px" fontWeight={500} color="var(--cc-text)" flexShrink={0}>
                {seg.value} · {(frac * 100).toFixed(0)}%
              </Text>
            </HStack>
          );
        })}
      </Stack>
    </Stack>
  );
}

/* ── Field / meta primitives ──────────────────────────────────────────────── */

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <Text fontSize="12px" fontWeight={500} letterSpacing="0.06em" textTransform="uppercase" color="var(--cc-text-2)">
      {children}
    </Text>
  );
}

export function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0} align="flex-end">
      <Text fontSize="10px" color="var(--cc-text-3)" textTransform="uppercase" letterSpacing="0.06em">
        {label}
      </Text>
      <Text className="cc-num" fontSize="12px" fontWeight={500} color="var(--cc-text)">
        {value}
      </Text>
    </Stack>
  );
}

export function MetaBlock({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={1}>
      <FieldLabel>{label}</FieldLabel>
      <Text className="cc-num" fontSize="14px" color="var(--cc-text-soft)" noOfLines={1}>
        {value}
      </Text>
    </Stack>
  );
}

export function ClosedBadge({ closed }: { closed: ClosedValue | null }) {
  if (closed === "closed_won") return <StatusPill tone="success">Won</StatusPill>;
  if (closed === "closed_lost") return <StatusPill tone="danger">Lost</StatusPill>;
  return <StatusPill tone="attention">Pending</StatusPill>;
}

/** Kleine neutrale Pill-Badge (z. B. utm_source, Herkunft, View-Count). */
export function TagBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "gold";
}) {
  return (
    <StatusPill tone={tone === "gold" ? "attention" : "neutral"} borderRadius="6px">
      {children}
    </StatusPill>
  );
}
