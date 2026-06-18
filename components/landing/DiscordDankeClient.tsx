"use client";

import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { Calendar, Lock } from "lucide-react";
import Script from "next/script";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";

const ACCENT = "#47F7DC";

/**
 * Calendly-Buchungsseite für den Discord-Funnel (analog /bewerbung/danke), neues Branding.
 * Attribution: utm_content = Lead-Token; ohne Token greift der E-Mail-Fallback im Webhook.
 */
export function DiscordDankeClient() {
  const searchParams = useSearchParams();
  const lid = (searchParams.get("lid") ?? "").trim();

  const [loading, setLoading] = useState(true);
  const [widgetReady, setWidgetReady] = useState(false);
  const [booked, setBooked] = useState(false);
  const [leadInfo, setLeadInfo] = useState<{ firstName: string | null; email: string | null }>({
    firstName: null,
    email: null,
  });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!lid) return;
    fetch(`/api/discord-funnel/lead-info?lid=${encodeURIComponent(lid)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { ok?: boolean; firstName?: string | null; email?: string | null }) => {
        if (d?.ok) setLeadInfo({ firstName: d.firstName ?? null, email: d.email ?? null });
      })
      .catch(() => undefined);
  }, [lid]);

  const handleMessage = useCallback((e: MessageEvent) => {
    if (typeof e.data !== "object" || e.data === null) return;
    const event = (e.data as { event?: string }).event;
    if (event === "calendly.event_scheduled") setBooked(true);
    if (event === "calendly.page_height" || event === "calendly.date_and_time_selected") {
      setWidgetReady(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    const timer = setTimeout(() => setWidgetReady(true), 5000);
    return () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(timer);
    };
  }, [handleMessage]);

  const calendlyUrl = (() => {
    // Discord-Funnel nutzt einen eigenen Calendly-Event (getrennt von /bewerbung).
    const base =
      process.env.NEXT_PUBLIC_DISCORD_CALENDLY_URL?.trim() ||
      "https://calendly.com/contact-capitalcircletrading/capital-circle";
    const url = new URL(base);
    url.searchParams.set("utm_source", "capital-circle");
    url.searchParams.set("utm_medium", "discord");
    if (lid) url.searchParams.set("utm_content", lid);
    if (leadInfo.firstName) url.searchParams.set("first_name", leadInfo.firstName);
    if (leadInfo.email) url.searchParams.set("email", leadInfo.email);
    url.searchParams.set("background_color", "0a0a0a");
    url.searchParams.set("text_color", "ffffff");
    url.searchParams.set("primary_color", "16cc9b");
    url.searchParams.set("hide_gdpr_banner", "1");
    return url.toString();
  })();

  return (
    <>
      {/* Splash overlay */}
      <Box
        position="fixed"
        inset={0}
        zIndex={9999}
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        gap={5}
        bg="#000000"
        pointerEvents={loading ? "auto" : "none"}
        sx={{
          transition: "transform 450ms cubic-bezier(0.4, 0, 0.2, 1), opacity 350ms ease",
          transform: loading ? "translateY(0)" : "translateY(-100%)",
          opacity: loading ? 1 : 0,
        }}
      >
        <Logo variant="onDark" width={200} height={56} priority />
        <Box w="120px" h="3px" borderRadius="full" bg="rgba(255,255,255,0.06)" overflow="hidden">
          <Box
            h="full"
            borderRadius="full"
            sx={{
              background: "linear-gradient(90deg, #1FB9A6, #47F7DC, #8FFBEB)",
              animation: "splashProgress 300ms linear forwards",
              "@keyframes splashProgress": {
                "0%": { width: "0%" },
                "100%": { width: "100%" },
              },
            }}
          />
        </Box>
      </Box>

      <style>{`
        nav[aria-label], header[role="banner"], [data-platform-nav], [data-topbar] {
          display: none !important;
        }
        body {
          padding-top: 0 !important;
          margin-top: 0 !important;
          background: #000000 !important;
        }
      `}</style>

      <Box
        minH="100vh"
        w="full"
        bg="#000000"
        color="var(--color-text-primary, #F0F0F2)"
        position="relative"
        overflowX="hidden"
        _before={{
          content: '""',
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 82% -10%, rgba(71,247,220,0.12), transparent 60%), radial-gradient(ellipse 60% 55% at 8% 105%, rgba(88,101,242,0.12), transparent 62%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <Box position="relative" zIndex={1} px={{ base: 4, md: 8, lg: 12 }}>
          {/* Header */}
          <Stack align="center" textAlign="center" pt={{ base: 10, md: 14 }} pb={{ base: 8, md: 10 }} maxW="760px" mx="auto" gap={5}>
            <Box display="flex" justifyContent="center">
              <Logo variant="onDark" width={180} height={50} />
            </Box>

            <Box
              w="56px"
              h="56px"
              borderRadius="16px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              sx={{
                background: "linear-gradient(145deg, rgba(71,247,220,0.22) 0%, rgba(71,247,220,0.06) 100%)",
                border: "1px solid rgba(71,247,220,0.40)",
                boxShadow: "0 0 24px rgba(71,247,220,0.18), inset 0 1px 0 rgba(255,255,255,0.10)",
              }}
            >
              <Calendar size={24} color={ACCENT} strokeWidth={1.75} />
            </Box>

            <Text
              as="h1"
              className="inter-bold"
              fontSize={{ base: "2xl", md: "3xl", lg: "4xl" }}
              lineHeight="1.18"
              color="var(--color-text-primary, #F0F0F2)"
            >
              <Box as="span" display="block">Dein Termin.</Box>
              <Box
                as="span"
                display="block"
                sx={{ color: ACCENT, textShadow: "0 0 16px rgba(71,247,220,0.40)" }}
              >
                Deine Chance.
              </Box>
            </Text>

            <Text className="inter" fontSize={{ base: "sm", md: "md" }} color="rgba(255,255,255,0.55)" maxW="600px" lineHeight="1.7">
              Buche jetzt deinen persönlichen Gesprächstermin. Das ist dein nächster Schritt in den Capital Circle.
            </Text>
          </Stack>

          {/* Calendly / booked */}
          <Box maxW="900px" mx="auto" mb={{ base: 10, md: 16 }}>
            {booked ? (
              <Box
                borderRadius="16px"
                p={{ base: 8, md: 12 }}
                textAlign="center"
                sx={{
                  border: "1px solid rgba(71,247,220,0.20)",
                  boxShadow: "0 8px 48px rgba(0,0,0,0.60), 0 0 24px rgba(71,247,220,0.10)",
                  background: "linear-gradient(135deg, rgba(71,247,220,0.04) 0%, rgba(6,6,8,0.75) 100%)",
                }}
              >
                <Text className="inter" fontSize={{ base: "md", md: "lg" }} color="rgba(255,255,255,0.78)" lineHeight="1.7" maxW="520px" mx="auto">
                  Dein Termin ist gebucht. Du erhältst gleich eine Bestätigung per Email. Den Link zu deinem Termin findest du in dieser Mail.
                </Text>
              </Box>
            ) : calendlyUrl ? (
              <Box
                borderRadius="16px"
                overflow="hidden"
                position="relative"
                sx={{
                  border: "1px solid rgba(71,247,220,0.20)",
                  boxShadow: "0 8px 48px rgba(0,0,0,0.60), 0 0 24px rgba(71,247,220,0.10)",
                  background: "linear-gradient(135deg, rgba(71,247,220,0.04) 0%, rgba(6,6,8,0.75) 100%)",
                }}
              >
                <Box
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                  h="2px"
                  zIndex={2}
                  background="linear-gradient(90deg, transparent, rgba(71,247,220,0.65), transparent)"
                />

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
                    bg="#000000"
                  >
                    <Box
                      w="40px"
                      h="40px"
                      borderRadius="full"
                      border="3px solid rgba(71,247,220,0.15)"
                      borderTopColor={ACCENT}
                      sx={{
                        animation: "calSpin 0.8s linear infinite",
                        "@keyframes calSpin": {
                          "0%": { transform: "rotate(0deg)" },
                          "100%": { transform: "rotate(360deg)" },
                        },
                      }}
                    />
                    <Text className="inter" fontSize="sm" color="rgba(255,255,255,0.40)">
                      Termine werden geladen…
                    </Text>
                  </Box>
                )}

                <div
                  className="calendly-inline-widget"
                  data-url={calendlyUrl}
                  style={{ minWidth: "320px", height: "700px", width: "100%" }}
                />
                <Script src="https://assets.calendly.com/assets/external/widget.js" strategy="lazyOnload" />
              </Box>
            ) : (
              <Box borderRadius="16px" p={8} textAlign="center" border="1px solid rgba(255,255,255,0.08)" bg="rgba(255,255,255,0.03)">
                <Text className="inter" color="rgba(255,255,255,0.35)" fontSize="sm">
                  Terminbuchung ist derzeit nicht verfügbar.
                </Text>
              </Box>
            )}
          </Box>

          {/* Footer disclaimer */}
          <Box pb={10} textAlign="center" borderTop="1px solid rgba(255,255,255,0.05)" pt={8}>
            <Stack spacing={2} maxW="560px" mx="auto">
              <Text fontSize="xs" color="rgba(255,255,255,0.22)" className="inter" lineHeight="1.7">
                Der Termin ist verbindlich. Bitte erscheine pünktlich. Trading und Investitionen
                sind mit erheblichen Verlustrisiken verbunden.
              </Text>
              <HStack justify="center" spacing={1.5} color="rgba(255,255,255,0.15)">
                <Lock size={11} strokeWidth={2} />
                <Text fontSize="xs" className="inter">
                  © {new Date().getFullYear()} Capital Circle Institut
                </Text>
              </HStack>
            </Stack>
          </Box>
        </Box>
      </Box>
    </>
  );
}
