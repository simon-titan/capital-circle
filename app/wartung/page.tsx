import type { Metadata } from "next";
import { Box, Stack, Text } from "@chakra-ui/react";
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
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="#080808" px={6}>
      <Stack maxW="480px" gap={5} textAlign="center" align="center">
        <Text
          fontSize="xs"
          letterSpacing="0.14em"
          textTransform="uppercase"
          className="inter-semibold"
          color="#D4AF37"
        >
          Capital Circle Institut
        </Text>
        <Box as="h1" className="radley-regular" fontSize="clamp(1.75rem, 4vw, 2.5rem)" color="#F0F0F2">
          Wir sind kurz im Wartungsmodus
        </Box>
        <Box
          h="2px"
          w="min(240px, 100%)"
          borderRadius="full"
          bg="linear-gradient(90deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.95) 45%, rgba(212, 175, 55, 0.1) 100%)"
          boxShadow="0 0 20px rgba(212, 175, 55, 0.15)"
        />
        <Text className="inter" fontSize="sm" color="rgba(240,240,242,0.65)">
          {message ?? "Wir fuehren gerade kurz Wartungsarbeiten durch. Bitte schau in ein paar Minuten wieder vorbei."}
        </Text>
      </Stack>
    </Box>
  );
}
