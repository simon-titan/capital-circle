import type { Metadata } from "next";
import { InsightLandingPageClient } from "@/components/landing/InsightLandingPageClient";

export const metadata: Metadata = {
  title: "Kostenloser Insight — Capital Circle Institut",
  description:
    "Sichere dir kostenlos Zugang zu exklusiven Trading-Insights von Capital Circle. Bewirb dich jetzt und werde Teil unserer Community.",
};

export default function InsightPage() {
  return <InsightLandingPageClient />;
}
