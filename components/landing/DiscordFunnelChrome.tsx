"use client";

import { Box, Flex, HStack, Stack, Text, type StackProps } from "@chakra-ui/react";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";

/**
 * Gemeinsamer Rahmen der Funnel-Seiten (/discord, /discord/termin, /termin, /video)
 * nach DESIGN.md v3.2 „Champagner auf Graphit“: Graphitgrund mit Sternenfeld und
 * Champagner-Licht, Splash, Footer, Dachzeile, Gold-Icon-Kachel, Gold-Wort.
 */

/** Label-Schnitt (13px, 500, 0.12em, versal) in Gold hell — Dachzeilen und Formular-Titel. */
export const funnelLabelProps = {
  fontSize: "13px",
  lineHeight: "18px",
  fontWeight: 500,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "var(--cc-gold-light)",
};

/** Blendet die globale Navigation aus; `mobileCta` hält unten Platz für die feste CTA-Leiste frei. */
export function FunnelPageStyles({ mobileCta = false }: { mobileCta?: boolean }) {
  const mobilePadding = mobileCta
    ? `
        body { padding-bottom: 120px; }
        @media (min-width: 768px) {
          body { padding-bottom: 0; }
        }`
    : "";
  return (
    <style>{`
        nav[aria-label], header[role="banner"], [data-platform-nav], [data-topbar] {
          display: none !important;
        }
        body {
          padding-top: 0 !important;
          margin-top: 0 !important;
          background: var(--cc-bg) !important;
        }${mobilePadding}
      `}</style>
  );
}

/** Splash (300 ms): Wortmarke und ein Gold-Balken, der sich einmal füllt; gleitet danach nach oben. */
export function FunnelSplash({ visible }: { visible: boolean }) {
  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={9999}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={5}
      bg="var(--cc-bg)"
      aria-hidden
      pointerEvents={visible ? "auto" : "none"}
      sx={{
        backgroundImage:
          "radial-gradient(ellipse 55% 42% at 80% -6%, rgba(212, 176, 128, 0.17), transparent 70%)",
        transition: "transform 450ms cubic-bezier(0.4, 0, 0.2, 1), opacity 350ms ease",
        transform: visible ? "translateY(0)" : "translateY(-100%)",
        opacity: visible ? 1 : 0,
        "@media (prefers-reduced-motion: reduce)": { transition: "opacity 200ms ease" },
      }}
    >
      <Logo variant="onDark" width={200} />
      <Box w="120px" h="3px" borderRadius="full" bg="rgba(255, 255, 255, 0.07)" overflow="hidden">
        <Box
          h="full"
          borderRadius="full"
          bg="var(--cc-gold-bar)"
          boxShadow="0 0 10px rgba(212, 176, 128, 0.45)"
          sx={{
            animation: "splashProgress 300ms linear forwards",
            "@keyframes splashProgress": {
              "0%": { width: "0%" },
              "100%": { width: "100%" },
            },
          }}
        />
      </Box>
    </Box>
  );
}

/**
 * Seitengrund: Graphit mit Sternenfeld und Champagner-Licht (beide `fixed`).
 * `overflow-x: clip` statt `hidden`, damit `position: sticky` im Inhalt greift.
 */
export function FunnelGround({ children }: { children: ReactNode }) {
  return (
    <Box minH="100vh" w="full" bg="var(--cc-bg)" color="var(--cc-text)" position="relative" overflowX="clip">
      <Box className="cc-stars" aria-hidden />
      <Box className="cc-goldlight" aria-hidden />
      <Box position="relative" zIndex={1}>
        {children}
      </Box>
    </Box>
  );
}

/** Weicher Champagner-Schein hinter dem Hero plus auslaufende Gold-Linie an der Oberkante. */
export function FunnelHeroGlow() {
  return (
    <>
      <Box
        position="absolute"
        inset={0}
        zIndex={0}
        pointerEvents="none"
        aria-hidden
        bg="radial-gradient(ellipse 70% 55% at 50% 18%, rgba(212, 176, 128, 0.09), transparent 62%)"
      />
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        h="1px"
        zIndex={1}
        pointerEvents="none"
        aria-hidden
        bg="linear-gradient(90deg, transparent 5%, rgba(232, 192, 148, 0.4) 50%, transparent 95%)"
      />
    </>
  );
}

/** Einzelnes Wort einer Headline in Gold hell (kein Verlaufstext). */
export function GoldWord({ children }: { children: ReactNode }) {
  return (
    <Box as="span" color="var(--cc-gold-light)">
      {children}
    </Box>
  );
}

/** Gold-Icon-Kachel für Marketing-Karten (DESIGN.md → Marketing). */
export function GoldIconTile({
  children,
  size = 40,
  radius = "10px",
}: {
  children: ReactNode;
  size?: number;
  radius?: string;
}) {
  return (
    <Flex
      w={`${size}px`}
      h={`${size}px`}
      flexShrink={0}
      align="center"
      justify="center"
      borderRadius={radius}
      border="1px solid rgba(212, 176, 128, 0.35)"
      bg="var(--cc-gold-wash)"
      color="var(--cc-gold-light)"
      boxShadow="inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 0 16px rgba(212, 176, 128, 0.1)"
      aria-hidden
    >
      {children}
    </Flex>
  );
}

/** Dachzeile einer Sektion mit auslaufenden Gold-Linien links und rechts. */
export function FunnelEyebrow({ children, justify = "center" }: { children: ReactNode; justify?: StackProps["justify"] }) {
  return (
    <HStack justify={justify} spacing={3}>
      <Box w="28px" h="1px" bg="linear-gradient(90deg, transparent, rgba(232, 192, 148, 0.7))" aria-hidden />
      <Text {...funnelLabelProps}>{children}</Text>
      <Box w="28px" h="1px" bg="linear-gradient(90deg, rgba(232, 192, 148, 0.7), transparent)" aria-hidden />
    </HStack>
  );
}

/** Überschrift über dem Funnel-Video (/discord/termin, /termin, /video). */
export function FunnelVideoHeadline() {
  return (
    <Text
      as="h1"
      fontSize={{ base: "24px", sm: "28px", md: "32px", lg: "36px" }}
      fontWeight={600}
      lineHeight="1.2"
      letterSpacing="-0.01em"
      color="var(--cc-text)"
      textAlign="center"
      maxW="760px"
    >
      Schau dieses Video — es zeigt warum <GoldWord>90% der Trader scheitern</GoldWord> und wie das Capital
      Circle Framework <GoldWord>das ändert</GoldWord>.
    </Text>
  );
}

/** Platzhalter, solange keine Video-URL konfiguriert ist. */
export function FunnelVideoPlaceholder() {
  return (
    <Flex className="cc-card cc-card--still" align="center" justify="center" sx={{ aspectRatio: "16 / 9" }}>
      <Text fontSize="14px" color="var(--cc-text-3)">
        Vorstellungsvideo folgt in Kürze
      </Text>
    </Flex>
  );
}

/** Rechtlicher Hinweis am Seitenende. */
export function FunnelFooter({ children, lock = true }: { children: ReactNode; lock?: boolean }) {
  return (
    <Box as="footer" pt={8} pb={10} px={{ base: 4, md: 8 }} textAlign="center" borderTop="1px solid var(--cc-line)">
      <Stack spacing={2} maxW="560px" mx="auto">
        <Text fontSize="12px" color="var(--cc-text-3)" lineHeight="1.7">
          {children}
        </Text>
        <HStack justify="center" spacing={1.5} color="var(--cc-text-3)">
          {lock ? <Lock size={11} strokeWidth={2} aria-hidden /> : null}
          <Text fontSize="12px" className="cc-num">
            © {new Date().getFullYear()} Capital Circle Institut
          </Text>
        </HStack>
      </Stack>
    </Box>
  );
}
