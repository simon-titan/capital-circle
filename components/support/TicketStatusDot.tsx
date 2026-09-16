import { Box } from "@chakra-ui/react";
import type { TicketStatus } from "@/lib/support/shared";

/**
 * Status-Punkt der Tickets im Mitgliederbereich (v3.2): Champagner für offen
 * bzw. „wartet auf dich“ (mit Leuchten), Datentinte für in Bearbeitung, Grün
 * nur für gelöst. `STATUS_COLORS` aus lib/support/shared bleibt für den Adminbereich.
 */
const TONE: Record<TicketStatus, { color: string; glow?: boolean }> = {
  open: { color: "var(--cc-gold)" },
  in_progress: { color: "var(--cc-ink)" },
  waiting_on_user: { color: "var(--cc-gold-light)", glow: true },
  resolved: { color: "var(--cc-success)" },
  closed: { color: "var(--cc-text-3)" },
};

export function TicketStatusDot({ status, size = 8 }: { status: TicketStatus; size?: number }) {
  const tone = TONE[status] ?? TONE.closed;
  return (
    <Box
      as="span"
      display="inline-block"
      w={`${size}px`}
      h={`${size}px`}
      borderRadius="full"
      bg={tone.color}
      boxShadow={tone.glow ? "0 0 10px rgba(232, 192, 148, 0.55)" : undefined}
      flexShrink={0}
      aria-hidden
    />
  );
}
