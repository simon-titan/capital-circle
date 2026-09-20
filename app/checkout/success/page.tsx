import type { Metadata } from "next";
import { Box, Flex, Heading, Stack, Text } from "@chakra-ui/react";
import { Check } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { KontoWarten } from "@/components/checkout/KontoWarten";
import { KontoWechseln } from "@/components/checkout/KontoWechseln";
import { ZugangForm } from "@/components/checkout/ZugangForm";
import { RechtsLinks } from "@/components/legal/RechtsFusszeile";
import { ladeKaufStatus, type KaufStatus } from "@/lib/checkout/kauf-status";
import { createClient } from "@/lib/supabase/server";
import { preiskarten } from "@/config/landing-membership";
import { getDiscordAuthUrl } from "@/lib/discord";
import { DiscordGlyph } from "@/components/platform/DiscordBanner";

export const metadata: Metadata = {
  title: "Zahlung bestätigt — Capital Circle",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Was der Käufer in **diesem Browser** als Nächstes tun muss.
 *
 * Bis 19.09.2026 hing die Anzeige allein daran, ob sich am Konto schon einmal
 * jemand angemeldet hatte (`zugangAktiv`). Ein Free-Mitglied, das mit seiner
 * bestehenden Adresse kaufte, las deshalb „Du bist eingeloggt" — auch auf
 * einem Gerät, auf dem es nie angemeldet war, mit einem Knopf „Zum Dashboard",
 * der beim Login endete. Jetzt zählt die Sitzung im Cookie:
 *
 *   - `eingeloggt`        Die Sitzung gehört zum Käufer — oder es gibt keinen
 *                         lesbaren Kauf, aber eine Sitzung; dann zählt die.
 *   - `passwort_waehlen`  Konto ohne jede Anmeldung (Gastkauf): Formular hier.
 *   - `anmelden`          Konto mit Passwort, dieser Browser nicht angemeldet.
 *   - `anderes_konto`     Angemeldet, aber als jemand anderes als der Käufer.
 *   - `wartet`            Der Webhook legt das Konto gerade an.
 *   - `per_mail`          Kaufstatus nicht lesbar (z. B. älter als 24 h).
 */
type Zugang =
  | { art: "eingeloggt" }
  | { art: "passwort_waehlen"; email: string }
  | { art: "anmelden"; email: string }
  | { art: "anderes_konto"; email: string; angemeldetAls: string | null }
  | { art: "wartet" }
  | { art: "per_mail"; kaufAlt: boolean };

function zugangAus(status: KaufStatus, sitzung: { id: string; email: string | null } | null): Zugang {
  if (status.ok) {
    if (sitzung?.id === status.userId) return { art: "eingeloggt" };
    // Vor `anderes_konto`: Das Formular setzt das Passwort des Käufers und
    // meldet ihn an — eine fremde Sitzung wird dabei ohnehin ersetzt.
    if (!status.zugangAktiv) return { art: "passwort_waehlen", email: status.email };
    if (sitzung) return { art: "anderes_konto", email: status.email, angemeldetAls: sitzung.email };
    return { art: "anmelden", email: status.email };
  }
  // Das Konto des Käufers existiert noch nicht — eine Sitzung im Browser
  // gehört dann sicher jemand anderem und sagt über diesen Kauf nichts.
  if (status.grund === "account_pending") return { art: "wartet" };
  if (sitzung) return { art: "eingeloggt" };
  return { art: "per_mail", kaufAlt: status.grund === "session_expired" };
}

const KOPFZEILE: Record<Zugang["art"], string> = {
  eingeloggt: "Alles eingerichtet. Schön, dass du dabei bist.",
  anmelden: "Deine Mitgliedschaft ist freigeschaltet. Melde dich an, und du bist drin.",
  anderes_konto: "Deine Mitgliedschaft ist freigeschaltet. Melde dich mit dem richtigen Konto an.",
  passwort_waehlen: "Ein kurzer Schritt fehlt noch, dann bist du drin.",
  wartet: "Ein kurzer Schritt fehlt noch, dann bist du drin.",
  per_mail: "Ein kurzer Schritt fehlt noch, dann bist du drin.",
};

/**
 * Gold-Knopf als bares `<a>`: Nach dem Passwortsetzen liegt eine frische
 * Sitzung im Cookie, und ein vollständiger Seitenaufruf ist der einzige Weg,
 * bei dem die Auth-Weiche in `proxy.ts` sie garantiert sieht. Außerdem ist die
 * Seite eine Server-Komponente — `as={NextLink}` ginge nicht über die Grenze.
 */
const goldKnopf = {
  display: "inline-flex",
  alignItems: "center",
  h: "48px",
  px: 6,
  borderRadius: "8px",
  fontWeight: 600,
  bg: "var(--cc-gold)",
  bgImage: "var(--cc-gold-grad)",
  color: "var(--cc-on-gold)",
  boxShadow: "0 6px 18px rgba(212, 176, 128, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.35)",
  transition: "transform 180ms var(--cc-ease), box-shadow 180ms var(--cc-ease), filter 180ms var(--cc-ease)",
  _hover: {
    filter: "brightness(1.06)",
    transform: "translateY(-1px)",
    boxShadow: "0 0 26px rgba(212, 176, 128, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
  },
  _focusVisible: { outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px" },
} as const;

/** Leiser Textlink für den Nebenweg („Passwort vergessen?"). */
const leiserLink = {
  fontSize: "14px",
  color: "var(--cc-text-2)",
  textDecoration: "underline",
  textDecorationColor: "var(--cc-line-strong)",
  textUnderlineOffset: "3px",
  transition: "color 180ms var(--cc-ease)",
  _hover: { color: "var(--cc-gold-light)", textDecorationColor: "var(--cc-gold-line)" },
} as const;

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const zugang = zugangAus(status, user ? { id: user.id, email: user.email ?? null } : null);
  const erledigt = zugang.art === "eingeloggt";
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
                {KOPFZEILE[zugang.art]}
              </Text>
            </Stack>
          </Stack>

          {/* ── Zugang ───────────────────────────────────────────────────── */}
          <Box className={erledigt ? "cc-card" : "cc-card cc-card--hero"} p={{ base: 5, md: 6 }}>
            <Stack spacing={4}>
              <Heading
                as="h2"
                fontSize="13px"
                lineHeight="18px"
                fontWeight={500}
                letterSpacing="0.12em"
                textTransform="uppercase"
                color={erledigt ? "var(--cc-text-soft)" : "var(--cc-gold-light)"}
              >
                Zugang zur Plattform
              </Heading>

              {zugang.art === "eingeloggt" ? (
                /*
                 * Discord steht hier vor dem Dashboard (Wunsch Simon,
                 * 20.09.2026): Die Verknuepfung ist der einzige Schritt, der
                 * spaeter niemand mehr nachholt, und genau jetzt ist die
                 * Sitzung frisch. Der Weg ist derselbe wie im Konto
                 * (`/api/discord/connect`), er faellt also nicht auseinander.
                 * Bares `<a>`, weil die Route zu Discord weiterleitet.
                 */
                <Stack spacing={4} align="flex-start">
                  <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)">
                    Du bist eingeloggt. Verbinde noch Discord, dann bist du direkt in der Community und bekommst die
                    Live-Sessions mit.
                  </Text>
                  <Box as="a" {...goldKnopf} href={getDiscordAuthUrl()} gap={2.5}>
                    <DiscordGlyph size={20} />
                    Discord verbinden
                  </Box>
                  <Box as="a" {...leiserLink} href="/dashboard">
                    Später verbinden, zum Dashboard
                  </Box>
                </Stack>
              ) : zugang.art === "passwort_waehlen" ? (
                <Stack spacing={4}>
                  <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)">
                    Wähle ein Passwort für <Box as="span" color="var(--cc-text)">{zugang.email}</Box> — danach bist du
                    direkt eingeloggt. Du kannst das auch überspringen: Der Link in der E-Mail funktioniert genauso.
                  </Text>
                  <ZugangForm sessionId={sessionId!} />
                </Stack>
              ) : zugang.art === "anmelden" ? (
                <Stack spacing={4} align="flex-start">
                  <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)">
                    Für <Box as="span" color="var(--cc-text)">{zugang.email}</Box> gibt es schon ein Konto, und dort
                    ist die Mitgliedschaft jetzt freigeschaltet. Melde dich mit deinem bestehenden Passwort an.
                  </Text>
                  <Box as="a" {...goldKnopf} href="/login">
                    Zur Anmeldung
                  </Box>
                  <Box as="a" {...leiserLink} href="/passwort-vergessen">
                    Passwort vergessen?
                  </Box>
                </Stack>
              ) : zugang.art === "anderes_konto" ? (
                <Stack spacing={4} align="flex-start">
                  <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)">
                    Gekauft wurde für <Box as="span" color="var(--cc-text)">{zugang.email}</Box>. In diesem Browser
                    bist du aber{" "}
                    {zugang.angemeldetAls ? (
                      <>
                        als <Box as="span" color="var(--cc-text)">{zugang.angemeldetAls}</Box>
                      </>
                    ) : (
                      "mit einem anderen Konto"
                    )}{" "}
                    angemeldet. Melde dich ab und mit der Adresse des Kaufs wieder an — dort ist die Mitgliedschaft
                    freigeschaltet.
                  </Text>
                  <KontoWechseln />
                  <Box as="a" {...leiserLink} href="/passwort-vergessen">
                    Passwort vergessen?
                  </Box>
                </Stack>
              ) : zugang.art === "wartet" ? (
                <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)">
                  Dein Konto wird gerade angelegt. Die Seite aktualisiert sich gleich von selbst.
                  <KontoWarten />
                </Text>
              ) : (
                <Stack spacing={4} align="flex-start">
                  <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)">
                    {zugang.kaufAlt ? "Der Kauf ist länger her. " : null}
                    Setz dein Passwort über den Link in der E-Mail, die wir dir geschickt haben. Keine Mail da oder der
                    Link abgelaufen? Hol dir einfach einen neuen.
                  </Text>
                  <Box as="a" {...goldKnopf} href="/passwort-vergessen">
                    Neuen Link anfordern
                  </Box>
                  <Box as="a" {...leiserLink} href="/login">
                    Du hast schon ein Passwort? Zur Anmeldung
                  </Box>
                </Stack>
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

          {/* Impressum · Datenschutz · AGB · Widerruf · Verträge hier kündigen */}
          <RechtsLinks ohneVertragswege borderTop="1px solid var(--cc-line)" pt={5} />
        </Stack>
      </Flex>
    </Box>
  );
}
