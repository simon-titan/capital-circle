"use client";

import { Box, Button, Flex, HStack, Stack, Text } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, Phone, User, Check } from "lucide-react";
import { FaDiscord } from "react-icons/fa6";
import { Logo } from "@/components/brand/Logo";
import { DiscordCasesSection } from "./DiscordCasesSection";
import { DiscordConnectModal } from "@/components/marketing/DiscordConnectModal";
import {
  FunnelFooter,
  FunnelGround,
  FunnelHeroGlow,
  FunnelPageStyles,
  FunnelSplash,
  GoldIconTile,
  GoldWord,
  funnelLabelProps,
} from "./DiscordFunnelChrome";

/* ── Tracking helpers ───────────────────────────────────────────────────── */

interface FunnelTracking {
  session_id: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
}

function getOrCreateSessionId(): string {
  try {
    const existing = sessionStorage.getItem("cc_discord_sid");
    if (existing) return existing;
    const newId = crypto.randomUUID();
    sessionStorage.setItem("cc_discord_sid", newId);
    return newId;
  } catch {
    return "unknown";
  }
}

function readTracking(): FunnelTracking {
  let utm: Record<string, string | null> = {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
  };
  let referrer: string | null = null;
  try {
    const params = new URLSearchParams(window.location.search);
    utm = {
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_content: params.get("utm_content"),
      utm_term: params.get("utm_term"),
    };
    referrer = document.referrer || null;
  } catch {
    // window/document nicht verfügbar
  }
  return {
    session_id: getOrCreateSessionId(),
    utm_source: utm.utm_source,
    utm_medium: utm.utm_medium,
    utm_campaign: utm.utm_campaign,
    utm_content: utm.utm_content,
    utm_term: utm.utm_term,
    referrer,
  };
}

/* ── Lead Form ──────────────────────────────────────────────────────────── */

/** Eingabe nach DESIGN.md: 3 % Weiß, kräftige Haarlinie, Radius 8, Fokus mit Gold-Haarlinie. */
const inputSx = {
  background: "rgba(255, 255, 255, 0.03)",
  border: "1px solid var(--cc-line-strong)",
  borderRadius: "8px",
  color: "var(--cc-text)",
  width: "100%",
  height: "48px",
  paddingLeft: "44px",
  paddingRight: "16px",
  fontSize: "15px",
  outline: "none",
  transition: "border-color 180ms var(--cc-ease), box-shadow 180ms var(--cc-ease)",
  _placeholder: { color: "var(--cc-text-3)" },
  _hover: { borderColor: "rgba(255, 255, 255, 0.24)" },
  _focus: {
    borderColor: "var(--cc-gold-line)",
    boxShadow: "0 0 0 1px var(--cc-gold-line)",
  },
  _disabled: { opacity: 0.6, cursor: "not-allowed" },
} as const;

function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <Box
      position="absolute"
      left="14px"
      top="50%"
      transform="translateY(-50%)"
      pointerEvents="none"
      color="var(--cc-text-2)"
      display="flex"
      alignItems="center"
      aria-hidden
    >
      {children}
    </Box>
  );
}

function LeadForm({
  trackingRef,
  onSuccess,
}: {
  trackingRef: React.MutableRefObject<FunnelTracking | null>;
  onSuccess: (token: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError("Bitte fülle alle Felder aus.");
      return;
    }

    setLoading(true);
    try {
      const tracking = trackingRef.current ?? readTracking();
      const res = await fetch("/api/discord-funnel/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          session_id: tracking.session_id,
          utm_source: tracking.utm_source,
          utm_medium: tracking.utm_medium,
          utm_campaign: tracking.utm_campaign,
          utm_content: tracking.utm_content,
          utm_term: tracking.utm_term,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | { ok: boolean; token?: string; error?: string }
        | null;

      if (!res.ok || !data?.ok || !data.token) {
        setError(data?.error ?? "Etwas ist schiefgelaufen. Bitte versuche es erneut.");
        setLoading(false);
        return;
      }

      setLoading(false);
      onSuccess(data.token);
    } catch {
      setError("Netzwerkfehler. Bitte versuche es erneut.");
      setLoading(false);
    }
  };

  return (
    <Box
      as="form"
      id="discord-lead-form"
      onSubmit={onSubmit}
      aria-labelledby="discord-lead-title"
      className="cc-card cc-card--hero cc-card--still"
      p={{ base: 5, md: 7 }}
      w="full"
      maxW="480px"
      mx="auto"
    >
      <Stack spacing={3} mb={5} textAlign="center" align="center">
        {/* Discord-Marke neutral statt Lila */}
        <Flex
          w="52px"
          h="52px"
          borderRadius="full"
          align="center"
          justify="center"
          color="var(--cc-text)"
          bg="rgba(255, 255, 255, 0.04)"
          border="1px solid var(--cc-line-strong)"
          boxShadow="inset 0 1px 0 rgba(255, 255, 255, 0.06)"
          aria-hidden
        >
          <FaDiscord size={24} />
        </Flex>
        <Text {...funnelLabelProps}>Kostenloser Discord Zugang</Text>
        <Text
          as="h2"
          id="discord-lead-title"
          fontSize={{ base: "20px", md: "22px" }}
          fontWeight={600}
          lineHeight="1.25"
          letterSpacing="-0.01em"
          color="var(--cc-text)"
        >
          Sichere dir jetzt deinen Discord Zugang
        </Text>
      </Stack>

      <Stack spacing={3}>
        <Box position="relative">
          <FieldIcon>
            <User size={18} strokeWidth={1.75} />
          </FieldIcon>
          <Box
            as="input"
            type="text"
            name="name"
            aria-label="Name"
            placeholder="Name"
            autoComplete="name"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            required
            disabled={loading}
            sx={inputSx}
          />
        </Box>

        <Box position="relative">
          <FieldIcon>
            <Mail size={18} strokeWidth={1.75} />
          </FieldIcon>
          <Box
            as="input"
            type="email"
            name="email"
            aria-label="Email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            required
            disabled={loading}
            sx={inputSx}
          />
        </Box>

        <Box position="relative">
          <FieldIcon>
            <Phone size={18} strokeWidth={1.75} />
          </FieldIcon>
          <Box
            as="input"
            type="tel"
            name="phone"
            aria-label="Telefon"
            placeholder="Telefon"
            autoComplete="tel"
            value={phone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
            required
            disabled={loading}
            sx={inputSx}
          />
        </Box>

        {error && (
          <Text role="alert" fontSize="14px" color="var(--cc-danger)" textAlign="center" lineHeight="1.4">
            {error}
          </Text>
        )}

        <Button
          type="submit"
          variant="gold"
          w="full"
          h="48px"
          mt={1}
          fontSize="15px"
          letterSpacing="0.02em"
          isLoading={loading}
          loadingText="Wird gesendet…"
          leftIcon={<FaDiscord size={18} aria-hidden />}
        >
          DISCORD JETZT JOINEN
        </Button>

        <Text fontSize="12px" color="var(--cc-text-3)" textAlign="center" letterSpacing="0.03em">
          100% kostenlos · Kein Risiko · Sofortiger Zugang
        </Text>
      </Stack>
    </Box>
  );
}

/* ── Trust-Punkt (Desktop, linke Hero-Spalte) ───────────────────────────── */

function TrustItem({ children }: { children: React.ReactNode }) {
  return (
    <HStack as="li" spacing={3} align="center">
      <Flex
        w="22px"
        h="22px"
        borderRadius="full"
        flexShrink={0}
        align="center"
        justify="center"
        color="var(--cc-gold-light)"
        bg="var(--cc-gold-wash)"
        border="1px solid rgba(212, 176, 128, 0.4)"
        boxShadow="0 0 12px rgba(212, 176, 128, 0.16)"
        aria-hidden
      >
        <Check size={13} strokeWidth={2.5} />
      </Flex>
      <Text fontSize="16px" color="var(--cc-text-soft)">
        {children}
      </Text>
    </HStack>
  );
}

/* ── Urgency Badge (über dem Formular) ──────────────────────────────────── */

function UrgencyBadge() {
  return (
    <HStack
      spacing={2.5}
      px={4}
      py={2}
      borderRadius="full"
      maxW="full"
      bg="var(--cc-gold-wash)"
      border="1px solid rgba(212, 176, 128, 0.35)"
      boxShadow="0 0 22px rgba(212, 176, 128, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
    >
      {/* Live-Punkt wie in der Plattform: Gold hell mit Ring (`.cc-ping`, Reduced Motion in globals.css) */}
      <Box as="span" display="block" position="relative" w="8px" h="8px" flexShrink={0} aria-hidden>
        <Box as="span" className="cc-ping" position="absolute" inset={0} borderRadius="full" bg="var(--cc-gold-light)" />
        <Box
          as="span"
          position="absolute"
          inset={0}
          borderRadius="full"
          bg="var(--cc-gold-light)"
          boxShadow="0 0 10px rgba(232, 192, 148, 0.8)"
        />
      </Box>
      <Text
        fontSize={{ base: "12px", md: "13px" }}
        fontWeight={500}
        color="var(--cc-text)"
        textTransform="uppercase"
        letterSpacing="0.12em"
        lineHeight="1.3"
      >
        Nur kurze Zeit verfügbar
      </Text>
    </HStack>
  );
}

/* ── Joined Success Card (nach Discord-Connect) ─────────────────────────── */

function JoinedCard() {
  return (
    <Box
      className="cc-card cc-card--hero cc-card--still"
      role="status"
      p={{ base: 6, md: 8 }}
      w="full"
      maxW="480px"
      mx="auto"
      textAlign="center"
    >
      <Stack spacing={4} align="center">
        <GoldIconTile size={60} radius="9999px">
          <Check size={28} strokeWidth={2.25} />
        </GoldIconTile>
        <Stack spacing={2}>
          <Text
            as="h2"
            fontSize={{ base: "20px", md: "22px" }}
            fontWeight={600}
            letterSpacing="-0.01em"
            color="var(--cc-text)"
          >
            Du bist drin!
          </Text>
          <Text fontSize="15px" color="var(--cc-text-2)" lineHeight="1.6">
            Dein Zugang ist freigeschaltet. Schau jetzt in Discord vorbei, dort
            findest du alle nächsten Schritte und deinen Termin Link.
          </Text>
        </Stack>
      </Stack>
    </Box>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────── */

export function DiscordLandingClient() {
  const [loading, setLoading] = useState(true);
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const trackingRef = useRef<FunnelTracking | null>(null);

  // Erfolgs-State nach dem Discord-Connect (Redirect von discord-callback → ?discord=joined).
  const searchParams = useSearchParams();
  const joined = searchParams.get("discord") === "joined";

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Visit-Tracking: einmal pro Mount feuern.
  useEffect(() => {
    const tracking = readTracking();
    trackingRef.current = tracking;
    try {
      fetch("/api/discord-funnel/visit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session_id: tracking.session_id,
          utm_source: tracking.utm_source,
          utm_medium: tracking.utm_medium,
          utm_campaign: tracking.utm_campaign,
          utm_content: tracking.utm_content,
          utm_term: tracking.utm_term,
          referrer: tracking.referrer,
        }),
      }).catch(() => undefined);
    } catch {
      // Tracking-Fehler still ignorieren
    }
  }, []);

  return (
    <>
      <FunnelSplash visible={loading} />
      <FunnelPageStyles />

      <FunnelGround>
        {/* ── Hero ─────────────────────────────────────────── */}
        <Box
          as="section"
          w="100%"
          position="relative"
          pt={{ base: 8, md: 14 }}
          pb={{ base: 10, md: 16 }}
          px={{ base: 4, md: 8, lg: 12 }}
        >
          <FunnelHeroGlow />

          <Box maxW="1160px" mx="auto" position="relative" zIndex={2}>
            <Stack spacing={{ base: 8, lg: 12 }}>
              {/* Wortmarke zentriert über dem Grid */}
              <Box display="flex" justifyContent="center">
                <Logo variant="onDark" width={200} />
              </Box>

              {/* Desktop: 2 Spalten (Text links, Formular rechts) · Mobile: gestapelt */}
              <Box
                display={{ base: "flex", lg: "grid" }}
                flexDirection="column"
                alignItems="center"
                sx={{ gridTemplateColumns: { lg: "1fr 460px" } }}
                gap={{ base: 8, lg: 16 }}
              >
                {/* Text-Spalte */}
                <Stack
                  className="cc-rise"
                  spacing={{ base: 5, lg: 7 }}
                  align={{ base: "center", lg: "flex-start" }}
                  textAlign={{ base: "center", lg: "left" }}
                  maxW={{ base: "660px", lg: "none" }}
                >
                  <Text
                    as="h1"
                    fontSize={{ base: "30px", sm: "34px", md: "42px", lg: "52px" }}
                    fontWeight={600}
                    lineHeight="1.1"
                    letterSpacing="-0.01em"
                    color="var(--cc-text)"
                  >
                    Lerne wie du innerhalb weniger Wochen deinen ersten <GoldWord>Payout</GoldWord> erzielst
                  </Text>

                  <Text fontSize={{ base: "16px", md: "18px" }} color="var(--cc-text-2)" maxW="540px" lineHeight="1.5">
                    Während andere für dieses Wissen hunderte Euro zahlen,
                    bekommst du es hier{" "}
                    <Box as="strong" color="var(--cc-text)" fontWeight={600}>
                      kostenlos.
                    </Box>
                  </Text>

                  {/* Trust-Punkte (nur Desktop) */}
                  <Stack as="ul" listStyleType="none" m={0} p={0} display={{ base: "none", lg: "flex" }} spacing={3.5} pt={1}>
                    <TrustItem>100% kostenlos, kein Risiko</TrustItem>
                    <TrustItem>Sofortiger Zugang zur Discord Community</TrustItem>
                    <TrustItem>Bewährte Strategie für deinen ersten Payout</TrustItem>
                  </Stack>
                </Stack>

                {/* Formular-Spalte */}
                <Box
                  w="full"
                  maxW="460px"
                  mx={{ base: "auto", lg: "0" }}
                  className="cc-rise"
                  style={{ animationDelay: "150ms" }}
                >
                  {joined ? (
                    <JoinedCard />
                  ) : (
                    <Stack spacing={5} align="center" w="full">
                      <UrgencyBadge />
                      <LeadForm trackingRef={trackingRef} onSuccess={(token) => setConnectToken(token)} />
                    </Stack>
                  )}
                </Box>
              </Box>
            </Stack>
          </Box>
        </Box>

        {/* ── Echte Ergebnisse (Cases, direkt unter dem Formular) ── */}
        <DiscordCasesSection />

        {/* ── Footer disclaimer ────────────────────────────── */}
        <FunnelFooter lock={false}>
          Trading und Investitionen sind mit erheblichen Verlustrisiken
          verbunden. Frühere Ergebnisse sind keine Garantie für
          zukünftige Gewinne.
        </FunnelFooter>
      </FunnelGround>

      {connectToken && <DiscordConnectModal token={connectToken} onClose={() => setConnectToken(null)} />}
    </>
  );
}
