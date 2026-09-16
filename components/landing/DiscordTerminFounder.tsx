"use client";

import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import Image from "next/image";
import { TrendingUp, Users, DollarSign, Award, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { landingConfig } from "@/config/landing-config";
import { FunnelEyebrow, GoldIconTile } from "./DiscordFunnelChrome";

/**
 * „Meet the Founder“ für die Funnel-Seiten (/discord/termin, /termin). Inhalte aus
 * landingConfig.founder (unverändert). Look nach DESIGN.md v3.2: Glas-Karten,
 * Gold-Icon-Kacheln, Champagner als einziger Akzent.
 */

const ACHIEVEMENT_CARDS: { icon: LucideIcon; label: string; value: string; sub: string }[] = [
  { icon: Award, label: "Funded Status", value: "7-stellig", sub: "Nachgewiesen und gehalten" },
  { icon: DollarSign, label: "Verifizierte Payouts", value: "300.000 €", sub: "Ausgezahlte Gewinne" },
  { icon: Users, label: "Ausgebildete Trader", value: "1.000+", sub: "Persönlich betreut" },
  { icon: TrendingUp, label: "Aktives Trading", value: "4 Jahre", sub: "An den Kapitalmärkten" },
];

const socialLinkSx = {
  background: "rgba(255, 255, 255, 0.02)",
  border: "1px solid var(--cc-line-strong)",
  color: "var(--cc-text-2)",
  transition:
    "background-color 180ms var(--cc-ease), border-color 180ms var(--cc-ease), color 180ms var(--cc-ease), transform 180ms var(--cc-ease)",
  _hover: {
    background: "rgba(212, 176, 128, 0.06)",
    borderColor: "var(--cc-gold-line)",
    color: "var(--cc-text)",
    transform: "translateY(-2px)",
  },
};

const labelTextProps = {
  fontSize: "12px",
  fontWeight: 500,
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
  color: "var(--cc-text-2)",
};

function Strong({ children }: { children: ReactNode }) {
  return (
    <Box as="strong" color="var(--cc-text)" fontWeight={600}>
      {children}
    </Box>
  );
}

export function DiscordTerminFounder() {
  const { founder } = landingConfig;

  return (
    <Box as="section" aria-labelledby="founder-name" w="100%" position="relative" py={{ base: 14, md: 20 }}>
      <Box maxW="980px" mx="auto" position="relative" zIndex={1} px={{ base: 4, md: 8, lg: 12 }}>
        {/* Section label */}
        <Box mb={10}>
          <FunnelEyebrow justify={{ base: "center", lg: "flex-start" }}>Meet the Founder</FunnelEyebrow>
        </Box>

        <Stack direction={{ base: "column", lg: "row" }} gap={{ base: 10, lg: 14 }} align={{ base: "center", lg: "flex-start" }}>
          {/* LEFT: Photo + Social */}
          <Box
            flexShrink={0}
            textAlign="center"
            alignSelf={{ base: "center", lg: "flex-start" }}
            position={{ base: "relative", lg: "sticky" }}
            top={{ lg: "100px" }}
          >
            <Box position="relative" display="inline-block">
              {/* Weicher Champagner-Schein hinter dem Foto */}
              <Box
                position="absolute"
                inset="-28px"
                borderRadius="full"
                pointerEvents="none"
                aria-hidden
                bg="radial-gradient(closest-side, rgba(212, 176, 128, 0.16), transparent)"
              />
              <Box
                w={{ base: "220px", md: "280px", lg: "320px" }}
                h={{ base: "290px", md: "360px", lg: "420px" }}
                borderRadius="12px"
                overflow="hidden"
                position="relative"
                mx="auto"
                border="1px solid rgba(212, 176, 128, 0.28)"
                boxShadow="0 20px 56px rgba(0, 0, 0, 0.5), 0 0 44px rgba(212, 176, 128, 0.12)"
                bg="var(--cc-surface)"
              >
                <Box
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                  h="1px"
                  zIndex={1}
                  aria-hidden
                  bg="linear-gradient(90deg, transparent, rgba(232, 192, 148, 0.85), transparent)"
                />
                <Box position="relative" w="full" h="full" minH={0}>
                  <Image
                    src={founder.image}
                    alt={founder.name}
                    fill
                    sizes="(max-width: 48em) 220px, (max-width: 64em) 280px, 320px"
                    style={{ objectFit: "cover" }}
                    priority
                  />
                </Box>
              </Box>
            </Box>

            {/* Social links (Marken-Icons neutral) */}
            <HStack justify="center" gap={3} mt={7}>
              {[
                { href: founder.socialLinks.instagram, label: "Instagram", path: "ig" },
                { href: founder.socialLinks.tiktok, label: "TikTok", path: "tt" },
              ].map((s) => (
                <Box
                  key={s.path}
                  as="a"
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  w="40px"
                  h="40px"
                  borderRadius="full"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  sx={socialLinkSx}
                >
                  {s.path === "ig" && (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
                    </svg>
                  )}
                  {s.path === "tt" && (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.77a8.16 8.16 0 0 0 4.77 1.52V6.82a4.85 4.85 0 0 1-1-.13z" />
                    </svg>
                  )}
                </Box>
              ))}
            </HStack>
          </Box>

          {/* RIGHT: Content */}
          <Stack flex={1} minW="0" gap={7} w={{ base: "100%", lg: "auto" }}>
            <Stack gap={2}>
              <Text {...labelTextProps}>{founder.subtitle}</Text>
              <Text
                as="h2"
                id="founder-name"
                fontWeight={600}
                fontSize={{ base: "30px", md: "36px" }}
                color="var(--cc-text)"
                lineHeight="1.1"
                letterSpacing="-0.01em"
              >
                {founder.name}
              </Text>
              <Box
                w="44px"
                h="2px"
                bg="linear-gradient(90deg, rgba(232, 192, 148, 0.85), transparent)"
                borderRadius="full"
                aria-hidden
              />
            </Stack>

            {/* Bio */}
            <Stack gap={4}>
              <Text fontSize={{ base: "15px", md: "16px" }} color="var(--cc-text-2)" lineHeight="1.8">
                Ich trade seit über <Strong>4 Jahren</Strong>
                . Nicht als Hobby. Nicht nebenbei.{" "}
                <Strong>Vollzeit, an echten Märkten, mit echtem Geld.</Strong>{" "}
                Ich habe den <Strong>siebenstelligen Funded Status</Strong>{" "}
                erreicht und über{" "}
                <Box as="strong" className="cc-num" color="var(--cc-gold-light)" fontWeight={600}>
                  300.000 € in verifizierten Payouts
                </Box>{" "}
                ausgezahlt bekommen.
              </Text>

              <Box className="cc-card cc-card--still" px={{ base: 4, md: 5 }} py={{ base: 4, md: 5 }}>
                <Text fontSize={{ base: "15px", md: "16px" }} color="var(--cc-text-soft)" lineHeight="1.8">
                  Irgendwann war mir klar: Was ich aufgebaut habe, ist zu wertvoll um es für mich zu behalten. Aber ich wollte{" "}
                  <Strong>keinen Massenkurs bauen, der jeden reinlässt.</Strong>{" "}
                  Deshalb habe ich{" "}
                  <Box as="strong" color="var(--cc-gold-light)" fontWeight={600}>
                    Capital Circle
                  </Box>{" "}
                  gegründet. Eine Community, in der nur Trader landen, die es wirklich ernst meinen.
                </Text>
              </Box>

              <Text fontSize={{ base: "15px", md: "16px" }} color="var(--cc-text-soft)" lineHeight="1.8">
                Kein Fluff. Kein Copy-Paste System.{" "}
                <Strong>Nur eine Methodik die funktioniert – und ein Umfeld das dich zwingt besser zu werden.</Strong>
              </Text>
            </Stack>

            {/* Achievement Cards */}
            <Stack gap={3}>
              <Text {...labelTextProps}>Nachgewiesene Ergebnisse</Text>
              <Box display="grid" sx={{ gridTemplateColumns: "1fr 1fr", gap: { base: "8px", md: "10px" } }}>
                {ACHIEVEMENT_CARDS.map((card) => (
                  <AchievementCard key={card.label} card={card} />
                ))}
              </Box>
            </Stack>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}

function AchievementCard({ card }: { card: (typeof ACHIEVEMENT_CARDS)[number] }) {
  const Icon = card.icon;
  return (
    <Box className="cc-card" minW={0} p={{ base: 3, md: 4 }}>
      <Stack gap={3}>
        <GoldIconTile size={34} radius="9px">
          <Icon size={17} strokeWidth={1.75} />
        </GoldIconTile>
        <Stack gap={0.5}>
          <Text
            fontSize={{ base: "18px", md: "20px" }}
            fontWeight={600}
            lineHeight="1.1"
            letterSpacing="-0.01em"
            color="var(--cc-text)"
          >
            {card.value}
          </Text>
          <Text fontSize="12px" fontWeight={500} color="var(--cc-text-soft)" lineHeight="1.3">
            {card.label}
          </Text>
          <Text fontSize="11px" color="var(--cc-text-3)" lineHeight="1.3">
            {card.sub}
          </Text>
        </Stack>
      </Stack>
    </Box>
  );
}
