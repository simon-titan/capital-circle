"use client";

import { Box, Button, Flex, SimpleGrid, Stack, Text, Wrap, WrapItem } from "@chakra-ui/react";
import { ExternalLink, Package } from "lucide-react";
import type { ArsenalCardRow } from "@/lib/server-data";
import { IconTile, Meta } from "@/components/platform/dashboard/primitives";

function parseBullets(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim() !== "");
}

/**
 * @deprecated Seit v3.2 gibt es nur noch einen Akzent (Champagner-Gold). Der Wert
 * wird ignoriert und bleibt nur, damit bestehende Aufrufer kompilieren.
 */
export type ArsenalCardsAccent = "blue" | "green" | "gold";

/** Logo-Hintergrund, wie im Admin gewählt (manche Logos brauchen hellen Grund). */
const LOGO_BG: Record<string, string> = {
  transparent: "rgba(255, 255, 255, 0.02)",
  white: "rgba(255, 255, 255, 0.98)",
  dark: "var(--cc-bg)",
};

function riseDelay(i: number) {
  return { animationDelay: `${80 + Math.min(i, 10) * 70}ms` };
}

function ArsenalCardTile({ card, index }: { card: ArsenalCardRow; index: number }) {
  const bullets = parseBullets(card.feature_bullets);
  const hasUrl = Boolean(card.external_url?.trim());
  const hasDesc = Boolean(card.description?.trim());
  const hasLogo = Boolean(card.logo_storage_key?.trim());
  const placeholder = !hasUrl && bullets.length === 0 && !hasDesc && !hasLogo;
  const featured = Boolean(card.is_featured);
  const logoBgKey = card.logo_bg === "white" || card.logo_bg === "dark" ? card.logo_bg : "transparent";

  const logoSrc = hasLogo ? `/api/cover-url?key=${encodeURIComponent(card.logo_storage_key!.trim())}` : null;

  return (
    <Box
      as="article"
      className="cc-card cc-rise"
      style={riseDelay(index)}
      p={{ base: 5, md: 6 }}
      h="100%"
      minW={0}
      display="flex"
      flexDirection="column"
      borderColor={featured ? "rgba(212, 176, 128, 0.32)" : undefined}
    >
      <Stack gap={4} flex="1" align="stretch">
        {/* Logo randfüllend (cover), Medienradius 10px */}
        <Box
          w="100%"
          h={{ base: "76px", md: "88px" }}
          flexShrink={0}
          position="relative"
          borderRadius="10px"
          border="1px solid var(--cc-line-strong)"
          bg={LOGO_BG[logoBgKey]}
          overflow="hidden"
        >
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt=""
              style={{
                display: "block",
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
              }}
            />
          ) : (
            <Flex h="100%" align="center" justify="center" px={2}>
              <Text fontSize="13px" color="var(--cc-text-3)">
                Kein Logo
              </Text>
            </Flex>
          )}
        </Box>

        <Stack gap={2}>
          {featured ? (
            <Box
              as="span"
              alignSelf="flex-start"
              px={2.5}
              py={1}
              borderRadius="full"
              border="1px solid var(--cc-gold-line)"
              bg="var(--cc-gold-wash)"
              color="var(--cc-gold-light)"
              fontSize="11px"
              lineHeight="14px"
              fontWeight={500}
              textTransform="uppercase"
              letterSpacing="0.12em"
            >
              Empfohlen
            </Box>
          ) : null}
          <Box
            as="h2"
            fontSize={{ base: "17px", md: "18px" }}
            fontWeight={600}
            lineHeight={1.3}
            letterSpacing="-0.01em"
            color="var(--cc-text)"
            overflowWrap="break-word"
          >
            {card.title}
          </Box>
        </Stack>

        {bullets.length > 0 ? (
          <Wrap spacing={2}>
            {bullets.map((b) => (
              <WrapItem key={b} minW={0}>
                <Box
                  as="span"
                  display="inline-block"
                  px={2.5}
                  py={1}
                  borderRadius="full"
                  border="1px solid var(--cc-line-strong)"
                  bg="rgba(255, 255, 255, 0.03)"
                  fontSize="12px"
                  lineHeight="16px"
                  color="var(--cc-text-soft)"
                  overflowWrap="anywhere"
                >
                  {b}
                </Box>
              </WrapItem>
            ))}
          </Wrap>
        ) : null}

        {hasDesc ? (
          <Meta whiteSpace="pre-wrap" flex="1" overflowWrap="break-word">
            {card.description}
          </Meta>
        ) : null}

        {placeholder ? <Meta color="var(--cc-text-3)">Wird bald freigeschaltet.</Meta> : null}

        {hasUrl ? (
          <Box mt="auto" pt={1}>
            <Button
              as="a"
              href={card.external_url!}
              target="_blank"
              rel="noopener noreferrer"
              size="sm"
              variant="line"
              leftIcon={<ExternalLink size={15} strokeWidth={1.75} aria-hidden />}
              aria-label={`${card.title} öffnen (neuer Tab)`}
            >
              Öffnen
            </Button>
          </Box>
        ) : null}
      </Stack>
    </Box>
  );
}

export function ArsenalCardsSection({
  cards,
  emptyLabel = "Wird bald freigeschaltet.",
}: {
  cards: ArsenalCardRow[];
  emptyLabel?: string;
  /** @deprecated Wird ignoriert (v3.2: nur Champagner-Gold). */
  accentColor?: ArsenalCardsAccent;
}) {
  if (cards.length === 0) {
    return (
      <Box className="cc-card cc-card--still cc-rise" style={riseDelay(0)} p={{ base: 6, md: 8 }}>
        <Stack align="center" gap={4} textAlign="center">
          <IconTile>
            <Package size={24} strokeWidth={1.5} />
          </IconTile>
          <Meta fontSize="16px">{emptyLabel}</Meta>
        </Stack>
      </Box>
    );
  }

  return (
    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5} alignItems="stretch">
      {cards.map((card, i) => (
        <ArsenalCardTile key={card.id} card={card} index={i} />
      ))}
    </SimpleGrid>
  );
}
