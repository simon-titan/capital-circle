"use client";

import { Box, Button, SimpleGrid, Stack, Text, Wrap, WrapItem } from "@chakra-ui/react";
import type { ArsenalCardRow } from "@/lib/server-data";
import { ExternalLink } from "lucide-react";

function parseBullets(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim() !== "");
}

const ACCENTS = {
  blue: {
    borderLeft: "4px solid rgba(74, 144, 217, 0.85)",
    radial: "radial-gradient(circle at 0% 0%, rgba(74, 144, 217, 0.14), transparent 52%)",
    btnBg: "rgba(74, 144, 217, 0.2)",
    btnBorder: "rgba(74, 144, 217, 0.5)",
    btnHover: "rgba(74, 144, 217, 0.32)",
    pillBg: "rgba(74, 144, 217, 0.15)",
    pillBorder: "rgba(74, 144, 217, 0.4)",
  },
  green: {
    borderLeft: "4px solid rgba(74, 222, 128, 0.85)",
    radial: "radial-gradient(circle at 0% 0%, rgba(74, 222, 128, 0.12), transparent 52%)",
    btnBg: "rgba(74, 222, 128, 0.18)",
    btnBorder: "rgba(74, 222, 128, 0.48)",
    btnHover: "rgba(74, 222, 128, 0.28)",
    pillBg: "rgba(74, 222, 128, 0.14)",
    pillBorder: "rgba(74, 222, 128, 0.38)",
  },
  gold: {
    borderLeft: "4px solid rgba(212, 175, 55, 0.65)",
    radial: "radial-gradient(circle at 0% 0%, rgba(212, 175, 55, 0.12), transparent 52%)",
    btnBg: "rgba(212, 175, 55, 0.22)",
    btnBorder: "rgba(212, 175, 55, 0.45)",
    btnHover: "rgba(212, 175, 55, 0.32)",
    pillBg: "rgba(212, 175, 55, 0.14)",
    pillBorder: "rgba(212, 175, 55, 0.35)",
  },
} as const;

export type ArsenalCardsAccent = "blue" | "green" | "gold";

function ArsenalCardTile({
  card,
  accent,
}: {
  card: ArsenalCardRow;
  accent: (typeof ACCENTS)[ArsenalCardsAccent];
}) {
  const bullets = parseBullets(card.feature_bullets);
  const hasUrl = Boolean(card.external_url?.trim());
  const hasDesc = Boolean(card.description?.trim());
  const hasLogo = Boolean(card.logo_storage_key?.trim());
  const placeholder =
    !hasUrl && bullets.length === 0 && !hasDesc && !hasLogo;

  const logoSrc = hasLogo
    ? `/api/cover-url?key=${encodeURIComponent(card.logo_storage_key!.trim())}`
    : null;

  return (
    <Box
      className="glass-card-dashboard"
      p={{ base: 5, md: 6 }}
      borderRadius="14px"
      borderWidth="1px"
      borderColor="rgba(212, 175, 55, 0.22)"
      borderLeft={accent.borderLeft}
      position="relative"
      overflow="hidden"
      h="100%"
      display="flex"
      flexDirection="column"
    >
      <Box
        position="absolute"
        inset={0}
        pointerEvents="none"
        borderRadius="14px"
        bg={accent.radial}
        zIndex={0}
      />
      <Stack gap={3} position="relative" zIndex={1} flex="1" align="stretch">
        <Box
          w="100%"
          minH="80px"
          maxH="120px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          borderRadius="md"
          borderWidth="1px"
          borderColor="rgba(212, 175, 55, 0.15)"
          bg="rgba(0, 0, 0, 0.2)"
          overflow="hidden"
        >
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt=""
              style={{ maxWidth: "100%", maxHeight: "112px", width: "auto", height: "auto", objectFit: "contain" }}
            />
          ) : (
            <Text className="inter" fontSize="xs" color="var(--color-text-tertiary)">
              Kein Logo
            </Text>
          )}
        </Box>

        <Text className="inter-semibold" fontSize={{ base: "lg", md: "xl" }} color="var(--color-text-primary)" lineHeight="short">
          {card.title}
        </Text>

        {bullets.length > 0 ? (
          <Wrap gap={2}>
            {bullets.map((b) => (
              <WrapItem key={b}>
                <Box
                  as="span"
                  display="inline-block"
                  px={2.5}
                  py={1}
                  borderRadius="full"
                  borderWidth="1px"
                  borderColor={accent.pillBorder}
                  bg={accent.pillBg}
                  className="inter"
                  fontSize="xs"
                  color="var(--color-text-secondary)"
                >
                  {b}
                </Box>
              </WrapItem>
            ))}
          </Wrap>
        ) : null}

        {hasDesc ? (
          <Text className="inter" fontSize="sm" color="var(--color-text-secondary)" whiteSpace="pre-wrap" flex="1">
            {card.description}
          </Text>
        ) : null}

        {placeholder ? (
          <Text className="inter" fontSize="sm" color="var(--color-text-tertiary)" fontStyle="italic">
            Wird bald freigeschaltet.
          </Text>
        ) : null}

        {hasUrl ? (
          <Button
            as="a"
            href={card.external_url!}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            alignSelf="flex-start"
            mt="auto"
            leftIcon={<ExternalLink size={16} />}
            bg={accent.btnBg}
            color="var(--color-text-primary)"
            borderWidth="1px"
            borderColor={accent.btnBorder}
            _hover={{ bg: accent.btnHover }}
            className="inter-medium"
          >
            Öffnen
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}

export function ArsenalCardsSection({
  cards,
  emptyLabel = "Wird bald freigeschaltet.",
  accentColor = "gold",
}: {
  cards: ArsenalCardRow[];
  emptyLabel?: string;
  accentColor?: ArsenalCardsAccent;
}) {
  const accent = ACCENTS[accentColor];

  if (cards.length === 0) {
    return (
      <Box
        className="glass-card-dashboard arsenal-cards-empty-pulse"
        p={{ base: 6, md: 8 }}
        borderRadius="14px"
        textAlign="center"
        borderWidth="1px"
        borderColor="rgba(212, 175, 55, 0.28)"
      >
        <Text className="inter" fontSize="md" color="var(--color-text-muted)">
          {emptyLabel}
        </Text>
      </Box>
    );
  }

  return (
    <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} alignItems="stretch">
      {cards.map((card) => (
        <ArsenalCardTile key={card.id} card={card} accent={accent} />
      ))}
    </SimpleGrid>
  );
}
