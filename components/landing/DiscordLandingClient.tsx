"use client";

import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, Phone, User, Check } from "lucide-react";
import { FaDiscord } from "react-icons/fa6";
import { Logo } from "@/components/brand/Logo";
import { DiscordCasesSection } from "./DiscordCasesSection";
import { DiscordConnectModal } from "@/components/marketing/DiscordConnectModal";

/* ── Farb-Akzente (Discord-Funnel): Aqua-Akzent + Discord-Lila ──────────── */
// Akzent (Buttons, Glows, Text-Highlights)
const ACCENT = "#47F7DC";
// Discord-Brand-Lila (nur das Discord-Icon)
const DISCORD_PURPLE = "#5865F2";

/* ── Accent CTA button style (#16cc9b, ausgeblichener Verlauf) ──────────── */
const accentCtaSx = {
  background: "linear-gradient(135deg, #16cc9b 0%, #5FE6C6 100%)",
  boxShadow:
    "0 0 30px rgba(22,204,155,0.40), 0 4px 16px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.28)",
  border: "none",
  cursor: "pointer",
  transition: "all 220ms cubic-bezier(0.16, 1, 0.3, 1)",
  _hover: {
    background: "linear-gradient(135deg, #1AE0AC 0%, #82EFD6 100%)",
    boxShadow:
      "0 0 50px rgba(22,204,155,0.55), 0 6px 22px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.36)",
    transform: "translateY(-1px)",
  },
  _active: {
    transform: "translateY(0px)",
    boxShadow: "0 0 20px rgba(22,204,155,0.32)",
  },
};

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

const inputSx = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.45)",
  borderRadius: "12px",
  color: "#F0F0F2",
  width: "100%",
  height: "52px",
  paddingLeft: "44px",
  paddingRight: "16px",
  fontSize: "15px",
  outline: "none",
  transition: "border-color 180ms ease, box-shadow 180ms ease",
  _placeholder: { color: "rgba(255,255,255,0.35)" },
  _focus: {
    borderColor: "rgba(255,255,255,0.85)",
    boxShadow: "0 0 0 3px rgba(255,255,255,0.12)",
  },
} as const;

function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <Box
      position="absolute"
      left="14px"
      top="50%"
      transform="translateY(-50%)"
      pointerEvents="none"
      color="rgba(255,255,255,0.85)"
      display="flex"
      alignItems="center"
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
      borderRadius="20px"
      p={{ base: 5, md: 7 }}
      w="full"
      maxW="480px"
      mx="auto"
      sx={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.60)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow:
          "0 16px 56px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.12)",
      }}
    >
      <Box
        h="2px"
        mb={5}
        mx={-7}
        mt={-7}
        sx={{
          background:
            "linear-gradient(90deg, transparent 4%, #5865F2 28%, #47F7DC 72%, transparent 96%)",
          borderRadius: "20px 20px 0 0",
        }}
        display={{ base: "none", md: "block" }}
      />

      <Stack spacing={3} mb={5} textAlign="center" align="center">
        <Box
          w="52px"
          h="52px"
          borderRadius="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
          color={DISCORD_PURPLE}
          sx={{
            background:
              "radial-gradient(circle at 50% 40%, rgba(88,101,242,0.22), rgba(88,101,242,0.05) 70%)",
            border: "1px solid rgba(88,101,242,0.50)",
            boxShadow:
              "0 0 24px rgba(88,101,242,0.40), inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
        >
          <FaDiscord size={26} />
        </Box>
        <Text
          fontSize="xs"
          letterSpacing="0.22em"
          textTransform="uppercase"
          color={DISCORD_PURPLE}
          className="inter-semibold"
        >
          Kostenloser Discord Zugang
        </Text>
        <Text
          fontSize={{ base: "lg", md: "xl" }}
          className="inter-bold"
          color="var(--color-text-primary, #F0F0F2)"
          lineHeight="1.25"
        >
          Sichere dir jetzt deinen Discord Zugang
        </Text>
      </Stack>

      <Stack spacing={4}>
        <Box position="relative">
          <FieldIcon>
            <User size={18} strokeWidth={1.75} />
          </FieldIcon>
          <Box
            as="input"
            type="text"
            name="name"
            placeholder="Name"
            autoComplete="name"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            required
            disabled={loading}
            className="inter"
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
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="inter"
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
            placeholder="Telefon"
            autoComplete="tel"
            value={phone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
            required
            disabled={loading}
            className="inter"
            sx={inputSx}
          />
        </Box>

        {error && (
          <Text
            fontSize="sm"
            color="#FF6B6B"
            className="inter"
            textAlign="center"
            lineHeight="1.4"
          >
            {error}
          </Text>
        )}

        <Box
          as="button"
          type="submit"
          disabled={loading}
          w="full"
          minH="52px"
          borderRadius="12px"
          fontWeight="600"
          fontSize="15px"
          letterSpacing="0.02em"
          color="#000000"
          display="flex"
          alignItems="center"
          justifyContent="center"
          gap={2}
          className="inter-semibold"
          sx={{
            ...accentCtaSx,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? (
            <>
              <Box
                w="16px"
                h="16px"
                borderRadius="full"
                border="2px solid rgba(0,0,0,0.30)"
                borderTopColor="#000000"
                sx={{
                  animation: "spin 700ms linear infinite",
                  "@keyframes spin": { to: { transform: "rotate(360deg)" } },
                }}
              />
              Wird gesendet…
            </>
          ) : (
            <>
              <FaDiscord size={18} />
              DISCORD JETZT JOINEN
            </>
          )}
        </Box>

        <Text
          fontSize="11px"
          color="rgba(255,255,255,0.32)"
          className="inter"
          textAlign="center"
          letterSpacing="0.03em"
        >
          100% kostenlos · Kein Risiko · Sofortiger Zugang
        </Text>
      </Stack>
    </Box>
  );
}

/* ── Trust-Punkt (Desktop, linke Hero-Spalte) ───────────────────────────── */

function TrustItem({ children }: { children: React.ReactNode }) {
  return (
    <HStack spacing={3} align="center">
      <Box
        w="22px"
        h="22px"
        borderRadius="full"
        flexShrink={0}
        display="flex"
        alignItems="center"
        justifyContent="center"
        color="#47F7DC"
        sx={{
          background: "rgba(71,247,220,0.10)",
          border: "1px solid rgba(71,247,220,0.40)",
          boxShadow: "0 0 12px rgba(71,247,220,0.20)",
        }}
      >
        <Check size={13} strokeWidth={3} />
      </Box>
      <Text className="inter" fontSize="md" color="rgba(255,255,255,0.78)">
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
      sx={{
        background: "rgba(71,247,220,0.07)",
        border: "1px solid rgba(71,247,220,0.38)",
        boxShadow:
          "0 0 26px rgba(71,247,220,0.20), inset 0 1px 0 rgba(255,255,255,0.06)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <Box
        as="span"
        w="8px"
        h="8px"
        borderRadius="full"
        flexShrink={0}
        sx={{
          background: "#47F7DC",
          boxShadow: "0 0 10px rgba(71,247,220,0.95)",
          animation: "ub-pulse 1.6s ease-in-out infinite",
          "@keyframes ub-pulse": {
            "0%,100%": { opacity: 1, transform: "scale(1)" },
            "50%": { opacity: 0.4, transform: "scale(0.7)" },
          },
        }}
      />
      <Text
        fontSize={{ base: "xs", md: "sm" }}
        className="inter-semibold"
        color="#FFFFFF"
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
      borderRadius="20px"
      p={{ base: 6, md: 8 }}
      w="full"
      maxW="480px"
      mx="auto"
      textAlign="center"
      sx={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(71,247,220,0.30)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow:
          "0 16px 56px rgba(0,0,0,0.65), 0 0 0 1px rgba(71,247,220,0.10), 0 0 52px rgba(71,247,220,0.10)",
      }}
    >
      <Stack spacing={4} align="center">
        <Box
          w="60px"
          h="60px"
          borderRadius="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
          color={ACCENT}
          sx={{
            background:
              "radial-gradient(circle at 50% 40%, rgba(71,247,220,0.22), rgba(71,247,220,0.05) 70%)",
            border: "1px solid rgba(71,247,220,0.50)",
            boxShadow: "0 0 26px rgba(71,247,220,0.35), inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
        >
          <Check size={28} strokeWidth={2.5} />
        </Box>
        <Stack spacing={2}>
          <Text
            className="inter-bold"
            fontSize={{ base: "lg", md: "xl" }}
            color="var(--color-text-primary, #F0F0F2)"
          >
            Du bist drin!
          </Text>
          <Text className="inter" fontSize="sm" color="rgba(255,255,255,0.55)" lineHeight="1.6">
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
      {/* Splash overlay */}
      <Box
        position="fixed"
        inset={0}
        zIndex={9999}
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        gap={5}
        bg="#000000"
        pointerEvents={loading ? "auto" : "none"}
        sx={{
          transition:
            "transform 450ms cubic-bezier(0.4, 0, 0.2, 1), opacity 350ms ease",
          transform: loading ? "translateY(0)" : "translateY(-100%)",
          opacity: loading ? 1 : 0,
        }}
      >
        <Logo variant="onDark" width={200} height={56} priority />
        <Box
          w="120px"
          h="3px"
          borderRadius="full"
          bg="rgba(255,255,255,0.06)"
          overflow="hidden"
        >
          <Box
            h="full"
            borderRadius="full"
            sx={{
              background: "linear-gradient(90deg, #1FB9A6, #47F7DC, #8FFBEB)",
              animation: "splashProgress 300ms linear forwards",
              "@keyframes splashProgress": {
                "0%": { width: "0%" },
                "100%": { width: "100%" },
              },
            }}
          />
        </Box>
      </Box>

      <style>{`
        nav[aria-label], header[role="banner"], [data-platform-nav], [data-topbar] {
          display: none !important;
        }
        body {
          padding-top: 0 !important;
          margin-top: 0 !important;
        }
      `}</style>

      <Box
        minH="100vh"
        w="full"
        bg="#000000"
        color="var(--color-text-primary, #F0F0F2)"
        position="relative"
        overflowX="hidden"
        _before={{
          content: '""',
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 82% -10%, rgba(71,247,220,0.12), transparent 60%), radial-gradient(ellipse 60% 55% at 8% 105%, rgba(88,101,242,0.12), transparent 62%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <Box position="relative" zIndex={1}>
          {/* ── Hero ─────────────────────────────────────────── */}
          <Box
            as="section"
            w="100%"
            position="relative"
            pt={{ base: 8, md: 14 }}
            pb={{ base: 10, md: 16 }}
            px={{ base: 4, md: 8, lg: 12 }}
          >
            {/* Hero-Glow: Aqua oben, Discord-Lila seitlich (auf Schwarz) */}
            <Box
              position="absolute"
              inset={0}
              zIndex={0}
              pointerEvents="none"
              sx={{
                background:
                  "radial-gradient(ellipse 70% 60% at 50% 22%, rgba(71,247,220,0.14), transparent 60%), radial-gradient(circle at 84% 8%, rgba(88,101,242,0.16), transparent 52%), radial-gradient(circle at 12% 90%, rgba(71,247,220,0.08), transparent 55%)",
              }}
            />
            {/* Aqua top accent */}
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              h="2px"
              zIndex={1}
              pointerEvents="none"
              sx={{
                background:
                  "linear-gradient(90deg, transparent 5%, rgba(71,247,220,0.55) 30%, rgba(71,247,220,0.55) 70%, transparent 95%)",
              }}
            />

            <Box maxW="1160px" mx="auto" position="relative" zIndex={2}>
              <Stack spacing={{ base: 8, lg: 12 }}>
                {/* Logo zentriert über dem Grid */}
                <Box display="flex" justifyContent="center">
                  <Logo variant="onDark" width={200} height={56} priority />
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
                    spacing={{ base: 5, lg: 7 }}
                    align={{ base: "center", lg: "flex-start" }}
                    textAlign={{ base: "center", lg: "left" }}
                    maxW={{ base: "660px", lg: "none" }}
                  >
                    <Text
                      as="h1"
                      className="inter-bold"
                      fontSize={{ base: "2xl", sm: "3xl", md: "4xl", lg: "5xl" }}
                      color="var(--color-text-primary, #F0F0F2)"
                      lineHeight="1.1"
                      letterSpacing="0.005em"
                      textTransform="uppercase"
                    >
                      Lerne wie du innerhalb weniger Wochen deinen ersten{" "}
                      <Box
                        as="span"
                        className="inter-bold"
                        sx={{
                          background:
                            "linear-gradient(135deg, #8FFBEB 0%, #47F7DC 55%, #1FB9A6 100%)",
                          WebkitBackgroundClip: "text",
                          backgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          color: "transparent",
                          filter: "drop-shadow(0 0 20px rgba(71,247,220,0.45))",
                        }}
                      >
                        Payout
                      </Box>{" "}
                      erzielst
                    </Text>

                    <Text
                      fontSize={{ base: "md", md: "lg" }}
                      className="inter"
                      color="rgba(255,255,255,0.62)"
                      maxW="540px"
                      lineHeight="1.5"
                    >
                      Während andere für dieses Wissen hunderte Euro zahlen,
                      bekommst du es hier{" "}
                      <Box as="span" color="rgba(255,255,255,0.92)" className="inter-semibold">
                        kostenlos.
                      </Box>
                    </Text>

                    {/* Trust-Punkte (nur Desktop) */}
                    <Stack display={{ base: "none", lg: "flex" }} spacing={3.5} pt={1}>
                      <TrustItem>100% kostenlos, kein Risiko</TrustItem>
                      <TrustItem>Sofortiger Zugang zur Discord Community</TrustItem>
                      <TrustItem>Bewährte Strategie für deinen ersten Payout</TrustItem>
                    </Stack>
                  </Stack>

                  {/* Formular-Spalte */}
                  <Box w="full" maxW="460px" mx={{ base: "auto", lg: "0" }}>
                    {joined ? (
                      <JoinedCard />
                    ) : (
                      <Stack spacing={5} align="center" w="full">
                        <UrgencyBadge />
                        <LeadForm
                          trackingRef={trackingRef}
                          onSuccess={(token) => setConnectToken(token)}
                        />
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
          <Box
            py={10}
            px={{ base: 4, md: 8 }}
            textAlign="center"
            borderTop="1px solid rgba(255,255,255,0.05)"
          >
            <Stack spacing={2}>
              <Text
                fontSize="xs"
                color="rgba(255,255,255,0.22)"
                className="inter"
                maxW="560px"
                mx="auto"
                lineHeight="1.7"
              >
                Trading und Investitionen sind mit erheblichen Verlustrisiken
                verbunden. Frühere Ergebnisse sind keine Garantie für
                zukünftige Gewinne.
              </Text>
              <Text fontSize="xs" color="rgba(255,255,255,0.15)" className="inter">
                © {new Date().getFullYear()} Capital Circle Institut
              </Text>
            </Stack>
          </Box>
        </Box>
      </Box>

      {connectToken && (
        <DiscordConnectModal token={connectToken} onClose={() => setConnectToken(null)} />
      )}
    </>
  );
}
