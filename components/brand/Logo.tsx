import Image from "next/image";

/** Weißes Logo für dunkle Hintergründe, schwarzes Logo für helle Flächen. */
export type LogoVariant = "onDark" | "onLight";

const SRC: Record<LogoVariant, string> = {
  onDark: "/logo/logo-white.png",
  onLight: "/logo/logo-black.png",
};

export type LogoProps = {
  variant?: LogoVariant;
  /** Schmale Leiste / collapsed Sidebar */
  compact?: boolean;
  /** Überschreibt die Standardgröße (nur wenn nicht compact). */
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  /**
   * Entfernt optisch eingebettetes Schwarz im PNG (z. B. logo-white.png mit schwarzer Fläche):
   * `mix-blend-mode: lighten` — helle Pixel bleiben, Schwarz nimmt den Hintergrund an.
   */
  knockoutEmbeddedDark?: boolean;
};

export function Logo({
  variant = "onDark",
  compact = false,
  width: widthProp,
  height: heightProp,
  className,
  priority,
  knockoutEmbeddedDark = false,
}: LogoProps) {
  const width = compact ? 40 : (widthProp ?? 200);
  const height = compact ? 40 : (heightProp ?? 56);
  const maxW = compact ? width : widthProp ? widthProp + 24 : 220;

  const knockout = Boolean(knockoutEmbeddedDark && variant === "onDark");

  return (
    <Image
      src={SRC[variant]}
      alt="Capital Circle"
      width={width}
      height={height}
      priority={priority}
      className={className}
      style={{
        objectFit: "contain",
        width: compact ? width : "100%",
        maxWidth: maxW,
        height: "auto",
        display: "block",
        ...(knockout ? { mixBlendMode: "lighten" as const } : {}),
      }}
    />
  );
}
