"use client";

import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { CheckCircle2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

  if (!visible) return null;

  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={9999}
      display="flex"
      alignItems="center"
      justifyContent="center"
      onClick={() => setVisible(false)}
      sx={{
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        animation: "bsIn 250ms ease forwards",
        "@keyframes bsIn": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
      }}
    >
      <Box
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        maxW="480px"
        w="full"
        mx={4}
        p={{ base: 7, md: 9 }}
        borderRadius="20px"
        position="relative"
        textAlign="center"
        sx={{
          background: "linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(12,13,16,0.97) 100%)",
          border: "1px solid rgba(212,175,55,0.30)",
          boxShadow: "0 12px 60px rgba(0,0,0,0.70), 0 0 32px rgba(212,175,55,0.12)",
          animation: "bsScale 300ms cubic-bezier(0.16,1,0.3,1) forwards",
          "@keyframes bsScale": {
            "0%": { opacity: 0, transform: "scale(0.90)" },
            "100%": { opacity: 1, transform: "scale(1)" },
          },
        }}
      >
        {/* Gold light line top */}
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          h="2px"
          borderRadius="20px 20px 0 0"
          background="linear-gradient(90deg, transparent, rgba(212,175,55,0.70), transparent)"
        />

        {/* Close button */}
        <Box
          as="button"
          position="absolute"
          top={3}
          right={3}
          w="32px"
          h="32px"
          borderRadius="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          bg="transparent"
          border="none"
          color="rgba(255,255,255,0.35)"
          onClick={() => setVisible(false)}
          sx={{
            transition: "all 150ms ease",
            _hover: { color: "rgba(255,255,255,0.70)" },
          }}
        >
          <X size={16} />
        </Box>

        <Stack align="center" gap={5}>
          {/* Icon */}
          <Box
            w="56px"
            h="56px"
            borderRadius="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
            sx={{
              background: "rgba(212,175,55,0.12)",
              border: "1px solid rgba(212,175,55,0.35)",
              boxShadow: "0 0 20px rgba(212,175,55,0.18)",
            }}
          >
            <CheckCircle2 size={28} color="#D4AF37" />
          </Box>

          <Stack gap={3} align="center">
            <Text
              className="inter-bold"
              fontSize={{ base: "xl", md: "2xl" }}
              color="var(--color-text-primary, #F0F0F2)"
              lineHeight="1.2"
            >
              Termin gebucht!
            </Text>

            <Text
              className="inter"
              fontSize={{ base: "sm", md: "md" }}
              color="rgba(255,255,255,0.60)"
              lineHeight="1.7"
              maxW="360px"
            >
              Deine Terminbuchung war erfolgreich. Das ist deine{" "}
              <Box as="span" className="inter-semibold" color="var(--color-accent-gold, #D4AF37)">
                einzige Chance
              </Box>{" "}
              dabei zu sein. Bereite dich auf das Meeting vor!
            </Text>

            <Text
              className="inter-semibold"
              fontSize={{ base: "sm", md: "md" }}
              color="rgba(255,255,255,0.80)"
              lineHeight="1.5"
            >
              Wir freuen uns auf dich!
            </Text>
          </Stack>

          {/* Dismiss button */}
          <Box
            as="button"
            mt={2}
            px={8}
            py={3}
            borderRadius="12px"
            cursor="pointer"
            className="inter-semibold"
            fontSize="sm"
            onClick={() => setVisible(false)}
            sx={{
              background: "linear-gradient(135deg, rgba(212,175,55,0.20) 0%, rgba(212,175,55,0.08) 100%)",
              border: "1px solid rgba(212,175,55,0.35)",
              color: "var(--color-accent-gold, #D4AF37)",
              transition: "all 200ms ease",
              _hover: {
                background: "rgba(212,175,55,0.28)",
                borderColor: "rgba(212,175,55,0.50)",
                transform: "translateY(-1px)",
              },
            }}
          >
            Verstanden
          </Box>

          {/* Auto-dismiss progress bar */}
          <Box
            w="60px"
            h="3px"
            borderRadius="full"
            bg="rgba(255,255,255,0.06)"
            overflow="hidden"
          >
            <Box
              h="full"
              borderRadius="full"
              sx={{
                background: "linear-gradient(90deg, rgba(212,175,55,0.5), rgba(212,175,55,0.9))",
                animation: "bsProgress 8s linear forwards",
                "@keyframes bsProgress": {
                  "0%": { width: "100%" },
                  "100%": { width: "0%" },
                },
              }}
            />
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
