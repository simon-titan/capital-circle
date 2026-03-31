import { Box, type BoxProps } from "@chakra-ui/react";

export type GlassCardProps = BoxProps & {
  /** Stärkerer Kontrast + Akzentlinie (z. B. Dashboard-Karten) */
  highlight?: boolean;
  /** Zusätzliche Betonung (z. B. Hausaufgabe, Events) */
  spotlight?: boolean;
  /** Hero-Variante für den Welcome-Bereich */
  hero?: boolean;
  /** Dashboard-Karten im Hero-Subcard-Stil (siehe HERO-UI-SPEZIFIKATION.md) */
  dashboard?: boolean;
};

export function GlassCard({ highlight, spotlight, hero, dashboard, className, children, ...props }: GlassCardProps) {
  const classes = [
    dashboard
      ? "glass-card-dashboard"
      : hero
        ? "glass-card-hero"
        : spotlight
          ? "glass-card-spotlight"
          : highlight
            ? "glass-card-highlight"
            : "glass-card",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const inner =
    dashboard ? (
      <Box position="relative" zIndex={1}>
        {children}
      </Box>
    ) : (
      children
    );

  return (
    <Box
      className={classes}
      p={dashboard ? { base: 4, md: 5 } : 6}
      borderRadius={dashboard ? "14px" : "16px"}
      transition="all 0.2s ease"
      _hover={
        dashboard
          ? {
              borderColor: "rgba(232, 197, 71, 0.52)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.5), 0 0 32px rgba(212,175,55,0.16), inset 0 1px 0 rgba(255,255,255,0.09)",
            }
          : hero
            ? { borderColor: "rgba(232, 197, 71, 0.72)", boxShadow: "0 18px 56px rgba(0,0,0,0.55), 0 0 64px rgba(232, 197, 71, 0.28)" }
            : highlight || spotlight
              ? { borderColor: "rgba(212, 175, 55, 0.75)" }
              : { borderColor: "rgba(255,255,255,0.16)" }
      }
      {...props}
    >
      {inner}
    </Box>
  );
}
