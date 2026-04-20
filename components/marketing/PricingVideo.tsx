import { Box, Center, Text } from "@chakra-ui/react";

/**
 * Sales-Video auf der Pricing-Seite.
 *
 * Bewusst nativer HTML5 `<video>`-Tag (kein Mux, kein CloudflareStream): die
 * Quelle ist eine MP4 aus dem Hetzner-Bucket, eingebunden über die öffentliche
 * URL in `NEXT_PUBLIC_PRICING_VIDEO_URL`. autoPlay+muted+playsInline sorgen
 * dafür, dass der Player auch auf iOS/Safari sofort losläuft (Browser-Policy).
 *
 * Wenn die ENV-Var nicht gesetzt ist, zeigen wir einen schlanken Platzhalter,
 * statt die Seite leer zu lassen — Pricing ist sonst funktionsfähig.
 */
export function PricingVideo() {
  const src = process.env.NEXT_PUBLIC_PRICING_VIDEO_URL?.trim() ?? "";
  const poster = process.env.NEXT_PUBLIC_PRICING_VIDEO_POSTER?.trim() || undefined;

  return (
    <Box
      maxW="768px"
      mx="auto"
      w="full"
      borderRadius="16px"
      overflow="hidden"
      sx={{
        aspectRatio: "16 / 9",
        border: "1px solid rgba(212, 175, 55, 0.20)",
        boxShadow:
          "0 16px 56px rgba(0,0,0,0.55), 0 0 64px rgba(212,175,55,0.12), inset 0 1px 0 rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      {src ? (
        <video
          src={src}
          autoPlay
          muted
          loop
          playsInline
          poster={poster}
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
        <Center w="full" h="full">
          <Text className="inter" color="rgba(255,255,255,0.45)" fontSize="sm">
            Sales-Video wird in Kürze verfügbar sein.
          </Text>
        </Center>
      )}
    </Box>
  );
}
