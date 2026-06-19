/**
 * Discord-Funnel — Client-seitiger Video-Tracking-Helper.
 *
 * Framework-agnostisch (reine Funktionen, kein React-Hook). Die Landing-Clients
 * rufen `createVideoTracker(...)` einmal auf und hängen `handleProgress` an
 * `GlassVideoPlayer.onProgress` sowie `handleEnded` an `onEnded`.
 *
 * Vereinheitlicht die zuvor in DiscordTerminClient inline gepflegte Throttle-/
 * Prozent-Logik und ergänzt session_id + source, damit auch /termin- & /video-
 * Watches VOR der Lead-Anlage (nur session_id) erfasst werden.
 */
import type { VideoSource } from "./types";

/** Throttle-Intervall für Video-Fortschritts-POSTs (ms). */
export const VIDEO_POST_INTERVAL_MS = 10_000;

/** sessionStorage-Key für die Funnel-Session (gleich wie in den Landing-Clients). */
const SESSION_STORAGE_KEY = "cc_discord_sid";

/**
 * Liest bzw. erzeugt die Funnel-Session-ID aus sessionStorage.
 * Gleiche Logik wie `TerminDirectClient.getOrCreateSessionId`.
 */
export function getOrCreateSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const newId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_STORAGE_KEY, newId);
    return newId;
  } catch {
    return "unknown";
  }
}

export interface VideoTracker {
  /**
   * Bei jedem Progress-Tick aufrufen (GlassVideoPlayer feuert ~alle 250ms).
   * `durationOrEl` erlaubt es, die Gesamtdauer für die Prozent-Berechnung
   * mitzugeben — entweder als Zahl (Sekunden) oder als `<video>`-Element.
   * Fehlt sie, wird die zuletzt bekannte Dauer verwendet.
   */
  handleProgress: (seconds: number, durationOrEl?: number | HTMLVideoElement | null) => void;
  /** Beim `ended`-Event aufrufen — postet sofort mit completed=true. */
  handleEnded: () => void;
}

interface CreateVideoTrackerOptions {
  /** Lead-Token (lid), falls bereits bekannt. Sonst null/undefined. */
  token?: string | null;
  /** Herkunft des Video-Views. */
  source: VideoSource;
}

function resolveDuration(durationOrEl?: number | HTMLVideoElement | null): number {
  if (typeof durationOrEl === "number" && Number.isFinite(durationOrEl) && durationOrEl > 0) {
    return durationOrEl;
  }
  if (durationOrEl && typeof durationOrEl === "object") {
    const dur = durationOrEl.duration;
    if (Number.isFinite(dur) && dur > 0) return dur;
  }
  // Fallback: GlassVideoPlayer.onProgress liefert nur Sekunden — Dauer aus dem
  // gerenderten <video> der Glass-Shell ziehen (gleiche Quelle wie zuvor inline).
  try {
    const el = document.querySelector<HTMLVideoElement>(".cc-video-shell video");
    const dur = el?.duration;
    if (dur && Number.isFinite(dur) && dur > 0) return dur;
  } catch {
    // document nicht verfügbar — letzte bekannte Dauer verwenden.
  }
  return 0;
}

/**
 * Erzeugt einen Tracker-Instanz mit eigenem Throttle-/Prozent-State.
 * Postet an `/api/discord-funnel/video` (fetch keepalive, Fehler werden geschluckt).
 */
export function createVideoTracker({ token, source }: CreateVideoTrackerOptions): VideoTracker {
  let lastPostAt = 0;
  let lastSeconds = 0;
  let lastPercent = 0;
  let durationSeconds = 0;
  // Zeitpunkt des ersten Posts dieser Tracker-Instanz (ISO).
  let sessionStart: string | null = null;

  function post(watchSeconds: number, percent: number, completed: boolean) {
    if (!sessionStart) sessionStart = new Date().toISOString();
    lastPostAt = Date.now();

    let sessionId = "unknown";
    try {
      sessionId = getOrCreateSessionId();
    } catch {
      // sessionStorage nicht verfügbar — mit Fallback weiter.
    }

    try {
      fetch("/api/discord-funnel/video", {
        method: "POST",
        headers: { "content-type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          session_id: sessionId,
          token: token ?? null,
          watchSeconds,
          percent,
          source,
          completed,
          sessionStart,
        }),
      }).catch(() => undefined);
    } catch {
      // Tracking-Fehler still ignorieren.
    }
  }

  function handleProgress(
    seconds: number,
    durationOrEl?: number | HTMLVideoElement | null,
  ): void {
    const dur = resolveDuration(durationOrEl);
    if (dur > 0) durationSeconds = dur;

    const watchSeconds = Math.floor(seconds);
    const percent = durationSeconds > 0 ? Math.round((seconds / durationSeconds) * 100) : 0;
    lastSeconds = watchSeconds;
    lastPercent = percent;

    const now = Date.now();
    if (now - lastPostAt >= VIDEO_POST_INTERVAL_MS) {
      post(watchSeconds, percent, false);
    }
  }

  function handleEnded(): void {
    post(lastSeconds, Math.max(lastPercent, 100), true);
  }

  return { handleProgress, handleEnded };
}
