import type { Metadata } from "next";
import { Box, Button, Stack } from "@chakra-ui/react";
import { Logo } from "@/components/brand/Logo";
import {
  FunnelEyebrow,
  FunnelFinePrint,
  FunnelHeadline,
  FunnelLead,
  FunnelVideoFrame,
  GoldWord,
  SuccessMark,
  rise,
} from "@/components/marketing/funnel-ui";

export const metadata: Metadata = {
  title: "Bewerbung eingegangen — 1:1 Mentoring · Capital Circle",
  description:
    "Wir melden uns innerhalb von 2 Stunden persönlich per WhatsApp.",
  robots: { index: false, follow: false },
};

export default function ThanksHighTicketPage() {
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() || "";
  const videoSrc = process.env.NEXT_PUBLIC_HT_THANKS_VIDEO_URL?.trim() || "";
  const videoPoster = process.env.NEXT_PUBLIC_HT_THANKS_VIDEO_POSTER?.trim() || "";

  // WhatsApp-Link nur ohne Sonderzeichen — wa.me akzeptiert Ziffern und „+".
  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/[^\d+]/g, "")}`
    : null;

  return (
    <Box as="main" minH="100vh" w="full" py={{ base: 10, md: 16 }} px={{ base: 4, md: 8 }}>
      <Stack spacing={{ base: 8, md: 10 }} maxW="720px" mx="auto">
        <Box maxW="180px" mx="auto" {...rise(0)}>
          <Logo variant="onDark" priority />
        </Box>

        {videoSrc ? (
          <Box w="full" {...rise(1)}>
            <FunnelVideoFrame>
              <Box
                as="video"
                src={videoSrc}
                poster={videoPoster || undefined}
                controls
                playsInline
                autoPlay
                preload="metadata"
                w="full"
                h="full"
                sx={{ objectFit: "cover" }}
              />
            </FunnelVideoFrame>
          </Box>
        ) : null}

        <Stack
          spacing={5}
          textAlign="center"
          align="center"
          p={{ base: 6, md: 10 }}
          {...rise(2, "cc-card")}
        >
          <SuccessMark />

          <Stack spacing={4} align="center">
            <FunnelEyebrow>Bewerbung eingegangen</FunnelEyebrow>
            <FunnelHeadline scale="lg">Danke für deine Bewerbung!</FunnelHeadline>
          </Stack>

          <FunnelLead maxW="520px" lineHeight={1.65}>
            Du hörst innerhalb von <GoldWord fontWeight={600}>2 Stunden</GoldWord> per WhatsApp von mir persönlich.
            Schau parallel auch in deine E-Mails — dort findest du eine Bestätigung.
          </FunnelLead>

          {whatsappLink ? (
            <Button
              as="a"
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              variant="line"
              h="auto"
              minH="44px"
              maxW="full"
              py={3}
              px={5}
              fontSize="14px"
              whiteSpace="normal"
            >
              Du erreichst uns auch direkt: WhatsApp öffnen →
            </Button>
          ) : null}
        </Stack>

        <FunnelFinePrint textAlign="center">Bitte halte dein Telefon die nächsten Stunden griffbereit.</FunnelFinePrint>
      </Stack>
    </Box>
  );
}
