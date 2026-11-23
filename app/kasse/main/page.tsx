import type { Metadata } from "next";
import { FesterKassenEinstieg } from "@/components/kasse/FesterKassenEinstieg";
import { gueltigerCloser } from "@/lib/mentoring/fester-link";

export const metadata: Metadata = {
  title: "Main Mentoring · Capital Circle",
  robots: { index: false, follow: false },
};

/**
 * Fester Kassenlink für das Main Mentoring (nach der SignWell-Unterschrift).
 * `?closer=kevin|simon|daniel` ordnet den Kauf dem Closer zu. Regeln in
 * `lib/mentoring/fester-link.ts`.
 */
export default async function KasseMainPage({ searchParams }: { searchParams: Promise<{ closer?: string | string[] }> }) {
  const { closer } = await searchParams;
  return <FesterKassenEinstieg produkt="main" closer={gueltigerCloser(closer)} />;
}
