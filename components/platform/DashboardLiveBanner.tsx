"use client";

import { Box, Button, Flex, HStack, Text, VStack } from "@chakra-ui/react";
import { Radio } from "lucide-react";
import NextLink from "next/link";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

type LiveStatus = {
  isLive: boolean;
  title: string;
  startedAt: string | null;
};

/**
 * Dashboard-Banner fuer Free-User.
 * Erscheint nur, wenn der Stream gerade live ist (einmaliger Fetch beim Mount).
 * Kein dauerhaftes Polling — bloss ein schneller Check nach dem initialen Render.
 */
export function DashboardLiveBanner() {
  const [status, setStatus] = useState<LiveStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/stream/status", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as {
          ok: boolean;
          status?: { isLive: boolean; title: string; startedAt: string | null };
        };
        if (!json.ok || !json.status || cancelled) return;
        setStatus({
          isLive: json.status.isLive,
          title: json.status.title,
          startedAt: json.status.startedAt,
        });
      } catch {
        // Stiller Fehler — Banner bleibt ausgeblendet.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Solange nicht live → komplett unsichtbar (kein Platzhalter, kein Skeleton).
  if (!status?.isLive) return null;

  const elapsedMin = status.startedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(status.startedAt).getTime()) / 60_000))
    : null;

  const elapsedLabel =
    elapsedMin === null
      ? null
      : elapsedMin < 1
      ? "gerade gestartet"
      : elapsedMin < 60
      ? `seit ${elapsedMin} Min`
      : `seit ${Math.floor(elapsedMin / 60)} h ${elapsedMin % 60 > 0 ? `${elapsedMin % 60} Min` : ""}`.trim();

  return (
    <GlassCard
      dashboard
      borderColor="rgba(239, 68, 68, 0.45) !important"
      boxShadow="0 0 32px rgba(239, 68, 68, 0.14), 0 8px 28px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)"
      _hover={{
        borderColor: "rgba(239, 68, 68, 0.62) !important",
        boxShadow:
          "0 0 48px rgba(239, 68, 68, 0.22), 0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.09)",
      }}
    >
      <Flex
        direction={{ base: "column", sm: "row" }}
        align={{ base: "flex-start", sm: "center" }}
        justify="space-between"
        gap={4}
      >
        <HStack spacing={4} align="center">
          {/* Live-Puls-Icon */}
          <Flex
            position="relative"
            align="center"
            justify="center"
            w="48px"
            h="48px"
            borderRadius="14px"
            bg="rgba(239, 68, 68, 0.15)"
            border="1px solid rgba(239, 68, 68, 0.45)"
            flexShrink={0}
          >
            <Radio size={22} strokeWidth={2} aria-hidden style={{ color: "#ef4444" }} />
            {/* Pulsierender Outer-Ring */}
            <Box
              position="absolute"
              inset={0}
              borderRadius="14px"
              border="2px solid rgba(239, 68, 68, 0.55)"
              sx={{
                animation: "livePulseRing 2s ease-out infinite",
                "@keyframes livePulseRing": {
                  "0%": { opacity: 1, transform: "scale(1)" },
                  "70%": { opacity: 0, transform: "scale(1.45)" },
                  "100%": { opacity: 0, transform: "scale(1.45)" },
                },
              }}
            />
          </Flex>

          <VStack align="flex-start" spacing={0.5}>
            <HStack spacing={2}>
              <Box
                w="7px"
                h="7px"
                borderRadius="full"
                bg="#ef4444"
                boxShadow="0 0 8px rgba(239,68,68,0.9)"
                sx={{
                  animation: "liveDotPulse 1.6s ease-in-out infinite",
                  "@keyframes liveDotPulse": {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.4 },
                  },
                }}
              />
              <Text
                className="inter-semibold"
                fontSize="xs"
                letterSpacing="0.12em"
                textTransform="uppercase"
                color="rgba(239,68,68,0.95)"
              >
                Jetzt Live
                {elapsedLabel ? (
                  <Box as="span" color="rgba(255,255,255,0.4)" fontWeight={400} ml={2} letterSpacing="0">
                    {elapsedLabel}
                  </Box>
                ) : null}
              </Text>
            </HStack>
            <Text className="inter-semibold" fontSize={{ base: "md", md: "lg" }} color="var(--color-text-primary)">
              {status.title}
            </Text>
            <Text className="inter" fontSize="xs" color="rgba(255,255,255,0.5)">
              Emre ist gerade live — schau jetzt rein.
            </Text>
          </VStack>
        </HStack>

        <Button
          as={NextLink}
          href="/stream"
          size="md"
          flexShrink={0}
          alignSelf={{ base: "stretch", sm: "center" }}
          borderRadius="10px"
          bg="rgba(239, 68, 68, 0.18)"
          border="1px solid rgba(239, 68, 68, 0.45)"
          color="rgba(255,255,255,0.92)"
          className="inter-semibold"
          _hover={{
            bg: "rgba(239, 68, 68, 0.28)",
            borderColor: "rgba(239, 68, 68, 0.65)",
            boxShadow: "0 0 18px rgba(239, 68, 68, 0.25)",
          }}
          leftIcon={<Radio size={16} />}
        >
          Stream beitreten
        </Button>
      </Flex>
    </GlassCard>
  );
}
