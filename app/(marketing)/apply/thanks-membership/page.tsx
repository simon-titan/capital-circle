import type { Metadata } from "next";
import { Box, Heading, HStack, Stack, Text } from "@chakra-ui/react";
import { Logo } from "@/components/brand/Logo";
import { glassPrimaryButtonProps } from "@/components/ui/glassButtonStyles";

export const metadata: Metadata = {
  title: "Du hast bestanden — Mitgliedschaft · Capital Circle",
  description:
    "Du erfüllst alle Voraussetzungen für die Capital Circle Mitgliedschaft. Wähle deinen Plan und starte sofort.",
  robots: { index: false, follow: false },
};

export default function ThanksMembershipPage() {
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL?.trim() || "";
  const videoSrc = process.env.NEXT_PUBLIC_MEMBERSHIP_THANKS_VIDEO_URL?.trim() || "";
  const videoPoster =
    process.env.NEXT_PUBLIC_MEMBERSHIP_THANKS_VIDEO_POSTER?.trim() || "";

  return (
    <Box as="main" minH="100vh" w="full" py={{ base: 8, md: 14 }} px={{ base: 4, md: 8 }}>
      <Stack spacing={{ base: 8, md: 10 }} maxW="780px" mx="auto">
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
          spacing={6}
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
          <Stack spacing={2}>
            <Text
              fontSize="xs"
              letterSpacing="0.22em"
              textTransform="uppercase"
              color="var(--color-accent-gold)"
              className="inter-semibold"
            >
              Voraussetzungen erfüllt
            </Text>
            <Heading
              as="h1"
              className="radley-regular"
              fontWeight={400}
              fontSize={{ base: "3xl", md: "4xl" }}
              lineHeight="1.15"
              color="var(--color-text-primary)"
            >
              Du hast alle Voraussetzungen erfüllt!
            </Heading>
          </Stack>

          <Text
            fontSize={{ base: "md", md: "lg" }}
            color="rgba(255,255,255,0.72)"
            className="inter"
            maxW="560px"
            lineHeight="1.7"
          >
            Du bist bereit für Capital Circle. Auf der Plattform findest du das
            komplette Curriculum, tägliche Live-Analysen, das Trading-Journal mit
            datengetriebenem Edge-Tracking — und eine Community, die dasselbe Ziel
            verfolgt wie du. Wähle deinen Einstieg.
          </Text>

          <Stack
            spacing={4}
            w="full"
            maxW="520px"
            pt={2}
          >
            <HStack
              spacing={3}
              flexWrap={{ base: "wrap", md: "nowrap" }}
              w="full"
              justify="center"
            >
              <Box
                as="a"
                href="/pricing?plan=monthly"
                {...glassPrimaryButtonProps}
                w="full"
                textAlign="center"
                textDecoration="none"
                display="flex"
              >
                97 € / Monat →
              </Box>
              <Box
                as="a"
                href="/pricing?plan=lifetime"
                {...glassPrimaryButtonProps}
                w="full"
                textAlign="center"
                textDecoration="none"
                display="flex"
              >
                699 € Lifetime →
              </Box>
            </HStack>
            <Text fontSize="xs" color="rgba(255,255,255,0.42)" className="inter">
              Beide Pläne sind monatlich kündbar bzw. einmalig — kein Abo-Trick.
            </Text>
          </Stack>

          {calendlyUrl ? (
            <Box pt={4}>
              <Box
                as="a"
                href={calendlyUrl}
                target="_blank"
                rel="noopener noreferrer"
                color="var(--color-text-secondary)"
                className="inter"
                fontSize="sm"
                textDecoration="underline"
                _hover={{ color: "var(--color-accent-gold)" }}
              >
                Doch lieber Fragen? Kostenloses Erstgespräch buchen →
              </Box>
            </Box>
          ) : null}
        </Stack>

        <Stack spacing={3} maxW="640px" mx="auto" textAlign="center">
          <Text
            fontSize="xs"
            letterSpacing="0.18em"
            textTransform="uppercase"
            color="rgba(255,255,255,0.38)"
            className="inter-semibold"
          >
            Was dich erwartet
          </Text>
          <Stack spacing={2} className="inter" fontSize="sm" color="rgba(255,255,255,0.62)">
            <Text>
              Sofortiger Zugriff auf alle Module & Live-Analysen
            </Text>
            <Text>
              Trading-Journal mit datengetriebenem Edge-Tracking
            </Text>
            <Text>
              Aktive Community von ambitionierten Tradern
            </Text>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}
