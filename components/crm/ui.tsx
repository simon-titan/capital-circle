"use client";

import {
  Box,
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Skeleton,
  Stack,
  Text,
  Tooltip,
  useToast,
  type BoxProps,
} from "@chakra-ui/react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { initialen } from "@/lib/crm/anzeige";

/**
 * Bausteine des CRM (`/crm`) im Schema v3.2 „Champagner auf Graphit": Chips,
 * Avatare, Icon-Knöpfe, Abschnitte, Kennzahlen, Menüs und Rückmeldungen.
 * Vorbilder: HubSpot (Aktionsleiste, Abschnitte), Pipedrive (Karten-Indikatoren),
 * Salesforce (Pfad). Farben nur aus `--cc-*`, Gold für Aktion/Auswahl, Rot/Grün
 * nur für Bedeutung.
 */

/* ─── Kontext: wer, wo ─────────────────────────────────────────────────── */

type CrmWert = { basis: string; ichId: string | null; istAdmin: boolean; name: string };
const CrmKontext = createContext<CrmWert>({ basis: "/crm", ichId: null, istAdmin: false, name: "" });

export function CrmProvider({ wert, children }: { wert: CrmWert; children: ReactNode }) {
  return <CrmKontext.Provider value={wert}>{children}</CrmKontext.Provider>;
}

/** Nutzer und Pfade. `pfad("/kontakte/x")` hängt an `/crm` (oder die Vorschau). */
export function useCrm() {
  const c = useContext(CrmKontext);
  return useMemo(() => ({ ...c, pfad: (p = "") => `${c.basis}${p}` }), [c]);
}

/* ─── Chips ────────────────────────────────────────────────────────────── */

export function Chip({
  aktiv = false,
  onClick,
  children,
  icon: Icon,
  zahl,
  klein = false,
  ton,
  isDisabled,
  title,
}: {
  aktiv?: boolean;
  onClick?: () => void;
  children: ReactNode;
  icon?: LucideIcon;
  zahl?: number;
  klein?: boolean;
  ton?: "danger";
  isDisabled?: boolean;
  title?: string;
}) {
  const rot = ton === "danger";
  return (
    <Box
      as="button"
      type="button"
      onClick={onClick}
      aria-pressed={aktiv}
      disabled={isDisabled}
      title={title}
      display="inline-flex"
      alignItems="center"
      gap={1.5}
      h={klein ? "26px" : "30px"}
      px={klein ? 2.5 : 3}
      borderRadius="full"
      border="1px solid"
      fontSize={klein ? "12px" : "13px"}
      fontWeight={500}
      whiteSpace="nowrap"
      transition="background 160ms var(--cc-ease), border-color 160ms var(--cc-ease), color 160ms var(--cc-ease)"
      bg={aktiv ? (rot ? "rgba(248,113,113,0.1)" : "var(--cc-gold-wash)") : "rgba(255,255,255,0.02)"}
      borderColor={aktiv ? (rot ? "rgba(248,113,113,0.45)" : "var(--cc-gold-line)") : "var(--cc-line-strong)"}
      color={aktiv ? (rot ? "var(--cc-danger)" : "var(--cc-gold-light)") : "var(--cc-text-2)"}
      _hover={isDisabled ? undefined : aktiv ? { bg: rot ? "rgba(248,113,113,0.14)" : "rgba(212,176,128,0.13)" } : { bg: "rgba(255,255,255,0.05)", color: "var(--cc-text)", borderColor: "rgba(255,255,255,0.24)" }}
      _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px" }}
      _disabled={{ opacity: 0.45, cursor: "not-allowed" }}
    >
      {Icon ? <Icon size={klein ? 12 : 14} strokeWidth={1.75} /> : null}
      {children}
      {zahl !== undefined ? (
        <Box
          as="span"
          className="cc-num"
          minW="18px"
          h="18px"
          px="5px"
          borderRadius="full"
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          fontSize="11px"
          bg={aktiv ? "rgba(212,176,128,0.18)" : "rgba(255,255,255,0.07)"}
          color={aktiv ? "var(--cc-gold-light)" : "var(--cc-text-2)"}
        >
          {zahl}
        </Box>
      ) : null}
    </Box>
  );
}

/* ─── Avatar ───────────────────────────────────────────────────────────── */

export function Avatar({ name, groesse = 28, gold = false, title }: { name: string | null | undefined; groesse?: number; gold?: boolean; title?: string }) {
  // Ohne Namen (Pool): leerer, gestrichelter Kreis.
  if (!name?.trim()) {
    return (
      <Box
        as="span"
        title={title}
        aria-hidden={title ? undefined : true}
        w={`${groesse}px`}
        h={`${groesse}px`}
        flexShrink={0}
        borderRadius="full"
        border="1px dashed var(--cc-line-strong)"
        display="inline-block"
      />
    );
  }
  return (
    <Flex
      as="span"
      title={title ?? name ?? undefined}
      aria-hidden={title ? undefined : true}
      w={`${groesse}px`}
      h={`${groesse}px`}
      flexShrink={0}
      borderRadius="full"
      align="center"
      justify="center"
      fontSize={`${Math.max(10, Math.round(groesse * 0.38))}px`}
      fontWeight={600}
      letterSpacing="0.02em"
      color={gold ? "var(--cc-gold-light)" : "var(--cc-text-soft)"}
      bg={gold ? "radial-gradient(circle at 30% 20%, rgba(232,192,148,0.22), rgba(212,176,128,0.06) 70%)" : "linear-gradient(160deg, #2a2f36 0%, #1d2127 100%)"}
      border="1px solid"
      borderColor={gold ? "rgba(212,176,128,0.5)" : "var(--cc-line-strong)"}
      boxShadow={gold ? "0 0 14px rgba(212,176,128,0.16)" : "none"}
    >
      {initialen(name)}
    </Flex>
  );
}

/* ─── Knöpfe ───────────────────────────────────────────────────────────── */

/** Quadratischer Icon-Knopf mit Tooltip — für Zeilen- und Kartenaktionen. */
export function IconKnopf({
  icon: Icon,
  label,
  onClick,
  href,
  extern,
  gold = false,
  groesse = "sm",
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  href?: string;
  extern?: boolean;
  gold?: boolean;
  groesse?: "xs" | "sm";
}) {
  const knopf = (
    <Button
      as={href ? "a" : "button"}
      {...(href ? { href, ...(extern ? { target: "_blank", rel: "noopener noreferrer" } : {}) } : {})}
      onClick={onClick}
      aria-label={label}
      size={groesse}
      variant={gold ? "gold" : "line"}
      px={0}
      minW={groesse === "xs" ? "28px" : "32px"}
      h={groesse === "xs" ? "28px" : "32px"}
    >
      <Icon size={groesse === "xs" ? 13 : 15} strokeWidth={1.75} />
    </Button>
  );
  return (
    <Tooltip label={label} openDelay={350} hasArrow placement="top" bg="var(--cc-surface-2)" color="var(--cc-text)" fontSize="12px" borderRadius="6px" px={2} py={1}>
      {knopf}
    </Tooltip>
  );
}

/* ─── Flächen ──────────────────────────────────────────────────────────── */

/** Glas-Karte mit Versaltitel, Zähler und Aktion rechts — der Grundbaustein jeder Ansicht. */
export function Abschnitt({
  titel,
  zahl,
  rechts,
  unter,
  children,
  hero = false,
  ...rest
}: { titel?: ReactNode; zahl?: number; rechts?: ReactNode; unter?: ReactNode; children: ReactNode; hero?: boolean } & Omit<BoxProps, "title">) {
  return (
    <Box className={hero ? "cc-card cc-card--hero cc-card--still" : "cc-card cc-card--still"} p={{ base: 4, md: 5 }} {...rest}>
      {titel ? (
        <Flex align="center" gap={2} mb={unter ? 1 : 3} minH="28px">
          <Text as="h2" fontSize="12px" lineHeight="18px" fontWeight={500} letterSpacing="0.12em" textTransform="uppercase" color={hero ? "var(--cc-gold-light)" : "var(--cc-text-soft)"}>
            {titel}
          </Text>
          {zahl !== undefined ? (
            <Text as="span" className="cc-num" fontSize="12px" color="var(--cc-text-3)">
              {zahl}
            </Text>
          ) : null}
          {rechts ? <Box ml="auto">{rechts}</Box> : null}
        </Flex>
      ) : null}
      {unter ? (
        <Text fontSize="12px" color="var(--cc-text-3)" mb={3}>
          {unter}
        </Text>
      ) : null}
      {children}
    </Box>
  );
}

/** Kennzahl-Kachel mit neutraler Icon-Kachel (DESIGN: Icon-Kacheln nie golden). */
export function Kennzahl({
  icon: Icon,
  label,
  wert,
  hinweis,
  ton = "neutral",
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  wert: number | string;
  hinweis?: string;
  ton?: "danger" | "gold" | "neutral";
  onClick?: () => void;
}) {
  const farbe = ton === "danger" ? "var(--cc-danger)" : ton === "gold" ? "var(--cc-gold-light)" : "var(--cc-text)";
  return (
    <Flex
      as={onClick ? "button" : "div"}
      onClick={onClick}
      textAlign="left"
      className="cc-card cc-card--still"
      px={4}
      py={3.5}
      gap={3}
      align="center"
      w="100%"
      _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px" }}
    >
      <Flex w="40px" h="40px" flexShrink={0} borderRadius="10px" align="center" justify="center" border="1px solid var(--cc-line-strong)" bg="rgba(255,255,255,0.02)" color={ton === "danger" ? "var(--cc-danger)" : "var(--cc-text-soft)"}>
        <Icon size={18} strokeWidth={1.75} />
      </Flex>
      <Box minW={0}>
        <Text className="cc-num" fontSize="24px" fontWeight={600} lineHeight={1.1} color={farbe}>
          {wert}
        </Text>
        <Text fontSize="12px" color="var(--cc-text-2)" noOfLines={1}>
          {label}
          {hinweis ? (
            <Text as="span" color="var(--cc-text-3)">
              {" "}
              · {hinweis}
            </Text>
          ) : null}
        </Text>
      </Box>
    </Flex>
  );
}

export function LeerZustand({ icon: Icon, titel, text, aktion }: { icon: LucideIcon; titel: string; text?: string; aktion?: ReactNode }) {
  return (
    <Stack align="center" textAlign="center" gap={2} py={8} px={4} border="1px dashed var(--cc-line-strong)" borderRadius="12px">
      <Flex w="40px" h="40px" borderRadius="full" align="center" justify="center" bg="rgba(255,255,255,0.03)" color="var(--cc-text-3)">
        <Icon size={18} strokeWidth={1.75} />
      </Flex>
      <Text fontSize="14px" fontWeight={500} color="var(--cc-text-soft)">
        {titel}
      </Text>
      {text ? (
        <Text fontSize="13px" color="var(--cc-text-3)" maxW="340px">
          {text}
        </Text>
      ) : null}
      {aktion}
    </Stack>
  );
}

/** Ladeplatzhalter in Graphit — statt „Lädt …". */
export function Laden({ zeilen = 4, hoehe = "52px" }: { zeilen?: number; hoehe?: string }) {
  return (
    <Stack gap={2} aria-busy="true" aria-label="Lädt">
      {Array.from({ length: zeilen }, (_, i) => (
        <Skeleton key={i} h={hoehe} borderRadius="10px" startColor="rgba(255,255,255,0.03)" endColor="rgba(255,255,255,0.07)" />
      ))}
    </Stack>
  );
}

/* ─── Menü-Auswahl (statt nativer Selects) ─────────────────────────────── */

export const menuListProps = {
  bg: "var(--cc-panel-solid)",
  border: "1px solid rgba(212, 176, 128, 0.22)",
  borderRadius: "12px",
  boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
  py: 1.5,
  minW: "220px",
  maxH: "360px",
  overflowY: "auto" as const,
  zIndex: 30,
};

export const menuItemProps = {
  bg: "transparent",
  fontSize: "13px",
  color: "var(--cc-text-soft)",
  px: 3,
  py: 2,
  _hover: { bg: "rgba(255,255,255,0.05)", color: "var(--cc-text)" },
  _focus: { bg: "rgba(255,255,255,0.05)", color: "var(--cc-text)" },
  _checked: { color: "var(--cc-gold-light)" },
};

export type Option = { wert: string; label: string; vor?: ReactNode; trenner?: boolean };

/** Filter-Knopf mit Menü: zeigt die Auswahl, Gold, sobald nicht auf Standard. */
export function AuswahlMenu({
  label,
  wert,
  standard,
  optionen,
  onWahl,
  icon: Icon,
}: {
  label: string;
  wert: string;
  standard?: string;
  optionen: Option[];
  onWahl: (w: string) => void;
  icon?: LucideIcon;
}) {
  const aktuell = optionen.find((o) => o.wert === wert);
  const gesetzt = standard !== undefined && wert !== standard;
  return (
    <Menu isLazy placement="bottom-start">
      <MenuButton
        as={Box}
        role="button"
        tabIndex={0}
        display="inline-flex"
        alignItems="center"
        gap={1.5}
        h="32px"
        px={3}
        borderRadius="8px"
        border="1px solid"
        borderColor={gesetzt ? "var(--cc-gold-line)" : "var(--cc-line-strong)"}
        bg={gesetzt ? "var(--cc-gold-wash)" : "rgba(255,255,255,0.02)"}
        color={gesetzt ? "var(--cc-gold-light)" : "var(--cc-text-soft)"}
        fontSize="13px"
        cursor="pointer"
        whiteSpace="nowrap"
        _hover={{ borderColor: gesetzt ? "var(--cc-gold-line)" : "rgba(255,255,255,0.24)", color: "var(--cc-text)" }}
        _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px" }}
      >
        <Flex as="span" align="center" gap={1.5}>
          {Icon ? <Icon size={14} strokeWidth={1.75} /> : null}
          <Text as="span" color={gesetzt ? "inherit" : "var(--cc-text-3)"}>
            {label}:
          </Text>
          <Text as="span" fontWeight={500}>
            {aktuell?.label ?? "—"}
          </Text>
          <ChevronDown size={14} strokeWidth={1.75} />
        </Flex>
      </MenuButton>
      <MenuList {...menuListProps}>
        <MenuOptionGroup type="radio" value={wert} onChange={(v) => onWahl(String(v))}>
          {optionen.map((o) => (
            <MenuItemOption key={o.wert} value={o.wert} {...menuItemProps} borderTop={o.trenner ? "1px solid var(--cc-line)" : undefined} mt={o.trenner ? 1 : 0}>
              <Flex align="center" gap={2}>
                {o.vor}
                {o.label}
              </Flex>
            </MenuItemOption>
          ))}
        </MenuOptionGroup>
      </MenuList>
    </Menu>
  );
}

/* ─── Rückmeldung ──────────────────────────────────────────────────────── */

/** Toasts unten rechts (Theme: Graphit-Panel, Icon grün/rot). */
export function useMeldung() {
  const toast = useToast();
  const ok = useCallback(
    (text: string) => toast({ status: "success", title: text, position: "bottom-right", duration: 3500, isClosable: true, variant: "solid" }),
    [toast],
  );
  const fehler = useCallback(
    (text: string) => toast({ status: "error", title: text, position: "bottom-right", duration: 7000, isClosable: true, variant: "solid" }),
    [toast],
  );
  return useMemo(() => ({ ok, fehler }), [ok, fehler]);
}

/* ─── Formfelder ───────────────────────────────────────────────────────── */

/** Für `datetime-local` & Co.: dunkles Farbschema, sonst ist das Kalender-Icon schwarz auf Graphit. */
export const dunklesFeld = { sx: { colorScheme: "dark" } } as const;

export function Feldlabel({ children }: { children: ReactNode }) {
  return (
    <Text fontSize="12px" fontWeight={500} letterSpacing="0.04em" color="var(--cc-text-3)" mb={1.5}>
      {children}
    </Text>
  );
}
