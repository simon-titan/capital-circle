"use client";

import dynamic from "next/dynamic";
import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { DiscordTerminHero } from "./DiscordTerminHero";
import { DiscordTerminFounder } from "./DiscordTerminFounder";
import { DiscordTerminMobileCTA } from "./DiscordTerminMobileCTA";
import type { LeadFunnelTracking } from "@/components/marketing/DiscordQuestionsModal";
import { createVideoTracker } from "@/lib/discord-funnel/video-tracking";

const DiscordQuestionsModal = dynamic(
  () =>
    import("@/components/marketing/DiscordQuestionsModal").then((m) => ({
      default: m.DiscordQuestionsModal,
    })),
  { ssr: false },
);

/** utm_source-Fallback, der diese Leads als Nicht-Discord-Herkunft markiert. */
const LEAD_SOURCE = "termin-direkt";

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

function readTracking(): LeadFunnelTracking {
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
    // Ohne UTM in der URL den Funnel klar als "termin-direkt" kennzeichnen.
    utm_source: utm.utm_source ?? LEAD_SOURCE,
    utm_medium: utm.utm_medium,
    utm_campaign: utm.utm_campaign,
    utm_content: utm.utm_content,
    utm_term: utm.utm_term,
    referrer,
  };
}

/**
 * /termin — exakte Kopie von /discord/termin OHNE Discord-OAuth.
 * Der CTA öffnet das Popup, das zuerst Name/E-Mail/Telefon abfragt (legt einen Lead
 * ohne Discord-Invite an) und danach die 6 Funnel-Fragen stellt. Anschließend →
 * /termin/danke (Calendly). Die Leads landen im selben System (discord_leads),
 * markiert als utm_source="termin-direkt" mit discord_user_id = NULL.
 */
export function TerminDirectClient() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [tracking, setTracking] = useState<LeadFunnelTracking | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Tracking-Snapshot erst beim Öffnen des Popups ermitteln (kein setState im Effect,
  // window/sessionStorage stehen hier sicher zur Verfügung).
  const openModal = () => {
    setTracking((t) => t ?? readTracking());
    setModalOpen(true);
  };

  // Visit-Tracking (einmal pro Mount) — feuert reines Fire-and-forget, kein State.
  useEffect(() => {
    const snapshot = readTracking();
    try {
      fetch("/api/discord-funnel/visit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session_id: snapshot.session_id,
          utm_source: snapshot.utm_source,
          utm_medium: snapshot.utm_medium,
          utm_campaign: snapshot.utm_campaign,
          utm_content: snapshot.utm_content,
          utm_term: snapshot.utm_term,
          referrer: snapshot.referrer,
        }),
      }).catch(() => undefined);
    } catch {
      // Tracking-Fehler still ignorieren
    }
  }, []);

  // Video-Tracking: Watches der /termin-Seite werden anonym (nur session_id) erfasst
  // und beim Lead-Anlegen rückwirkend verknüpft.
  const videoTracker = useMemo(
    () => createVideoTracker({ token: null, source: "termin_direct" }),
    [],
  );

  const videoSrc = process.env.NEXT_PUBLIC_DISCORD_TERMIN_VIDEO_URL;

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
          transition: "transform 450ms cubic-bezier(0.4, 0, 0.2, 1), opacity 350ms ease",
          transform: loading ? "translateY(0)" : "translateY(-100%)",
          opacity: loading ? 1 : 0,
        }}
      >
        <Logo variant="onDark" width={200} height={56} priority />
        <Box w="120px" h="3px" borderRadius="full" bg="rgba(255,255,255,0.06)" overflow="hidden">
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
          background: #000000 !important;
          padding-bottom: 120px;
        }
        @media (min-width: 768px) {
          body { padding-bottom: 0; }
        }
      `}</style>

      <DiscordTerminMobileCTA onApply={openModal} />

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
            "radial-gradient(ellipse 80% 60% at 82% -10%, rgba(71,247,220,0.10), transparent 60%), radial-gradient(ellipse 60% 55% at 8% 105%, rgba(88,101,242,0.10), transparent 62%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <Box position="relative" zIndex={1}>
          <DiscordTerminHero
            onApply={openModal}
            videoSrc={videoSrc}
            onVideoProgress={videoTracker.handleProgress}
            onVideoEnded={videoTracker.handleEnded}
          />

          <DiscordTerminFounder />

          {/* Footer disclaimer */}
          <Box pb={10} px={{ base: 4, md: 8 }} textAlign="center" borderTop="1px solid rgba(255,255,255,0.05)" pt={8}>
            <Stack spacing={2} maxW="560px" mx="auto">
              <Text fontSize="xs" color="rgba(255,255,255,0.22)" className="inter" lineHeight="1.7">
                Mit dem Abschicken der Bewerbung stimmst du unserer Datenschutzerklärung zu. Trading
                und Investitionen sind mit erheblichen Verlustrisiken verbunden. Frühere Ergebnisse
                sind keine Garantie für zukünftige Gewinne.
              </Text>
              <HStack justify="center" spacing={1.5} color="rgba(255,255,255,0.15)">
                <Lock size={11} strokeWidth={2} />
                <Text fontSize="xs" className="inter">
                  © {new Date().getFullYear()} Capital Circle Institut
                </Text>
              </HStack>
            </Stack>
          </Box>
        </Box>
      </Box>

      {modalOpen && (
        <DiscordQuestionsModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          token=""
          collectContact
          leadSource={LEAD_SOURCE}
          tracking={tracking}
          sourceOrigin="termin_direct"
          onComplete={(newToken) => {
            setModalOpen(false);
            router.push(`/termin/danke?lid=${encodeURIComponent(newToken ?? "")}`);
          }}
        />
      )}
    </>
  );
}
