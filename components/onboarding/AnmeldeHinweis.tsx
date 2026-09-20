"use client";

import { Box, Flex, Link, Stack, Text } from "@chakra-ui/react";
import { AlertTriangle } from "lucide-react";
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";

/**
 * Hinweis über dem Login, wenn ein Link aus unseren Mails nicht funktioniert hat.
 *
 * `app/auth/confirm/route.ts` leitet bei einem gescheiterten Einmal-Token auf
 * `/login?fehler=<code>`. Bis 19.09.2026 packte niemand den Code aus: Wer auf
 * einen abgelaufenen Link aus der Willkommensmail klickte, stand kommentarlos
 * vor dem Login — ohne Passwort, das er dort eingeben könnte.
 *
 * Deshalb steht hier nicht nur, *was* passiert ist, sondern direkt der Weg zu
 * einem neuen Link. Der Parameter wird im Client gelesen (`useSearchParams`,
 * vom Aufrufer in `Suspense` gesetzt), damit `/login` und `/einsteig` nicht
 * dynamisch werden.
 *
 * Wer einen neuen Code in `/auth/confirm` einführt, ergänzt ihn hier;
 * unbekannte Codes bekommen den allgemeinen Text.
 */

const TEXTE: Record<string, { titel: string; text: string }> = {
  link_abgelaufen: {
    titel: "Dieser Link ist nicht mehr gültig.",
    text:
      "Links zum Passwortsetzen funktionieren genau einmal und nur für begrenzte Zeit, und jede neue Anforderung " +
      "ersetzt die alte. Hol dir einfach einen neuen.",
  },
  link_ungueltig: {
    titel: "Dieser Link ist unvollständig.",
    text: "Vermutlich wurde er beim Kopieren abgeschnitten. Öffne ihn direkt aus der Mail oder hol dir einen neuen.",
  },
};

const RUECKFALL = {
  titel: "Der Link hat nicht funktioniert.",
  text: "Hol dir einfach einen neuen. Das dauert eine Minute.",
};

export function AnmeldeHinweis() {
  const code = useSearchParams().get("fehler");
  if (!code) return null;
  const { titel, text } = TEXTE[code] ?? RUECKFALL;

  return (
    <Flex
      role="alert"
      gap={3}
      align="flex-start"
      textAlign="left"
      borderRadius="10px"
      border="1px solid rgba(248, 113, 113, 0.35)"
      bg="rgba(30, 22, 24, 0.7)"
      px={4}
      py={3.5}
    >
      <Box color="var(--cc-danger)" flexShrink={0} mt="2px" aria-hidden>
        <AlertTriangle size={16} strokeWidth={1.75} />
      </Box>
      <Stack spacing={1} minW={0}>
        <Text fontSize="14px" fontWeight={600} lineHeight={1.4} color="var(--cc-text)">
          {titel}
        </Text>
        <Text fontSize="13px" lineHeight={1.5} color="var(--cc-text-2)">
          {text}
        </Text>
        <Link
          as={NextLink}
          href="/passwort-vergessen"
          alignSelf="flex-start"
          mt={1}
          fontSize="13px"
          fontWeight={600}
          color="var(--cc-gold-light)"
          textDecoration="underline"
          textDecorationColor="var(--cc-gold-line)"
          textUnderlineOffset="3px"
          _hover={{ color: "var(--cc-gold)" }}
        >
          Neuen Link anfordern
        </Link>
      </Stack>
    </Flex>
  );
}
