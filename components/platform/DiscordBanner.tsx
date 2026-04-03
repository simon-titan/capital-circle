"use client";

import { Box, Button, Flex, HStack, Text, VStack } from "@chakra-ui/react";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

export function DiscordGlyph({ size = 22 }: { size?: number }) {
  return (
    <Box as="svg" viewBox="0 0 24 24" w={`${size}px`} h={`${size}px`} fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </Box>
  );
}

type DiscordBannerProps = {
  discordUsername: string | null;
};

export function DiscordBanner({ discordUsername }: DiscordBannerProps) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);
  const connected = Boolean(discordUsername?.trim());

  const disconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/discord/disconnect", {
        method: "POST",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        redirect?: string;
        error?: string;
      };

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok || !data.ok) {
        window.location.href = `/dashboard?discord=error&reason=${encodeURIComponent(data.error ?? "disconnect_failed")}`;
        return;
      }
      if (data.redirect) {
        window.location.href = data.redirect;
        return;
      }
      router.refresh();
    } finally {
      setDisconnecting(false);
    }
  };

  if (connected) {
    const handle = discordUsername!.trim().startsWith("@") ? discordUsername!.trim() : `@${discordUsername!.trim()}`;
    return (
      <GlassCard dashboard>
        <Flex
          direction={{ base: "column", sm: "row" }}
          align={{ base: "flex-start", sm: "center" }}
          justify="space-between"
          gap={4}
        >
          <HStack spacing={4} align="center">
            <Flex
              align="center"
              justify="center"
              w="48px"
              h="48px"
              borderRadius="14px"
              bg="rgba(34, 197, 94, 0.12)"
              border="1px solid rgba(34, 197, 94, 0.35)"
              color="rgb(34, 197, 94)"
              flexShrink={0}
            >
              <CheckCircle2 size={26} strokeWidth={2} />
            </Flex>
            <VStack align="flex-start" spacing={1}>
              <Text
                className="inter-medium"
                fontSize="xs"
                letterSpacing="0.1em"
                textTransform="uppercase"
                color="rgba(255,255,255,0.5)"
              >
                Community
              </Text>
              <Text className="inter-semibold" fontSize={{ base: "lg", md: "xl" }} color="var(--color-text-primary)">
                Discord verbunden
              </Text>
              <Text className="jetbrains-mono" fontSize="sm" color="rgba(34, 197, 94, 0.95)">
                {handle}
              </Text>
            </VStack>
          </HStack>
          <Button
            type="button"
            variant="outline"
            size="sm"
            borderRadius="10px"
            borderColor="rgba(255,255,255,0.2)"
            color="var(--color-text-secondary)"
            _hover={{ bg: "rgba(255,255,255,0.06)", borderColor: "rgba(212,175,55,0.4)" }}
            onClick={() => void disconnect()}
            isLoading={disconnecting}
            isDisabled={disconnecting}
          >
            Trennen
          </Button>
        </Flex>
      </GlassCard>
    );
  }

  return (
    <GlassCard dashboard>
      <Flex
        direction={{ base: "column", md: "row" }}
        align={{ base: "flex-start", md: "center" }}
        justify="space-between"
        gap={5}
      >
        <HStack spacing={4} align="flex-start">
          <Flex
            align="center"
            justify="center"
            w="48px"
            h="48px"
            borderRadius="14px"
            bg="rgba(212, 175, 55, 0.12)"
            border="1px solid rgba(212, 175, 55, 0.38)"
            color="var(--color-accent-gold-light)"
            flexShrink={0}
          >
            <DiscordGlyph size={26} />
          </Flex>
          <VStack align="flex-start" spacing={2} maxW={{ md: "520px" }}>
            <Text
              className="inter-medium"
              fontSize="xs"
              letterSpacing="0.1em"
              textTransform="uppercase"
              color="rgba(255,255,255,0.5)"
            >
              Community
            </Text>
            <Text className="inter-semibold" fontSize={{ base: "lg", md: "xl" }} color="var(--color-text-primary)">
              Verbinde deinen Discord Account
            </Text>
            <Text className="inter" fontSize="sm" color="rgba(245, 236, 210, 0.78)" lineHeight="tall">
              Erhalte Zugang zum exklusiven Capital-Circle-Server und tausche dich mit der Community aus.
            </Text>
          </VStack>
        </HStack>
        <Button
          as="a"
          href="/api/discord/connect"
          size="md"
          borderRadius="10px"
          bg="linear-gradient(135deg, var(--color-accent-gold-dark) 0%, var(--color-accent-gold-light) 100%)"
          color="#0a0a0a"
          _hover={{
            filter: "brightness(1.06)",
            boxShadow: "0 0 24px rgba(212, 175, 55, 0.35)",
          }}
          flexShrink={0}
          alignSelf={{ base: "stretch", md: "center" }}
        >
          Discord verbinden
        </Button>
      </Flex>
    </GlassCard>
  );
}
