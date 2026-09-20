/**
 * Bausteine für Funnel-, Pricing- und Bewerbungsflächen (DESIGN.md v3.2
 * „Champagner auf Graphit“). Ohne Hooks und ohne "use client", damit Server-
 * Seiten und Client-Modale dieselben Teile nutzen können.
 */
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Heading,
  HStack,
  IconButton,
  Stack,
  Text,
  VisuallyHidden,
  type BoxProps,
  type HeadingProps,
  type TextProps,
} from "@chakra-ui/react";
import { AlertTriangle, Check, Play, X } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

/* ─────────────────────────── Bewegung ─────────────────────────── */

/** Einstieg wie im Dashboard: Elemente steigen nacheinander auf (80ms + 70ms je Schritt). */
export function rise(step: number, className?: string): { className: string; style: CSSProperties } {
  return {
    className: className ? `${className} cc-rise` : "cc-rise",
    style: { animationDelay: `${80 + step * 70}ms` },
  };
}

/** Dauer- und Übergangsanimationen bei reduzierter Bewegung abschalten. */
export const noMotion = {
  "@media (prefers-reduced-motion: reduce)": { animation: "none" },
} as const;

/* ─────────────────────────── Typografie ─────────────────────────── */

/** Kleine Pille über der Headline: leuchtender Gold-Punkt + gesperrter Versaltext. */
export function FunnelEyebrow({ children, ...rest }: BoxProps) {
  return (
    <HStack
      as="p"
      display="inline-flex"
      spacing={2}
      px={3}
      h="28px"
      borderRadius="full"
      border="1px solid rgba(232, 192, 148, 0.28)"
      bg="var(--cc-gold-wash)"
      color="var(--cc-gold-light)"
      fontSize="12px"
      fontWeight={500}
      letterSpacing="0.12em"
      textTransform="uppercase"
      lineHeight={1}
      maxW="full"
      {...rest}
    >
      <Box
        as="span"
        w="6px"
        h="6px"
        flexShrink={0}
        borderRadius="full"
        bg="var(--cc-gold-light)"
        boxShadow="0 0 10px rgba(232, 192, 148, 0.8)"
        aria-hidden
      />
      <Box as="span" minW={0} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
        {children}
      </Box>
    </HStack>
  );
}

const HEADLINE_SCALE = {
  xl: { fontSize: { base: "32px", md: "48px" }, lineHeight: 1.1, letterSpacing: "-0.02em" },
  lg: { fontSize: { base: "28px", md: "40px" }, lineHeight: 1.15, letterSpacing: "-0.02em" },
  md: { fontSize: { base: "22px", md: "28px" }, lineHeight: 1.25, letterSpacing: "-0.01em" },
  sm: { fontSize: { base: "19px", md: "22px" }, lineHeight: 1.35, letterSpacing: "-0.01em" },
} as const;

/** Inter-Headline (600), eng gesetzt. Einzelne Wörter über `GoldWord` in Gold hell. */
export function FunnelHeadline({
  scale = "xl",
  as = "h1",
  ...rest
}: Omit<HeadingProps, "scale"> & { scale?: keyof typeof HEADLINE_SCALE }) {
  return <Heading as={as} fontWeight={600} color="var(--cc-text)" {...HEADLINE_SCALE[scale]} {...rest} />;
}

/** Akzentwort in Gold hell (Vollton, kein Verlaufstext). */
export function GoldWord(props: BoxProps) {
  return <Box as="span" color="var(--cc-gold-light)" {...props} />;
}

/** Gedämpfte zweite Zeile unter einer Headline. */
export function FunnelLead(props: TextProps) {
  return <Text fontSize={{ base: "16px", md: "18px" }} lineHeight={1.6} color="var(--cc-text-2)" {...props} />;
}

/** Kleingedrucktes: Disclaimer, Vertrauenszeilen. */
export function FunnelFinePrint(props: TextProps) {
  return <Text fontSize="12px" lineHeight={1.7} color="var(--cc-text-3)" {...props} />;
}

/** Versaltitel einer Karte (Label-Schnitt). */
export function CardLabel({ hero = false, ...rest }: TextProps & { hero?: boolean }) {
  return (
    <Text
      fontSize="13px"
      lineHeight="18px"
      fontWeight={500}
      letterSpacing="0.12em"
      textTransform="uppercase"
      color={hero ? "var(--cc-gold-light)" : "var(--cc-text-soft)"}
      {...rest}
    />
  );
}

/* ─────────────────────────── Formularfelder ─────────────────────────── */

/** Eingaben: 3 % Weiß, kräftige Haarlinie, 8px, Fokus in Gold-Haarlinie. */
export const funnelFieldProps = {
  bg: "rgba(255, 255, 255, 0.03)",
  border: "1px solid",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  color: "var(--cc-text)",
  focusBorderColor: "var(--cc-gold-line)",
  errorBorderColor: "var(--cc-danger)",
  _placeholder: { color: "var(--cc-text-3)" },
  _hover: { borderColor: "rgba(232, 192, 148, 0.35)" },
  transition: "border-color 180ms var(--cc-ease), box-shadow 180ms var(--cc-ease)",
} as const;

/** `<option>`-Hintergrund für native Selects auf Graphit. */
export const funnelSelectSx = {
  "& > option": { background: "var(--cc-panel-solid)", color: "var(--cc-text)" },
} as const;

export const funnelLabelProps = {
  fontSize: "14px",
  fontWeight: 500,
  color: "var(--cc-text-soft)",
  sx: { ".chakra-form__required-indicator": { color: "var(--cc-danger)" } },
} as const;

export const funnelHelperProps = { fontSize: "12px", color: "var(--cc-text-3)" } as const;

export const funnelErrorProps = { fontSize: "13px", color: "var(--cc-danger)" } as const;

/** Fehlertext außerhalb eines FormControl (z. B. unter Auswahlkarten). */
export function FieldError({ children }: { children: ReactNode }) {
  return (
    <Text fontSize="13px" color="var(--cc-danger)" role="alert">
      {children}
    </Text>
  );
}

/** Serverfehler: rote Haarlinie, Text neutral. */
export function FunnelAlert({ children, ...rest }: BoxProps) {
  return (
    <Alert
      status="error"
      variant="subtle"
      bg="rgba(248, 113, 113, 0.08)"
      border="1px solid rgba(248, 113, 113, 0.28)"
      borderRadius="8px"
      color="var(--cc-text)"
      {...rest}
    >
      <AlertIcon color="var(--cc-danger)" />
      <Text fontSize="14px">{children}</Text>
    </Alert>
  );
}

/** Neutraler Hinweis (z. B. fehlende Konfiguration). */
export function FunnelNotice({ children }: { children: ReactNode }) {
  return (
    <HStack
      spacing={3}
      align="flex-start"
      p={3}
      borderRadius="8px"
      border="1px solid var(--cc-line-strong)"
      bg="rgba(255, 255, 255, 0.03)"
    >
      <Box color="var(--cc-gold-light)" pt="1px" flexShrink={0}>
        <AlertTriangle size={16} strokeWidth={1.75} aria-hidden />
      </Box>
      <Text fontSize="12px" color="var(--cc-text-2)" lineHeight={1.5}>
        {children}
      </Text>
    </HStack>
  );
}

/** Auswahlkarte mit verstecktem Radio. Aktiv: Gold-Haarlinie, Gold-Hauch, weicher Glow. */
export function OptionCard({
  name,
  value,
  checked,
  onSelect,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <Box
      as="label"
      display="block"
      cursor="pointer"
      p={4}
      borderRadius="10px"
      border="1px solid"
      borderColor={checked ? "var(--cc-gold-line)" : "var(--cc-line-strong)"}
      bg={checked ? "var(--cc-gold-wash)" : "rgba(255, 255, 255, 0.03)"}
      boxShadow={checked ? "0 0 0 1px rgba(232, 192, 148, 0.3), 0 0 18px rgba(212, 176, 128, 0.14)" : "none"}
      transition="border-color 180ms var(--cc-ease), background-color 180ms var(--cc-ease), box-shadow 180ms var(--cc-ease)"
      _hover={{
        borderColor: checked ? "var(--cc-gold-line)" : "rgba(232, 192, 148, 0.35)",
        bg: checked ? "var(--cc-gold-wash)" : "rgba(212, 176, 128, 0.04)",
      }}
      sx={{
        "&:has(input:focus-visible)": { outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px" },
      }}
    >
      <HStack spacing={3} align="center">
        <Box
          w="18px"
          h="18px"
          borderRadius="full"
          border="1.5px solid"
          borderColor={checked ? "var(--cc-gold-light)" : "rgba(255, 255, 255, 0.3)"}
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
          transition="border-color 180ms var(--cc-ease)"
        >
          {checked ? (
            <Box w="8px" h="8px" borderRadius="full" bg="var(--cc-gold-light)" boxShadow="0 0 8px rgba(232, 192, 148, 0.6)" />
          ) : null}
        </Box>
        <VisuallyHidden>
          <input type="radio" name={name} value={value} checked={checked} onChange={onSelect} />
        </VisuallyHidden>
        <Text fontSize="15px" fontWeight={500} color="var(--cc-text)" flex="1" lineHeight={1.45}>
          {children}
        </Text>
      </HStack>
    </Box>
  );
}

/** Zeichenzähler mit Fortschrittsring in der Textarea-Ecke; erfüllt = Grün (Validierung). */
export function CharCounterPill({ value, min }: { value: string; min: number }) {
  const len = value.trim().length;
  const pct = Math.min(len / min, 1);
  const ok = pct >= 1;
  const r = 9;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <HStack
      position="absolute"
      bottom="8px"
      right="10px"
      spacing={1.5}
      bg="rgba(21, 26, 30, 0.9)"
      border="1px solid var(--cc-line)"
      borderRadius="full"
      px={2}
      py={0.5}
      zIndex={2}
      pointerEvents="none"
    >
      {ok ? (
        <Box
          w="22px"
          h="22px"
          borderRadius="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="rgba(74, 222, 128, 0.14)"
          border="1.5px solid rgba(74, 222, 128, 0.5)"
          color="var(--cc-success)"
        >
          <Check size={12} strokeWidth={2.5} aria-hidden />
        </Box>
      ) : (
        <Box as="svg" w="22px" h="22px" viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="12" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
          <circle
            cx="12"
            cy="12"
            r={r}
            fill="none"
            stroke="var(--cc-gold)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform="rotate(-90 12 12)"
            style={{ transition: "stroke-dashoffset 0.3s ease" }}
          />
        </Box>
      )}
      <Text
        className="cc-num"
        fontSize="11px"
        fontWeight={600}
        color={ok ? "var(--cc-success)" : "var(--cc-text-2)"}
        lineHeight="1"
        whiteSpace="nowrap"
      >
        {ok ? `${len} ✓` : `${len}/${min}`}
      </Text>
    </HStack>
  );
}

/* ─────────────────────────── Fortschritt ─────────────────────────── */

/** Gold-Balken (außerhalb des Dashboards) mit weichem Leuchten. */
export function FunnelProgress({ value, h = "3px", label = "Fortschritt" }: { value: number; h?: string; label?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <Box
      h={h}
      w="full"
      borderRadius="full"
      bg="rgba(255, 255, 255, 0.07)"
      overflow="hidden"
      role="progressbar"
      aria-label={label}
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <Box
        h="full"
        w={`${v}%`}
        bg="var(--cc-gold)"
        bgImage="var(--cc-gold-bar)"
        borderRadius="full"
        boxShadow="0 0 10px rgba(212, 176, 128, 0.45)"
        transition="width 400ms var(--cc-ease)"
      />
    </Box>
  );
}

/** Schrittkreise: erledigt/aktiv im Gold-Verlauf, offen mit Haarlinie. Ab 7 Schritten kompakt als Text. */
export function FunnelStepIndicator({
  current,
  total,
  unit = "Frage",
  maxVisible = 6,
}: {
  current: number;
  total: number;
  unit?: string;
  maxVisible?: number;
}) {
  if (total > maxVisible) {
    return (
      <HStack justify="center" w="full">
        <Text className="cc-num" fontSize="13px" fontWeight={500} color="var(--cc-text-soft)">
          {unit} <GoldWord fontWeight={600}>{current}</GoldWord> von {total}
        </Text>
      </HStack>
    );
  }

  const roomy = total <= 4;
  const dot = roomy ? "32px" : "28px";
  const gap = roomy ? { base: "28px", md: "48px" } : { base: "12px", md: "20px" };

  return (
    <HStack spacing={0} justify="center" align="center" w="full">
      <VisuallyHidden>
        {unit} {current} von {total}
      </VisuallyHidden>
      {Array.from({ length: total }, (_, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === current;
        const isCompleted = stepNum < current;
        const lit = isActive || isCompleted;

        return (
          <HStack key={stepNum} spacing={0} align="center" aria-hidden>
            {i > 0 ? (
              <Box
                h="2px"
                w={gap}
                borderRadius="full"
                bg={lit ? "var(--cc-gold)" : "rgba(255, 255, 255, 0.08)"}
                bgImage={lit ? "var(--cc-gold-bar)" : undefined}
                transition="background 400ms var(--cc-ease)"
              />
            ) : null}
            <Box
              className="cc-num"
              w={dot}
              h={dot}
              borderRadius="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize={roomy ? "12px" : "11px"}
              fontWeight={600}
              flexShrink={0}
              transition="transform 250ms var(--cc-ease), box-shadow 250ms var(--cc-ease)"
              transform={isActive ? "scale(1.12)" : "scale(1)"}
              bg={lit ? "var(--cc-gold)" : "rgba(255, 255, 255, 0.03)"}
              bgImage={lit ? "var(--cc-gold-grad)" : undefined}
              color={lit ? "var(--cc-on-gold)" : "var(--cc-text-3)"}
              border={lit ? "none" : "1px solid var(--cc-line-strong)"}
              boxShadow={
                isActive
                  ? "0 0 16px rgba(212, 176, 128, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.35)"
                  : isCompleted
                    ? "0 0 8px rgba(212, 176, 128, 0.22)"
                    : "none"
              }
            >
              {isCompleted ? <Check size={13} strokeWidth={2.5} /> : stepNum}
            </Box>
          </HStack>
        );
      })}
    </HStack>
  );
}

/* ─────────────────────────── Modale ─────────────────────────── */

export const funnelOverlayProps = {
  bg: "rgba(8, 10, 12, 0.72)",
  backdropFilter: "blur(8px)",
  sx: { WebkitBackdropFilter: "blur(8px)" },
} as const;

/** Modal-Fläche: Panel massiv, Champagner-Haarlinie, 12px, Gold-Schein oben rechts, Gold-Lichtkante. */
export const funnelModalContentProps = {
  maxW: "680px",
  mx: 4,
  position: "relative",
  overflow: "hidden",
  bg: "var(--cc-panel-solid)",
  bgImage:
    "radial-gradient(circle at 100% 0%, rgba(212, 176, 128, 0.12), transparent 45%), radial-gradient(circle at 0% 100%, rgba(232, 192, 148, 0.04), transparent 50%)",
  border: "1px solid rgba(232, 192, 148, 0.28)",
  borderRadius: "12px",
  boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(212, 176, 128, 0.08)",
  _before: {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    h: "1px",
    bgImage: "linear-gradient(90deg, transparent 0%, rgba(232, 192, 148, 0.9) 45%, rgba(212, 176, 128, 0.3) 100%)",
    pointerEvents: "none",
    zIndex: 1,
  },
} as const;

/** Kopfzeile im Modal: gesperrter Gold-Titel links, Schließen rechts. */
export function FunnelModalTopBar({ label, onClose }: { label: string; onClose: () => void }) {
  return (
    <HStack justify="space-between" align="center" spacing={3}>
      <Text
        minW={0}
        fontSize={{ base: "11px", md: "12px" }}
        fontWeight={500}
        letterSpacing="0.12em"
        textTransform="uppercase"
        color="var(--cc-gold-light)"
        lineHeight={1.4}
      >
        {label}
      </Text>
      <IconButton
        aria-label="Schließen"
        icon={<X size={18} strokeWidth={1.75} />}
        variant="ghost"
        size="sm"
        flexShrink={0}
        onClick={onClose}
        color="var(--cc-text-2)"
        borderRadius="8px"
        _hover={{ color: "var(--cc-text)", bg: "rgba(255, 255, 255, 0.06)" }}
      />
    </HStack>
  );
}

/** Zurück-Link im Modal-Fuß: leise, erst beim Hover sichtbar gerahmt. */
export const funnelBackButtonProps = {
  variant: "ghost",
  w: "full",
  size: "sm",
  color: "var(--cc-text-2)",
  fontWeight: 500,
  borderRadius: "8px",
  border: "1px solid transparent",
  _hover: { color: "var(--cc-text)", bg: "rgba(255, 255, 255, 0.04)", borderColor: "var(--cc-line-strong)" },
} as const;

/**
 * Pflicht-Hinweis vor der Bewerbung: Countdown, dann Gold-Button. Rot trägt hier
 * Bedeutung (endgültige Entscheidung) — als Haarlinie, Icon und zwei Schlüsselwörter.
 */
export function FunnelWarningOverlay({
  countdown,
  fadingOut,
  onDismiss,
  lead,
  readyLabel = "Ich habe verstanden, Bewerbung starten →",
  zIndex = 10,
}: {
  countdown: number;
  fadingOut: boolean;
  onDismiss: () => void;
  /** Erster Satz (je Funnel verschieden). */
  lead: string;
  readyLabel?: string;
  zIndex?: number;
}) {
  const canDismiss = countdown <= 0;
  const bodyText = { fontSize: { base: "14px", md: "16px" }, lineHeight: 1.7, color: "var(--cc-text-soft)" } as const;

  return (
    <Box
      position="absolute"
      inset={0}
      zIndex={zIndex}
      borderRadius="inherit"
      w="100%"
      minH="100%"
      h="100%"
      display="flex"
      flexDirection="column"
      alignItems="stretch"
      justifyContent="center"
      textAlign="center"
      px={6}
      pt={{ base: "max(24px, env(safe-area-inset-top, 0px))", md: 6 }}
      pb={{ base: "max(24px, env(safe-area-inset-bottom, 0px))", md: 6 }}
      overflowY="auto"
      overflowX="hidden"
      bg="rgba(21, 26, 30, 0.96)"
      bgImage="radial-gradient(ellipse 60% 40% at 50% 0%, rgba(248, 113, 113, 0.07), transparent 70%)"
      sx={{
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        animation: fadingOut ? "appWarningFadeOut 0.3s ease forwards" : undefined,
        _before: {
          content: '""',
          position: "absolute",
          top: 0,
          left: "12%",
          right: "12%",
          h: "1px",
          bgImage: "linear-gradient(90deg, transparent, rgba(248, 113, 113, 0.7), transparent)",
        },
      }}
    >
      <Box w="100%" maxW="100%" flexShrink={0} mx="auto">
        <Box
          w={{ base: "48px", md: "56px" }}
          h={{ base: "48px", md: "56px" }}
          borderRadius="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="rgba(248, 113, 113, 0.08)"
          border="1px solid rgba(248, 113, 113, 0.3)"
          color="var(--cc-danger)"
          mb={{ base: 3, md: 5 }}
          mx="auto"
          sx={{ animation: "appWarningPulse 2.5s ease-in-out infinite", ...noMotion }}
        >
          <AlertTriangle size={24} strokeWidth={1.75} aria-hidden />
        </Box>

        <Text
          fontSize="12px"
          fontWeight={600}
          letterSpacing="0.14em"
          textTransform="uppercase"
          color="var(--cc-danger)"
          mb={{ base: 3, md: 4 }}
        >
          Wichtige Mitteilung
        </Text>

        <Stack spacing={3} maxW="440px" mx="auto" mb={{ base: 5, md: 7 }}>
          <Text {...bodyText}>{lead}</Text>
          <Text {...bodyText}>Wir wählen alle Teilnehmer nach einer ausführlichen Auswertung aus!</Text>
          <Text {...bodyText}>
            Du hast eine{" "}
            <Box as="span" fontWeight={600} color="var(--cc-danger)">
              einmalige Chance
            </Box>{" "}
            dich zu bewerben, sofern wir dich ablehnen ist diese Entscheidung{" "}
            <Box as="span" fontWeight={600} color="var(--cc-danger)">
              final
            </Box>
            !
          </Text>
          <Text {...bodyText} fontWeight={600} color="var(--cc-text)">
            Nimm dir also Zeit und beantworte alle Fragen ausführlich!
          </Text>
        </Stack>

        <Button
          variant={canDismiss ? "gold" : "line"}
          className="cc-num"
          w="full"
          maxW="380px"
          mx="auto"
          display="flex"
          h="auto"
          minH={{ base: "44px", md: "48px" }}
          py={3}
          px={5}
          fontSize={{ base: "13px", md: "14px" }}
          whiteSpace="normal"
          lineHeight={1.35}
          isDisabled={!canDismiss}
          onClick={onDismiss}
          _disabled={{ opacity: 1, cursor: "not-allowed", color: "var(--cc-text-3)" }}
          sx={{
            "&:disabled:hover": {
              bg: "rgba(255, 255, 255, 0.02)",
              borderColor: "var(--cc-line-strong)",
              boxShadow: "none",
            },
          }}
        >
          {canDismiss ? readyLabel : `Bitte lies die Mitteilung sorgfältig… (${countdown}s)`}
        </Button>
      </Box>
    </Box>
  );
}

/** Gold-Kreis mit Haken (Bestätigungen). */
export function SuccessMark({ size = 64 }: { size?: number }) {
  return (
    <Box
      w={`${size}px`}
      h={`${size}px`}
      borderRadius="full"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
      bg="radial-gradient(circle at 50% 35%, rgba(232, 192, 148, 0.24), rgba(212, 176, 128, 0.06) 70%)"
      border="1px solid rgba(232, 192, 148, 0.45)"
      color="var(--cc-gold-light)"
      boxShadow="0 0 28px rgba(212, 176, 128, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
      position="relative"
      zIndex={1}
      aria-hidden
    >
      <Check size={Math.round(size * 0.42)} strokeWidth={2} />
    </Box>
  );
}

/** Bestätigung nach dem Absenden: Gold-Ringe, Stichpunkte, Weiterleitungsbalken. */
export function FunnelThanks({
  title,
  bullets,
  footer,
  fillSeconds,
}: {
  title: string;
  bullets: string[];
  footer: string;
  fillSeconds: number;
}) {
  const ring = {
    position: "absolute",
    inset: 0,
    borderRadius: "full",
    border: "1.5px solid",
  } as const;

  return (
    <Stack spacing={6} align="center" textAlign="center" py={6} role="status">
      <Box position="relative" w="80px" h="80px">
        <Box {...ring} borderColor="rgba(232, 192, 148, 0.3)" sx={{ animation: "appRipple 2.5s ease-out infinite", ...noMotion }} />
        <Box
          {...ring}
          borderColor="rgba(232, 192, 148, 0.2)"
          sx={{ animation: "appRipple 2.5s ease-out 0.8s infinite", ...noMotion }}
        />
        <SuccessMark size={80} />
      </Box>

      <FunnelHeadline as="h2" scale="md">
        {title}
      </FunnelHeadline>

      <Stack spacing={3} maxW="400px">
        {bullets.map((b) => (
          <HStack key={b} spacing={3} align="flex-start">
            <Box
              w="6px"
              h="6px"
              borderRadius="full"
              bg="var(--cc-gold-light)"
              boxShadow="0 0 8px rgba(232, 192, 148, 0.6)"
              mt="8px"
              flexShrink={0}
            />
            <Text fontSize="14px" color="var(--cc-text-soft)" textAlign="left" lineHeight={1.6}>
              {b}
            </Text>
          </HStack>
        ))}
      </Stack>

      <Stack spacing={2} w="full" maxW="300px" pt={2}>
        <Box h="3px" w="full" bg="rgba(255, 255, 255, 0.07)" borderRadius="full" overflow="hidden">
          <Box
            h="full"
            w="full"
            bg="var(--cc-gold)"
            bgImage="var(--cc-gold-bar)"
            borderRadius="full"
            boxShadow="0 0 10px rgba(212, 176, 128, 0.45)"
            sx={{ animation: `appRedirectFill ${fillSeconds}s linear forwards`, ...noMotion }}
          />
        </Box>
        <Text fontSize="12px" color="var(--cc-text-3)">
          {footer}
        </Text>
      </Stack>
    </Stack>
  );
}

/* ─────────────────────────── Medien ─────────────────────────── */

/** 16:9-Rahmen für Videos: 10px, Gold-Rand 28 %, Tiefenschatten mit Gold-Schein. */
export function FunnelVideoFrame({ children, ...rest }: BoxProps) {
  return (
    <Box
      maxW="768px"
      mx="auto"
      w="full"
      position="relative"
      borderRadius="10px"
      overflow="hidden"
      border="1px solid rgba(212, 176, 128, 0.28)"
      bg="var(--cc-panel-solid)"
      boxShadow="0 10px 28px rgba(0, 0, 0, 0.45), 0 0 60px rgba(212, 176, 128, 0.1)"
      sx={{ aspectRatio: "16 / 9" }}
      {...rest}
    >
      {children}
    </Box>
  );
}

/** Platzhalter ohne Video: warmer Gold-Schein, Play-Button im Gold-Verlauf. */
export function VideoPlaceholder({ label }: { label: string }) {
  return (
    <Box
      w="full"
      h="full"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={4}
      px={6}
      textAlign="center"
      bgImage="radial-gradient(ellipse 60% 70% at 50% 45%, rgba(212, 176, 128, 0.14), transparent 70%)"
    >
      <Box
        w={{ base: "56px", md: "64px" }}
        h={{ base: "56px", md: "64px" }}
        borderRadius="full"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="var(--cc-gold)"
        bgImage="var(--cc-gold-grad)"
        color="var(--cc-on-gold)"
        boxShadow="0 0 36px rgba(212, 176, 128, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.35)"
        aria-hidden
      >
        <Play size={24} fill="currentColor" strokeWidth={0} style={{ marginLeft: 3 }} />
      </Box>
      <Text fontSize="14px" color="var(--cc-text-2)">
        {label}
      </Text>
    </Box>
  );
}
