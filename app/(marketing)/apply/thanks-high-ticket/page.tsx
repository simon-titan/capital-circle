import type { Metadata } from "next";
import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { Logo } from "@/components/brand/Logo";

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
    <Box as="main" minH="100vh" w="full" py={{ base: 8, md: 14 }} px={{ base: 4, md: 8 }}>
      <Stack spacing={{ base: 8, md: 10 }} maxW="720px" mx="auto">
        <Box maxW="200px" mx="auto">
          <Logo variant="onDark" priority />
        </Box>

        {videoSrc ? (
          <Box
            maxW="768px"
            mx="auto"
            w="full"
            borderRadius="16px"
            overflow="hidden"
            border="1px solid rgba(255,255,255,0.09)"
            boxShadow="0 18px 60px rgba(0,0,0,0.55)"
            sx={{ aspectRatio: "16/9" }}
            bg="black"
          >
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
          </Box>
        ) : null}

        <Stack
          spacing={5}
          textAlign="center"
          align="center"
          p={{ base: 6, md: 10 }}
          sx={{
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: "16px",
            boxShadow:
              "0 8px 32px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.07)",
          }}
        >
          <Box
            w="64px"
            h="64px"
            borderRadius="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg="rgba(212,175,55,0.18)"
            border="1px solid rgba(212,175,55,0.5)"
            color="var(--color-accent-gold)"
            fontSize="32px"
          >
            ✓
          </Box>

          <Stack spacing={2}>
            <Text
              fontSize="xs"
              letterSpacing="0.22em"
              textTransform="uppercase"
              color="var(--color-accent-gold)"
              className="inter-semibold"
            >
              Bewerbung eingegangen
            </Text>
            <Heading
              as="h1"
              className="radley-regular"
              fontWeight={400}
              fontSize={{ base: "3xl", md: "4xl" }}
              lineHeight="1.15"
              color="var(--color-text-primary)"
            >
              Danke für deine Bewerbung!
            </Heading>
          </Stack>

          <Text
            fontSize={{ base: "md", md: "lg" }}
            color="rgba(255,255,255,0.72)"
            className="inter"
            maxW="520px"
            lineHeight="1.65"
          >
            Du hörst innerhalb von <Box as="span" color="var(--color-accent-gold)" className="inter-semibold">2 Stunden</Box> per WhatsApp von mir persönlich.
            Schau parallel auch in deine E-Mails — dort findest du eine Bestätigung.
          </Text>

          {whatsappLink ? (
            <Box
              as="a"
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              display="inline-flex"
              alignItems="center"
              gap={2}
              px={5}
              py={3}
              borderRadius="12px"
              border="1px solid rgba(255,255,255,0.12)"
              bg="rgba(255,255,255,0.04)"
              color="var(--color-text-primary)"
              className="inter"
              fontSize="sm"
              _hover={{
                borderColor: "rgba(212,175,55,0.45)",
                bg: "rgba(255,255,255,0.06)",
              }}
            >
              Du erreichst uns auch direkt: WhatsApp öffnen →
            </Box>
          ) : null}
        </Stack>

        <Text
          fontSize="xs"
          color="rgba(255,255,255,0.32)"
          textAlign="center"
          className="inter"
        >
          Bitte halte dein Telefon die nächsten Stunden griffbereit.
        </Text>
      </Stack>
    </Box>
  );
}
