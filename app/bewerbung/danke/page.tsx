import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DankePageClient } from "./DankePageClient";

export const metadata: Metadata = {
  title: "Vielen Dank — Capital Circle Institut",
  description: "Deine erweiterte Bewerbung ist eingegangen. Buche jetzt dein persönliches Gespräch.",
};

const CALENDLY_BASE =
  "https://calendly.com/contact-capitalcircletrading/30min?background_color=222222&text_color=ffffff&primary_color=d4af37&hide_gdpr_banner=1";

function buildCalendlyUrl(userId: string, email: string, firstName: string): string {
  const url = new URL(CALENDLY_BASE);
  if (firstName) url.searchParams.set("first_name", firstName);
  if (email) url.searchParams.set("email", email);
  url.searchParams.set("utm_source", "capital-circle");
  url.searchParams.set("utm_medium", "step2");
  url.searchParams.set("utm_content", userId);

  return url.toString();
}

export default async function DankePage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", authData.user.id)
    .single();

  const fullName = (profile?.full_name as string | null) ?? "";
  const firstName = fullName.trim().split(/\s+/)[0] ?? "";
  const email = authData.user.email ?? "";

  const calendlyUrl = buildCalendlyUrl(authData.user.id, email, firstName);

  return <DankePageClient calendlyUrl={calendlyUrl} />;
}
