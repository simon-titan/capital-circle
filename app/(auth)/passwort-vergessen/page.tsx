import type { Metadata } from "next";
import { Stack } from "@chakra-ui/react";
import { SkyArchBackground } from "@/components/layout/SkyArchBackground";
import { RechtsLinks } from "@/components/legal/RechtsFusszeile";
import { PasswortVergessenForm } from "@/components/onboarding/PasswortVergessenForm";

export const metadata: Metadata = {
  title: "Passwort vergessen — Capital Circle",
  robots: { index: false, follow: false },
};

/**
 * „Passwort vergessen" — verlinkt vom Login (`LoginStep`, also `/login` und
 * `/einsteig`), vom Hinweis zu abgelaufenen Links und von der Erfolgsseite.
 *
 * Die Kette dahinter ist dieselbe wie bei der Willkommensmail:
 *   1. `POST /api/auth/passwort-vergessen` antwortet sofort und immer gleich.
 *   2. Danach (`after()`) Link über die Supabase-Admin-API, Versand über Resend.
 *   3. Link → `/auth/confirm` löst den Token ein, setzt die Sitzung.
 *   4. `/set-password` → neues Passwort → Dashboard.
 *
 * Öffentlich (`PUBLIC_PATHS` in `proxy.ts`) und vom Wartungs-Gate ausgenommen,
 * wie `/login`.
 */
export default function PasswortVergessenPage() {
  return (
    <SkyArchBackground>
      <Stack
        minH="100vh"
        w="full"
        align="center"
        justify="center"
        px={{ base: 4, md: 8 }}
        py={{ base: 10, md: 12 }}
        spacing={0}
      >
        <PasswortVergessenForm />
        <RechtsLinks mt={10} maxW="360px" />
      </Stack>
    </SkyArchBackground>
  );
}
