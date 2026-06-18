"use client";

import { Box, Stack, Text } from "@chakra-ui/react";
import { useEffect } from "react";
import { X } from "lucide-react";
import { FaDiscord } from "react-icons/fa6";

const DISCORD_PURPLE = "#5865F2";

const accentCtaSx = {
  background: "linear-gradient(135deg, #8FFBEB 0%, #47F7DC 50%, #1FB9A6 100%)",
  boxShadow:
    "0 0 28px rgba(71,247,220,0.40), 0 4px 16px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.34)",
  border: "none",
  cursor: "pointer",
  transition: "all 220ms cubic-bezier(0.16, 1, 0.3, 1)",
  _hover: {
    background: "linear-gradient(135deg, #A8FCEF 0%, #5FFAE2 50%, #2AD3BE 100%)",
    boxShadow:
      "0 0 48px rgba(71,247,220,0.60), 0 6px 22px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.40)",
    transform: "translateY(-1px)",
  },
};

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
      sx={{
        background: "rgba(0,0,0,0.82)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        animation: "dcmFadeIn 200ms ease forwards",
        "@keyframes dcmFadeIn": { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
      }}
    >
      <Box
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        position="relative"
        w="full"
        maxW="440px"
        borderRadius="20px"
        p={{ base: 7, md: 9 }}
        textAlign="center"
        sx={{
          background: "rgba(6,6,8,0.96)",
          border: "1px solid rgba(71,247,220,0.30)",
          boxShadow:
            "0 24px 70px rgba(0,0,0,0.75), 0 0 0 1px rgba(71,247,220,0.10), 0 0 60px rgba(71,247,220,0.12)",
          animation: "dcmScaleIn 260ms cubic-bezier(0.16,1,0.3,1) forwards",
          "@keyframes dcmScaleIn": {
            "0%": { opacity: 0, transform: "scale(0.94) translateY(8px)" },
            "100%": { opacity: 1, transform: "scale(1) translateY(0)" },
          },
        }}
      >
        <Box
          h="2px"
          position="absolute"
          top={0}
          left={0}
          right={0}
          sx={{
            background:
              "linear-gradient(90deg, transparent 5%, rgba(71,247,220,0.55) 30%, rgba(71,247,220,0.55) 70%, transparent 95%)",
            borderRadius: "20px 20px 0 0",
          }}
        />

        <Box
          as="button"
          position="absolute"
          top="14px"
          right="14px"
          w="36px"
          h="36px"
          borderRadius="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          onClick={onClose}
          sx={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.65)",
            transition: "all 160ms ease",
            _hover: { background: "rgba(255,255,255,0.12)", color: "#fff" },
          }}
        >
          <X size={18} />
        </Box>

        <Stack spacing={5} align="center">
          <Box
            w="64px"
            h="64px"
            borderRadius="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
            color={DISCORD_PURPLE}
            sx={{
              background:
                "radial-gradient(circle at 50% 40%, rgba(88,101,242,0.24), rgba(88,101,242,0.05) 70%)",
              border: "1px solid rgba(88,101,242,0.50)",
              boxShadow:
                "0 0 28px rgba(88,101,242,0.42), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            <FaDiscord size={32} />
          </Box>

          <Stack spacing={2}>
            <Text
              className="inter-bold"
              fontSize={{ base: "xl", md: "2xl" }}
              color="var(--color-text-primary, #F0F0F2)"
              lineHeight="1.25"
            >
              Fast geschafft. Verbinde dein Discord.
            </Text>
            <Text className="inter" fontSize="sm" color="rgba(255,255,255,0.55)" lineHeight="1.6">
              Ein Klick und du bist drin. Du wirst automatisch dem Server
              hinzugefügt und bekommst deinen Zugang freigeschaltet.
            </Text>
          </Stack>

          <Box
            as="a"
            href={joinUrl}
            w="full"
            minH="52px"
            borderRadius="12px"
            fontSize="15px"
            letterSpacing="0.02em"
            color="#07080A"
            display="flex"
            alignItems="center"
            justifyContent="center"
            gap={2}
            className="inter-semibold"
            sx={accentCtaSx}
          >
            <FaDiscord size={18} />
            Discord verbinden
          </Box>

        </Stack>
      </Box>
    </Box>
  );
}
