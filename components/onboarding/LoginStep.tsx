"use client";

import { Box, Button, HStack, Icon, Input, Link, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { SiInstagram, SiTiktok } from "react-icons/si";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { glassPrimaryButtonProps } from "@/components/ui/glassButtonStyles";

const SOCIAL = {
  instagram: "https://www.instagram.com/",
  tiktok: "https://www.tiktok.com/",
} as const;

type LoginStepProps = {
  onAuthenticated: () => void | Promise<void>;
};

export function LoginStep({ onAuthenticated }: LoginStepProps) {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (loginError) {
      setError(loginError.message);
      return;
    }
    await onAuthenticated();
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
        className="glass-card"
        p={{ base: 6, md: 7 }}
        w="full"
        maxW="360px"
        borderWidth="1px"
        borderStyle="solid"
        borderColor="rgba(212, 175, 55, 0.55)"
        boxShadow="
          0 8px 40px rgba(0, 0, 0, 0.55),
          0 0 0 1px rgba(212, 175, 55, 0.2),
          0 0 28px rgba(212, 175, 55, 0.12),
          inset 0 1px 0 rgba(255, 255, 255, 0.06)
        "
      >
        <Box display="flex" justifyContent="center" mb={5}>
          <Logo variant="onDark" priority width={268} height={76} />
        </Box>
        <Text textAlign="center" fontSize="sm" className="inter" color="rgba(240, 240, 242, 0.55)">
          Melde dich an, um zur Plattform zu gelangen.
        </Text>
        <Stack mt={6} spacing={3}>
          <Input
            placeholder="E-Mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            size="md"
            bg="rgba(0, 0, 0, 0.35)"
            borderColor="rgba(255, 255, 255, 0.1)"
            color="var(--color-text-primary)"
            _placeholder={{ color: "rgba(240, 240, 242, 0.35)" }}
            _hover={{ borderColor: "rgba(255, 255, 255, 0.14)" }}
            _focusVisible={{
              borderColor: "#D4AF37",
              boxShadow: "0 0 0 1px rgba(212, 175, 55, 0.5)",
            }}
          />
          <Input
            placeholder="Passwort"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            size="md"
            bg="rgba(0, 0, 0, 0.35)"
            borderColor="rgba(255, 255, 255, 0.1)"
            color="var(--color-text-primary)"
            _placeholder={{ color: "rgba(240, 240, 242, 0.35)" }}
            _hover={{ borderColor: "rgba(255, 255, 255, 0.14)" }}
            _focusVisible={{
              borderColor: "#D4AF37",
              boxShadow: "0 0 0 1px rgba(212, 175, 55, 0.5)",
            }}
          />
          {error ? (
            <Text fontSize="sm" color="red.300">
              {error}
            </Text>
          ) : null}
          <Button
            {...glassPrimaryButtonProps}
            mt={1}
            onClick={onSubmit}
            isLoading={loading}
            isDisabled={!email || !password}
          >
            Einloggen
          </Button>
        </Stack>
      </Box>

      <HStack mt={10} spacing={10}>
        <Link
          href={SOCIAL.tiktok}
          isExternal
          aria-label="Capital Circle auf TikTok"
          display="flex"
          alignItems="center"
          justifyContent="center"
          color="var(--color-accent-gold)"
          _hover={{ color: "var(--color-accent-gold-light)", transform: "translateY(-2px)" }}
          transition="color 0.2s ease, transform 0.2s ease"
        >
          <Icon as={SiTiktok} boxSize={8} />
        </Link>
        <Link
          href={SOCIAL.instagram}
          isExternal
          aria-label="Capital Circle auf Instagram"
          display="flex"
          alignItems="center"
          justifyContent="center"
          color="var(--color-accent-gold)"
          _hover={{ color: "var(--color-accent-gold-light)", transform: "translateY(-2px)" }}
          transition="color 0.2s ease, transform 0.2s ease"
        >
          <Icon as={SiInstagram} boxSize={8} />
        </Link>
      </HStack>
    </Stack>
  );
}
