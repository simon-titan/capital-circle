"use client";

import { Hourglass, XCircle } from "lucide-react";

/** Wartend = Sanduhr in Gold hell; abgelehnt = ruhig neutral statt Alarmrot. */
export function PendingReviewStatusIcon({ rejected }: { rejected: boolean }) {
  if (rejected) {
    return <XCircle size={26} strokeWidth={1.75} color="var(--cc-text-2)" aria-hidden />;
  }
  return <Hourglass size={26} strokeWidth={1.75} color="var(--cc-gold-light)" aria-hidden />;
}
