"use client";

import { useEffect, useMemo } from "react";
import { Box, Stack } from "@chakra-ui/react";
import { GlassVideoPlayer } from "@/components/ui/GlassVideoPlayer";
import {
  createVideoTracker,
  getOrCreateSessionId,
} from "@/lib/discord-funnel/video-tracking";
import {
  FunnelGround,
  FunnelHeroGlow,
  FunnelPageStyles,
  FunnelVideoHeadline,
  FunnelVideoPlaceholder,
} from "./DiscordFunnelChrome";

/**
 * /video — minimalste Kopie der /termin-Hero: nur Überschrift und Video.
 * Kein CTA, keine weiteren Sektionen, kein Popup.
 */
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
      <FunnelPageStyles />

      <FunnelGround>
        <Box
          as="section"
          w="100%"
          position="relative"
          pt={{ base: 8, md: 10 }}
          pb={{ base: 10, md: 14 }}
          px={{ base: 4, md: 8, lg: 12 }}
        >
          <FunnelHeroGlow />

          <Box maxW="820px" mx="auto" position="relative" zIndex={2}>
            <Stack spacing={6} align="center">
              <Box className="cc-rise">
                <FunnelVideoHeadline />
              </Box>

              {/* Video (Player-Akzent = Champagner, Standard des GlassVideoPlayer) */}
              <Box w="full" maxW={{ base: "100%", md: "720px" }} position="relative">
                {videoSrc ? (
                  <GlassVideoPlayer
                    src={videoSrc}
                    autoPlay
                    onProgress={videoTracker.handleProgress}
                    onEnded={videoTracker.handleEnded}
                  />
                ) : (
                  <FunnelVideoPlaceholder />
                )}
              </Box>
            </Stack>
          </Box>
        </Box>
      </FunnelGround>
    </>
  );
}
