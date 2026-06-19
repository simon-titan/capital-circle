import type { Metadata } from "next";
import { Suspense } from "react";
import { TerminDirectClient } from "@/components/landing/TerminDirectClient";

export const metadata: Metadata = {
  title: "Dein kostenloser Termin — Capital Circle",
  description:
    "Schau das Video vollständig an und sichere dir deinen persönlichen Gesprächstermin mit Capital Circle.",
  robots: { index: false, follow: false },
};

export default function TerminPage() {
  return (
    <Suspense fallback={null}>
      <TerminDirectClient />
    </Suspense>
  );
}
