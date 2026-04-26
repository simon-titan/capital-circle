import { Box, Center, Text } from "@chakra-ui/react";

/**
 * Intro-Video auf der Free-Funnel-Landing-Page.
 *
 * Liest aus NEXT_PUBLIC_FREE_FUNNEL_VIDEO_URL — getrennt vom Pricing-Video,
 * damit beide Seiten unabhängig voneinander bestückt werden können.
 * Wenn leer: dezenter Gold-Glow-Placeholder, Seite bleibt vollständig funktionsfähig.
 */
export function FreeFunnelVideo() {
  const src = process.env.NEXT_PUBLIC_FREE_FUNNEL_VIDEO_URL?.trim() ?? "";

  return (
    <Box
      maxW="768px"
      mx="auto"
      w="full"
      borderRadius="20px"
      overflow="hidden"
      sx={{
        aspectRatio: "16 / 9",
        border: "1px solid rgba(212, 175, 55, 0.25)",
        boxShadow:
          "0 20px 64px rgba(0,0,0,0.60), 0 0 80px rgba(212,175,55,0.10), inset 0 1px 0 rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {src ? (
        <video
          src={src}
          controls
          playsInline
          preload="metadata"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            background: "#000",
          }}
        />
      ) : (
        <Center w="full" h="full" flexDirection="column" gap={3}>
          <Box
            w="56px"
            h="56px"
            borderRadius="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg="rgba(212,175,55,0.12)"
            border="1px solid rgba(212,175,55,0.35)"
            color="var(--color-accent-gold)"
            fontSize="22px"
          >
            ▶
          </Box>
          <Text className="inter" color="rgba(255,255,255,0.40)" fontSize="sm">
            Vorstellungsvideo folgt in Kürze
          </Text>
        </Center>
      )}
    </Box>
  );
}
