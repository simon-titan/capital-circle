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
import { Maximize, Minimize, Pause, Play, Settings, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
// Nur Typ (wird beim Build entfernt); die Laufzeit-Instanz kommt aus dem dynamischen import().
import type HlsJs from "hls.js";
import { PlayerSettingsMenu, QUALITY_AUTO } from "@/components/ui/video-player/PlayerSettingsMenu";
import {
  buildQualityOptions,
  levelLabel,
  readStoredSpeed,
  writeStoredSpeed,
  type QualityOption,
} from "@/components/ui/video-player/player-settings";

type GlassVideoPlayerProps = {
  /** Direkte öffentliche URL (z. B. externes Intro). HLS-Manifest (.m3u8) wird automatisch erkannt. */
  src?: string;
  /** Standbild bis das Video startet (z. B. Cloudflare-Stream-Thumbnail). */
  poster?: string;
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
  /** Akzentfarbe (Hex) — Default Champagner `#d4b080` (DESIGN.md v3.2). */
  accent?: string;
  /** Akzentfarbe als "r, g, b" für rgba()-Tönungen — Default Gold. */
  accentRgb?: string;
  /** Farbe des Zeitstrahls (Progress-Bar) — Default = accent. */
  progressColor?: string;
  /**
   * @deprecated Ohne Wirkung seit dem Umbau vom 19.09.2026: Der Zeitstrahl-Griff trägt
   * statt des farbigen Scheins einen dunklen Ring, der auf jedem Bildinhalt lesbar ist.
   */
  progressRgb?: string;
};

const DEFAULT_ACCENT = "#d4b080";

/** 0:07 · 12:30 · 1:04:09 (Live-Aufzeichnungen laufen oft über eine Stunde). */
function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = s.toString().padStart(2, "0");
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/**
 * Scrim unter der Bedienleiste: oben eine weiche Blende über `fade` px, darunter
 * mindestens 80 % Schwarz. Auf reinem Weiß ergibt das einen Grund von höchstens
 * #333 — Text (#f2f3f5) steht dort bei ~11:1, Text weich (#d4d7db) bei ~8:1,
 * also deutlich über WCAG AA, egal wie hell die Folie dahinter ist.
 */
function controlsScrim(fade: number) {
  return `linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.8) calc(100% - ${fade}px), rgba(0, 0, 0, 0) 100%)`;
}

/**
 * Natives HLS nur bei Apple-WebKit (Safari, jeder Browser auf iOS/iPadOS — dort
 * ist `navigator.vendor` immer „Apple Computer, Inc.“).
 *
 * Nicht mehr allein nach `canPlayType` entscheiden: Chrome meldet dort „maybe“
 * (Android schon lange, der Desktop-Chrome geprüft am 19.09.2026 ebenfalls) und
 * spielte dann nativ — ohne Stufenliste, also ohne Qualitätsauswahl. Über
 * hls.js bekommt Chrome die Liste.
 */
function prefersNativeHls(video: HTMLVideoElement): boolean {
  if (!video.canPlayType("application/vnd.apple.mpegurl")) return false;
  return typeof navigator !== "undefined" && /apple/i.test(navigator.vendor ?? "");
}

/** Gemeinsame Optik der Knöpfe in der Leiste — neutral, Gold nur für Fokus und „aktiv“. */
const controlButtonProps = {
  variant: "ghost",
  size: "sm",
  h: { base: "40px", md: "36px" },
  minW: { base: "40px", md: "36px" },
  flexShrink: 0,
  borderRadius: "8px",
  color: "var(--cc-text)",
  _hover: { bg: "rgba(255, 255, 255, 0.12)" },
  _active: { bg: "rgba(255, 255, 255, 0.18)" },
} as const;

export function GlassVideoPlayer({
  src,
  poster,
  storageKey,
  presignApiPath = "/api/video-url",
  startAtSeconds = 0,
  disableSeeking = false,
  autoPlay = false,
  onEnded,
  onProgress,
  accent = DEFAULT_ACCENT,
  accentRgb = "212, 176, 128",
  progressColor,
}: GlassVideoPlayerProps) {
  const isDefaultAccent = accent.toLowerCase() === DEFAULT_ACCENT;
  // Zeitstrahl-Farbe: eigener Prop, sonst = Akzent (beim Standard-Champagner der Gold-Balken aus DESIGN.md).
  const progClr = progressColor ?? accent;
  const progFill = progressColor ?? (isDefaultAccent ? "var(--cc-gold-bar)" : accent);
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
  /** Stumm nur bei Autoplay (Browser-Richtlinie); Plattform-Module starten mit Ton. */
  const [muted, setMuted] = useState(autoPlay);
  const [fullscreen, setFullscreen] = useState(false);
  const [mobileVolOpen, setMobileVolOpen] = useState(false);
  const mobileVolWrapRef = useRef<HTMLDivElement>(null);
  const volPressTimerRef = useRef<number | null>(null);
  const volJustOpenedByLongPress = useRef(false);
  /** Touch: Steuerleiste während der Wiedergabe automatisch ausblenden (wie Hover auf Desktop). */
  const [controlsHidden, setControlsHidden] = useState(false);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Einstellungen (Zahnrad): Geschwindigkeit und Qualität ──────────────────── */
  const [menuOpen, setMenuOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  /** Tipp aufs Video, der nur das Menü schließt, soll nicht zusätzlich pausieren. */
  const swallowVideoClickUntilRef = useRef(0);
  /**
   * Pflichtvideos ohne Vorspulen (Onboarding-Intro) bekommen keine Geschwindigkeit:
   * doppelte Geschwindigkeit wäre dort nur ein Vorspulen auf Umwegen.
   */
  const allowSpeed = !disableSeeking;
  /**
   * Gemerkte Geschwindigkeit direkt als Startwert. Unbedenklich für die Hydration:
   * Der Wert erscheint nur im (beim Server-Rendern geschlossenen) Menü und wird
   * per Effect ans Video gegeben. `readStoredSpeed` fängt fehlendes `window` ab.
   */
  const [speed, setSpeed] = useState<number>(() => (allowSpeed ? (readStoredSpeed() ?? 1) : 1));
  const hlsRef = useRef<HlsJs | null>(null);
  const [qualityOptions, setQualityOptions] = useState<QualityOption[]>([]);
  const [qualityChoice, setQualityChoice] = useState<string>(QUALITY_AUTO);
  const [playingLevelLabel, setPlayingLevelLabel] = useState<string | null>(null);

  const isMobileControls = useBreakpointValue({ base: true, md: false });

  const effectiveSrc = resolvedSrc;
  /** HLS-Manifest (Cloudflare Stream o. Ä.) — wird über hls.js / nativ abgespielt. */
  const isHls = Boolean(effectiveSrc && /\.m3u8(\?|$)/i.test(effectiveSrc));

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
    setMuted(autoPlay);
    // Bei HLS übernimmt die hls.js-/Native-Anbindung das Laden (s. Effect unten).
    if (!isHls) el.load();
  }, [effectiveSrc, autoPlay, isHls]);

  /**
   * HLS-Manifeste (.m3u8): Safari/iOS spielen nativ; Chrome/Firefox/Edge/Android über
   * hls.js (dynamischer Import → kein Bundle-Aufschlag für Seiten ohne Video). Das native
   * <video>-Element bleibt dasselbe, daher feuern timeupdate/ended-Events (Tracking)
   * unverändert weiter. Bei nicht-HLS-Quellen (MP4) macht dieser Effect nichts.
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !effectiveSrc || !isHls) return;

    // Natives HLS nur bei Apple-WebKit (Safari, alle Browser auf iOS/iPadOS).
    if (prefersNativeHls(video)) {
      video.src = effectiveSrc;
      return;
    }

    let hls: HlsJs | null = null;
    let cancelled = false;

    void (async () => {
      const Hls = (await import("hls.js")).default;
      if (cancelled || !videoRef.current) return;
      if (Hls.isSupported()) {
        const instance = new Hls({ enableWorker: true });
        hls = instance;
        hlsRef.current = instance;
        // Stufenliste fürs Qualitätsmenü. LEVELS_UPDATED: hls.js wirft kaputte Stufen raus.
        const syncLevels = () => {
          setQualityOptions(buildQualityOptions(instance.levels));
          const manual = instance.manualLevel;
          setQualityChoice(manual < 0 ? QUALITY_AUTO : (levelLabel(instance.levels[manual]) ?? QUALITY_AUTO));
        };
        instance.on(Hls.Events.MANIFEST_PARSED, syncLevels);
        instance.on(Hls.Events.LEVELS_UPDATED, syncLevels);
        // Feuert, sobald ein Fragment einer anderen Stufe tatsächlich *läuft* — daraus „Automatisch (720p)“.
        instance.on(Hls.Events.LEVEL_SWITCHED, (_evt, data) => {
          setPlayingLevelLabel(levelLabel(instance.levels[data.level]));
        });
        instance.loadSource(effectiveSrc);
        instance.attachMedia(videoRef.current);
        instance.on(Hls.Events.ERROR, (_evt, data) => {
          if (data.fatal) {
            setLoadError("Video konnte nicht geladen werden. Netzwerk prüfen.");
          }
        });
      } else {
        // Kein MediaSource (z. B. alte Android-WebViews): nativ versuchen.
        videoRef.current.src = effectiveSrc;
      }
    })();

    return () => {
      cancelled = true;
      if (hls) {
        hls.destroy();
        hls = null;
      }
      hlsRef.current = null;
      // Neue Quelle = neue Stufen; die Qualität startet wieder bei „Automatisch“.
      setQualityOptions([]);
      setQualityChoice(QUALITY_AUTO);
      setPlayingLevelLabel(null);
    };
  }, [effectiveSrc, isHls]);

  /**
   * Qualität umschalten über `hls.nextLevel` — bewusst nicht `currentLevel`:
   * `currentLevel` leert den ganzen Puffer, das Bild steht kurz und lädt neu
   * (wirkt wie ein Neustart). `nextLevel` lässt das laufende Fragment
   * ausspielen, verwirft nur den Puffer dahinter und lädt ab dort in der neuen
   * Stufe — der Wechsel kommt nach wenigen Sekunden, ohne Unterbrechung.
   * (`loadLevel` wäre noch sanfter, griffe aber erst nach dem gesamten
   * Vorpuffer, also oft erst nach 30 s und mehr.) −1 = zurück auf Automatisch.
   */
  const selectQuality = useCallback(
    (key: string) => {
      const hls = hlsRef.current;
      if (!hls) return;
      if (key === QUALITY_AUTO) {
        hls.nextLevel = -1;
        setQualityChoice(QUALITY_AUTO);
        return;
      }
      const option = qualityOptions.find((o) => o.key === key);
      if (!option) return;
      hls.nextLevel = option.levelIndex;
      setQualityChoice(option.key);
    },
    [qualityOptions],
  );

  /**
   * Geschwindigkeit ans Video geben. `defaultPlaybackRate` mitsetzen: Jeder
   * Ladevorgang (auch hls.js beim Anhängen und der URL-Refresh) setzt
   * `playbackRate` auf `defaultPlaybackRate` zurück.
   */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const rate = allowSpeed ? speed : 1;
    v.defaultPlaybackRate = rate;
    v.playbackRate = rate;
  }, [speed, allowSpeed, effectiveSrc]);

  const changeSpeed = useCallback((rate: number) => {
    setSpeed(rate);
    writeStoredSpeed(rate);
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const onMenuOutsidePointerDown = useCallback((target: EventTarget | null) => {
    if (target && target === videoRef.current) {
      swallowVideoClickUntilRef.current = performance.now() + 700;
    }
  }, []);

  /** Qualität nur anbieten, wenn es etwas zu wählen gibt (nicht bei nativem HLS, MP4 oder einer Stufe). */
  const showQuality = qualityOptions.length >= 2;
  const hasSettings = allowSpeed || showQuality;

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

  /* ── Touch: Steuerleiste automatisch aus-/einblenden ─────────────────────────
     Desktop blendet die Leiste per CSS-Hover aus. Touch-Geräte haben kein Hover,
     daher hier per Timer: während der Wiedergabe nach kurzer Zeit ausblenden,
     bei Tipp/Interaktion wieder einblenden. Nicht im Vollbild (dort immer sichtbar). */
  const clearControlsTimer = useCallback(() => {
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = null;
    }
  }, []);

  const revealControls = useCallback(() => {
    clearControlsTimer();
    setControlsHidden(false);
    // Offenes Menü: Leiste bleibt stehen, bis es wieder zu ist.
    if (isMobileControls === true && playing && !fullscreen && !menuOpen) {
      controlsTimerRef.current = setTimeout(() => setControlsHidden(true), 2800);
    }
  }, [clearControlsTimer, isMobileControls, playing, fullscreen, menuOpen]);

  useEffect(() => {
    if (isMobileControls !== true || fullscreen) {
      clearControlsTimer();
      setControlsHidden(false);
      return;
    }
    if (playing && !menuOpen) {
      clearControlsTimer();
      controlsTimerRef.current = setTimeout(() => setControlsHidden(true), 2800);
    } else {
      clearControlsTimer();
      setControlsHidden(false);
    }
    return clearControlsTimer;
  }, [playing, fullscreen, isMobileControls, clearControlsTimer, menuOpen]);

  /** Pausiert oder Menü offen: Leiste bleibt sichtbar (Desktop sonst nur beim Hover). */
  const controlsPinned = menuOpen || !playing;

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
        <Text className="inter" color="var(--cc-text-2)" fontSize="sm">
          Video wird vorbereitet…
        </Text>
      </Box>
    );
  }

  if (!effectiveSrc) {
    return (
      <Box
        borderRadius="16px"
        aspectRatio="16/9"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="#000"
        border={`1px solid rgba(${accentRgb}, 0.3)`}
      >
        <Text className="inter" color="var(--cc-text-2)" fontSize="sm">
          Kein Video hinterlegt.
        </Text>
      </Box>
    );
  }

  const controlsClassName = [
    "cc-video-controls",
    controlsHidden ? "cc-controls-hidden" : "",
    controlsPinned ? "cc-controls-pinned" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Box
      ref={shellRef}
      className="cc-video-shell"
      position="relative"
      w="full"
      zIndex={2}
      borderRadius="16px"
      overflow="hidden"
      border={`1px solid rgba(${accentRgb}, 0.3)`}
      // Schwarz statt Glas: Letterbox, Ladezustand und Vollbild bleiben dunkel,
      // damit Bild und Bedienelemente nie auf aufgehelltem Grund stehen.
      bg="#000"
      transform="translateZ(0)"
      willChange="transform"
      sx={{
        "&:fullscreen, &:-webkit-full-screen": {
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          maxHeight: "100vh",
          width: "100vw",
          borderRadius: 0,
          borderWidth: 0,
          overflow: "hidden",
          background: "#000",
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
        // Touch (kein Hover): Leiste während der Wiedergabe per JS-Klasse ausblenden.
        "@media (hover: none)": {
          "& .cc-video-controls.cc-controls-hidden": {
            opacity: 0,
            pointerEvents: "none",
          },
        },
        // Pausiert oder Menü offen: Leiste bleibt stehen (schlägt das Hover-Ausblenden).
        "& .cc-video-controls.cc-controls-pinned": {
          opacity: 1,
          pointerEvents: "auto",
        },
        // Tastatur in der Leiste: sichtbar, auch ohne Maus darüber. Eigene Regel —
        // ein Browser ohne :has() verwirft sonst die ganze Selektorliste.
        "&:has(.cc-video-controls :focus-visible) .cc-video-controls": {
          opacity: 1,
          pointerEvents: "auto",
        },
        // Im Vollbildmodus bleiben die Controls sichtbar (überschreibt das Hover-Hide).
        "&:fullscreen .cc-video-controls, &:-webkit-full-screen .cc-video-controls": {
          opacity: 1,
          pointerEvents: "auto",
        },
      }}
      boxShadow={`0 16px 56px rgba(0, 0, 0, 0.55), 0 0 36px rgba(${accentRgb}, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)`}
    >
      <Box
        className="cc-video-stage"
        position="relative"
        w="full"
        pt="56.25%"
        // Größen-Container fürs Einstellungsmenü (Kachelraster bei niedrigem Player).
        // Unbedenklich: Die Bühne hat nur absolut positionierte Kinder, ihre Höhe
        // kommt allein aus `pt` bzw. im Vollbild aus dem Flex-Layout.
        sx={{ containerType: "size", containerName: "cc-player" }}
      >
        <video
          ref={videoRef}
          // HLS-Quellen werden von hls.js / nativem HLS gesetzt (s. Effect), nicht hier.
          src={isHls ? undefined : effectiveSrc ?? undefined}
          poster={poster}
          playsInline
          preload="metadata"
          autoPlay={autoPlay}
          muted={muted}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            background: "#000",
          }}
          onClick={() => {
            // Der Tipp hat nur das Einstellungsmenü geschlossen — nicht pausieren.
            if (performance.now() < swallowVideoClickUntilRef.current) {
              swallowVideoClickUntilRef.current = 0;
              return;
            }
            // Touch & Leiste ausgeblendet: erster Tipp blendet nur ein (kein Pausieren).
            if (isMobileControls === true && controlsHidden) {
              revealControls();
              return;
            }
            void togglePlay();
            if (isMobileControls === true) revealControls();
          }}
          onLoadedMetadata={(e) => {
            const el = e.currentTarget;
            setDuration(el.duration);
            setReady(true);
            // Neu geladene Quelle: gewählte Geschwindigkeit sicher wieder anlegen.
            const rate = allowSpeed ? speed : 1;
            el.defaultPlaybackRate = rate;
            el.playbackRate = rate;
            const start = Math.max(0, startAtSeconds ?? 0);
            if (start > 0 && Number.isFinite(el.duration) && el.duration > 0) {
              const clamped = Math.min(start, Math.max(0, el.duration - 0.5));
              el.currentTime = clamped;
              setCurrent(clamped);
              setProgressPct((clamped / el.duration) * 100);
            }
          }}
          onRateChange={(e) => {
            // Z. B. über die native iOS-Vollbild-Steuerung geändert — Menü zeigt dann denselben Wert.
            const rate = e.currentTarget.playbackRate;
            if (allowSpeed && Number.isFinite(rate) && rate > 0) setSpeed(rate);
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
            setLoadError("Video konnte nicht geladen werden. URL oder Netzwerk prüfen.");
          }}
        />

        {buffering && (
          <Center
            position="absolute"
            inset={0}
            zIndex={3}
            pointerEvents="none"
            bg="rgba(0, 0, 0, 0.45)"
          >
            <Spinner size="xl" color={accent} thickness="3px" speed="0.85s" />
          </Center>
        )}

        {!playing && ready && !buffering && (
          <Center
            position="absolute"
            inset={0}
            zIndex={2}
            pointerEvents="none"
            bg="radial-gradient(circle at center, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.6))"
          >
            <IconButton
              aria-label="Abspielen"
              icon={<Play size={28} fill="currentColor" />}
              pointerEvents="auto"
              onClick={(e) => {
                e.stopPropagation();
                void togglePlay();
              }}
              isRound
              w={{ base: "56px", md: "64px" }}
              h={{ base: "56px", md: "64px" }}
              minW={{ base: "56px", md: "64px" }}
              pl="3px"
              // Play-Button laut DESIGN.md: Gold-Verlauf mit dunkler Tinte. Dunkler Schatten
              // statt Gold-Glow, damit er auch in `.cc-neutral`-Bereichen passt.
              bg={isDefaultAccent ? "var(--cc-gold-grad)" : accent}
              color="var(--cc-on-gold)"
              boxShadow="0 8px 28px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.35)"
              _hover={{ transform: "scale(1.07)", filter: "brightness(1.06)" }}
              _active={{ transform: "scale(1)", filter: "brightness(0.96)" }}
              transition="transform 0.2s var(--cc-ease), filter 0.2s ease"
              sx={{ "@media (prefers-reduced-motion: reduce)": { transition: "none", "&:hover": { transform: "none" } } }}
            />
          </Center>
        )}

        {/*
          Bedienleiste wie bei YouTube: oben der Zeitstrahl über die volle Breite,
          darunter die Knöpfe. Beides liegt auf einem kräftigen Scrim (siehe
          `controlsScrim`), damit Symbole, Zeit und Balken auf jeder Folie lesbar sind.
        */}
        <Box
          className={controlsClassName}
          onPointerDown={() => {
            if (isMobileControls === true) revealControls();
          }}
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          zIndex={4}
          px={{ base: 1, md: 2 }}
          pt={{ base: "24px", md: "40px" }}
          pb={{ base: "2px", md: "4px" }}
          bg={{ base: controlsScrim(24), md: controlsScrim(40) }}
        >
          <Box px={2}>
            <Slider
              aria-label={disableSeeking ? "Fortschritt (kein Vorspulen)" : "Fortschritt"}
              getAriaValueText={() => `${formatTime(current)} von ${formatTime(duration)}`}
              value={progressPct}
              min={0}
              max={100}
              step={0.1}
              focusThumbOnChange={false}
              onChange={onSeekSlider}
              colorScheme="brand"
              py={{ base: "8px", md: "10px" }}
              pointerEvents={disableSeeking ? "none" : "auto"}
              sx={disableSeeking ? { cursor: "default" } : undefined}
            >
              <SliderTrack bg="rgba(255, 255, 255, 0.36)" h="5px" borderRadius="full">
                <SliderFilledTrack bg={progFill} borderRadius="full" />
              </SliderTrack>
              <SliderThumb
                boxSize={3.5}
                borderWidth="2px"
                borderColor="white"
                bg={progClr}
                boxShadow="0 0 0 3px rgba(0, 0, 0, 0.35)"
                opacity={disableSeeking ? 0 : 1}
                pointerEvents={disableSeeking ? "none" : "auto"}
              />
            </Slider>
          </Box>

          <HStack spacing={{ base: 0, md: 1 }} align="center">
            <IconButton
              {...controlButtonProps}
              aria-label={playing ? "Pause" : "Abspielen"}
              icon={playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              onClick={(e) => {
                e.stopPropagation();
                void togglePlay();
              }}
            />

            <HStack spacing={1} flexShrink={0} display={{ base: "none", md: "flex" }}>
              <IconButton
                {...controlButtonProps}
                aria-label={muted ? "Ton ein" : "Stumm"}
                icon={muted || volumePct === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
              />
              <Box w="84px" minW="48px" pr={2}>
                <Slider
                  aria-label="Lautstärke"
                  value={volumePct}
                  min={0}
                  max={100}
                  step={1}
                  focusThumbOnChange={false}
                  onChange={onVolumeSlider}
                  colorScheme="brand"
                >
                  <SliderTrack bg="rgba(255, 255, 255, 0.3)" h="4px" borderRadius="full">
                    <SliderFilledTrack bg="var(--cc-text)" borderRadius="full" />
                  </SliderTrack>
                  <SliderThumb boxSize={3} bg="white" boxShadow="0 0 0 3px rgba(0, 0, 0, 0.35)" />
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
                  borderRadius="12px"
                  border="1px solid rgba(255, 255, 255, 0.12)"
                  bg="rgba(10, 12, 15, 0.96)"
                  backdropFilter="blur(14px)"
                  boxShadow="0 12px 32px rgba(0, 0, 0, 0.55)"
                  sx={{ WebkitBackdropFilter: "blur(14px)" }}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <Slider
                    aria-label="Lautstärke"
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
                    <SliderTrack w="6px" h="full" bg="rgba(255, 255, 255, 0.3)" borderRadius="full">
                      <SliderFilledTrack bg="var(--cc-text)" borderRadius="full" />
                    </SliderTrack>
                    <SliderThumb boxSize={3} bg="white" boxShadow="0 0 0 3px rgba(0, 0, 0, 0.35)" />
                  </Slider>
                </Box>
              ) : null}
              <IconButton
                {...controlButtonProps}
                aria-label={
                  isMobileControls
                    ? "Stumm / Lautstärke: kurz tippen oder länger drücken für Regler"
                    : muted
                      ? "Ton ein"
                      : "Stumm"
                }
                icon={muted || volumePct === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
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

            <Text
              className="cc-num"
              fontSize={{ base: "12px", md: "13px" }}
              color="var(--cc-text)"
              whiteSpace="nowrap"
              flexShrink={0}
              pl={{ base: 1, md: 2 }}
            >
              {formatTime(current)}
              <Box as="span" color="var(--cc-text-soft)">
                {` / ${formatTime(duration)}`}
              </Box>
            </Text>

            <Box flex="1" minW={0} />

            {hasSettings ? (
              <IconButton
                {...controlButtonProps}
                ref={settingsButtonRef}
                aria-label="Einstellungen"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-controls={menuOpen ? menuId : undefined}
                icon={<Settings size={20} />}
                // Offen = aktiver Zustand → Gold hell (DESIGN.md: Gold für aktiv/Fokus).
                color={menuOpen ? "var(--cc-gold-light)" : "var(--cc-text)"}
                sx={{
                  "& svg": {
                    transition: "transform 0.2s var(--cc-ease)",
                    transform: menuOpen ? "rotate(30deg)" : "none",
                  },
                  "@media (prefers-reduced-motion: reduce)": { "& svg": { transition: "none" } },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((open) => !open);
                }}
              />
            ) : null}

            <IconButton
              {...controlButtonProps}
              aria-label={fullscreen ? "Vollbild beenden" : "Vollbild"}
              icon={fullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
            />
          </HStack>
        </Box>

        {menuOpen && hasSettings ? (
          <PlayerSettingsMenu
            id={menuId}
            anchorRef={settingsButtonRef}
            onClose={closeMenu}
            onOutsidePointerDown={onMenuOutsidePointerDown}
            speed={speed}
            onSpeedChange={allowSpeed ? changeSpeed : undefined}
            quality={
              showQuality
                ? {
                    options: qualityOptions,
                    value: qualityChoice,
                    playingLabel: playingLevelLabel,
                    onChange: selectQuality,
                  }
                : undefined
            }
          />
        ) : null}
      </Box>

      {loadError ? (
        <Text px={4} py={3} fontSize="sm" color="red.300" className="inter">
          {loadError}
        </Text>
      ) : null}
    </Box>
  );
}
