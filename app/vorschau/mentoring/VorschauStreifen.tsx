import { Box, Flex, Text } from "@chakra-ui/react";
import { ArrowLeft } from "lucide-react";

/**
 * Schmaler Streifen über jeder Vorschauseite: sagt, dass hier Beispieldaten
 * stehen, und führt zurück zur Übersicht. Bewusst neutral, damit er nicht mit
 * dem Gold der eigentlichen Seite konkurriert.
 */
export function VorschauStreifen({ text }: { text: string }) {
  return (
    <Flex
      position="relative"
      zIndex={3}
      align="center"
      justify="space-between"
      gap={4}
      px={{ base: 4, md: 6 }}
      py={2.5}
      bg="var(--cc-panel-solid)"
      borderBottom="1px solid var(--cc-line-strong)"
      fontSize="13px"
      lineHeight={1.45}
    >
      <Box
        as="a"
        href="/vorschau/mentoring"
        display="inline-flex"
        alignItems="center"
        gap={1.5}
        color="var(--cc-text-soft)"
        flexShrink={0}
        _hover={{ color: "var(--cc-gold-light)" }}
      >
        <ArrowLeft size={15} strokeWidth={1.75} aria-hidden />
        Übersicht
      </Box>
      <Text color="var(--cc-text-2)" textAlign="right">
        {text}
      </Text>
    </Flex>
  );
}
