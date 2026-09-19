"use client";

import {
  Box,
  Button,
  Flex,
  Heading,
  Stack,
  Text,
  type BoxProps,
  type FlexProps,
  type HeadingProps,
} from "@chakra-ui/react";
import { ArrowRight, Lock, Play } from "lucide-react";
import { Children, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { RechtsLinks } from "@/components/legal/RechtsFusszeile";
import { GlassVideoPlayer } from "@/components/ui/GlassVideoPlayer";

/*
 * Bausteine der Marketing-Landingpages (/bewerbung, /insight) im Schema v3.2
 * „Champagner auf Graphit“ (DESIGN.md → Marketing). Farben nur über `--cc-*`;
 * rgba-Werte nur für Licht und Schatten der Champagner-Familie.
 */

/** Hero-Einstieg: steigt nacheinander auf, während der Splash nach oben fährt. */
export function heroRise(step: number): { className: string; style: CSSProperties } {
  return { className: "cc-rise", style: { animationDelay: `${420 + step * 90}ms` } };
}

/**
 * Steigt auf (`.cc-rise`), sobald der Block ins Bild scrollt. Was beim Mount
 * schon sichtbar ist, bleibt unberührt; bei reduzierter Bewegung passiert nichts.
 * Arbeitet direkt am DOM, damit kein Re-Render nötig ist.
 */
export function Reveal({ delay = 0, children, ...rest }: BoxProps & { delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    el.style.opacity = "0";
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        el.style.opacity = "";
        el.style.animationDelay = `${delay}ms`;
        el.classList.add("cc-rise");
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      el.style.opacity = "";
    };
  }, [delay]);

  return (
    <Box ref={ref} {...rest}>
      {children}
    </Box>
  );
}

/** Dachzeile über Abschnittsüberschriften: 12px, versal, gesperrt, Gold hell, mit Lichtstrichen. */
export function Eyebrow({ children, ...rest }: FlexProps) {
  return (
    <Flex align="center" justify="center" gap={3} {...rest}>
      <Box aria-hidden w="28px" h="1px" flexShrink={0} bg="linear-gradient(90deg, transparent, var(--cc-gold-line))" />
      <Text
        as="span"
        fontSize="12px"
        lineHeight="18px"
        fontWeight={600}
        letterSpacing="0.12em"
        textTransform="uppercase"
        color="var(--cc-gold-light)"
      >
        {children}
      </Text>
      <Box aria-hidden w="28px" h="1px" flexShrink={0} bg="linear-gradient(90deg, var(--cc-gold-line), transparent)" />
    </Flex>
  );
}

const DISPLAY_SIZES = {
  hero: "clamp(30px, 6.2vw, 58px)",
  section: "clamp(28px, 4.4vw, 44px)",
} as const;

/** Große Inter-Headline (700, eng gesperrt). Standard `h2`; `as="h1"` für den Seitenkopf. */
export function DisplayHeading({ tier = "section", ...rest }: HeadingProps & { tier?: keyof typeof DISPLAY_SIZES }) {
  return (
    <Heading
      as="h2"
      fontSize={DISPLAY_SIZES[tier]}
      fontWeight={700}
      lineHeight={1.1}
      letterSpacing="-0.02em"
      color="var(--cc-text)"
      overflowWrap="break-word"
      {...rest}
    />
  );
}

/** Einzelnes Akzentwort in Gold hell (Vollton, kein Verlauf). */
export function Accent({ children }: { children: ReactNode }) {
  return (
    <Box as="span" color="var(--cc-gold-light)">
      {children}
    </Box>
  );
}

/** Gold-Icon-Kachel für Marketing-Karten (DESIGN.md → Marketing). */
export function GoldIconTile({ children, size = 48 }: { children: ReactNode; size?: number }) {
  return (
    <Flex
      w={`${size}px`}
      h={`${size}px`}
      flexShrink={0}
      align="center"
      justify="center"
      borderRadius="12px"
      bg="radial-gradient(circle at 30% 20%, rgba(232, 192, 148, 0.22), rgba(212, 176, 128, 0.05) 70%)"
      border="1px solid rgba(212, 176, 128, 0.35)"
      color="var(--cc-gold-light)"
      boxShadow="0 0 22px rgba(212, 176, 128, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.08)"
      aria-hidden
    >
      {children}
    </Flex>
  );
}

export type OfferBullet = { text: string; icon: ReactNode };

type OfferCardProps = {
  index: number;
  icon: ReactNode;
  title: string;
  description: string;
  bullets: OfferBullet[];
  ctaLabel: string;
  onApply: () => void;
  /** Mindesthöhe von Titel + Text ab `md`, damit die Trennlinien in einer Reihe fluchten. */
  headMinH?: string;
};

/** Glas-Karte mit Nummer, Gold-Icon-Kachel, Titel, Text, Punkten und Funnel-Button. */
export function OfferCard({ index, icon, title, description, bullets, ctaLabel, onApply, headMinH }: OfferCardProps) {
  return (
    <Flex className="cc-card" direction="column" h="100%" p={{ base: 5, md: 6 }}>
      <Flex align="flex-start" justify="space-between" mb={5}>
        <GoldIconTile>{icon}</GoldIconTile>
        <Text
          as="span"
          className="cc-num"
          fontSize="13px"
          fontWeight={600}
          letterSpacing="0.12em"
          color="var(--cc-text-3)"
          aria-hidden
        >
          {String(index + 1).padStart(2, "0")}
        </Text>
      </Flex>

      <Box minH={headMinH ? { base: "auto", md: headMinH } : undefined}>
        <Heading
          as="h3"
          fontSize={{ base: "19px", md: "20px" }}
          fontWeight={600}
          lineHeight={1.3}
          letterSpacing="-0.01em"
          color="var(--cc-text)"
        >
          {title}
        </Heading>
        <Text mt={2} fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)">
          {description}
        </Text>
      </Box>

      <Box aria-hidden h="1px" my={5} bg="linear-gradient(90deg, rgba(212, 176, 128, 0.4), transparent)" />

      <Stack as="ul" role="list" listStyleType="none" spacing={3} flex="1">
        {bullets.map((b) => (
          <Flex as="li" key={b.text} align="flex-start" gap={3}>
            <Flex
              w="28px"
              h="28px"
              flexShrink={0}
              align="center"
              justify="center"
              borderRadius="8px"
              bg="var(--cc-gold-wash)"
              border="1px solid rgba(212, 176, 128, 0.22)"
              color="var(--cc-gold-light)"
              aria-hidden
            >
              {b.icon}
            </Flex>
            <Text pt="4px" fontSize="15px" lineHeight={1.45} fontWeight={500} color="var(--cc-text-soft)">
              {b.text}
            </Text>
          </Flex>
        ))}
      </Stack>

      <Button
        variant="line"
        alignSelf="flex-start"
        mt={6}
        onClick={onApply}
        color="var(--cc-gold-light)"
        borderColor="var(--cc-gold-line)"
        rightIcon={<ArrowRight size={16} strokeWidth={2} />}
        sx={{
          "& .chakra-button__icon": { transition: "transform 180ms var(--cc-ease)" },
          "&:hover .chakra-button__icon": { transform: "translateX(3px)" },
        }}
      >
        {ctaLabel}
      </Button>
    </Flex>
  );
}

/**
 * Kartenreihe: mobil ein wischbares Band (bis an den Rand), ab `md` ein
 * dreispaltiges Raster. Eine Liste statt zwei, damit nichts doppelt im DOM steht.
 */
export function CardRail({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <Box
      as="ul"
      role="list"
      aria-label={label}
      listStyleType="none"
      display={{ base: "flex", md: "grid" }}
      gridTemplateColumns={{ md: "repeat(3, minmax(0, 1fr))" }}
      gap={{ base: 4, md: 6 }}
      overflowX={{ base: "auto", md: "visible" }}
      mx={{ base: -4, md: 0 }}
      px={{ base: 4, md: 0 }}
      pt={{ base: 2, md: 0 }}
      pb={{ base: 6, md: 0 }}
      sx={{
        scrollSnapType: { base: "x mandatory", md: "none" },
        scrollPaddingInline: "16px",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      {Children.map(children, (child) => (
        <Box
          as="li"
          flexShrink={0}
          w={{ base: "82%", md: "auto" }}
          maxW={{ base: "340px", md: "none" }}
          sx={{ scrollSnapAlign: "start" }}
        >
          {child}
        </Box>
      ))}
    </Box>
  );
}

type VideoStageProps = {
  /** Leer = Platzhalter „Vorstellungsvideo folgt in Kürze“. */
  src?: string;
  /** Beschriftung des Gold-Buttons nach Videoende. */
  endedLabel: string;
  onApply: () => void;
  /** Zeigt unter dem Button den Hinweis zum erneuten Abspielen. */
  replayHint?: boolean;
};

/** Video-Bühne mit Champagner-Schein; nach Videoende Overlay mit Gold-CTA. */
export function VideoStage({ src, endedLabel, onApply, replayHint = false }: VideoStageProps) {
  const [ended, setEnded] = useState(false);

  return (
    <Box position="relative" w="full">
      <Box
        aria-hidden
        position="absolute"
        inset={{ base: "-10% -4%", md: "-14% -8%" }}
        zIndex={0}
        pointerEvents="none"
        bg="radial-gradient(ellipse 55% 55% at 50% 45%, rgba(212, 176, 128, 0.2), transparent 72%)"
        filter="blur(24px)"
      />
      <Box position="relative" zIndex={1}>
        {src ? (
          <>
            <GlassVideoPlayer src={src} autoPlay onEnded={() => setEnded(true)} />
            {ended ? (
              <Flex
                position="absolute"
                inset={0}
                zIndex={5}
                direction="column"
                align="center"
                justify="center"
                gap={4}
                px={4}
                textAlign="center"
                borderRadius="16px"
                bg="radial-gradient(circle at 50% 40%, rgba(29, 34, 40, 0.9), rgba(18, 23, 28, 0.95))"
                backdropFilter="blur(12px)"
              >
                <Text fontSize={{ base: "18px", md: "22px" }} fontWeight={600} letterSpacing="-0.01em" color="var(--cc-text)">
                  Bereit für den nächsten Schritt?
                </Text>
                <Button
                  variant="gold"
                  size="lg"
                  h="48px"
                  px={8}
                  fontSize="16px"
                  leftIcon={<Lock size={15} strokeWidth={2.25} />}
                  onClick={() => {
                    setEnded(false);
                    onApply();
                  }}
                >
                  {endedLabel}
                </Button>
                {replayHint ? (
                  <Text fontSize="12px" color="var(--cc-text-3)" mt={-1}>
                    Klicke um das Video erneut abzuspielen
                  </Text>
                ) : null}
              </Flex>
            ) : null}
          </>
        ) : (
          <Flex
            direction="column"
            align="center"
            justify="center"
            gap={4}
            borderRadius="16px"
            border="1px solid rgba(212, 176, 128, 0.28)"
            bg="radial-gradient(circle at 50% 42%, rgba(212, 176, 128, 0.12), transparent 60%), linear-gradient(180deg, rgba(27, 32, 38, 0.94), rgba(24, 29, 34, 0.94))"
            boxShadow="0 16px 56px rgba(0, 0, 0, 0.5), 0 0 36px rgba(212, 176, 128, 0.1)"
            sx={{ aspectRatio: "16 / 9" }}
          >
            <Flex
              w="64px"
              h="64px"
              align="center"
              justify="center"
              borderRadius="full"
              bg="var(--cc-gold-grad)"
              color="var(--cc-on-gold)"
              boxShadow="0 0 36px rgba(212, 176, 128, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.35)"
              aria-hidden
            >
              <Play size={24} fill="currentColor" strokeWidth={0} style={{ marginLeft: 3 }} />
            </Flex>
            <Text fontSize="14px" color="var(--cc-text-2)">
              Vorstellungsvideo folgt in Kürze
            </Text>
          </Flex>
        )}
      </Box>
    </Box>
  );
}

/** Splash beim Laden: Graphit, Champagner-Licht, Logo und Gold-Balken; fährt nach oben weg. */
export function LandingSplash({ loading }: { loading: boolean }) {
  return (
    <Flex
      position="fixed"
      inset={0}
      zIndex={9999}
      direction="column"
      align="center"
      justify="center"
      gap={5}
      bg="var(--cc-bg)"
      pointerEvents={loading ? "auto" : "none"}
      aria-hidden={!loading}
      sx={{
        transition: "transform 450ms cubic-bezier(0.4, 0, 0.2, 1), opacity 350ms ease",
        transform: loading ? "translateY(0)" : "translateY(-100%)",
        opacity: loading ? 1 : 0,
      }}
    >
      <Box className="cc-goldlight" aria-hidden />
      <Box position="relative" zIndex={1}>
        <Logo variant="onDark" width={200} height={56} priority />
      </Box>
      <Box position="relative" zIndex={1} w="120px" h="3px" borderRadius="full" bg="var(--cc-track)" overflow="hidden">
        <Box
          h="full"
          borderRadius="full"
          sx={{
            background: "var(--cc-gold-bar)",
            boxShadow: "0 0 10px rgba(212, 176, 128, 0.45)",
            animation: "splashProgress 300ms linear forwards",
            "@keyframes splashProgress": {
              "0%": { width: "0%" },
              "100%": { width: "100%" },
            },
          }}
        />
      </Box>
    </Flex>
  );
}

/** Blendet auf Funnel-Seiten Plattform-Navigation aus und reserviert Platz für den mobilen CTA-Balken. */
export function LandingChromeStyles() {
  return (
    <style>{`
      nav[aria-label], header[role="banner"], [data-platform-nav], [data-topbar] {
        display: none !important;
      }
      body {
        padding-top: 0 !important;
        margin-top: 0 !important;
        padding-bottom: 120px;
      }
      @media (min-width: 768px) {
        body { padding-bottom: 0; }
      }
    `}</style>
  );
}

/** Rechtlicher Abschluss der Funnel-Seiten. */
export function LandingFooter({ applicationNote = false }: { applicationNote?: boolean }) {
  return (
    <Box as="footer" py={10} px={{ base: 4, md: 8 }} textAlign="center" borderTop="1px solid var(--cc-line)">
      <Stack spacing={2}>
        <Text fontSize="12px" color="var(--cc-text-3)" maxW="560px" mx="auto" lineHeight={1.7}>
          {applicationNote ? "Mit dem Abschicken der Bewerbung stimmst du unserer Datenschutzerklärung zu. " : null}
          Trading und Investitionen sind mit erheblichen Verlustrisiken verbunden. Frühere Ergebnisse sind keine Garantie
          für zukünftige Gewinne.
        </Text>
        <Text fontSize="12px" color="var(--cc-text-3)" className="cc-num">
          © {new Date().getFullYear()} Capital Circle Institut
        </Text>
        {/* Impressum · Datenschutz · AGB · Widerruf · Verträge hier kündigen */}
        <RechtsLinks pt={2} maxW="720px" mx="auto" />
      </Stack>
    </Box>
  );
}
