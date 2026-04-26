"use client";

import { Box, Button, Collapse, Stack, Text } from "@chakra-ui/react";
import { ChevronDown, Lock } from "lucide-react";
import NextLink from "next/link";
import { useId, useState } from "react";

/** Gleiches CTA-Muster wie HeroSection (Desktop) / MobileCTAFooter auf der Bewerbungs-Landingpage. */
const landingApplyCtaSx = {
  background: "linear-gradient(135deg, #E8C547 0%, #D4AF37 50%, #A67C00 100%)",
  boxShadow:
    "0 0 28px rgba(212,175,55,0.30), 0 4px 16px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.22)",
  border: "none",
  cursor: "pointer",
  transition: "all 220ms cubic-bezier(0.16, 1, 0.3, 1)",
  textDecoration: "none",
  _hover: {
    background: "linear-gradient(135deg, #F0DC82 0%, #E8C547 50%, #D4AF37 100%)",
    boxShadow:
      "0 0 44px rgba(212,175,55,0.50), 0 6px 22px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.28)",
    transform: "translateY(-1px)",
    textDecoration: "none",
  },
  _active: {
    transform: "translateY(0px)",
    boxShadow: "0 0 16px rgba(212,175,55,0.20)",
  },
};

export function BewerbungsLandingCard() {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  return (
    <Box
      className="glass-card"
      p={{ base: 4, md: 5 }}
      w="full"
      maxW="360px"
      mt={10}
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
      <Button
        type="button"
        variant="unstyled"
        w="full"
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
        _hover={{ opacity: 0.92 }}
        _focusVisible={{
          boxShadow: "0 0 0 2px rgba(212, 175, 55, 0.55)",
          borderRadius: "8px",
        }}
      >
        <Text
          as="span"
          className="inter"
          fontWeight="600"
          fontSize="md"
          color="var(--color-text-primary, #F0F0F2)"
          lineHeight="1.45"
          flex="1"
        >
          Noch kein Mitglied?
        </Text>
        <Box
          as="span"
          color="var(--color-accent-gold, #D4AF37)"
          display="flex"
          alignItems="center"
          flexShrink={0}
          transition="transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)"
          sx={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          aria-hidden
        >
          <ChevronDown size={22} strokeWidth={2.25} />
        </Box>
      </Button>

      <Collapse in={isOpen} animateOpacity>
        <Stack
          id={panelId}
          spacing={3}
          textAlign="center"
          pt={3}
          mt={3}
          borderTop="1px solid rgba(255,255,255,0.08)"
        >
          <Text className="inter" fontSize="sm" color="rgba(240, 240, 242, 0.55)" lineHeight="1.65">
            Bewirb dich jetzt und sichere dir deinen Platz im exklusiven Capital Circle.
          </Text>
          <Box
            as={NextLink}
            href="/insight"
            w="full"
            minH="52px"
            borderRadius="12px"
            fontWeight="600"
            fontSize="md"
            letterSpacing="0.02em"
            color="#07080A"
            display="flex"
            alignItems="center"
            justifyContent="center"
            gap={2}
            className="inter"
            sx={landingApplyCtaSx}
          >
            <Lock size={15} strokeWidth={2.5} />
            Zur Bewerbung
          </Box>
        </Stack>
      </Collapse>
    </Box>
  );
}
