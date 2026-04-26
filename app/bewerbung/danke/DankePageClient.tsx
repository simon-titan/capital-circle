"use client";

import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { Calendar } from "lucide-react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface Props {
  calendlyUrl: string;
}

export function DankePageClient({ calendlyUrl }: Props) {
  const router = useRouter();
  const [widgetReady, setWidgetReady] = useState(false);

  const handleMessage = useCallback(
    (e: MessageEvent) => {
      if (e.data?.event === "calendly.event_scheduled") {
        router.push("/dashboard?booking_success=1");
      }
      if (e.data?.event === "calendly.page_height" || e.data?.event === "calendly.date_and_time_selected") {
        setWidgetReady(true);
      }
    },
    [router],
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  const loadTimeout = useEffect(() => {
    const timer = setTimeout(() => setWidgetReady(true), 5000);
    return () => clearTimeout(timer);
  }, []);
  void loadTimeout;

  return (
    <>
      <style>{`
        nav[aria-label], header[role="banner"], [data-platform-nav], [data-topbar] {
          display: none !important;
        }
        body {
          padding-top: 0 !important;
          margin-top: 0 !important;
          background: #07080A !important;
        }
      `}</style>

      <Box
        minH="100vh"
        w="full"
        bg="#07080A"
        color="var(--color-text-primary, #F0F0F2)"
        position="relative"
        overflowX="hidden"
        _before={{
          content: '""',
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 80% -10%, rgba(212,175,55,0.10), transparent 60%), radial-gradient(ellipse 60% 50% at 10% 100%, rgba(212,175,55,0.05), transparent 65%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <Box position="relative" zIndex={1} px={{ base: 4, md: 8, lg: 12 }}>
          {/* Header section */}
          <Stack
            align="center"
            textAlign="center"
            pt={{ base: 12, md: 16 }}
            pb={{ base: 8, md: 10 }}
            maxW="680px"
            mx="auto"
            gap={5}
          >
            {/* Icon badge */}
            <Box
              w="56px"
              h="56px"
              borderRadius="16px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              sx={{
                background: "linear-gradient(145deg, rgba(212,175,55,0.25) 0%, rgba(212,175,55,0.08) 100%)",
                border: "1px solid rgba(212,175,55,0.40)",
                boxShadow: "0 0 24px rgba(212,175,55,0.15), inset 0 1px 0 rgba(255,255,255,0.10)",
              }}
            >
              <Calendar size={24} color="#D4AF37" strokeWidth={1.75} />
            </Box>

            {/* Section label */}
            <HStack gap={3}>
              <Box w="28px" h="1px" bg="linear-gradient(90deg, transparent, rgba(212,175,55,0.70))" />
              <Text
                fontSize="xs"
                letterSpacing="0.22em"
                textTransform="uppercase"
                color="var(--color-accent-gold, #D4AF37)"
                className="inter-semibold"
              >
                Bewerbung eingegangen
              </Text>
              <Box w="28px" h="1px" bg="linear-gradient(90deg, rgba(212,175,55,0.70), transparent)" />
            </HStack>

            {/* Headline */}
            <Text
              as="h1"
              className="inter-bold"
              fontSize={{ base: "2xl", md: "3xl", lg: "4xl" }}
              lineHeight="1.15"
            >
              Dein Termin.{" "}
              <Box
                as="span"
                sx={{
                  color: "var(--color-accent-gold, #D4AF37)",
                  textShadow: "0 0 16px rgba(212,175,55,0.30)",
                }}
              >
                Deine Chance.
              </Box>
            </Text>

            {/* Subtitle */}
            <Text
              className="inter"
              fontSize={{ base: "sm", md: "md" }}
              color="rgba(255,255,255,0.50)"
              maxW="520px"
              lineHeight="1.7"
            >
              Buche jetzt deinen persönlichen Gesprächstermin.
              Das ist dein nächster Schritt in den Capital Circle.
            </Text>
          </Stack>

          {/* Calendly embed container */}
          <Box
            maxW="900px"
            mx="auto"
            mb={{ base: 10, md: 16 }}
            borderRadius="16px"
            overflow="hidden"
            position="relative"
            sx={{
              border: "1px solid rgba(212,175,55,0.20)",
              boxShadow: "0 8px 48px rgba(0,0,0,0.60), 0 0 24px rgba(212,175,55,0.08)",
              background: "linear-gradient(135deg, rgba(212,175,55,0.04) 0%, rgba(8,8,8,0.70) 100%)",
            }}
          >
            {/* Gold light line top */}
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              h="2px"
              zIndex={2}
              background="linear-gradient(90deg, transparent, rgba(212,175,55,0.65), transparent)"
            />

            {/* Loading overlay */}
            {!widgetReady && (
              <Box
                position="absolute"
                inset={0}
                zIndex={1}
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                gap={5}
                bg="#07080A"
              >
                {/* Gold spinner */}
                <Box
                  w="40px"
                  h="40px"
                  borderRadius="full"
                  border="3px solid rgba(212,175,55,0.15)"
                  borderTopColor="var(--color-accent-gold, #D4AF37)"
                  sx={{
                    animation: "calSpin 0.8s linear infinite",
                    "@keyframes calSpin": {
                      "0%": { transform: "rotate(0deg)" },
                      "100%": { transform: "rotate(360deg)" },
                    },
                  }}
                />
                <Text
                  className="inter"
                  fontSize="sm"
                  color="rgba(255,255,255,0.40)"
                >
                  Termine werden geladen…
                </Text>
              </Box>
            )}

            <div
              className="calendly-inline-widget"
              data-url={calendlyUrl}
              style={{ minWidth: "320px", height: "700px", width: "100%" }}
            />
            <Script
              src="https://assets.calendly.com/assets/external/widget.js"
              strategy="lazyOnload"
            />
          </Box>

          {/* Footer */}
          <Box pb={10} textAlign="center">
            <Text
              fontSize="xs"
              color="rgba(255,255,255,0.18)"
              className="inter"
              maxW="480px"
              mx="auto"
              lineHeight="1.7"
            >
              Der Termin ist verbindlich. Bitte erscheine pünktlich und
              bereite dich auf das Gespräch vor.
            </Text>
          </Box>
        </Box>
      </Box>
    </>
  );
}
