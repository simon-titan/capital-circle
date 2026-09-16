import type { Metadata } from "next";
import { Box, Flex, Heading, Stack, Text } from "@chakra-ui/react";
import { Check } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ZugangForm } from "@/components/checkout/ZugangForm";
import { ladeKaufStatus } from "@/lib/checkout/kauf-status";
import { preiskarten } from "@/config/landing-membership";

export const metadata: Metadata = {
  title: "Zahlung bestätigt — Capital Circle",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Landet hier direkt nach dem Stripe-Checkout.
 *
 * ── Zwei Herkünfte, eine Seite ──────────────────────────────────────────────
 * Über `/go/<plan>` kommt ein **Gast**: Er hat zu diesem Zeitpunkt noch kein
 * Passwort, sein Konto entsteht parallel im Webhook. Über den eingebetteten
 * Checkout im Mitgliederbereich kommt jemand, der längst eingeloggt ist. Beide
 * landen auf derselben Adresse, weil beide dieselbe Frage haben: „Ist das
 * durch, und wie komme ich jetzt rein?"
 *
 * Deshalb steht die Seite **außerhalb** der Plattform-Gruppe: Die Shell mit
 * Sidebar setzt eine Anmeldung voraus, die der Gast hier noch gar nicht haben
 * kann. `/checkout/success` muss aus demselben Grund in `PUBLIC_PATHS` stehen
 * (`proxy.ts`) — ausgewiesen wird der Käufer über die Checkout-Session, nicht
 * über einen Login.
 *
 * ── Der Zustand kommt aus Stripe und der Datenbank, nicht aus der URL ───────
 * Die Vorgängerfassung pollte im Browser gegen `profiles` und leitete nach
 * spätestens 20 Sekunden weiter. Für einen Gast wäre das ins Leere gelaufen:
 * Ohne Sitzung liest er seine eigene Zeile nicht, und ohne Passwort nützt ihm
 * ein `/dashboard` nichts.
 */
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  const status = await ladeKaufStatus(sessionId);

  const zugangAktiv = status.ok && status.zugangAktiv;
  const planLabel =
    status.ok && status.tier
      ? (preiskarten.find((k) => k.plan === status.tier)?.laufzeit ?? null)
      : null;

  return (
    <Box position="relative" minH="100vh" w="full" bg="var(--cc-bg)" color="var(--cc-text)" overflowX="clip">
      <Box className="cc-stars" aria-hidden />
      <Box className="cc-goldlight" aria-hidden />

      <Flex position="relative" zIndex={1} justify="center" px={4} py={{ base: 12, md: 20 }}>
        <Stack spacing={8} w="full" maxW="560px">
          {/* ── Kopf ─────────────────────────────────────────────────────── */}
          <Stack spacing={5} align="center" textAlign="center">
            <Box maxW="170px">
              <Logo variant="onDark" priority />
            </Box>

            <Flex
              w="52px"
              h="52px"
              align="center"
              justify="center"
              borderRadius="full"
              bg="var(--cc-gold-grad)"
              color="var(--cc-on-gold)"
              boxShadow="0 0 28px rgba(212, 176, 128, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.35)"
              aria-hidden
            >
              <Check size={24} strokeWidth={2.5} />
            </Flex>

            <Stack spacing={3} align="center">
              <Heading
                as="h1"
                fontSize={{ base: "28px", md: "34px" }}
                fontWeight={600}
                lineHeight={1.15}
                letterSpacing="-0.01em"
              >
                Zahlung bestätigt
              </Heading>
              {planLabel ? (
                <Text
                  fontSize="13px"
                  fontWeight={500}
                  letterSpacing="0.12em"
                  textTransform="uppercase"
                  color="var(--cc-gold-light)"
                >
                  {planLabel}
                </Text>
              ) : null}
              <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)" maxW="42ch">
                {zugangAktiv
                  ? "Alles eingerichtet. Schön, dass du dabei bist."
                  : "Ein kurzer Schritt fehlt noch, dann bist du drin."}
              </Text>
            </Stack>
          </Stack>

          {/* ── Zugang ───────────────────────────────────────────────────── */}
          <Box className={zugangAktiv ? "cc-card" : "cc-card cc-card--hero"} p={{ base: 5, md: 6 }}>
            <Stack spacing={4}>
              <Heading
                as="h2"
                fontSize="13px"
                lineHeight="18px"
                fontWeight={500}
                letterSpacing="0.12em"
                textTransform="uppercase"
                color={zugangAktiv ? "var(--cc-text-soft)" : "var(--cc-gold-light)"}
              >
                Zugang zur Plattform
              </Heading>

              {zugangAktiv ? (
                <Stack spacing={4} align="flex-start">
                  <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)">
                    Du bist eingeloggt. Der nächste Schritt wartet im Dashboard.
                  </Text>
                  {/*
                    Bares `<a>` statt `next/link`: Nach dem Passwortsetzen liegt
                    eine frische Sitzung im Cookie, und ein vollständiger
                    Seitenaufruf ist der einzige Weg, bei dem die Auth-Weiche in
                    `proxy.ts` sie garantiert sieht.
                  */}
                  <Box
                    as="a"
                    href="/dashboard"
                    display="inline-flex"
                    alignItems="center"
                    h="48px"
                    px={6}
                    borderRadius="8px"
                    fontWeight={600}
                    bg="var(--cc-gold)"
                    bgImage="var(--cc-gold-grad)"
                    color="var(--cc-on-gold)"
                    boxShadow="0 6px 18px rgba(212, 176, 128, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.35)"
                    transition="transform 180ms var(--cc-ease), box-shadow 180ms var(--cc-ease), filter 180ms var(--cc-ease)"
                    _hover={{
                      filter: "brightness(1.06)",
                      transform: "translateY(-1px)",
                      boxShadow: "0 0 26px rgba(212, 176, 128, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
                    }}
                    _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px" }}
                  >
                    Zum Dashboard
                  </Box>
                </Stack>
              ) : status.ok ? (
                <Stack spacing={4}>
                  <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)">
                    Wähle ein Passwort für <Box as="span" color="var(--cc-text)">{status.email}</Box> — danach bist du
                    direkt eingeloggt. Du kannst das auch überspringen: Der Link in der E-Mail funktioniert genauso.
                  </Text>
                  <ZugangForm sessionId={sessionId!} />
                </Stack>
              ) : (
                <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)">
                  {status.grund === "account_pending"
                    ? "Dein Konto wird gerade angelegt. Lade die Seite in ein paar Sekunden neu."
                    : status.grund === "session_expired"
                      ? "Der Kauf ist länger her. Setz dein Passwort über den Link in der E-Mail, die wir dir geschickt haben."
                      : "Setz dein Passwort über den Link in der E-Mail, die wir dir geschickt haben."}
                </Text>
              )}
            </Stack>
          </Box>

          {/* ── Was jetzt passiert ───────────────────────────────────────── */}
          <Box className="cc-card cc-card--still" p={{ base: 5, md: 6 }}>
            <Stack spacing={4}>
              <Heading
                as="h2"
                fontSize="13px"
                lineHeight="18px"
                fontWeight={500}
                letterSpacing="0.12em"
                textTransform="uppercase"
                color="var(--cc-text-soft)"
              >
                So startest du
              </Heading>
              <Stack as="ol" spacing={3} listStyleType="none" m={0} p={0}>
                {[
                  "Im Institut mit Modul 1 anfangen — das Fundament trägt alles andere.",
                  "Discord im Dashboard verbinden, damit du die Live-Sessions mitbekommst.",
                  "Deinen ersten Trade im Journal erfassen, auch wenn er klein ist.",
                ].map((schritt, i) => (
                  <Flex as="li" key={schritt} gap={3} align="flex-start">
                    <Box
                      className="cc-num"
                      flexShrink={0}
                      w="24px"
                      fontSize="13px"
                      fontWeight={600}
                      letterSpacing="0.08em"
                      color="var(--cc-text-3)"
                      aria-hidden
                    >
                      {String(i + 1).padStart(2, "0")}
                    </Box>
                    <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)">
                      {schritt}
                    </Text>
                  </Flex>
                ))}
              </Stack>
            </Stack>
          </Box>

          <Text fontSize="12px" color="var(--cc-text-3)" textAlign="center" lineHeight={1.6}>
            Keine Mail erhalten? Schau kurz im Spam-Ordner nach — sie kommt von Capital Circle. Die Rechnung schickt
            dir unser Zahlungsdienstleister separat.
          </Text>
        </Stack>
      </Flex>
    </Box>
  );
}
