"use client";

import { Badge, Box, HStack, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
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

export function SectionCard(props: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Stack spacing={4}>
      <HStack justify="space-between" flexWrap="wrap" gap={2}>
        <Stack spacing={0.5}>
          <HStack spacing={2}>
            {props.icon ? (
              <Box color="var(--color-accent-gold-light, #E8C547)">{props.icon}</Box>
            ) : null}
            <Text className="inter-semibold" fontSize="lg" color="whiteAlpha.950">
              {props.title}
            </Text>
          </HStack>
          {props.subtitle ? (
            <Text fontSize="xs" color="var(--color-text-secondary)" className="inter">
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
  const iconColor =
    accent === "green" ? "#34D399" : accent === "red" ? "#F87171" : "var(--color-accent-gold-light, #E8C547)";
  return (
    <Box
      bg="rgba(20, 21, 25, 0.82)"
      backdropFilter="blur(20px) saturate(1.6)"
      border="1px solid rgba(255,255,255,0.09)"
      borderRadius="20px"
      p="18px 20px"
      boxShadow="0 8px 32px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.06)"
      position="relative"
      overflow="hidden"
    >
      <Stack spacing={3}>
        <HStack spacing={2} color={iconColor}>
          {icon}
          <Text
            fontSize="11px"
            fontWeight={500}
            letterSpacing="0.08em"
            textTransform="uppercase"
            color="#606068"
            className="inter"
          >
            {label}
          </Text>
        </HStack>
        <Text className="inter-semibold" fontSize="28px" fontWeight={700} lineHeight="1" color="#F0F0F2">
          {value}
        </Text>
        {sublabel ? (
          <Text fontSize="xs" color="var(--color-text-secondary)" className="inter">
            {sublabel}
          </Text>
        ) : null}
      </Stack>
    </Box>
  );
}

export function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Box bg="#0C0D10" border="1px solid rgba(255,255,255,0.07)" borderRadius="12px" p={4}>
      <Text
        fontSize="11px"
        fontWeight={500}
        letterSpacing="0.08em"
        textTransform="uppercase"
        color="#606068"
        className="inter"
        mb={2}
      >
        {label}
      </Text>
      <Text className="inter-semibold" fontSize="22px" fontWeight={700} color="#F0F0F2" lineHeight="1">
        {value}
      </Text>
      {sub ? (
        <Text fontSize="xs" color="var(--color-text-secondary)" className="inter" mt={2}>
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
    <Box bg="#0C0D10" border="1px solid rgba(255,255,255,0.07)" borderRadius="12px" p={4}>
      <Text className="inter-semibold" fontSize="sm" color="var(--color-text-primary)" mb={3}>
        {title}
      </Text>
      <Stack spacing={3}>
        {options.map((o) => {
          const pct = max > 0 ? o.count / max : 0;
          return (
            <Stack key={o.option} spacing={1}>
              <HStack justify="space-between" align="flex-start" gap={2}>
                <Text fontSize="xs" color="var(--color-text-secondary)" className="inter" noOfLines={2}>
                  {o.option}
                </Text>
                <Text className="inter-semibold" fontSize="xs" color="var(--color-text-primary)" flexShrink={0}>
                  {o.count}
                </Text>
              </HStack>
              <Box bg="#1A1B1F" borderRadius="9999px" overflow="hidden" h="6px">
                <Box
                  h="full"
                  w={`${(pct * 100).toFixed(2)}%`}
                  background={
                    accent
                      ? "linear-gradient(90deg, #34D399 0%, #10B981 100%)"
                      : "linear-gradient(90deg, #A67C00 0%, #D4AF37 100%)"
                  }
                  borderRadius="9999px"
                  transition="width 500ms ease"
                />
              </Box>
            </Stack>
          );
        })}
        {total === 0 ? (
          <Text fontSize="xs" color="#3A3A40" className="inter" fontStyle="italic">
            Keine Daten im Zeitraum.
          </Text>
        ) : null}
      </Stack>
    </Box>
  );
}

/* ── Donut chart (Gold-Palette) ───────────────────────────────────────────── */

const DONUT_PALETTE = ["#D4AF37", "#A67C00", "#E8C547", "#7A5C00", "#F0D77A"];

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
        <Text className="inter-semibold" fontSize="xs" color="var(--color-text-secondary)" textAlign="center">
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
            stroke="#1A1B1F"
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
          <Text className="inter-semibold" fontSize="lg" fontWeight={700} color="#F0F0F2" lineHeight="1">
            {total}
          </Text>
          <Text fontSize="9px" color="#606068" className="inter" textTransform="uppercase" letterSpacing="0.08em">
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
                  w="9px"
                  h="9px"
                  borderRadius="2px"
                  bg={DONUT_PALETTE[i % DONUT_PALETTE.length]}
                  flexShrink={0}
                />
                <Text fontSize="11px" color="var(--color-text-secondary)" className="inter" noOfLines={1}>
                  {seg.label}
                </Text>
              </HStack>
              <Text className="inter-semibold" fontSize="11px" color="var(--color-text-primary)" flexShrink={0}>
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
    <Text fontSize="11px" letterSpacing="0.06em" textTransform="uppercase" color="#606068" className="inter">
      {children}
    </Text>
  );
}

export function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0} align="flex-end">
      <Text fontSize="10px" color="#606068" className="inter" textTransform="uppercase" letterSpacing="0.06em">
        {label}
      </Text>
      <Text fontSize="xs" color="var(--color-text-primary)" className="inter-semibold">
        {value}
      </Text>
    </Stack>
  );
}

export function MetaBlock({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={1}>
      <FieldLabel>{label}</FieldLabel>
      <Text fontSize="sm" color="var(--color-text-primary)" className="inter" noOfLines={1}>
        {value}
      </Text>
    </Stack>
  );
}

export function ClosedBadge({ closed }: { closed: ClosedValue | null }) {
  if (closed === "closed_won") {
    return (
      <Badge
        bg="rgba(52,211,153,0.14)"
        color="#34D399"
        border="1px solid rgba(52,211,153,0.4)"
        borderRadius="full"
        px={2}
        py={0.5}
        textTransform="none"
        className="inter"
      >
        Won
      </Badge>
    );
  }
  if (closed === "closed_lost") {
    return (
      <Badge
        bg="rgba(248,113,113,0.14)"
        color="#F87171"
        border="1px solid rgba(248,113,113,0.4)"
        borderRadius="full"
        px={2}
        py={0.5}
        textTransform="none"
        className="inter"
      >
        Lost
      </Badge>
    );
  }
  return (
    <Badge
      bg="rgba(245,200,74,0.14)"
      color="#F5C84A"
      border="1px solid rgba(245,200,74,0.4)"
      borderRadius="full"
      px={2}
      py={0.5}
      textTransform="none"
      className="inter"
    >
      Pending
    </Badge>
  );
}

/** Kleine neutrale Pill-Badge (z. B. utm_source, Herkunft, View-Count). */
export function TagBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "gold";
}) {
  const gold = tone === "gold";
  return (
    <Badge
      bg={gold ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.06)"}
      color={gold ? "var(--color-accent-gold-light, #E8C547)" : "#9A9AA4"}
      border="1px solid"
      borderColor={gold ? "rgba(212,175,55,0.30)" : "rgba(255,255,255,0.08)"}
      borderRadius="6px"
      fontSize="10px"
      px={2}
      textTransform="none"
      className="inter"
    >
      {children}
    </Badge>
  );
}
