"use client";

import dynamic from "next/dynamic";
import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { Lock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { DiscordTerminHero } from "./DiscordTerminHero";
import { DiscordTerminFounder } from "./DiscordTerminFounder";
import { DiscordTerminMobileCTA } from "./DiscordTerminMobileCTA";

const DiscordQuestionsModal = dynamic(
  () =>
    import("@/components/marketing/DiscordQuestionsModal").then((m) => ({
      default: m.DiscordQuestionsModal,
    })),
  { ssr: false },
);

/** Throttle-Intervall für Video-Fortschritts-POSTs (ms). */
const VIDEO_POST_INTERVAL_MS = 10_000;

/**
 * /discord/termin — /bewerbung-Kopie im neuen Branding (Hero + CTA-Footer + Founder).
 * Der CTA öffnet das 6-Fragen-Popup; nach Abschluss → /discord/termin/danke (Calendly).
 */
export function DiscordTerminClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lid = (searchParams.get("lid") ?? "").trim();
  // Identify-Loop-Schutz: Callback hängt einen `discord`-Param an.
  const identifyAttempted = (searchParams.get("discord") ?? "") !== "";

  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Kein lid (intern beworbener Link) → Discord-User per OAuth identifizieren.
  useEffect(() => {
    if (!lid && !identifyAttempted) {
      window.location.href = "/api/discord-funnel/identify";
    }
  }, [lid, identifyAttempted]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  /* ── Throttled Video Tracking ─────────────────────────── */
  const lastPostAtRef = useRef(0);
  const lastSecondsRef = useRef(0);
  const lastPercentRef = useRef(0);
  const durationRef = useRef(0);

  const postVideoProgress = useCallback(
    (watchSeconds: number, percent: number) => {
      if (!lid) return;
      lastPostAtRef.current = Date.now();
      fetch("/api/discord-funnel/video", {
        method: "POST",
        headers: { "content-type": "application/json" },
        keepalive: true,
        body: JSON.stringify({ token: lid, watchSeconds, percent }),
      }).catch(() => undefined);
    },
    [lid],
  );

  const handleProgress = useCallback(
    (seconds: number) => {
      const v = document.querySelector<HTMLVideoElement>(".cc-video-shell video");
      const dur = v?.duration;
      if (dur && Number.isFinite(dur) && dur > 0) durationRef.current = dur;

      const watchSeconds = Math.floor(seconds);
      const percent = durationRef.current > 0 ? Math.round((seconds / durationRef.current) * 100) : 0;
      lastSecondsRef.current = watchSeconds;
      lastPercentRef.current = percent;

      const now = Date.now();
      if (now - lastPostAtRef.current >= VIDEO_POST_INTERVAL_MS) {
        postVideoProgress(watchSeconds, percent);
      }
    },
    [postVideoProgress],
  );

  const handleEnded = useCallback(() => {
    postVideoProgress(lastSecondsRef.current, Math.max(lastPercentRef.current, 100));
  }, [postVideoProgress]);

  const openModal = useCallback(() => setModalOpen(true), []);

  const handleComplete = useCallback(() => {
    setModalOpen(false);
    router.push(`/discord/termin/danke?lid=${encodeURIComponent(lid)}`);
  }, [router, lid]);

  const videoSrc = process.env.NEXT_PUBLIC_STEP2_BEWERBUNG_VIDEO_URL;

  // Während der Identify-Weiterleitung nichts rendern.
  if (!lid && !identifyAttempted) return null;

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
            onVideoProgress={handleProgress}
            onVideoEnded={handleEnded}
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
          token={lid}
          onComplete={handleComplete}
        />
      )}
    </>
  );
}
