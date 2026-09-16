"use client";

import { Box, Stack, Text } from "@chakra-ui/react";
import { Calendar } from "lucide-react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  FunnelEyebrow,
  FunnelFinePrint,
  FunnelHeadline,
  FunnelLead,
  GoldWord,
  rise,
} from "@/components/marketing/funnel-ui";

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
          background: var(--cc-bg) !important;
        }
      `}</style>

      {/* Graphitgrund mit Sternenfeld und Champagner-Licht (wie Plattform und Marketing) */}
      <Box minH="100vh" w="full" bg="var(--cc-bg)" color="var(--cc-text)" position="relative" overflowX="clip">
        <Box className="cc-stars" aria-hidden />
        <Box className="cc-goldlight" aria-hidden />

        <Box position="relative" zIndex={1} px={{ base: 4, md: 8, lg: 12 }}>
          {/* Header section */}
          <Stack
            align="center"
            textAlign="center"
            pt={{ base: 12, md: 16 }}
            pb={{ base: 8, md: 10 }}
            maxW="680px"
            mx="auto"
            spacing={5}
            {...rise(0)}
          >
            {/* Icon badge */}
            <Box
              w="56px"
              h="56px"
              borderRadius="12px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="var(--cc-gold-light)"
              bg="radial-gradient(circle at 50% 30%, rgba(232, 192, 148, 0.22), rgba(212, 176, 128, 0.05) 75%)"
              border="1px solid rgba(232, 192, 148, 0.4)"
              boxShadow="0 0 26px rgba(212, 176, 128, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
              aria-hidden
            >
              <Calendar size={24} strokeWidth={1.75} />
            </Box>

            <FunnelEyebrow>Bewerbung eingegangen</FunnelEyebrow>

            <FunnelHeadline scale="lg">
              Dein Termin. <GoldWord>Deine Chance.</GoldWord>
            </FunnelHeadline>

            <FunnelLead fontSize={{ base: "15px", md: "17px" }} maxW="520px" lineHeight={1.7}>
              Buche jetzt deinen persönlichen Gesprächstermin.
              Das ist dein nächster Schritt in den Capital Circle.
            </FunnelLead>
          </Stack>

          {/* Calendly embed container — Panel massiv mit Champagner-Rand und Gold-Lichtkante */}
          <Box
            maxW="900px"
            mx="auto"
            mb={{ base: 10, md: 16 }}
            borderRadius="12px"
            overflow="hidden"
            position="relative"
            bg="var(--cc-panel-solid)"
            border="1px solid rgba(232, 192, 148, 0.28)"
            boxShadow="0 16px 48px rgba(0, 0, 0, 0.5), 0 0 40px rgba(212, 176, 128, 0.1)"
            {...rise(1)}
          >
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              h="1px"
              zIndex={2}
              bgImage="linear-gradient(90deg, transparent 0%, rgba(232, 192, 148, 0.9) 45%, rgba(212, 176, 128, 0.3) 100%)"
              aria-hidden
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
                bg="var(--cc-panel-solid)"
                role="status"
              >
                {/* Gold spinner */}
                <Box
                  w="40px"
                  h="40px"
                  borderRadius="full"
                  border="3px solid rgba(212, 176, 128, 0.15)"
                  borderTopColor="var(--cc-gold-light)"
                  boxShadow="0 0 18px rgba(212, 176, 128, 0.2)"
                  sx={{
                    animation: "calSpin 0.8s linear infinite",
                    "@keyframes calSpin": {
                      "0%": { transform: "rotate(0deg)" },
                      "100%": { transform: "rotate(360deg)" },
                    },
                  }}
                />
                <Text fontSize="14px" color="var(--cc-text-2)">
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
            <FunnelFinePrint maxW="480px" mx="auto">
              Der Termin ist verbindlich. Bitte erscheine pünktlich und
              bereite dich auf das Gespräch vor.
            </FunnelFinePrint>
          </Box>
        </Box>
      </Box>
    </>
  );
}
