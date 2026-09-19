/**
 * Reine Hilfsfunktionen für das Einstellungsmenü des `GlassVideoPlayer`
 * (Wiedergabegeschwindigkeit und HLS-Qualitätsstufen). Kein React, kein DOM
 * außer dem abgesicherten `localStorage`-Zugriff.
 */
import type { Level } from "hls.js";

/** Geschwindigkeiten wie bei YouTube. */
export const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

/** Pro Browser gemerkt — die Qualität bewusst nicht (Standard bleibt „Automatisch“). */
const SPEED_STORAGE_KEY = "cc-player-speed";

/** „Normal“ für 1, sonst deutsches Dezimalkomma: 0,25 · 1,5 · 2. */
export function formatSpeed(rate: number): string {
  if (Math.abs(rate - 1) < 0.001) return "Normal";
  return String(Math.round(rate * 100) / 100).replace(".", ",");
}

function isSpeedOption(value: number): boolean {
  return SPEED_OPTIONS.some((option) => Math.abs(option - value) < 0.001);
}

/** Gemerkte Geschwindigkeit oder `null` (nichts gemerkt, ungültig oder kein Speicher). */
export function readStoredSpeed(): number | null {
  try {
    const raw = window.localStorage.getItem(SPEED_STORAGE_KEY);
    if (raw == null) return null;
    const value = Number(raw);
    return Number.isFinite(value) && isSpeedOption(value) ? value : null;
  } catch {
    // Privates Fenster, blockierte Website-Daten o. Ä. — dann eben ohne Merken.
    return null;
  }
}

export function writeStoredSpeed(rate: number): void {
  try {
    if (Math.abs(rate - 1) < 0.001) window.localStorage.removeItem(SPEED_STORAGE_KEY);
    else window.localStorage.setItem(SPEED_STORAGE_KEY, String(rate));
  } catch {
    // Ohne Speicher funktioniert die Wahl trotzdem — nur nicht über den Besuch hinaus.
  }
}

/** Eine wählbare Qualitätsstufe; `levelIndex` zeigt in `hls.levels`. */
export type QualityOption = {
  /** Stabiler Schlüssel = Beschriftung („720p“), überlebt Umsortierungen von `hls.levels`. */
  key: string;
  label: string;
  levelIndex: number;
  /** Zeilenzahl (kürzere Bildseite) — Sortierschlüssel. */
  lines: number;
  bitrate: number;
};

type LevelLike = Pick<Level, "width" | "height" | "bitrate">;

/**
 * Beschriftung einer Stufe wie bei YouTube: die kürzere Bildseite in „p“,
 * damit ein Hochkant-Video mit 1080×1920 als 1080p erscheint und nicht als
 * 1920p. Stufen ohne Auflösungsangabe fallen auf die Bitrate zurück.
 */
export function levelLabel(level: LevelLike | undefined | null): string | null {
  if (!level) return null;
  const lines = levelLines(level);
  if (lines > 0) return `${lines}p`;
  if (level.bitrate > 0) return `${Math.round(level.bitrate / 1000)} kbit/s`;
  return null;
}

function levelLines(level: LevelLike): number {
  const { width, height } = level;
  if (width > 0 && height > 0) return Math.min(width, height);
  return height > 0 ? height : 0;
}

/**
 * HLS-Stufen → Menüeinträge: gleiche Beschriftung wird zusammengefasst (es
 * gewinnt die höchste Bitrate), sortiert von hoch nach niedrig.
 */
export function buildQualityOptions(levels: readonly LevelLike[]): QualityOption[] {
  const byKey = new Map<string, QualityOption>();
  levels.forEach((level, levelIndex) => {
    const label = levelLabel(level);
    if (!label) return;
    const previous = byKey.get(label);
    if (previous && previous.bitrate >= level.bitrate) return;
    byKey.set(label, { key: label, label, levelIndex, lines: levelLines(level), bitrate: level.bitrate });
  });
  return [...byKey.values()].sort((a, b) => b.lines - a.lines || b.bitrate - a.bitrate);
}
