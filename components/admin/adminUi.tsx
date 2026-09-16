import { Badge, Box, Flex, Stack, Text, type BadgeProps, type ChakraProps, type TextProps } from "@chakra-ui/react";
import type { ReactNode } from "react";

/**
 * Admin-Bausteine im Schema v3.2 „Champagner auf Graphit“ (DESIGN.md), Arbeitsmodus:
 * dicht und gut scanbar, die Marke steckt in den Details (Champagner nur für
 * aktive Zustände, Fokus, Hauptaktion und „offen/ausstehend“).
 *
 * Bewusst ohne "use client": Seiten (Server-Komponenten) nutzen `AdminPageHeader`,
 * Client-Manager zusätzlich die Stil-Objekte.
 */

/* ── Seitenkopf ─────────────────────────────────────────────────────────── */

export function AdminPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Aktionen rechts neben dem Titel (z. B. „Neu anlegen“). */
  actions?: ReactNode;
}) {
  return (
    <Stack spacing={1.5} mb={{ base: 6, md: 7 }}>
      <Flex justify="space-between" align="flex-end" gap={4} wrap="wrap">
        <Box
          as="h1"
          fontSize={{ base: "24px", md: "28px" }}
          fontWeight={600}
          letterSpacing="-0.01em"
          lineHeight={1.2}
          color="var(--cc-text)"
        >
          {title}
        </Box>
        {actions ? <Flex gap={2} wrap="wrap">{actions}</Flex> : null}
      </Flex>
      {subtitle ? (
        <Text fontSize="14px" color="var(--cc-text-2)" maxW="52rem" lineHeight={1.55}>
          {subtitle}
        </Text>
      ) : null}
      <Box
        h="1px"
        w="100%"
        mt={3}
        bg="linear-gradient(90deg, rgba(232, 192, 148, 0.45) 0%, rgba(212, 176, 128, 0.1) 35%, transparent 100%)"
        aria-hidden
      />
    </Stack>
  );
}

/* ── Karten & Flächen ───────────────────────────────────────────────────── */

/** Glas-Karte ohne Anheben — Admin-Flächen tragen Tabellen und Formulare. */
export const ADMIN_CARD_CLASS = "cc-card cc-card--still";

/** Innenpadding der Admin-Karten (dichter als im Mitgliederbereich). */
export const adminCardPadding = { base: 4, md: 5 } as const;

/**
 * Eingelassene Fläche innerhalb einer Karte oder Listen-Zeile — ohne Blur,
 * damit lange Listen nicht dutzende `backdrop-filter` stapeln.
 */
export const adminInsetProps: ChakraProps = {
  bg: "rgba(255, 255, 255, 0.02)",
  border: "1px solid var(--cc-line)",
  borderRadius: "10px",
};

/** Kartentitel (Label-Schnitt, versal) — als `h2` der Karte einsetzen. */
export function AdminCardTitle({ children, ...rest }: TextProps) {
  return (
    <Text
      as="h2"
      fontSize="13px"
      lineHeight="18px"
      fontWeight={500}
      letterSpacing="0.12em"
      textTransform="uppercase"
      color="var(--cc-text-soft)"
      {...rest}
    >
      {children}
    </Text>
  );
}

/** Kleines Feld-/Spalten-Label (12px, versal, Text 2). */
export function AdminLabel({ children, ...rest }: TextProps) {
  return (
    <Text
      fontSize="12px"
      lineHeight="16px"
      fontWeight={500}
      letterSpacing="0.06em"
      textTransform="uppercase"
      color="var(--cc-text-2)"
      {...rest}
    >
      {children}
    </Text>
  );
}

/** Leerer Zustand in Listen/Tabellen. */
export const adminEmptyProps: ChakraProps = {
  py: 12,
  px: 4,
  textAlign: "center",
  color: "var(--cc-text-2)",
  fontSize: "14px",
  border: "1px dashed var(--cc-line-strong)",
  borderRadius: "12px",
};

/* ── Formulare ──────────────────────────────────────────────────────────── */

/** Input / Select / Textarea / NumberInputField. */
export const adminInputProps: ChakraProps = {
  bg: "rgba(255, 255, 255, 0.03)",
  border: "1px solid",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  color: "var(--cc-text)",
  _placeholder: { color: "var(--cc-text-3)" },
  _hover: { borderColor: "rgba(255, 255, 255, 0.24)" },
  _focus: { borderColor: "var(--cc-gold-line)", boxShadow: "0 0 0 1px var(--cc-gold-line)" },
  _focusVisible: { borderColor: "var(--cc-gold-line)", boxShadow: "0 0 0 1px var(--cc-gold-line)" },
};

/** `<option style={adminOptionStyle}>` — native Dropdowns auf Graphit. */
export const adminOptionStyle = { background: "#151a1e", color: "#f2f3f5" } as const;

/**
 * `<Switch sx={adminSwitchSx}>` — Spur in Graphit, eingeschaltet Champagner.
 * Gleiche Werte wie in den Inhalts-Managern (ModuleForm, AdminCoursesManager).
 */
export const adminSwitchSx = {
  ".chakra-switch__track": { bg: "var(--cc-track)", boxShadow: "inset 0 0 0 1px var(--cc-line-strong)" },
  ".chakra-switch__track[data-checked]": { bg: "var(--cc-gold)", boxShadow: "none" },
} as const;

/** FormLabel über Feldern. */
export const adminFormLabelProps: ChakraProps = {
  fontSize: "12px",
  fontWeight: 500,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--cc-text-2)",
  mb: 1.5,
};

/* ── Tabs, Filter, Chips ────────────────────────────────────────────────── */

/**
 * Filter-/Tab-Button (auf `<Button>` spreaden). Aktiv = Champagner-Hauch,
 * Gold-Haarlinie, Text Gold hell — wie der aktive Nav-Punkt.
 */
export function adminChipProps(active: boolean) {
  return {
    variant: "line",
    size: "sm",
    fontWeight: 500,
    bg: active ? "var(--cc-gold-wash)" : "rgba(255, 255, 255, 0.02)",
    borderColor: active ? "var(--cc-gold-line)" : "var(--cc-line-strong)",
    color: active ? "var(--cc-gold-light)" : "var(--cc-text-2)",
    _hover: active
      ? { bg: "rgba(212, 176, 128, 0.12)" }
      : { bg: "rgba(255, 255, 255, 0.04)", color: "var(--cc-text)", borderColor: "rgba(255, 255, 255, 0.24)" },
  } as const;
}

/** Zähler in einem Chip/Tab. */
export function AdminCount({ active = false, children }: { active?: boolean; children: ReactNode }) {
  return (
    <Box
      as="span"
      className="cc-num"
      ml={2}
      minW="20px"
      h="18px"
      px="6px"
      borderRadius="full"
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      fontSize="11px"
      fontWeight={500}
      bg={active ? "rgba(212, 176, 128, 0.16)" : "rgba(255, 255, 255, 0.07)"}
      color={active ? "var(--cc-gold-light)" : "var(--cc-text-2)"}
    >
      {children}
    </Box>
  );
}

/* ── Status ─────────────────────────────────────────────────────────────── */

/**
 * ok / Fehler / neutral — plus „attention“ in Champagner für offen, ausstehend,
 * zu prüfen. Keine weiteren Statusfarben.
 */
export type AdminTone = "success" | "danger" | "neutral" | "attention";

export const ADMIN_TONES: Record<AdminTone, { bg: string; color: string; border: string; dot: string }> = {
  success: {
    bg: "rgba(74, 222, 128, 0.1)",
    color: "var(--cc-success)",
    border: "rgba(74, 222, 128, 0.28)",
    dot: "#4ade80",
  },
  danger: {
    bg: "rgba(248, 113, 113, 0.1)",
    color: "var(--cc-danger)",
    border: "rgba(248, 113, 113, 0.3)",
    dot: "#f87171",
  },
  neutral: {
    bg: "rgba(255, 255, 255, 0.05)",
    color: "var(--cc-text-2)",
    border: "var(--cc-line-strong)",
    dot: "#80868d",
  },
  attention: {
    bg: "var(--cc-gold-wash)",
    color: "var(--cc-gold-light)",
    border: "rgba(212, 176, 128, 0.32)",
    dot: "#e8c094",
  },
};

export function StatusPill({ tone = "neutral", children, ...rest }: BadgeProps & { tone?: AdminTone }) {
  const t = ADMIN_TONES[tone];
  return (
    <Badge
      bg={t.bg}
      color={t.color}
      border="1px solid"
      borderColor={t.border}
      borderRadius="full"
      px={2}
      py="1px"
      fontSize="11px"
      fontWeight={500}
      lineHeight="18px"
      letterSpacing="0"
      textTransform="none"
      whiteSpace="nowrap"
      {...rest}
    >
      {children}
    </Badge>
  );
}

/** 8px-Statuspunkt vor Listenzeilen. */
export function StatusDot({ tone = "neutral" }: { tone?: AdminTone }) {
  return <Box w="8px" h="8px" borderRadius="full" bg={ADMIN_TONES[tone].dot} flexShrink={0} aria-hidden />;
}

/* ── Tabellen ───────────────────────────────────────────────────────────── */

/**
 * `<Table variant="unstyled" size="sm" sx={adminTableSx}>` — Kopf 12px versal
 * in Text 2, Haarlinien, Hover 3 % Weiß, tabellarische Ziffern.
 */
export const adminTableSx = {
  fontVariantNumeric: "tabular-nums",
  "th, td": { px: 3 },
  th: {
    color: "var(--cc-text-2)",
    fontSize: "12px",
    fontWeight: 500,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    borderBottom: "1px solid var(--cc-line-strong)",
    py: 2.5,
  },
  td: {
    borderBottom: "1px solid var(--cc-line)",
    fontSize: "14px",
    color: "var(--cc-text-soft)",
    py: 3,
  },
  "tbody tr": { transition: "background-color 120ms ease" },
  "tbody tr:hover": { bg: "rgba(255, 255, 255, 0.03)" },
  "tbody tr:last-of-type td": { borderBottom: "none" },
} as const;

/** Für Listen-Zeilen außerhalb von `<Table>`. */
export const adminRowProps: ChakraProps = {
  borderBottom: "1px solid var(--cc-line)",
  transition: "background-color 120ms ease",
  _hover: { bg: "rgba(255, 255, 255, 0.03)" },
  _last: { borderBottom: "none" },
};

/* ── Modals ─────────────────────────────────────────────────────────────── */

export const adminOverlayProps: ChakraProps = { bg: "rgba(8, 10, 12, 0.72)" };

export const adminModalProps: ChakraProps = {
  bg: "var(--cc-panel-solid)",
  border: "1px solid rgba(212, 176, 128, 0.22)",
  borderRadius: "12px",
  color: "var(--cc-text)",
  boxShadow: "0 24px 64px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
};

export const adminModalHeaderProps: ChakraProps = {
  fontSize: "18px",
  fontWeight: 600,
  lineHeight: 1.3,
  color: "var(--cc-text)",
};

/* ── Buttons & Hinweise ─────────────────────────────────────────────────── */

/** Destruktive Aktion: Line-Button mit rotem Text (auf `<Button>` spreaden). */
export const adminDangerButtonProps = {
  variant: "line",
  color: "var(--cc-danger)",
  borderColor: "rgba(248, 113, 113, 0.35)",
  _hover: { bg: "rgba(248, 113, 113, 0.08)", borderColor: "rgba(248, 113, 113, 0.6)", boxShadow: "none" },
  _active: { bg: "rgba(248, 113, 113, 0.12)" },
} as const;

type AlertKind = "error" | "success" | "info" | "warning";

/** Flächen für Chakra-`<Alert>`; Icon-Farbe über `adminAlertIconColor`. */
export function adminAlertProps(kind: AlertKind): ChakraProps {
  const tone: AdminTone =
    kind === "error" ? "danger" : kind === "success" ? "success" : kind === "warning" ? "attention" : "neutral";
  const t = ADMIN_TONES[tone];
  return {
    bg: kind === "info" ? "rgba(255, 255, 255, 0.03)" : t.bg,
    border: "1px solid",
    borderColor: kind === "info" ? "var(--cc-line-strong)" : t.border,
    borderRadius: "8px",
    color: "var(--cc-text)",
    fontSize: "14px",
  };
}

export function adminAlertIconColor(kind: AlertKind): string {
  if (kind === "error") return "var(--cc-danger)";
  if (kind === "success") return "var(--cc-success)";
  if (kind === "warning") return "var(--cc-gold-light)";
  return "var(--cc-text-2)";
}

/* ── Diagramme ──────────────────────────────────────────────────────────── */

/** Champagner + Tinten-Grau — Reihenfolge für kategoriale Reihen. */
export const ADMIN_CHART = {
  series: ["#d4b080", "#d1d0d4", "#8a9098", "#b8935f", "#5c6168"],
  gold: "#d4b080",
  goldLight: "#e8c094",
  goldDark: "#b8935f",
  ink: "#d1d0d4",
  track: "#292c32",
  grid: "rgba(255, 255, 255, 0.06)",
  text: "#a3a9b0",
  success: "#4ade80",
  danger: "#f87171",
} as const;
