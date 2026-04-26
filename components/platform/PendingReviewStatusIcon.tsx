"use client";

import { Hourglass, XCircle } from "lucide-react";

export function PendingReviewStatusIcon({ rejected }: { rejected: boolean }) {
  if (rejected) {
    return (
      <XCircle
        size={28}
        strokeWidth={1.75}
        color="#FCA5A5"
        aria-hidden
      />
    );
  }
  return (
    <Hourglass
      size={28}
      strokeWidth={1.75}
      color="var(--color-accent-gold, #D4AF37)"
      aria-hidden
    />
  );
}
