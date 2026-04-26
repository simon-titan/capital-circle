import { Box, Stack, Text } from "@chakra-ui/react";
import { ArrowRight } from "lucide-react";

/**
 * Trennblock unterhalb der Pricing-Cards für das 1:1-Strategiegespräch.
 *
 * Bewusst KEIN Calendly-Embed (kein Drittanbieter-Iframe direkt im Layout) —
 * stattdessen ein Outbound-Link, der in einem neuen Tab öffnet. URL kommt aus
 * `NEXT_PUBLIC_CALENDLY_URL`; ohne ENV-Var blenden wir den Block aus, damit auf
 * Vorschau-Deployments kein toter Button steht.
 */
export function CalendlyCallout() {
  const url = process.env.NEXT_PUBLIC_CALENDLY_URL?.trim() ?? "";
  if (!url) return null;

  return (
    <Stack
      spacing={6}
      align="center"
      pt={{ base: 4, md: 8 }}
      maxW="640px"
      mx="auto"
      textAlign="center"
    >
      <Box
        display="flex"
        alignItems="center"
        gap={3}
        w="full"
        color="rgba(255,255,255,0.32)"
      >
        <Box flex={1} h="1px" bg="rgba(255,255,255,0.10)" />
        <Text
          className="inter"
          fontSize="xs"
          letterSpacing="0.18em"
          textTransform="uppercase"
        >
          oder
        </Text>
        <Box flex={1} h="1px" bg="rgba(255,255,255,0.10)" />
      </Box>

      <Text
        className="inter"
        fontSize={{ base: "md", md: "lg" }}
        color="rgba(255,255,255,0.78)"
      >
        Du willst 1:1-Betreuung von <Text as="span" color="var(--color-accent-gold)" className="inter-semibold">Emre persönlich</Text>? Buch dir ein kostenloses Strategie-Gespräch.
      </Text>

      <Box
        as="a"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        display="inline-flex"
        alignItems="center"
        gap="10px"
        px="22px"
        py="12px"
        borderRadius="12px"
        className="inter-semibold"
        color="var(--color-accent-gold)"
        bg="transparent"
        borderWidth="1px"
        borderStyle="solid"
        borderColor="rgba(212,175,55,0.40)"
        fontSize="15px"
        transition="all 150ms cubic-bezier(0.16, 1, 0.3, 1)"
        _hover={{
          bg: "rgba(212,175,55,0.10)",
          borderColor: "rgba(212,175,55,0.65)",
          transform: "translateY(-1px)",
        }}
        _active={{ transform: "translateY(0)" }}
      >
        Kostenloses Strategie-Gespräch buchen
        <ArrowRight size={16} />
      </Box>
    </Stack>
  );
}
