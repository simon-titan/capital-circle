import type { Metadata } from "next";
import { Box, Button, Flex, Heading, Link, Stack, Text } from "@chakra-ui/react";
import { Logo } from "@/components/brand/Logo";
import { SetPasswordForm } from "@/components/checkout/SetPasswordForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Passwort setzen · Capital Circle",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Ziel der Links „Passwort setzen" (Willkommensmail nach dem Gast-Kauf) und
 * „Neues Passwort wählen" (Mail aus `/passwort-vergessen`).
 *
 * Der Weg dorthin: Die Mail enthält `/auth/confirm?token_hash=…&next=/set-password`,
 * dort wird der Einmal-Token serverseitig eingelöst und die Sitzung als Cookie
 * gesetzt. Erst danach landet der Kunde hier — mit Sitzung, aber ohne (bekanntes)
 * Passwort.
 *
 * Nach dem Kauf ist das der **Rückweg**; der Hauptweg ist das Formular direkt
 * auf `/checkout/success`. Die Seite steht deshalb bewusst nicht im Kaufweg und
 * wirbt nicht.
 *
 * **Ohne Sitzung kein Formular.** Bis 19.09.2026 stand es immer da und
 * scheiterte erst beim Absenden mit „Auth session missing" — wer die Adresse
 * neu lud oder aus dem Verlauf öffnete, tippte also zweimal ein Passwort für
 * nichts. Jetzt steht in dem Fall gleich der Weg zu einem neuen Link da.
 */
export default async function SetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Box position="relative" minH="100vh" w="full" bg="var(--cc-bg)" color="var(--cc-text)" overflowX="clip">
      <Box className="cc-stars" aria-hidden />
      <Box className="cc-goldlight" aria-hidden />

      <Flex position="relative" zIndex={1} justify="center" px={4} py={{ base: 12, md: 20 }}>
        <Stack spacing={8} w="full" maxW="440px">
          <Stack spacing={5} align="center" textAlign="center">
            <Box maxW="170px">
              <Logo variant="onDark" priority />
            </Box>
            <Stack spacing={3}>
              <Heading as="h1" fontSize={{ base: "26px", md: "30px" }} fontWeight={600} letterSpacing="-0.01em">
                {user ? "Passwort setzen" : "Link nicht mehr gültig"}
              </Heading>
              <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)">
                {user ? (
                  <>
                    Wähle ein Passwort für{" "}
                    {user.email ? (
                      <Box as="span" color="var(--cc-text)" wordBreak="break-all">
                        {user.email}
                      </Box>
                    ) : (
                      "dein Konto"
                    )}
                    . Danach geht es direkt ins Dashboard.
                  </>
                ) : (
                  "Links zum Passwortsetzen funktionieren genau einmal und nur für begrenzte Zeit. Dieser wurde schon benutzt oder ist abgelaufen."
                )}
              </Text>
            </Stack>
          </Stack>

          <Box className="cc-card cc-card--hero" p={{ base: 5, md: 6 }}>
            {user ? (
              <SetPasswordForm />
            ) : (
              <Stack spacing={4}>
                <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)">
                  Hol dir einen neuen Link. Das geht auch, wenn du nach dem Kauf noch nie ein Passwort gesetzt hast.
                </Text>
                {/*
                  `as="a"` statt `as={NextLink}`: Diese Datei ist eine
                  Server-Komponente, eine Komponente als Prop wäre eine Funktion
                  über die Server-Grenze (siehe `app/(admin)/admin/page.tsx`).
                */}
                <Button as="a" href="/passwort-vergessen" variant="gold" h="48px">
                  Neuen Link anfordern
                </Button>
                <Link
                  href="/login"
                  alignSelf="center"
                  fontSize="13px"
                  color="var(--cc-text-2)"
                  textUnderlineOffset="3px"
                  _hover={{ color: "var(--cc-gold-light)", textDecoration: "underline" }}
                >
                  Du kennst dein Passwort? Zur Anmeldung
                </Link>
              </Stack>
            )}
          </Box>
        </Stack>
      </Flex>
    </Box>
  );
}
