"use client";

import {
  Box,
  Center,
  HStack,
  IconButton,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Spinner,
  Text,
  useBreakpointValue,
} from "@chakra-ui/react";
import { Maximize, Minimize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type GlassVideoPlayerProps = {
  /** Direkte öffentliche URL (z. B. externes Intro) */
  src?: string;
  /** S3-Key — Player holt Signed URL über presignApiPath (Standard: /api/video-url) */
  storageKey?: string;
  /** GET-Endpoint mit ?key=… — JSON { ok, url } wie /api/video-url */
  presignApiPath?: string;
  /** Nach Laden an diese Position springen (z. B. gespeicherter Fortschritt) */
  startAtSeconds?: number;
  /** Kein Vorspulen/Scrubben (z. B. Onboarding-Intro) */
  disableSeeking?: boolean;
  /** Nur für Onboarding-Intro: stummes Autoplay. Standard: aus (Plattform-Module etc.). */
  autoPlay?: boolean;
  onEnded?: () => void;
  onProgress?: (seconds: number) => void;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function GlassVideoPlayer({
  src,
  storageKey,
  presignApiPath = "/api/video-url",
  startAtSeconds = 0,
  disableSeeking = false,
  autoPlay = false,
  onEnded,
  onProgress,
}: GlassVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTickAtRef = useRef(0);

  const [resolvedSrc, setResolvedSrc] = useState<string | null>(src ?? null);
  const [urlLoading, setUrlLoading] = useState(Boolean(storageKey && !src));

  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [volumePct, setVolumePct] = useState(85);
  const [muted, setMuted] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [mobileVolOpen, setMobileVolOpen] = useState(false);
  const mobileVolWrapRef = useRef<HTMLDivElement>(null);
  const volPressTimerRef = useRef<number | null>(null);
  const volJustOpenedByLongPress = useRef(false);

  const isMobileControls = useBreakpointValue({ base: true, md: false });

  const effectiveSrc = resolvedSrc;

  useEffect(() => {
    if (src) {
      setResolvedSrc(src);
      setUrlLoading(false);
      return;
    }
    if (!storageKey) {
      setResolvedSrc(null);
      setUrlLoading(false);
      return;
    }

    if (/^https?:\/\//i.test(storageKey.trim())) {
      setResolvedSrc(storageKey.trim());
      setUrlLoading(false);
      return;
    }

    let cancelled = false;

    const fetchUrl = async () => {
      setUrlLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`${presignApiPath}?key=${encodeURIComponent(storageKey)}`);
        const json = (await res.json()) as {
          ok?: boolean;
          url?: string;
          expiresInSeconds?: number;
          error?: string;
        };
        if (cancelled) return;
        if (!json.ok || !json.url) {
          setLoadError(json.error === "forbidden" ? "Kein Zugriff auf dieses Video." : "Video-URL konnte nicht geladen werden.");
          setUrlLoading(false);
          return;
        }
        setResolvedSrc(json.url);
        setUrlLoading(false);
        const exp = json.expiresInSeconds ?? 900;
        const refreshMs = Math.max(10_000, exp * 1000 - 120_000);
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(() => {
          void fetchUrl();
        }, refreshMs);
      } catch {
        if (!cancelled) {
          setLoadError("Netzwerkfehler beim Laden der Video-URL.");
          setUrlLoading(false);
        }
      }
    };

    void fetchUrl();
    return () => {
      cancelled = true;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [src, storageKey, presignApiPath]);

  const tick = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    const t = el.currentTime;
    const now = performance.now();
    if (now - lastTickAtRef.current < 250) return;
    lastTickAtRef.current = now;
    setCurrent(t);
    if (el.duration > 0) {
      setProgressPct((t / el.duration) * 100);
    }
    onProgress?.(t);
  }, [onProgress]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !effectiveSrc) return;
    lastTickAtRef.current = 0;
    setLoadError(null);
    setReady(false);
    setPlaying(false);
    setBuffering(false);
    setCurrent(0);
    setProgressPct(0);
    setDuration(0);
    setMuted(true);
    el.load();
  }, [effectiveSrc]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = Math.max(0, Math.min(1, volumePct / 100));
    v.muted = muted;
  }, [volumePct, muted]);

  useEffect(() => {
    if (!mobileVolOpen) return;
    const close = (ev: MouseEvent | TouchEvent) => {
      const el = mobileVolWrapRef.current;
      if (el && !el.contains(ev.target as Node)) {
        setMobileVolOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close, { passive: true });
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [mobileVolOpen]);

  useEffect(() => {
    const syncFs = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      const el = document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
      setFullscreen(Boolean(el));
    };
    document.addEventListener("fullscreenchange", syncFs);
    document.addEventListener("webkitfullscreenchange", syncFs as EventListener);
    return () => {
      document.removeEventListener("fullscreenchange", syncFs);
      document.removeEventListener("webkitfullscreenchange", syncFs as EventListener);
    };
  }, []);

  /** iOS: nativer Vollbild-Player — Events auf dem Video-Element, nicht am Document */
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onBegin = () => setFullscreen(true);
    const onEnd = () => setFullscreen(false);
    vid.addEventListener("webkitbeginfullscreen", onBegin);
    vid.addEventListener("webkitendfullscreen", onEnd);
    return () => {
      vid.removeEventListener("webkitbeginfullscreen", onBegin);
      vid.removeEventListener("webkitendfullscreen", onEnd);
    };
  }, [effectiveSrc]);

  const toggleFullscreen = useCallback(() => {
    const shell = shellRef.current;
    const vid = videoRef.current;
    if (!shell || !vid) return;

    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void>;
    };
    const isDocFs = Boolean(document.fullscreenElement ?? doc.webkitFullscreenElement);
    const iosVid = vid as HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
      webkitSupportsFullscreen?: boolean;
      webkitExitFullscreen?: () => void;
    };

    if (isDocFs) {
      if (document.exitFullscreen) void document.exitFullscreen();
      else if (doc.webkitExitFullscreen) void doc.webkitExitFullscreen();
      return;
    }

    /** iOS nativer Player: kein Document-Fullscreen — nur Video-API */
    if (fullscreen && typeof iosVid.webkitExitFullscreen === "function") {
      iosVid.webkitExitFullscreen();
      return;
    }
    if (fullscreen) {
      /* z. B. iOS nativ ohne programmatisches Beenden — nichts tun */
      return;
    }

    if (typeof iosVid.webkitEnterFullscreen === "function" && (iosVid.webkitSupportsFullscreen ?? true)) {
      iosVid.webkitEnterFullscreen();
      return;
    }

    const elShell = shell as HTMLElement & { webkitRequestFullscreen?: () => void };
    if (shell.requestFullscreen) void shell.requestFullscreen();
    else if (elShell.webkitRequestFullscreen) void elShell.webkitRequestFullscreen();
  }, [fullscreen]);

  const toggleMute = useCallback(() => {
    setMuted((m) => !m);
  }, []);

  const onVolumeSlider = (pct: number) => {
    setVolumePct(pct);
    if (pct > 0 && muted) setMuted(false);
    if (pct === 0) setMuted(true);
  };

  const clearVolPressTimer = () => {
    if (volPressTimerRef.current != null) {
      clearTimeout(volPressTimerRef.current);
      volPressTimerRef.current = null;
    }
  };

  const onMobileVolPointerDown = () => {
    if (isMobileControls !== true || mobileVolOpen) return;
    volJustOpenedByLongPress.current = false;
    volPressTimerRef.current = window.setTimeout(() => {
      volPressTimerRef.current = null;
      volJustOpenedByLongPress.current = true;
      setMobileVolOpen(true);
    }, 450);
  };

  const onMobileVolPointerUp = () => {
    if (isMobileControls !== true) return;
    if (mobileVolOpen) {
      if (volJustOpenedByLongPress.current) {
        volJustOpenedByLongPress.current = false;
        return;
      }
      setMobileVolOpen(false);
      return;
    }
    clearVolPressTimer();
    toggleMute();
  };

  const onMobileVolPointerCancel = () => {
    if (isMobileControls === true) clearVolPressTimer();
  };

  const togglePlay = useCallback(async () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      try {
        await el.play();
        setPlaying(true);
      } catch {
        setLoadError("Wiedergabe nicht moeglich. Bitte erneut tippen.");
      }
    } else {
      el.pause();
      setPlaying(false);
    }
  }, []);

  const onSeekSlider = (pct: number) => {
    if (disableSeeking) return;
    const el = videoRef.current;
    if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return;
    const target = (pct / 100) * el.duration;
    const clamped = Math.max(0, Math.min(target, el.duration));
    el.currentTime = clamped;
    setCurrent(clamped);
    setProgressPct((clamped / el.duration) * 100);
  };

  if (storageKey && urlLoading && !effectiveSrc) {
    return (
      <Box
        borderRadius="16px"
        overflow="hidden"
        bg="#000"
        aspectRatio="16/9"
        display="flex"
        alignItems="center"
        justifyContent="center"
        border="1px solid rgba(255,255,255,0.08)"
      >
        <Text className="inter" color="gray.500" fontSize="sm">
          Video wird vorbereitet…
        </Text>
      </Box>
    );
  }

  if (!effectiveSrc) {
    return (
      <Box
        borderRadius="16px"
        p={8}
        bg="rgba(255,255,255,0.03)"
        border="1px solid rgba(255,255,255,0.08)"
      >
        <Text className="inter" color="gray.500" fontSize="sm">
          Kein Video hinterlegt.
        </Text>
      </Box>
    );
  }

  return (
    <Box
      ref={shellRef}
      className="cc-video-shell"
      position="relative"
      w="full"
      zIndex={2}
      borderRadius="16px"
      overflow="hidden"
      border="1px solid rgba(148, 163, 184, 0.28)"
      bg="linear-gradient(165deg, rgba(15, 23, 42, 0.55) 0%, rgba(8, 10, 14, 0.72) 100%)"
      transform="translateZ(0)"
      willChange="transform"
      backdropFilter="blur(12px) saturate(1.2)"
      sx={{
        WebkitBackdropFilter: "blur(12px) saturate(1.2)",
        "&:fullscreen, &:-webkit-full-screen": {
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          maxHeight: "100vh",
          width: "100vw",
          borderRadius: 0,
          overflow: "hidden",
        },
        "&:fullscreen .cc-video-stage, &:-webkit-full-screen .cc-video-stage": {
          flex: "1 1 0%",
          minHeight: 0,
          paddingTop: "0 !important",
          height: "100%",
        },
        "& .cc-video-controls": {
          transition: "opacity 0.22s ease",
          opacity: 1,
          pointerEvents: "auto",
        },
        "@media (hover: hover)": {
          "& .cc-video-controls": {
            opacity: 0,
            pointerEvents: "none",
          },
          "&:hover .cc-video-controls": {
            opacity: 1,
            pointerEvents: "auto",
          },
        },
      }}
      boxShadow="0 16px 56px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(212, 175, 55, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
    >
      <Box className="cc-video-stage" position="relative" w="full" pt="56.25%">
        <video
          ref={videoRef}
          src={effectiveSrc}
          playsInline
          preload="auto"
          autoPlay={autoPlay}
          muted={muted}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            background: "rgba(0,0,0,0.5)",
          }}
          onClick={() => void togglePlay()}
          onLoadedMetadata={(e) => {
            const el = e.currentTarget;
            setDuration(el.duration);
            setReady(true);
            const start = Math.max(0, startAtSeconds ?? 0);
            if (start > 0 && Number.isFinite(el.duration) && el.duration > 0) {
              const clamped = Math.min(start, Math.max(0, el.duration - 0.5));
              el.currentTime = clamped;
              setCurrent(clamped);
              setProgressPct((clamped / el.duration) * 100);
            }
          }}
          onCanPlay={() => {
            setReady(true);
            setBuffering(false);
            if (!autoPlay) return;
            const v = videoRef.current;
            if (v && v.paused) {
              void v.play().catch(() => {
                /* Autoplay blockiert */
              });
            }
          }}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => setBuffering(false)}
          onPlay={() => { setPlaying(true); setBuffering(false); }}
          onPause={() => setPlaying(false)}
          onTimeUpdate={tick}
          onEnded={(e) => {
            setPlaying(false);
            const el = e.currentTarget;
            const dur = el.duration;
            // Nur als echtes Ende werten — verhindert falsche „100%“ bei Navigation/Unmount
            if (Number.isFinite(dur) && dur > 0 && el.currentTime >= dur * 0.95) {
              onEnded?.();
            }
          }}
          onError={() => {
            setLoadError("Video konnte nicht geladen werden. URL oder Netzwerk pruefen.");
          }}
        />

        {buffering && (
          <Center
            position="absolute"
            inset={0}
            zIndex={3}
            pointerEvents="none"
            bg="rgba(0, 0, 0, 0.35)"
          >
            <Spinner size="xl" color="brand.400" thickness="3px" speed="0.85s" />
          </Center>
        )}

        {!playing && ready && !buffering && (
          <Center
            position="absolute"
            inset={0}
            zIndex={2}
            pointerEvents="none"
            bg="radial-gradient(circle at center, rgba(7,8,10,0.35), rgba(7,8,10,0.65))"
          >
            <IconButton
              aria-label="Abspielen"
              icon={<Play size={32} />}
              pointerEvents="auto"
              onClick={(e) => {
                e.stopPropagation();
                void togglePlay();
              }}
              size="lg"
              isRound
              fontSize="2xl"
              bg="rgba(212, 175, 55, 0.35)"
              borderWidth="1px"
              borderColor="rgba(232, 197, 71, 0.55)"
              color="white"
              backdropFilter="blur(16px)"
              sx={{ WebkitBackdropFilter: "blur(16px)" }}
              boxShadow="0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)"
              _hover={{
                bg: "rgba(212, 175, 55, 0.5)",
                transform: "scale(1.05)",
              }}
              transition="all 0.2s ease"
            />
          </Center>
        )}

        <HStack
          className="cc-video-controls"
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          zIndex={4}
          align="center"
          spacing={{ base: 1, md: 3 }}
          px={{ base: 2, md: 4 }}
          py={{ base: 2, md: 3 }}
          flexWrap="nowrap"
          borderTop="1px solid rgba(255, 255, 255, 0.06)"
          bg="rgba(255, 255, 255, 0.02)"
          backdropFilter="blur(10px) saturate(1.5)"
          boxShadow="inset 0 1px 0 rgba(255, 255, 255, 0.05)"
          sx={{
            WebkitBackdropFilter: "blur(10px) saturate(1.5)",
            columnGap: { base: "6px", md: "12px" },
          }}
        >
          <IconButton
            aria-label={playing ? "Pause" : "Play"}
            icon={playing ? <Pause size={20} /> : <Play size={20} />}
            size={{ base: "xs", md: "sm" }}
            flexShrink={0}
            variant="ghost"
            color="rgba(240, 240, 242, 0.95)"
            _hover={{ bg: "rgba(212, 175, 55, 0.15)" }}
            onClick={(e) => {
              e.stopPropagation();
              void togglePlay();
            }}
          />
          <Slider
            aria-label={disableSeeking ? "Fortschritt (kein Vorspulen)" : "Fortschritt"}
            value={progressPct}
            min={0}
            max={100}
            step={0.1}
            flex="1"
            minW={0}
            focusThumbOnChange={false}
            onChange={onSeekSlider}
            colorScheme="brand"
            pointerEvents={disableSeeking ? "none" : "auto"}
            sx={disableSeeking ? { cursor: "default" } : undefined}
          >
            <SliderTrack bg="rgba(255,255,255,0.1)" h="6px" borderRadius="full">
              <SliderFilledTrack bg="#D4AF37" borderRadius="full" />
            </SliderTrack>
            <SliderThumb
              boxSize={3.5}
              borderWidth="2px"
              borderColor="white"
              bg="#D4AF37"
              boxShadow="0 0 12px rgba(212,175,55,0.5)"
              opacity={disableSeeking ? 0 : 1}
              pointerEvents={disableSeeking ? "none" : "auto"}
            />
          </Slider>
          <Text
            fontSize={{ base: "10px", md: "xs" }}
            className="inter"
            color="rgba(240,240,242,0.8)"
            whiteSpace="nowrap"
            flexShrink={0}
            minW={{ base: "54px", md: "88px" }}
            textAlign="right"
          >
            {`${formatTime(current)} / ${formatTime(duration)}`}
          </Text>

          <HStack spacing={1} flexShrink={0} display={{ base: "none", md: "flex" }}>
            <IconButton
              aria-label={muted ? "Ton ein" : "Stumm"}
              icon={muted || volumePct === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              size="sm"
              variant="ghost"
              color="rgba(240, 240, 242, 0.9)"
              _hover={{ bg: "rgba(212, 175, 55, 0.12)" }}
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
            />
            <Box w="88px" minW="48px">
              <Slider
                aria-label="Lautstaerke"
                value={volumePct}
                min={0}
                max={100}
                step={1}
                focusThumbOnChange={false}
                onChange={onVolumeSlider}
                colorScheme="brand"
              >
                <SliderTrack bg="rgba(255,255,255,0.1)" h="4px" borderRadius="full">
                  <SliderFilledTrack bg="rgba(212, 175, 55, 0.88)" borderRadius="full" />
                </SliderTrack>
                <SliderThumb boxSize={2.5} bg="white" borderWidth="1px" borderColor="rgba(212,175,55,0.5)" />
              </Slider>
            </Box>
          </HStack>

          <Box ref={mobileVolWrapRef} position="relative" flexShrink={0} display={{ base: "block", md: "none" }}>
            {mobileVolOpen ? (
              <Box
                position="absolute"
                bottom="calc(100% + 10px)"
                left="50%"
                transform="translateX(-50%)"
                zIndex={6}
                px={3}
                py={3}
                borderRadius="14px"
                border="1px solid rgba(255, 255, 255, 0.12)"
                bg="rgba(255, 255, 255, 0.06)"
                backdropFilter="blur(16px) saturate(1.4)"
                boxShadow="0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)"
                sx={{ WebkitBackdropFilter: "blur(16px) saturate(1.4)" }}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <Slider
                  aria-label="Lautstaerke"
                  orientation="vertical"
                  min={0}
                  max={100}
                  step={1}
                  value={volumePct}
                  focusThumbOnChange={false}
                  onChange={onVolumeSlider}
                  height="112px"
                  colorScheme="brand"
                >
                  <SliderTrack w="6px" h="full" bg="rgba(255,255,255,0.12)" borderRadius="full">
                    <SliderFilledTrack bg="rgba(212, 175, 55, 0.9)" borderRadius="full" />
                  </SliderTrack>
                  <SliderThumb
                    boxSize={3}
                    bg="white"
                    borderWidth="2px"
                    borderColor="rgba(212,175,55,0.6)"
                  />
                </Slider>
              </Box>
            ) : null}
            <IconButton
              aria-label={
                isMobileControls
                  ? "Stumm / Lautstaerke: kurz tippen oder laenger druecken fuer Regler"
                  : muted
                    ? "Ton ein"
                    : "Stumm"
              }
              icon={muted || volumePct === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              size="sm"
              variant="ghost"
              color="rgba(240, 240, 242, 0.9)"
              _hover={{ bg: "rgba(212, 175, 55, 0.12)" }}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (isMobileControls === true) onMobileVolPointerDown();
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                if (isMobileControls === true) onMobileVolPointerUp();
              }}
              onPointerCancel={(e) => {
                e.stopPropagation();
                onMobileVolPointerCancel();
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (isMobileControls !== true) toggleMute();
              }}
            />
          </Box>

          <IconButton
            aria-label={fullscreen ? "Vollbild beenden" : "Vollbild"}
            icon={fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            size="sm"
            flexShrink={0}
            variant="ghost"
            color="rgba(240, 240, 242, 0.9)"
            _hover={{ bg: "rgba(212, 175, 55, 0.15)" }}
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
          />
        </HStack>
      </Box>

      {loadError ? (
        <Text px={4} pb={3} fontSize="sm" color="red.300" className="inter">
          {loadError}
        </Text>
      ) : null}
    </Box>
  );
}
