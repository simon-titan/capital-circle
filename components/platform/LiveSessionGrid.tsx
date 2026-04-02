"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  HStack,
  Stack,
  Text,
} from "@chakra-ui/react";
import { ChakraLinkButton } from "@/components/platform/ChakraLinkButton";
import type { LiveSessionCategoryRow, LiveSessionListItem } from "@/lib/server-data";
import { Calendar, Radio } from "lucide-react";

const BLUE = {
  line: "linear-gradient(90deg, rgba(74, 144, 217, 0) 0%, rgba(100, 170, 240, 0.95) 45%, rgba(74, 144, 217, 0.25) 100%)",
  border: "rgba(100, 170, 240, 0.45)",
  glow: "0 0 22px rgba(74, 144, 217, 0.28)",
  radial: "radial-gradient(ellipse at 0% 0%, rgba(74, 144, 217, 0.2), transparent 55%)",
};

type Props = {
  categories: LiveSessionCategoryRow[];
  sessions: LiveSessionListItem[];
};

export function LiveSessionGrid({ categories, sessions }: Props) {
  const [filterId, setFilterId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!filterId) return sessions;
    return sessions.filter((s) => s.category.id === filterId);
  }, [sessions, filterId]);

  return (
    <Stack gap={6}>
      <Flex gap={2} flexWrap="wrap" align="center">
        <Button
          size="sm"
          variant={filterId === null ? "solid" : "outline"}
          colorScheme={filterId === null ? "blue" : "gray"}
          borderColor={filterId === null ? undefined : "rgba(255,255,255,0.2)"}
          onClick={() => setFilterId(null)}
        >
          Alle
        </Button>
        {categories.map((c) => (
          <Button
            key={c.id}
            size="sm"
            variant={filterId === c.id ? "solid" : "outline"}
            colorScheme={filterId === c.id ? "blue" : "gray"}
            borderColor={filterId === c.id ? undefined : "rgba(255,255,255,0.2)"}
            onClick={() => setFilterId(c.id)}
          >
            {c.title}
          </Button>
        ))}
      </Flex>

      {filtered.length === 0 ? (
        <Box
          className="glass-card-dashboard"
          borderRadius="xl"
          p={8}
          textAlign="center"
        >
          <Text className="inter" color="var(--color-text-muted)" fontSize="sm">
            Keine Sessions in dieser Kategorie.
          </Text>
        </Box>
      ) : (
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" }} gap={6}>
          {filtered.map((s) => (
            <GridItem key={s.id}>
              <Box
                className="glass-card-hero"
                borderRadius="xl"
                overflow="hidden"
                display="flex"
                flexDirection="column"
                h="full"
                position="relative"
                borderWidth="1px"
                borderColor={BLUE.border}
                transition="transform 0.2s ease, box-shadow 0.2s ease"
                _hover={{
                  transform: "translateY(-2px)",
                  boxShadow: BLUE.glow,
                }}
              >
                <Box
                  position="absolute"
                  inset={0}
                  pointerEvents="none"
                  bg={BLUE.radial}
                  opacity={0.9}
                />
                <Box position="relative" h="160px" bg="rgba(15,23,42,0.6)" overflow="hidden">
                  {s.thumbnailSignedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.thumbnailSignedUrl}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <Flex align="center" justify="center" h="full" bg="linear-gradient(145deg, rgba(30,58,138,0.5), rgba(15,23,42,0.9))">
                      <Radio size={40} strokeWidth={1.5} color="rgba(147,197,253,0.6)" aria-hidden />
                    </Flex>
                  )}
                  <Box
                    position="absolute"
                    top={3}
                    left={3}
                    px={2}
                    py={1}
                    borderRadius="md"
                    bg="rgba(15,23,42,0.75)"
                    borderWidth="1px"
                    borderColor="rgba(100,170,240,0.35)"
                  >
                    <Text className="inter-semibold" fontSize="xs" color="rgba(191, 219, 254, 0.95)">
                      {s.category.title}
                    </Text>
                  </Box>
                </Box>
                <Stack gap={3} p={5} flex={1} position="relative">
                  <Box h="2px" w="40%" borderRadius="full" bg={BLUE.line} opacity={0.85} />
                  <Text className="radley-regular" fontSize="lg" color="var(--color-text-primary)" noOfLines={2}>
                    {s.title}
                  </Text>
                  {s.description ? (
                    <Text className="inter" fontSize="sm" color="var(--color-text-muted)" noOfLines={2} lineHeight={1.55}>
                      {s.description}
                    </Text>
                  ) : null}
                  {(() => {
                    const primaryIso = s.event?.start_time ?? s.recorded_at;
                    if (!primaryIso) return null;
                    const caption = s.event ? "Live-Termin" : "Aufzeichnung";
                    return (
                      <Stack gap={0.5}>
                        <Text fontSize="10px" letterSpacing="0.08em" textTransform="uppercase" className="inter-semibold" color="rgba(147, 197, 253, 0.75)">
                          {caption}
                        </Text>
                        <HStack spacing={2} color="rgba(147, 197, 253, 0.95)" fontSize="sm" className="inter-semibold">
                          <Calendar size={16} aria-hidden />
                          <Text>
                            {new Date(primaryIso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}
                          </Text>
                        </HStack>
                      </Stack>
                    );
                  })()}
                  {s.event ? (
                    <Box
                      px={3}
                      py={2.5}
                      borderRadius="lg"
                      borderWidth="1px"
                      borderColor="rgba(100, 170, 240, 0.5)"
                      bg="rgba(74, 144, 217, 0.14)"
                      boxShadow="0 0 20px rgba(74, 144, 217, 0.12)"
                    >
                      <Text fontSize="10px" letterSpacing="0.1em" textTransform="uppercase" className="inter-semibold" color="rgba(191, 219, 254, 0.9)" mb={1}>
                        Kalender-Event
                      </Text>
                      <Text className="inter" fontSize="sm" color="rgba(226, 232, 240, 0.98)" fontWeight={500} noOfLines={3} lineHeight={1.45}>
                        {s.event.title}
                      </Text>
                    </Box>
                  ) : null}
                  <Box mt="auto" pt={2}>
                    <ChakraLinkButton
                      href={`/live-session/${s.id}`}
                      size="sm"
                      w="full"
                      colorScheme="blue"
                      variant="outline"
                      borderColor="rgba(100, 170, 240, 0.55)"
                      color="rgba(191, 219, 254, 0.95)"
                      _hover={{ bg: "rgba(74, 144, 217, 0.2)" }}
                    >
                      Ansehen
                    </ChakraLinkButton>
                  </Box>
                </Stack>
              </Box>
            </GridItem>
          ))}
        </Grid>
      )}
    </Stack>
  );
}
