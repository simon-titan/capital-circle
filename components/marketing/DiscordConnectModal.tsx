"use client";

import { Box, Button, IconButton, Stack, Text } from "@chakra-ui/react";
import { useEffect } from "react";
import { X } from "lucide-react";
import { FaDiscord } from "react-icons/fa6";
import { FunnelHeadline, noMotion } from "./funnel-ui";

/**
 * Popup nach dem Lead-Formular: bietet den direkten Discord-Beitritt per OAuth an.
 * Primär: `/api/discord-funnel/join?lid={token}` (Server-OAuth → feste Funnel-Rolle).
 * Sekundär: schließen — der Lead hat zusätzlich die Fallback-Mail mit demselben Link.
 */
export function DiscordConnectModal({
  token,
  onClose,
}: {
  token: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const joinUrl = `/api/discord-funnel/join?lid=${encodeURIComponent(token)}`;

  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={10000}
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
      onClick={onClose}
      bg="rgba(8, 10, 12, 0.72)"
      sx={{
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        animation: "dcmFadeIn 200ms ease forwards",
        "@keyframes dcmFadeIn": { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        ...noMotion,
      }}
    >
      <Box
        role="dialog"
        aria-modal="true"
        aria-labelledby="discord-connect-title"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        position="relative"
        w="full"
        maxW="440px"
        borderRadius="12px"
        overflow="hidden"
        p={{ base: 7, md: 9 }}
        textAlign="center"
        bg="var(--cc-panel-solid)"
        bgImage="radial-gradient(circle at 100% 0%, rgba(212, 176, 128, 0.14), transparent 50%), radial-gradient(circle at 0% 100%, rgba(232, 192, 148, 0.05), transparent 50%)"
        border="1px solid rgba(232, 192, 148, 0.3)"
        boxShadow="0 24px 60px rgba(0, 0, 0, 0.6), 0 0 44px rgba(212, 176, 128, 0.12)"
        sx={{
          animation: "dcmScaleIn 260ms cubic-bezier(0.16,1,0.3,1) forwards",
          "@keyframes dcmScaleIn": {
            "0%": { opacity: 0, transform: "scale(0.94) translateY(8px)" },
            "100%": { opacity: 1, transform: "scale(1) translateY(0)" },
          },
          ...noMotion,
        }}
      >
        {/* Gold-Lichtkante oben */}
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          h="1px"
          bgImage="linear-gradient(90deg, transparent 0%, rgba(232, 192, 148, 0.9) 45%, rgba(212, 176, 128, 0.3) 100%)"
          aria-hidden
        />

        <IconButton
          aria-label="Schließen"
          icon={<X size={18} strokeWidth={1.75} />}
          position="absolute"
          top="14px"
          right="14px"
          size="sm"
          variant="line"
          borderRadius="full"
          color="var(--cc-text-2)"
          _hover={{ color: "var(--cc-text)", bg: "rgba(255, 255, 255, 0.06)", borderColor: "var(--cc-gold-line)" }}
          onClick={onClose}
        />

        <Stack spacing={5} align="center">
          <Box
            w="64px"
            h="64px"
            borderRadius="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
            color="var(--cc-gold-light)"
            bg="radial-gradient(circle at 50% 35%, rgba(232, 192, 148, 0.24), rgba(212, 176, 128, 0.05) 70%)"
            border="1px solid rgba(232, 192, 148, 0.45)"
            boxShadow="0 0 28px rgba(212, 176, 128, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.12)"
            aria-hidden
          >
            <FaDiscord size={30} />
          </Box>

          <Stack spacing={2}>
            <FunnelHeadline as="h2" scale="md" id="discord-connect-title" fontSize={{ base: "21px", md: "24px" }}>
              Fast geschafft. Verbinde dein Discord.
            </FunnelHeadline>
            <Text fontSize="14px" color="var(--cc-text-2)" lineHeight="1.6">
              Ein Klick und du bist drin. Du wirst automatisch dem Server
              hinzugefügt und bekommst deinen Zugang freigeschaltet.
            </Text>
          </Stack>

          <Button
            as="a"
            href={joinUrl}
            variant="gold"
            w="full"
            h="52px"
            fontSize="15px"
            leftIcon={<FaDiscord size={18} />}
          >
            Discord verbinden
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
