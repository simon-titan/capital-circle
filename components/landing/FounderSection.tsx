"use client";

import type { ReactNode } from "react";
import { Box, Flex, Heading, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import Image from "next/image";
import { landingConfig } from "@/config/landing-config";
import { DisplayHeading, Eyebrow, Reveal } from "./landing-ui";

const PROOF = [
  { label: "Funded Status", value: "7-stellig", sub: "Nachgewiesen und gehalten" },
  { label: "Verifizierte Payouts", value: "300.000 €", sub: "Ausgezahlte Gewinne" },
  { label: "Ausgebildete Trader", value: "1.000+", sub: "Persönlich betreut" },
  { label: "Aktives Trading", value: "5 Jahre", sub: "An den Kapitalmärkten" },
];

function Gold({ children }: { children: ReactNode }) {
  return (
    <Box as="span" color="var(--cc-gold-light)" fontWeight={600}>
      {children}
    </Box>
  );
}

function Strong({ children }: { children: ReactNode }) {
  return (
    <Box as="span" color="var(--cc-text)" fontWeight={600}>
      {children}
    </Box>
  );
}

const socialLinkStyle = {
  w: "40px",
  h: "40px",
  borderRadius: "full",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  bg: "rgba(255, 255, 255, 0.02)",
  border: "1px solid var(--cc-line-strong)",
  color: "var(--cc-text-2)",
  transition:
    "background-color 200ms var(--cc-ease), border-color 200ms var(--cc-ease), color 200ms var(--cc-ease), transform 200ms var(--cc-ease)",
  _hover: {
    bg: "rgba(212, 176, 128, 0.1)",
    borderColor: "var(--cc-gold-line)",
    color: "var(--cc-gold-light)",
    transform: "translateY(-2px)",
  },
  _focusVisible: { outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px" },
} as const;

export function FounderSection() {
  const { founder } = landingConfig;

  return (
    <Box as="section" aria-labelledby="founder-title" w="100%" position="relative" py={{ base: 16, md: 24 }}>
      <Box maxW="1080px" mx="auto" position="relative" px={{ base: 4, md: 8, lg: 12 }}>
        <Reveal>
          <Eyebrow justify={{ base: "center", lg: "flex-start" }} mb={{ base: 10, md: 12 }}>
            Meet the Founder
          </Eyebrow>
        </Reveal>

        <Stack direction={{ base: "column", lg: "row" }} spacing={{ base: 10, lg: 16 }} align={{ base: "center", lg: "flex-start" }}>
          {/* ── Links: Foto + Social — ab lg sticky ── */}
          <Box
            flexShrink={0}
            textAlign="center"
            alignSelf={{ base: "center", lg: "flex-start" }}
            position={{ base: "relative", lg: "sticky" }}
            top={{ lg: "100px" }}
          >
            <Reveal>
              <Box position="relative" display="inline-block">
                {/* Champagner-Schein hinter dem Foto */}
                <Box
                  aria-hidden
                  position="absolute"
                  inset="-16%"
                  pointerEvents="none"
                  bg="radial-gradient(circle at 50% 42%, rgba(212, 176, 128, 0.24), transparent 64%)"
                  filter="blur(18px)"
                />
                <Box
                  position="relative"
                  w={{ base: "240px", md: "300px", lg: "340px" }}
                  h={{ base: "310px", md: "390px", lg: "440px" }}
                  borderRadius="12px"
                  overflow="hidden"
                  mx="auto"
                  border="1px solid rgba(212, 176, 128, 0.4)"
                  boxShadow="0 24px 64px rgba(0, 0, 0, 0.55), 0 0 46px rgba(212, 176, 128, 0.16)"
                  bg="var(--cc-surface)"
                >
                  <Image
                    src={founder.image}
                    alt={founder.name}
                    fill
                    sizes="(max-width: 48em) 240px, (max-width: 64em) 300px, 340px"
                    style={{ objectFit: "cover" }}
                    priority
                  />
                  <Box
                    aria-hidden
                    position="absolute"
                    inset={0}
                    bg="linear-gradient(180deg, transparent 62%, rgba(18, 23, 28, 0.55) 100%)"
                    pointerEvents="none"
                  />
                  <Box
                    aria-hidden
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    h="1px"
                    bg="linear-gradient(90deg, transparent, rgba(232, 192, 148, 0.9), transparent)"
                  />
                </Box>
              </Box>
            </Reveal>

            <HStack justify="center" spacing={3} mt={7}>
              <Box as="a" href={founder.socialLinks.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" {...socialLinkStyle}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
                </svg>
              </Box>
              <Box as="a" href={founder.socialLinks.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok" {...socialLinkStyle}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.77a8.16 8.16 0 0 0 4.77 1.52V6.82a4.85 4.85 0 0 1-1-.13z" />
                </svg>
              </Box>
              <Box as="a" href={founder.socialLinks.telegram} target="_blank" rel="noopener noreferrer" aria-label="Telegram-Gruppe" {...socialLinkStyle}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M22 2L11 13" />
                  <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </Box>
            </HStack>
          </Box>

          {/* ── Rechts: Inhalt — minW=0 verhindert Flex-Überlauf ── */}
          <Stack flex={1} minW="0" spacing={8} w={{ base: "100%", lg: "auto" }}>
            <Reveal>
              <Stack spacing={3}>
                <Text fontSize="12px" fontWeight={600} letterSpacing="0.12em" textTransform="uppercase" color="var(--cc-text-2)">
                  {founder.subtitle}
                </Text>
                <DisplayHeading id="founder-title" fontSize="clamp(34px, 5vw, 52px)" lineHeight={1.04}>
                  {founder.name}
                </DisplayHeading>
                <Box
                  aria-hidden
                  w="48px"
                  h="2px"
                  borderRadius="full"
                  bg="var(--cc-gold-bar)"
                  boxShadow="0 0 10px rgba(212, 176, 128, 0.45)"
                />
              </Stack>
            </Reveal>

            {/* ── Bio: drei Absätze ── */}
            <Reveal delay={60}>
              <Stack spacing={5} fontSize={{ base: "16px", md: "17px" }} lineHeight={1.75}>
                <Text color="var(--cc-text-2)">
                  Ich trade seit über <Gold>5 Jahren</Gold>. Nicht als Hobby. Nicht nebenbei.{" "}
                  <Strong>Vollzeit, an echten Märkten, mit echtem Geld.</Strong> Ich habe den{" "}
                  <Gold>siebenstelligen Funded Status</Gold> erreicht und über{" "}
                  <Gold>300.000 € in verifizierten Payouts</Gold> ausgezahlt bekommen.
                </Text>

                <Box
                  px={{ base: 5, md: 6 }}
                  py={5}
                  borderRadius="12px"
                  bg="radial-gradient(circle at 100% 0%, rgba(212, 176, 128, 0.12), transparent 55%), var(--cc-gold-wash)"
                  border="1px solid rgba(212, 176, 128, 0.24)"
                  boxShadow="inset 0 1px 0 rgba(255, 255, 255, 0.04)"
                >
                  <Text color="var(--cc-text-soft)">
                    Irgendwann war mir klar: Was ich aufgebaut habe, ist zu wertvoll um es für mich zu behalten. Aber ich
                    wollte <Strong>keinen Massenkurs bauen, der jeden reinlässt.</Strong> Deshalb habe ich{" "}
                    <Gold>Capital Circle</Gold> gegründet. Eine Community, in der nur Trader landen, die es wirklich ernst
                    meinen.
                  </Text>
                </Box>

                <Text color="var(--cc-text)" fontWeight={500}>
                  Kein Fluff. Kein Copy-Paste System.{" "}
                  <Gold>Nur eine Methodik, die funktioniert, und ein Umfeld, das dich zwingt, besser zu werden.</Gold>
                </Text>
              </Stack>
            </Reveal>

            {/* ── Belege: eine Glas-Karte, vier Werte an Haarlinien ── */}
            <Reveal delay={120}>
              <Box as="section" aria-labelledby="founder-proof" className="cc-card cc-card--still" p={{ base: 5, md: 6 }}>
                <Heading
                  as="h3"
                  id="founder-proof"
                  fontSize="13px"
                  lineHeight="18px"
                  fontWeight={500}
                  letterSpacing="0.12em"
                  textTransform="uppercase"
                  color="var(--cc-text-soft)"
                  mb={2}
                >
                  Nachgewiesene Ergebnisse
                </Heading>
                <SimpleGrid
                  as="dl"
                  columns={2}
                  sx={{
                    "& > div": { py: { base: 4, md: 5 } },
                    "& > div:nth-of-type(odd)": { pr: { base: 3, md: 5 }, borderRight: "1px solid var(--cc-line)" },
                    "& > div:nth-of-type(even)": { pl: { base: 3, md: 5 } },
                    "& > div:nth-of-type(n+3)": { borderTop: "1px solid var(--cc-line)" },
                  }}
                >
                  {PROOF.map((item) => (
                    <Flex key={item.label} direction="column" minW={0}>
                      {/* DOM: dt vor dd (gültige Beschreibungsliste); optisch steht der Wert oben */}
                      <Box as="dt" order={2} mt={2} fontSize="14px" fontWeight={500} lineHeight={1.3} color="var(--cc-text)">
                        {item.label}
                      </Box>
                      <Box
                        as="dd"
                        order={1}
                        fontSize={{ base: "24px", md: "30px" }}
                        fontWeight={600}
                        lineHeight={1.1}
                        letterSpacing="-0.02em"
                        color="var(--cc-gold-light)"
                      >
                        {item.value}
                      </Box>
                      <Box as="dd" order={3} mt={0.5} fontSize="12px" lineHeight={1.35} color="var(--cc-text-3)">
                        {item.sub}
                      </Box>
                    </Flex>
                  ))}
                </SimpleGrid>
              </Box>
            </Reveal>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
