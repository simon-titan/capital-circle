import type { Metadata } from "next";
import { FesterKassenEinstieg } from "@/components/kasse/FesterKassenEinstieg";
import { gueltigerCloser } from "@/lib/mentoring/fester-link";

export const metadata: Metadata = {
  title: "Premium Mentoring · Capital Circle",
  robots: { index: false, follow: false },
};

/**
 * Fester Kassenlink für das Premium Mentoring (nach der SignWell-Unterschrift).
 * `?closer=kevin|simon|daniel` ordnet den Kauf dem Closer zu. Regeln in
 * `lib/mentoring/fester-link.ts`.
 */
export default async function KassePremiumPage({ searchParams }: { searchParams: Promise<{ closer?: string | string[] }> }) {
  const { closer } = await searchParams;
  return <FesterKassenEinstieg produkt="premium" closer={gueltigerCloser(closer)} />;
}
