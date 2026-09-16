"use client";

import { Box, Button, Collapse, Stack, Text } from "@chakra-ui/react";
import { ChevronDown, Lock } from "lucide-react";
import NextLink from "next/link";
import { useId, useState } from "react";

/** „Noch kein Mitglied?“ unter dem Login: Glas-Karte mit Gold-Rand, klappt den Weg zur Bewerbung auf. */
export function BewerbungsLandingCard() {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  return (
    <Box
      className="cc-card"
      p={{ base: 4, md: 5 }}
      w="full"
      maxW="360px"
      mt={10}
      style={{ borderColor: "rgba(212, 176, 128, 0.38)" }}
    >
      <Button
        type="button"
        variant="unstyled"
        w="full"
        h="auto"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap={3}
        textAlign="left"
        py={0}
        px={0}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((v) => !v)}
        _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px", borderRadius: "8px" }}
      >
        <Text as="span" fontWeight={600} fontSize="16px" color="var(--cc-text)" lineHeight={1.45} flex="1">
          Noch kein Mitglied?
        </Text>
        <Box
          as="span"
          color="var(--cc-gold-light)"
          display="flex"
          alignItems="center"
          flexShrink={0}
          transition="transform 220ms var(--cc-ease)"
          sx={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          aria-hidden
        >
          <ChevronDown size={22} strokeWidth={2} />
        </Box>
      </Button>

      <Collapse in={isOpen} animateOpacity>
        <Stack id={panelId} spacing={3} textAlign="center" pt={3} mt={3} borderTop="1px solid var(--cc-line)">
          <Text fontSize="14px" color="var(--cc-text-2)" lineHeight={1.65}>
            Bewirb dich jetzt und sichere dir deinen Platz im exklusiven Capital Circle.
          </Text>
          <Button
            as={NextLink}
            href="/insight"
            variant="gold"
            w="full"
            h="48px"
            fontSize="16px"
            leftIcon={<Lock size={15} strokeWidth={2.25} />}
          >
            Zur Bewerbung
          </Button>
        </Stack>
      </Collapse>
    </Box>
  );
}
