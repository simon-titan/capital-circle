import type { Metadata } from "next";
import { LandingPageClient } from "@/components/landing/LandingPageClient";

export const metadata: Metadata = {
  title: "Bewerbung — Capital Circle Institut",
  description:
    "Bewirb dich jetzt für die exklusive Capital Circle Trading-Ausbildung. Lerne von Profis und werde Teil unserer Community.",
};

/**
 * /bewerbung — die volle Marketing-Landingpage (ehemals Root `/`).
 * Auth-Redirect (eingeloggt → /dashboard) übernimmt proxy.ts.
 */
export default function BewerbungPage() {
  return <LandingPageClient />;
}
