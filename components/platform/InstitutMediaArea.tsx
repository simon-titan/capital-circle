"use client";

import { Box, Flex } from "@chakra-ui/react";
import { Video } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

type InstitutMediaAreaProps = {
  /** S3 storage_key — Signed URL über /api/video-url */
  videoStorageKey: string | null;
  /** Modul-Thumbnail (Fallback), volle Fläche mit object-fit cover */
  thumbnailUrl: string | null;
  /** Beim letzten Stand starten (0 = Anfang, Teaser-Loop) */
  startAtSeconds?: number;
  children?: ReactNode;
  /** Ersetzt die Standard-Fläche, wenn weder Video noch Thumbnail vorliegen. */
  fallback?: ReactNode;
};

/**
 * Video-Vorschau (stumm, inline) oder vollwertiges Modul-Thumbnail.
 * Medienfüllung: immer 100 % × 100 % des 16:9-Containers (object-fit: cover).
 */
export function InstitutMediaArea({
  videoStorageKey,
  thumbnailUrl,
  startAtSeconds = 0,
  children,
  fallback,
}: InstitutMediaAreaProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [videoDecodeError, setVideoDecodeError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoStorageKey?.trim()) {
      setResolvedUrl(null);
      setLoadError(false);
      setVideoDecodeError(false);
      return;
    }
    setVideoDecodeError(false);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/video-url?key=${encodeURIComponent(videoStorageKey.trim())}`);
        const json = (await res.json()) as { ok?: boolean; url?: string };
        if (cancelled) return;
        if (json.ok && json.url) {
          setResolvedUrl(json.url);
          setLoadError(false);
        } else {
          setLoadError(true);
          setResolvedUrl(null);
        }
      } catch {
        if (!cancelled) {
          setLoadError(true);
          setResolvedUrl(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [videoStorageKey]);

  /**
   * Cloudflare Stream liefert HLS (`.m3u8`). Ein nacktes `<video src>` spielt das
   * nur in Safari — in Chrome/Firefox/Edge scheitert es still, und die Vorschau
   * blieb leer. Deshalb dieselbe Anbindung wie im GlassVideoPlayer.
   */
  const isHls = Boolean(resolvedUrl && /\.m3u8(\?|$)/i.test(resolvedUrl));

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolvedUrl || !isHls) return;

    // Safari/iOS können HLS nativ — dort keine zusätzliche Bibliothek laden.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = resolvedUrl;
      return;
    }

    let cancelled = false;
    let hls: import("hls.js").default | null = null;

    void (async () => {
      const Hls = (await import("hls.js")).default;
      if (cancelled || !videoRef.current) return;
      if (!Hls.isSupported()) {
        videoRef.current.src = resolvedUrl;
        return;
      }
      hls = new Hls({ enableWorker: true });
      hls.loadSource(resolvedUrl);
      hls.attachMedia(videoRef.current);
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        // Vorschau ist Beiwerk: bei einem echten Fehler still auf das Standbild
        // zurückfallen, statt eine Fehlermeldung in die Karte zu setzen.
        if (data.fatal) setVideoDecodeError(true);
      });
    })();

    return () => {
      cancelled = true;
      hls?.destroy();
      hls = null;
    };
  }, [resolvedUrl, isHls]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !resolvedUrl) return;

    const onMeta = () => {
      const dur = v.duration;
      if (!Number.isFinite(dur) || dur <= 0) return;
      const target = Math.max(0, Math.min(startAtSeconds, dur - 0.2));
      v.currentTime = target;
      void v.play().catch(() => {});
    };

    v.addEventListener("loadedmetadata", onMeta);
    return () => v.removeEventListener("loadedmetadata", onMeta);
  }, [resolvedUrl, startAtSeconds]);

  const showVideo = Boolean(resolvedUrl && !loadError && !videoDecodeError);
  const loopTeaser = startAtSeconds < 0.5;

  return (
    <Box position="relative" w="100%" aspectRatio="16 / 9" overflow="hidden" bg="#0a0a0a">
      {showVideo ? (
        <video
          ref={videoRef}
          // HLS-Quellen setzt der Effect oben (hls.js bzw. nativ) — hier würde
          // ein `src` die Anbindung überschreiben.
          src={isHls ? undefined : resolvedUrl ?? undefined}
          muted
          playsInline
          autoPlay
          loop={loopTeaser}
          preload="metadata"
          poster={thumbnailUrl ?? undefined}
          onError={() => setVideoDecodeError(true)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 0,
          }}
        />
      ) : null}

      {!showVideo && thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : null}

      {!showVideo && !thumbnailUrl && fallback ? (
        <Box position="absolute" inset={0}>
          {fallback}
        </Box>
      ) : null}

      {!showVideo && !thumbnailUrl && !fallback ? (
        <Box
          position="absolute"
          inset={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="linear-gradient(145deg, rgba(212,176,128,0.12) 0%, rgba(15,23,42,0.75) 55%, rgba(8,8,10,0.95) 100%)"
        >
          <Box borderRadius="14px" p={3} bg="rgba(212,176,128,0.12)" border="1px solid rgba(212,176,128,0.4)" color="var(--cc-gold-light)">
            <Video size={36} strokeWidth={1.6} />
          </Box>
        </Box>
      ) : null}

      <Box
        position="absolute"
        inset={0}
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 45%, transparent 100%)"
        pointerEvents="none"
        zIndex={1}
      />
      {children ? (
        <Flex
          position="absolute"
          inset={0}
          zIndex={2}
          align="center"
          justify="center"
          pointerEvents="none"
        >
          <Box pointerEvents="auto">{children}</Box>
        </Flex>
      ) : null}
    </Box>
  );
}
