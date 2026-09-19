"use client";

import { Box, Button, HStack, Icon, Input, Link, Stack, Text } from "@chakra-ui/react";
import type { AuthError } from "@supabase/supabase-js";
import NextLink from "next/link";
import { type FormEvent, type ReactNode, Suspense, useMemo, useState } from "react";
import { SiInstagram, SiTiktok } from "react-icons/si";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { AnmeldeHinweis } from "@/components/onboarding/AnmeldeHinweis";
import { glassPrimaryButtonProps } from "@/components/ui/glassButtonStyles";

const SOCIAL = {
  instagram: "https://www.instagram.com/",
  tiktok: "https://www.tiktok.com/",
} as const;

/**
 * Eingabe nach DESIGN.md: 3 % Weiß, kräftige Haarlinie, Radius 8, Fokus mit Gold-Haarlinie.
 * Exportiert, weil „Passwort vergessen" (`PasswortVergessenForm`) dieselbe Karte zeigt.
 */
export const anmeldeEingabeStil = {
  h: "44px",
  bg: "rgba(255, 255, 255, 0.03)",
  borderWidth: "1px",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  color: "var(--cc-text)",
  fontSize: "15px",
  _placeholder: { color: "var(--cc-text-3)" },
  _hover: { borderColor: "rgba(255, 255, 255, 0.24)" },
  _focusVisible: {
    borderColor: "var(--cc-gold-line)",
    boxShadow: "0 0 0 1px var(--cc-gold-line)",
  },
};

/** Social-Links als runde Line-Buttons; Marken-Icons neutral, beim Hover Gold-Kante. */
const socialLinkStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  w: "44px",
  h: "44px",
  borderRadius: "full",
  border: "1px solid var(--cc-line-strong)",
  bg: "rgba(255, 255, 255, 0.02)",
  color: "var(--cc-text-2)",
  transition:
    "color 180ms var(--cc-ease), border-color 180ms var(--cc-ease), background-color 180ms var(--cc-ease)",
  _hover: {
    color: "var(--cc-text)",
    borderColor: "var(--cc-gold-line)",
    bg: "rgba(212, 176, 128, 0.06)",
    textDecoration: "none",
  },
};

/**
 * Supabase meldet Anmeldefehler auf Englisch („Invalid login credentials").
 * Der häufigste Fall bekommt einen Satz, der weiterhilft: Wer nach einem Kauf
 * noch nie ein Passwort gesetzt hat, landet genau hier.
 */
function anmeldeFehlerText(fehler: AuthError): string {
  const code = fehler.code ?? "";
  if (code === "invalid_credentials" || /invalid login credentials/i.test(fehler.message)) {
    return "E-Mail oder Passwort stimmen nicht. Noch nie ein Passwort gesetzt oder vergessen? Unten bekommst du einen Link für ein neues.";
  }
  if (code === "email_not_confirmed") {
    return "Diese E-Mail-Adresse ist noch nicht bestätigt. Über „Passwort vergessen?“ unten bekommst du einen Link, mit dem sich das erledigt.";
  }
  if (code === "over_request_rate_limit" || fehler.status === 429) {
    return "Zu viele Versuche in kurzer Zeit. Warte einen Moment und versuch es dann noch einmal.";
  }
  if (code === "user_banned") {
    return "Dieses Konto ist gesperrt. Schreib uns, wenn du glaubst, dass das ein Fehler ist.";
  }
  return fehler.message;
}

type LoginStepProps = {
  onAuthenticated: () => void | Promise<void>;
  footer?: ReactNode;
};

export function LoginStep({ onAuthenticated, footer }: LoginStepProps) {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!email || !password || loading) return;
    setError(null);
    setLoading(true);
    try {
      if (process.env.NODE_ENV === "development") {
        console.time("[Login] signInWithPassword");
      }
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (process.env.NODE_ENV === "development") {
        console.timeEnd("[Login] signInWithPassword");
      }
      if (loginError) {
        setError(anmeldeFehlerText(loginError));
        return;
      }
      await onAuthenticated();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack
      minH="100vh"
      w="full"
      align="center"
      justify="center"
      px={{ base: 4, md: 8 }}
      py={{ base: 10, md: 12 }}
      spacing={0}
    >
      <Box
        as="form"
        onSubmit={onSubmit}
        noValidate
        aria-labelledby="login-title"
        className="cc-card cc-card--hero cc-card--still"
        w="full"
        maxW="380px"
        p={{ base: 6, md: 8 }}
      >
        <Stack spacing={4} align="center" textAlign="center">
          <Box as="h1" id="login-title" m={0} lineHeight={1}>
            <Logo variant="onDark" width={240} />
          </Box>
          <Box
            aria-hidden
            h="1px"
            w="120px"
            bg="linear-gradient(90deg, transparent, rgba(232, 192, 148, 0.7), transparent)"
          />
          <Text fontSize="14px" lineHeight={1.5} color="var(--cc-text-2)">
            Melde dich an, um zur Plattform zu gelangen.
          </Text>
        </Stack>

        <Stack mt={6} spacing={3}>
          {/* `?fehler=…` aus `/auth/confirm` — im Client gelesen, deshalb in Suspense. */}
          <Suspense fallback={null}>
            <AnmeldeHinweis />
          </Suspense>
          <Input
            aria-label="E-Mail"
            placeholder="E-Mail"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            {...anmeldeEingabeStil}
          />
          <Input
            aria-label="Passwort"
            placeholder="Passwort"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            {...anmeldeEingabeStil}
          />
          {error ? (
            <Text role="alert" fontSize="14px" lineHeight={1.5} color="var(--cc-danger)">
              {error}
            </Text>
          ) : null}
          <Button
            {...glassPrimaryButtonProps}
            type="submit"
            mt={1}
            isLoading={loading}
            isDisabled={!email || !password}
          >
            Einloggen
          </Button>
          {/*
            Gilt auch für Gastkäufer, die nach dem Kauf nie ein Passwort
            gesetzt haben: Der Link führt über dieselbe Kette wie der aus der
            Willkommensmail.
          */}
          <Link
            as={NextLink}
            href="/passwort-vergessen"
            alignSelf="center"
            mt={1}
            fontSize="13px"
            color="var(--cc-text-2)"
            textUnderlineOffset="3px"
            transition="color 180ms var(--cc-ease)"
            _hover={{ color: "var(--cc-gold-light)", textDecoration: "underline" }}
          >
            Passwort vergessen?
          </Link>
        </Stack>
      </Box>

      <HStack mt={8} spacing={3}>
        <Link href={SOCIAL.tiktok} isExternal aria-label="Capital Circle auf TikTok" {...socialLinkStyle}>
          <Icon as={SiTiktok} boxSize={5} />
        </Link>
        <Link href={SOCIAL.instagram} isExternal aria-label="Capital Circle auf Instagram" {...socialLinkStyle}>
          <Icon as={SiInstagram} boxSize={5} />
        </Link>
      </HStack>

      {footer}
    </Stack>
  );
}
