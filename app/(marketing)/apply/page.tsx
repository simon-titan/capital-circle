import type { Metadata } from "next";
import { Box, Stack, Text } from "@chakra-ui/react";
import { HTApplicationForm } from "@/components/marketing/HTApplicationForm";
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
    <Box as="main" minH="100vh" w="full" py={{ base: 8, md: 14 }} px={{ base: 4, md: 8 }}>
      <Stack spacing={{ base: 8, md: 10 }}>
        <Box maxW="200px" mx="auto">
          <Logo variant="onDark" priority />
        </Box>

        <Stack spacing={3} maxW="720px" mx="auto" textAlign="center">
          <Text
            fontSize="xs"
            letterSpacing="0.22em"
            textTransform="uppercase"
            color="var(--color-accent-gold)"
            className="inter-semibold"
          >
            High-Ticket · 1:1 Mentoring
          </Text>
          <Text
            as="h1"
            className="radley-regular"
            fontWeight={400}
            fontSize={{ base: "3xl", md: "5xl" }}
            lineHeight="1.1"
            color="var(--color-text-primary)"
          >
            Bereit für den nächsten Schritt?
          </Text>
          <Text
            fontSize={{ base: "md", md: "lg" }}
            color="rgba(255,255,255,0.62)"
            className="inter"
          >
            8 kurze Fragen. Wir melden uns innerhalb von 2 Stunden persönlich
            per WhatsApp — keine automatisierten Emails, keine Funnels.
          </Text>
        </Stack>

        <HTApplicationForm
          videoSrc={videoSrc}
          videoPoster={videoPoster}
          prefillEmail={prefill.email}
          prefillName={prefill.name}
        />

        <Text
          fontSize="xs"
          color="rgba(255,255,255,0.32)"
          textAlign="center"
          className="inter"
          maxW="520px"
          mx="auto"
        >
          Mit dem Abschicken stimmst du unserer{" "}
          <Box as="a" href="/datenschutz" color="var(--color-accent-gold)" textDecoration="underline">
            Datenschutzerklärung
          </Box>{" "}
          zu. Trading birgt Verlustrisiken — Ergebnisse aus der Vergangenheit sind keine Garantie.
        </Text>
      </Stack>
    </Box>
  );
}
