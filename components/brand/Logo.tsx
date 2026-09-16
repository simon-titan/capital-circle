import type { CSSProperties } from "react";

/** Helle Wortmarke für dunkle Flächen, dunkle Wortmarke für helle Flächen. */
export type LogoVariant = "onDark" | "onLight";

export type LogoProps = {
  variant?: LogoVariant;
  /** Schmale Leiste / collapsed Sidebar: Monogramm „CC“. */
  compact?: boolean;
  /** Zielbreite der Wortmarke in px; bestimmt die Schriftgröße (200 → ~15px wie in der Sidebar). */
  width?: number;
  /** @deprecated Stammt vom früheren Logo-Bild; ohne Wirkung. */
  height?: number;
  className?: string;
  /** @deprecated Stammt vom früheren Logo-Bild; ohne Wirkung. */
  priority?: boolean;
  /** @deprecated Stammt vom früheren Logo-Bild; ohne Wirkung. */
  knockoutEmbeddedDark?: boolean;
};

/** „CAPITAL CIRCLE“ in Inter 400 mit 0.32em Sperrung ist rund 13em breit. */
const WORDMARK_EMS = 13;

/**
 * Wortmarke nach DESIGN.md v3.2: „CAPITAL CIRCLE“ in Inter 400, versal, 0.32em
 * gesperrt — wie in der Plattform-Sidebar. Ersetzt das frühere Serif-Logo-Bild.
 * Reiner Text ohne Hooks, damit Server- und Client-Komponenten sie nutzen können;
 * auf schmalen Screens schrumpft sie mit der Viewport-Breite.
 */
export function Logo({ variant = "onDark", compact = false, width = 200, className }: LogoProps) {
  const style: CSSProperties = {
    display: "inline-block",
    fontFamily: "var(--font-body, 'Inter'), system-ui, sans-serif",
    fontSize: compact
      ? "15px"
      : `min(${(width / WORDMARK_EMS).toFixed(1)}px, calc((100vw - 2rem) / ${WORDMARK_EMS}))`,
    fontWeight: 400,
    letterSpacing: compact ? "0.2em" : "0.32em",
    lineHeight: 1,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    color: variant === "onLight" ? "var(--cc-bg)" : "var(--cc-text)",
  };

  if (compact) {
    return (
      <span className={className} style={style} role="img" aria-label="Capital Circle">
        CC
      </span>
    );
  }

  return (
    <span className={className} style={style}>
      Capital Circle
    </span>
  );
}
