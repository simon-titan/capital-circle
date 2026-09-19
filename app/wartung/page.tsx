import type { Metadata } from "next";
import { Box, Stack, Text } from "@chakra-ui/react";
import { RechtsLinks } from "@/components/legal/RechtsFusszeile";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wartungsmodus — Capital Circle Institut",
  description: "Die Plattform ist kurzzeitig im Wartungsmodus.",
};

export default async function WartungPage() {
  const service = createServiceClient();
  const { data } = await service
    .from("app_settings")
    .select("value")
    .eq("key", "maintenance_mode")
    .maybeSingle();

  const value = (data?.value ?? {}) as { message?: unknown };
  const message = typeof value.message === "string" && value.message.trim() ? value.message.trim() : null;

  return (
    <Box
      position="relative"
      minH="100vh"
      display="flex"
      flexDirection="column"
      gap={6}
      alignItems="center"
      justifyContent="center"
      bg="var(--cc-bg)"
      color="var(--cc-text)"
      px={{ base: 4, md: 6 }}
      py={10}
      overflowX="clip"
    >
      {/* Graphitgrund mit Sternenfeld und Champagner-Licht (DESIGN.md v3.2) */}
      <Box className="cc-stars" aria-hidden />
      <Box className="cc-goldlight" aria-hidden />

      <Stack
        className="cc-card cc-card--still cc-rise"
        zIndex={1}
        w="full"
        maxW="520px"
        p={{ base: 6, md: 10 }}
        gap={5}
        textAlign="center"
        align="center"
      >
        <Text
          fontSize="13px"
          lineHeight="18px"
          fontWeight={500}
          letterSpacing="0.12em"
          textTransform="uppercase"
          color="var(--cc-gold-light)"
        >
          Capital Circle Institut
        </Text>
        <Box
          as="h1"
          fontSize={{ base: "28px", md: "36px" }}
          fontWeight={600}
          lineHeight={1.15}
          letterSpacing="-0.01em"
          color="var(--cc-text)"
        >
          Wir sind kurz im{" "}
          <Box as="span" color="var(--cc-gold-light)">
            Wartungsmodus
          </Box>
        </Box>
        <Box
          aria-hidden
          h="1px"
          w="min(200px, 100%)"
          bg="linear-gradient(90deg, transparent, rgba(232, 192, 148, 0.7), transparent)"
        />
        <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)">
          {message ?? "Wir führen gerade kurz Wartungsarbeiten durch. Bitte schau in ein paar Minuten wieder vorbei."}
        </Text>
      </Stack>

      {/* Rechtstexte und Kündigungsbutton bleiben auch im Wartungsmodus
          erreichbar (Ausnahme in `proxy.ts`). */}
      <RechtsLinks position="relative" zIndex={1} maxW="520px" />
    </Box>
  );
}
