"use client";

import { Box, Stack, Text } from "@chakra-ui/react";
import { Calendar } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { CalendlyZweiKlick } from "@/components/marketing/CalendlyZweiKlick";
import { FunnelFooter, FunnelGround, FunnelPageStyles, FunnelSplash, GoldIconTile } from "./DiscordFunnelChrome";

/**
 * Calendly-Buchungsseite für den Discord-Funnel (analog /bewerbung/danke), Look nach DESIGN.md v3.2.
 * Attribution: utm_content = Lead-Token; ohne Token greift der E-Mail-Fallback im Webhook.
 * Der Kalender lädt erst nach Klick (Zwei-Klick-Lösung, `CalendlyZweiKlick`).
 */
export function DiscordDankeClient() {
  const searchParams = useSearchParams();
  const lid = (searchParams.get("lid") ?? "").trim();

  const [loading, setLoading] = useState(true);
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
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
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
    // Standard-Calendly-Embed ohne Design-/Sprach-Parameter (im Calendly-Dashboard
    // konfigurieren). utm_* + Prefill bleiben für Attribution/Vorausfüllung erhalten.
    return url.toString();
  })();

  return (
    <>
      <FunnelSplash visible={loading} />
      <FunnelPageStyles />

      <FunnelGround>
        <Box px={{ base: 4, md: 8, lg: 12 }}>
          {/* Header */}
          <Stack
            as="header"
            className="cc-rise"
            align="center"
            textAlign="center"
            pt={{ base: 10, md: 14 }}
            pb={{ base: 8, md: 10 }}
            maxW="760px"
            mx="auto"
            gap={5}
          >
            <Logo variant="onDark" width={180} />

            <GoldIconTile size={56} radius="12px">
              <Calendar size={24} strokeWidth={1.75} />
            </GoldIconTile>

            <Text
              as="h1"
              fontSize={{ base: "30px", md: "38px", lg: "46px" }}
              fontWeight={600}
              lineHeight="1.15"
              letterSpacing="-0.01em"
              color="var(--cc-text)"
            >
              <Box as="span" display="block">
                Dein Termin.
              </Box>
              <Box as="span" display="block" color="var(--cc-gold-light)">
                Deine Chance.
              </Box>
            </Text>

            <Text fontSize={{ base: "15px", md: "17px" }} color="var(--cc-text-2)" maxW="600px" lineHeight="1.7">
              Buche jetzt deinen persönlichen Gesprächstermin. Das ist dein nächster Schritt in den Capital Circle.
            </Text>
          </Stack>

          {/* Calendly / booked */}
          <Box maxW="900px" mx="auto" mb={{ base: 10, md: 16 }}>
            {booked ? (
              <Box className="cc-card cc-card--still" role="status" p={{ base: 8, md: 12 }} textAlign="center">
                <Text
                  fontSize={{ base: "16px", md: "18px" }}
                  color="var(--cc-text-soft)"
                  lineHeight="1.7"
                  maxW="520px"
                  mx="auto"
                >
                  Dein Termin ist gebucht. Du erhältst gleich eine Bestätigung per Email. Den Link zu deinem Termin findest du in dieser Mail.
                </Text>
              </Box>
            ) : calendlyUrl ? (
              <Box className="cc-card cc-card--hero cc-card--still">
                {/* Innerer Clip, damit die Gold-Kante (::before) der Karte sichtbar bleibt */}
                <Box position="relative" borderRadius="11px" overflow="hidden">
                  <CalendlyZweiKlick url={calendlyUrl} flaeche="var(--cc-surface)" />
                </Box>
              </Box>
            ) : (
              <Box className="cc-card cc-card--still" p={8} textAlign="center">
                <Text color="var(--cc-text-3)" fontSize="14px">
                  Terminbuchung ist derzeit nicht verfügbar.
                </Text>
              </Box>
            )}
          </Box>
        </Box>

        {/* Footer disclaimer */}
        <FunnelFooter>
          Der Termin ist verbindlich. Bitte erscheine pünktlich. Trading und Investitionen
          sind mit erheblichen Verlustrisiken verbunden.
        </FunnelFooter>
      </FunnelGround>
    </>
  );
}
