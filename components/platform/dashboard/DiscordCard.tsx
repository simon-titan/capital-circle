"use client";

import { Box, Button, Flex, Text, type FlexProps } from "@chakra-ui/react";
import { DiscordGlyph } from "@/components/platform/DiscordBanner";
import { IconTile } from "./primitives";
import type { DiscordStatus } from "./types";

/**
 * Discord ganz oben, über „Als nächstes“ — aber nur unterhalb von `lg`.
 *
 * Ab `lg` steht die Sidebar dauerhaft neben dem Inhalt und trägt Discord dort;
 * zweimal dieselbe Zeile wäre doppelt. Darunter wird die Sidebar zum Drawer und
 * ist damit weggeklappt — deshalb bekommt Discord auf schmalen Screens eine
 * eigene Karte an der Stelle, an der man zuerst hinsieht.
 */
export function DiscordCard({
  discord,
  className,
  ...rest
}: FlexProps & { discord: DiscordStatus }) {
  if (!discord.visible) return null;

  const raw = discord.username?.trim() ?? "";
  const handle = raw ? (raw.startsWith("@") ? raw : `@${raw}`) : null;

  return (
    <Flex
      className={["cc-card", className].filter(Boolean).join(" ")}
      display={{ base: "flex", lg: "none" }}
      align="center"
      gap={4}
      p={{ base: 4, md: 5 }}
      minW={0}
      {...rest}
    >
      <IconTile>
        <DiscordGlyph size={22} />
      </IconTile>
      <Box minW={0} flex="1">
        <Text
          fontSize="12px"
          lineHeight="16px"
          fontWeight={500}
          letterSpacing="0.12em"
          textTransform="uppercase"
          color="var(--cc-text-2)"
        >
          Discord
        </Text>
        <Text fontSize="15px" fontWeight={500} lineHeight={1.35} color="var(--cc-text-soft)" mt={1} isTruncated>
          {handle ? `Verbunden · ${handle}` : "Nicht verbunden"}
        </Text>
      </Box>
      {handle ? (
        <Box
          w="9px"
          h="9px"
          flexShrink={0}
          borderRadius="full"
          bg="var(--cc-success)"
          role="img"
          aria-label="Verbunden"
        />
      ) : (
        // Kein Router-Link: /api/discord/connect ist der OAuth-Start, der auf Discord weiterleitet.
        <Button as="a" href="/api/discord/connect" variant="gold" size="sm" flexShrink={0}>
          Verbinden
        </Button>
      )}
    </Flex>
  );
}
