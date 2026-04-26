"use client";

import { Box, Heading, Stack, Text, VStack } from "@chakra-ui/react";
import { CheckCircle2 } from "lucide-react";

interface Props {
  calendlyUrl: string | null;
}

export function DankePageClient({ calendlyUrl }: Props) {
  return (
    <Box
      minH="100vh"
      bg="var(--color-bg-app)"
      display="flex"
      flexDir="column"
      alignItems="center"
      px={4}
      pt={{ base: 12, md: 20 }}
      pb={16}
    >
      <VStack spacing={6} maxW="680px" textAlign="center" mb={10}>
        <Box
          w="64px"
          h="64px"
          borderRadius="full"
          bg="rgba(52,211,153,0.12)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          border="1px solid rgba(52,211,153,0.3)"
        >
          <CheckCircle2 size={32} color="#34D399" />
        </Box>

        <Heading
          as="h1"
          className="inter-semibold"
          fontWeight={600}
          fontSize={{ base: "2xl", md: "3xl" }}
          color="var(--color-text-primary)"
          lineHeight="1.3"
        >
          Vielen Dank für deine Bewerbung!
        </Heading>

        <Text
          className="inter"
          fontSize={{ base: "md", md: "lg" }}
          color="var(--color-text-secondary)"
          maxW="540px"
          lineHeight="1.7"
        >
          Deine erweiterte Bewerbung ist bei uns eingegangen.
          Buche jetzt direkt einen Termin, damit wir gemeinsam besprechen können,
          ob und wie wir zusammenarbeiten.
        </Text>
      </VStack>

      {calendlyUrl ? (
        <Box
          w="full"
          maxW="900px"
          borderRadius="16px"
          overflow="hidden"
          border="1px solid rgba(255,255,255,0.09)"
          bg="rgba(255,255,255,0.03)"
          boxShadow="0 8px 40px rgba(0,0,0,0.50)"
        >
          <Box
            as="iframe"
            src={calendlyUrl}
            w="full"
            minH={{ base: "700px", md: "660px" }}
            border="none"
            title="Termin buchen — Calendly"
          />
        </Box>
      ) : (
        <Box
          p={8}
          maxW="540px"
          borderRadius="16px"
          border="1px solid rgba(255,255,255,0.09)"
          bg="rgba(255,255,255,0.04)"
          textAlign="center"
        >
          <Stack spacing={3}>
            <Text
              className="inter-semibold"
              color="var(--color-accent-gold)"
              fontSize="md"
            >
              Terminbuchung wird in Kürze verfügbar
            </Text>
            <Text className="inter" color="var(--color-text-secondary)" fontSize="sm">
              Du wirst benachrichtigt, sobald du einen Termin buchen kannst.
              Du kannst dieses Fenster jetzt schließen.
            </Text>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
