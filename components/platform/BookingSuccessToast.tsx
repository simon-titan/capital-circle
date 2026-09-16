"use client";

import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react";
import { CheckCircle2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const REDUCED_MOTION = { "@media (prefers-reduced-motion: reduce)": { animation: "none" } };

export function BookingSuccessToast() {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    router.replace("/dashboard", { scroll: false });
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  // Escape schließt den Hinweis wie ein Dialog.
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVisible(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  if (!visible) return null;

  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={9999}
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
      bg="rgba(8, 10, 12, 0.72)"
      onClick={() => setVisible(false)}
      sx={{
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        animation: "bsIn 250ms ease forwards",
        "@keyframes bsIn": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        ...REDUCED_MOTION,
      }}
    >
      {/* Äußere Hülle trägt das Einblenden, die Karte selbst den atmenden Hero-Glow. */}
      <Box
        maxW="480px"
        w="full"
        sx={{
          animation: "bsScale 300ms var(--cc-ease) forwards",
          "@keyframes bsScale": {
            "0%": { opacity: 0, transform: "scale(0.94)" },
            "100%": { opacity: 1, transform: "scale(1)" },
          },
          ...REDUCED_MOTION,
        }}
      >
        <Box
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-success-title"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          className="cc-card cc-card--hero cc-card--still"
          p={{ base: 7, md: 9 }}
          textAlign="center"
        >
          <Box
            as="button"
            type="button"
            aria-label="Schließen"
            position="absolute"
            top={3}
            right={3}
            w="32px"
            h="32px"
            borderRadius="8px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            bg="transparent"
            color="var(--cc-text-3)"
            transition="color 150ms var(--cc-ease), background-color 150ms var(--cc-ease)"
            _hover={{ color: "var(--cc-text)", bg: "rgba(255, 255, 255, 0.06)" }}
            _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px" }}
            onClick={() => setVisible(false)}
          >
            <X size={16} aria-hidden />
          </Box>

          <Stack align="center" spacing={5}>
            <Flex
              w="56px"
              h="56px"
              borderRadius="full"
              align="center"
              justify="center"
              bg="var(--cc-gold-wash)"
              border="1px solid var(--cc-gold-line)"
              boxShadow="0 0 20px rgba(212, 176, 128, 0.2)"
              color="var(--cc-gold-light)"
              aria-hidden
            >
              <CheckCircle2 size={28} strokeWidth={1.75} />
            </Flex>

            <Stack spacing={3} align="center">
              <Text
                as="h2"
                id="booking-success-title"
                fontSize={{ base: "22px", md: "26px" }}
                fontWeight={600}
                lineHeight={1.2}
                letterSpacing="-0.01em"
                color="var(--cc-text)"
              >
                Termin gebucht!
              </Text>

              <Text fontSize={{ base: "15px", md: "16px" }} lineHeight={1.7} color="var(--cc-text-2)" maxW="360px">
                Deine Terminbuchung war erfolgreich. Das ist deine{" "}
                <Box as="span" fontWeight={600} color="var(--cc-gold-light)">
                  einzige Chance
                </Box>{" "}
                dabei zu sein. Bereite dich auf das Meeting vor!
              </Text>

              <Text fontSize={{ base: "15px", md: "16px" }} fontWeight={600} lineHeight={1.5} color="var(--cc-text-soft)">
                Wir freuen uns auf dich!
              </Text>
            </Stack>

            <Button type="button" variant="gold" mt={2} px={8} onClick={() => setVisible(false)}>
              Verstanden
            </Button>

            {/* Auto-dismiss progress bar */}
            <Box w="60px" h="3px" borderRadius="full" bg="var(--cc-track)" overflow="hidden" aria-hidden>
              <Box
                h="full"
                borderRadius="full"
                bg="var(--cc-gold-bar)"
                sx={{
                  animation: "bsProgress 8s linear forwards",
                  "@keyframes bsProgress": {
                    "0%": { width: "100%" },
                    "100%": { width: "0%" },
                  },
                  ...REDUCED_MOTION,
                }}
              />
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
