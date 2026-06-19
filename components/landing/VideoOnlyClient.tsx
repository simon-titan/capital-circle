"use client";

import { useEffect, useMemo } from "react";
import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { GlassVideoPlayer } from "@/components/ui/GlassVideoPlayer";
import {
  createVideoTracker,
  getOrCreateSessionId,
} from "@/lib/discord-funnel/video-tracking";

/**
 * /video — minimalste Kopie der /termin-Hero: nur Überschrift, Video und das
 * "1.000+ Trader"-Banner. Kein CTA, keine weiteren Sektionen, kein Popup.
 */

// Animierter Cyan-Gradient-Shimmer für Headline-Highlights (1:1 aus DiscordTerminHero).
const headlineHighlightSx = {
  background: "linear-gradient(90deg, #8FFBEB 0%, #47F7DC 25%, #1FB9A6 50%, #47F7DC 75%, #8FFBEB 100%)",
  backgroundSize: "200% auto",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  color: "transparent",
  filter: "drop-shadow(0 0 18px rgba(71,247,220,0.50))",
  animation: "hlShimmer 4s linear infinite",
  "@keyframes hlShimmer": {
    "0%": { backgroundPosition: "0% center" },
    "100%": { backgroundPosition: "200% center" },
  },
} as const;

const AVATARS = [
  "/client-pb/1765279404415.jpg",
  "/client-pb/393d1b15978eed96285cf196b2f51eda.avif",
  "/client-pb/4208db19763848b131989eadba9899aa.avif",
  "/client-pb/user_6819319_6ec853ff-5777-4398-8fcc-06e2621cbcf8.avif",
  "/client-pb/Screenshot 2026-03-03 071433.png",
];

export function VideoOnlyClient() {
  const videoSrc = process.env.NEXT_PUBLIC_DISCORD_TERMIN_VIDEO_URL;

  // Anonymes Video-Tracking (nur session_id) für die /video-Seite.
  const videoTracker = useMemo(
    () => createVideoTracker({ token: null, source: "video_only" }),
    [],
  );

  // Visit-Tracking (einmal pro Mount) — reines Fire-and-forget, kein State.
  useEffect(() => {
    let sessionId = "unknown";
    let referrer: string | null = null;
    try {
      sessionId = getOrCreateSessionId();
      referrer = document.referrer || null;
    } catch {
      // window/document/sessionStorage nicht verfügbar.
    }
    try {
      fetch("/api/discord-funnel/visit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          utm_source: "video",
          referrer,
        }),
      }).catch(() => undefined);
    } catch {
      // Tracking-Fehler still ignorieren.
    }
  }, []);

  return (
    <>
      <style>{`
        nav[aria-label], header[role="banner"], [data-platform-nav], [data-topbar] {
          display: none !important;
        }
        body {
          padding-top: 0 !important;
          margin-top: 0 !important;
          background: #000000 !important;
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
            "radial-gradient(ellipse 80% 60% at 82% -10%, rgba(71,247,220,0.10), transparent 60%), radial-gradient(ellipse 60% 55% at 8% 105%, rgba(88,101,242,0.10), transparent 62%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <Box
          as="section"
          w="100%"
          position="relative"
          zIndex={1}
          pt={{ base: 8, md: 10 }}
          pb={{ base: 10, md: 14 }}
          px={{ base: 4, md: 8, lg: 12 }}
        >
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

          <Box maxW="820px" mx="auto" position="relative" zIndex={2}>
            <Stack spacing={{ base: 6, md: 6 }} align="center">
              {/* Überschrift */}
              <Text
                as="h1"
                className="inter-bold"
                textTransform="uppercase"
                color="#FFFFFF"
                fontSize={{ base: "lg", sm: "xl", md: "2xl", lg: "3xl" }}
                lineHeight="1.2"
                letterSpacing="0.005em"
                textAlign="center"
                maxW="760px"
              >
                Schau dieses Video — es zeigt warum{" "}
                <Box as="span" className="inter-bold" sx={headlineHighlightSx}>
                  90% der Trader scheitern
                </Box>{" "}
                und wie das Capital Circle Framework{" "}
                <Box as="span" className="inter-bold" sx={headlineHighlightSx}>
                  das ändert
                </Box>
                .
              </Text>

              {/* Video */}
              <Box w="full" maxW={{ base: "100%", md: "720px" }} position="relative">
                {videoSrc ? (
                  <GlassVideoPlayer
                    src={videoSrc}
                    autoPlay
                    accent="#47F7DC"
                    accentRgb="71, 247, 220"
                    progressColor="#FFFFFF"
                    progressRgb="255, 255, 255"
                    onProgress={videoTracker.handleProgress}
                    onEnded={videoTracker.handleEnded}
                  />
                ) : (
                  <Box
                    borderRadius="16px"
                    overflow="hidden"
                    sx={{
                      aspectRatio: "16 / 9",
                      border: "1px solid rgba(71,247,220,0.22)",
                      boxShadow: "0 16px 56px rgba(0,0,0,0.55), 0 0 0 1px rgba(71,247,220,0.08)",
                      background: "rgba(0,0,0,0.60)",
                    }}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text className="inter" color="rgba(255,255,255,0.35)" fontSize="sm">
                      Vorstellungsvideo folgt in Kürze
                    </Text>
                  </Box>
                )}
              </Box>
            </Stack>
          </Box>
        </Box>
      </Box>
    </>
  );
}
