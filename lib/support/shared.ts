export type TicketStatus = "open" | "in_progress" | "waiting_on_user" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high";
export type TicketCategory = "technical" | "billing" | "account" | "other";
export type SenderType = "user" | "admin";

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Offen",
  in_progress: "In Bearbeitung",
  waiting_on_user: "Wartet auf Antwort",
  resolved: "Gelöst",
  closed: "Geschlossen",
};

export const STATUS_COLORS: Record<TicketStatus, string> = {
  open: "#D4AF37",
  in_progress: "#4FA3E3",
  waiting_on_user: "#E8A23D",
  resolved: "#4ADE80",
  closed: "rgba(255,255,255,0.45)",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Niedrig",
  normal: "Normal",
  high: "Hoch",
};

export const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: "rgba(255,255,255,0.45)",
  normal: "#D4AF37",
  high: "#F87171",
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  technical: "Technisch",
  billing: "Abrechnung",
  account: "Account",
  other: "Sonstiges",
};

export const CATEGORY_OPTIONS: TicketCategory[] = ["technical", "billing", "account", "other"];
export const STATUS_OPTIONS: TicketStatus[] = ["open", "in_progress", "waiting_on_user", "resolved", "closed"];
export const PRIORITY_OPTIONS: TicketPriority[] = ["low", "normal", "high"];

/**
 * Humanisiert eine Dauer in Millisekunden — z. B. "2 Std 14 Min" oder "3 Tage".
 * Rundet auf die groebste sinnvolle Einheit, damit die Admin-Tabelle kompakt bleibt.
 */
export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return "< 1 Min";
  if (minutes < 60) return `${minutes} Min`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 24) {
    return remMinutes > 0 ? `${hours} Std ${remMinutes} Min` : `${hours} Std`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days} Tage ${remHours} Std` : `${days} Tage`;
}

/** Antwortzeit-Spalte: fertige Dauer bis zur ersten Admin-Antwort, sonst "offen seit X". */
export function formatResponseTime(createdAt: string, firstResponseAt: string | null): { label: string; isPending: boolean } {
  const created = new Date(createdAt).getTime();
  if (firstResponseAt) {
    const responded = new Date(firstResponseAt).getTime();
    return { label: formatDuration(responded - created), isPending: false };
  }
  return { label: `offen seit ${formatDuration(Date.now() - created)}`, isPending: true };
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}
