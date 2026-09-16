"use client";

import { Box, Button, Flex, SimpleGrid, Text, type SimpleGridProps } from "@chakra-ui/react";
import { CalendarCheck2, Clock3 } from "lucide-react";
import type { ReactNode } from "react";
import { DiscordGlyph } from "@/components/platform/DiscordBanner";
import { IconTile } from "./primitives";
import type { StatusSummary } from "./types";

function StatusCard({
  icon,
  label,
  value,
  valueMuted = false,
  children,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  /** Zustandstext statt Kennzahl (z. B. „Nicht verbunden“): kleiner, darf umbrechen. */
  valueMuted?: boolean;
  children?: ReactNode;
}) {
  return (
    <Flex className="cc-card" align="center" gap={4} p={{ base: 4, md: 5 }} minW={0}>
      <IconTile>{icon}</IconTile>
      <Box minW={0} flex="1">
        <Text fontSize="12px" lineHeight="16px" fontWeight={500} letterSpacing="0.12em" textTransform="uppercase" color="var(--cc-text-2)">
          {label}
        </Text>
        {valueMuted ? (
          <Text fontSize="15px" fontWeight={500} lineHeight={1.35} color="var(--cc-text-soft)" mt={1}>
            {value}
          </Text>
        ) : (
          <Text className="cc-num" fontSize={{ base: "18px", md: "20px" }} fontWeight={600} lineHeight={1.3} color="var(--cc-text)" mt={1} isTruncated>
            {value}
          </Text>
        )}
      </Box>
      {children}
    </Flex>
  );
}

/** Kennzahlen unter dem Raster: Lernzeit, Mitgliedschaft, Discord — als eigene Karten mit Icon. */
export function StatusCards({ status, ...rest }: SimpleGridProps & { status: StatusSummary }) {
  const { learningLabel, memberDays, discord } = status;
  const raw = discord.username?.trim() ?? "";
  const handle = raw ? (raw.startsWith("@") ? raw : `@${raw}`) : null;

  return (
    <SimpleGrid columns={{ base: 1, md: discord.visible ? 3 : 2 }} gap={5} {...rest}>
      <StatusCard icon={<Clock3 size={22} strokeWidth={1.5} />} label="Lernzeit gesamt" value={learningLabel} />
      <StatusCard
        icon={<CalendarCheck2 size={22} strokeWidth={1.5} />}
        label="Mitglied seit"
        value={memberDays === 0 ? "heute" : `${memberDays} ${memberDays === 1 ? "Tag" : "Tagen"}`}
      />
      {discord.visible ? (
        <StatusCard icon={<DiscordGlyph size={22} />} label="Discord" value={handle ?? "Nicht verbunden"} valueMuted={!handle}>
          {handle ? (
            <Box
              w="9px"
              h="9px"
              flexShrink={0}
              borderRadius="full"
              bg="var(--cc-success)"
              boxShadow="0 0 10px rgba(74, 222, 128, 0.7)"
              role="img"
              aria-label="Verbunden"
            />
          ) : (
            <Button as="a" href="/api/discord/connect" variant="gold" size="sm" flexShrink={0}>
              Verbinden
            </Button>
          )}
        </StatusCard>
      ) : null}
    </SimpleGrid>
  );
}
