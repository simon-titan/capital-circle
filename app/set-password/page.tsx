import type { Metadata } from "next";
import { Box, Flex, Heading, Stack, Text } from "@chakra-ui/react";
import { Logo } from "@/components/brand/Logo";
import { SetPasswordForm } from "@/components/checkout/SetPasswordForm";

export const metadata: Metadata = {
  title: "Passwort setzen — Capital Circle",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Ziel des Links „Passwort setzen" aus der Willkommensmail.
 *
 * Der Weg dorthin: Die Mail enthält `/auth/confirm?token_hash=…&next=/set-password`,
 * dort wird der Einmal-Token serverseitig eingelöst und die Sitzung als Cookie
 * gesetzt. Erst danach landet der Kunde hier — mit Sitzung, aber ohne Passwort.
 *
 * Das ist der **Rückweg**. Der Hauptweg ist das Formular direkt auf
 * `/checkout/success`; diese Seite fängt den auf, der die Erfolgsseite
 * weggeklickt hat. Sie steht deshalb bewusst nicht im Kaufweg und wirbt nicht.
 */
export default function SetPasswordPage() {
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
                Passwort setzen
              </Heading>
              <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)">
                Wähle ein Passwort für dein Konto. Danach geht es direkt ins Dashboard.
              </Text>
            </Stack>
          </Stack>

          <Box className="cc-card cc-card--hero" p={{ base: 5, md: 6 }}>
            <SetPasswordForm />
          </Box>
        </Stack>
      </Flex>
    </Box>
  );
}
