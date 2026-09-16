import type { Metadata } from "next";
import { Box, Stack } from "@chakra-ui/react";
import { HTApplicationForm } from "@/components/marketing/HTApplicationForm";
import {
  FunnelEyebrow,
  FunnelFinePrint,
  FunnelHeadline,
  FunnelLead,
  GoldWord,
  rise,
} from "@/components/marketing/funnel-ui";
import { Logo } from "@/components/brand/Logo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "1:1 Mentoring — Bewerbung · Capital Circle",
  description:
    "Bewirb dich für das Capital Circle High-Ticket Programm. 8 kurze Fragen — wir melden uns innerhalb von 2 Stunden persönlich.",
};

export const dynamic = "force-dynamic";

/**
 * Eingeloggte User können den Kontakt-Step überspringen — wir reichen
 * Email + Name aus dem Profil als Prefill durch.
 */
async function getPrefill(): Promise<{ email?: string; name?: string }> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return {};
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", data.user.id)
      .maybeSingle();
    return {
      email: data.user.email ?? undefined,
      name: (profile?.full_name as string | null) ?? undefined,
    };
  } catch {
    return {};
  }
}

export default async function ApplyPage() {
  const prefill = await getPrefill();
  const videoSrc = process.env.NEXT_PUBLIC_HT_INTRO_VIDEO_URL?.trim() || undefined;
  const videoPoster = process.env.NEXT_PUBLIC_HT_INTRO_VIDEO_POSTER?.trim() || undefined;

  return (
    <Box as="main" minH="100vh" w="full" py={{ base: 10, md: 16 }} px={{ base: 4, md: 8 }}>
      <Stack spacing={{ base: 8, md: 10 }}>
        <Box maxW="180px" mx="auto" {...rise(0)}>
          <Logo variant="onDark" priority />
        </Box>

        <Stack spacing={5} maxW="720px" mx="auto" textAlign="center" align="center" {...rise(1)}>
          <FunnelEyebrow>High-Ticket · 1:1 Mentoring</FunnelEyebrow>
          <FunnelHeadline>
            Bereit für den <GoldWord>nächsten Schritt</GoldWord>?
          </FunnelHeadline>
          <FunnelLead maxW="600px">
            8 kurze Fragen. Wir melden uns innerhalb von 2 Stunden persönlich
            per WhatsApp — keine automatisierten Emails, keine Funnels.
          </FunnelLead>
        </Stack>

        <Box w="full" {...rise(2)}>
          <HTApplicationForm
            videoSrc={videoSrc}
            videoPoster={videoPoster}
            prefillEmail={prefill.email}
            prefillName={prefill.name}
          />
        </Box>

        <FunnelFinePrint textAlign="center" maxW="520px" mx="auto">
          Mit dem Abschicken stimmst du unserer{" "}
          <Box
            as="a"
            href="/datenschutz"
            color="var(--cc-gold-light)"
            textDecoration="underline"
            textUnderlineOffset="2px"
          >
            Datenschutzerklärung
          </Box>{" "}
          zu. Trading birgt Verlustrisiken — Ergebnisse aus der Vergangenheit sind keine Garantie.
        </FunnelFinePrint>
      </Stack>
    </Box>
  );
}
