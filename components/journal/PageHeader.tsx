import { Box, Stack, Text } from "@chakra-ui/react";

/**
 * Seitenkopf der Journal-Ansichten — dieselbe Typo wie die Begrüßung im
 * Dashboard, darunter eine auslaufende Gold-Linie.
 */
export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Stack gap={2} mb={{ base: 6, md: 8 }} className="cc-rise">
      <Box
        as="h1"
        fontSize={{ base: "28px", md: "36px" }}
        fontWeight={600}
        letterSpacing="-0.01em"
        lineHeight={1.15}
        color="var(--cc-text)"
      >
        {title}
      </Box>

      {subtitle && (
        <Text fontSize={{ base: "15px", md: "16px" }} color="var(--cc-text-2)" maxW="46rem" lineHeight={1.6}>
          {subtitle}
        </Text>
      )}

      <Box
        h="1px"
        w="100%"
        mt={3}
        bg="linear-gradient(90deg, rgba(232, 192, 148, 0.55) 0%, rgba(212, 176, 128, 0.12) 40%, transparent 100%)"
        aria-hidden
      />
    </Stack>
  );
}
