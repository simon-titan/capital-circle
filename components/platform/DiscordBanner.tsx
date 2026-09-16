"use client";

import { Box, Button, Flex, Heading, HStack, Text } from "@chakra-ui/react";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconTile } from "@/components/platform/dashboard/primitives";

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

/** Kartentitel im Label-Schnitt (13px, versal, gesperrt) als `h2`. */
function CardLabel({ id, children }: { id: string; children: string }) {
  return (
    <Heading
      as="h2"
      id={id}
      fontSize="13px"
      lineHeight="18px"
      fontWeight={500}
      letterSpacing="0.12em"
      textTransform="uppercase"
      color="var(--cc-text-soft)"
    >
      {children}
    </Heading>
  );
}

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
      <Box as="section" aria-labelledby="discord-banner-title" className="cc-card" p={{ base: 5, md: 6 }}>
        <Flex
          direction={{ base: "column", sm: "row" }}
          align={{ base: "flex-start", sm: "center" }}
          justify="space-between"
          gap={4}
        >
          <HStack spacing={4} align="center" minW={0}>
            <IconTile>
              <Box color="var(--cc-success)">
                <CheckCircle2 size={24} strokeWidth={1.75} />
              </Box>
            </IconTile>
            <Box minW={0}>
              <CardLabel id="discord-banner-title">Community</CardLabel>
              <Text fontSize={{ base: "17px", md: "18px" }} fontWeight={600} lineHeight={1.3} color="var(--cc-text)" mt={2}>
                Discord verbunden
              </Text>
              <Text fontSize="14px" color="var(--cc-text-2)" mt={0.5} overflowWrap="anywhere">
                {handle}
              </Text>
            </Box>
          </HStack>
          <Button
            type="button"
            variant="line"
            size="sm"
            flexShrink={0}
            onClick={() => void disconnect()}
            isLoading={disconnecting}
            isDisabled={disconnecting}
          >
            Trennen
          </Button>
        </Flex>
      </Box>
    );
  }

  return (
    <Box as="section" aria-labelledby="discord-banner-title" className="cc-card" p={{ base: 5, md: 6 }}>
      <Flex
        direction={{ base: "column", md: "row" }}
        align={{ base: "flex-start", md: "center" }}
        justify="space-between"
        gap={5}
      >
        <HStack spacing={4} align="flex-start" minW={0}>
          <IconTile>
            <DiscordGlyph size={24} />
          </IconTile>
          <Box maxW={{ md: "520px" }} minW={0}>
            <CardLabel id="discord-banner-title">Community</CardLabel>
            <Text fontSize={{ base: "17px", md: "18px" }} fontWeight={600} lineHeight={1.3} color="var(--cc-text)" mt={2}>
              Verbinde deinen Discord Account
            </Text>
            <Text fontSize="14px" lineHeight={1.6} color="var(--cc-text-2)" mt={1}>
              Erhalte Zugang zum exklusiven Capital-Circle-Server und tausche dich mit der Community aus.
            </Text>
          </Box>
        </HStack>
        <Button
          as="a"
          href="/api/discord/connect"
          variant="gold"
          flexShrink={0}
          alignSelf={{ base: "stretch", md: "center" }}
        >
          Discord verbinden
        </Button>
      </Flex>
    </Box>
  );
}
