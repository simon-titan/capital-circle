import { Box, type BoxProps } from "@chakra-ui/react";

export type PanelProps = BoxProps & {
  /** Hebt die Karte als Hero hervor (Gold-Rahmen, Gold-Schein) — z. B. Net P&L. */
  raised?: boolean;
};

/**
 * Die Fläche des Journals: dieselbe Glas-Karte mit Gold-Kante wie auf dem
 * Dashboard (`.cc-card` in globals.css). `--still`: Journal-Karten tragen
 * Diagramme und Tabellen — sie glühen beim Hover, heben sich aber nicht an.
 */
export function Panel({ raised, className, children, ...props }: PanelProps) {
  return (
    <Box
      className={["cc-card cc-card--still", raised ? "cc-card--hero" : null, className].filter(Boolean).join(" ")}
      p={{ base: 4, md: 5 }}
      {...props}
    >
      {children}
    </Box>
  );
}
