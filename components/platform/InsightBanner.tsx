"use client";

import { Box, Button, Flex, HStack, Text, VStack } from "@chakra-ui/react";
import { Sparkles } from "lucide-react";
import NextLink from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";

export function InsightBanner() {
  return (
    <GlassCard dashboard>
      <Flex
        direction={{ base: "column", md: "row" }}
        align={{ base: "flex-start", md: "center" }}
        justify="space-between"
        gap={5}
      >
        <HStack spacing={4} align="flex-start">
          <Flex
            align="center"
            justify="center"
            w="48px"
            h="48px"
            borderRadius="14px"
            bg="rgba(212, 175, 55, 0.12)"
            border="1px solid rgba(212, 175, 55, 0.38)"
            color="var(--color-accent-gold-light)"
            flexShrink={0}
          >
            <Sparkles size={24} strokeWidth={2} />
          </Flex>
          <VStack align="flex-start" spacing={2} maxW={{ md: "520px" }}>
            <Text
              className="inter-medium"
              fontSize="xs"
              letterSpacing="0.1em"
              textTransform="uppercase"
              color="rgba(255,255,255,0.5)"
            >
              Exklusiver Insight
            </Text>
            <Text className="inter-semibold" fontSize={{ base: "lg", md: "xl" }} color="var(--color-text-primary)">
              Sichere dir deinen Platz im Capital Circle
            </Text>
            <Text className="inter" fontSize="sm" color="rgba(245, 236, 210, 0.78)" lineHeight="tall">
              Fülle die erweiterte Bewerbung aus und erhalte Zugang zu exklusiven Premium-Inhalten und unserer handverlesenen Community.
            </Text>
          </VStack>
        </HStack>
        <Button
          as={NextLink}
          href="/bewerbung"
          size="md"
          borderRadius="10px"
          bg="linear-gradient(135deg, var(--color-accent-gold-dark) 0%, var(--color-accent-gold-light) 100%)"
          color="#0a0a0a"
          _hover={{
            filter: "brightness(1.06)",
            boxShadow: "0 0 24px rgba(212, 175, 55, 0.35)",
          }}
          flexShrink={0}
          alignSelf={{ base: "stretch", md: "center" }}
          className="inter-semibold"
        >
          Jetzt bewerben
        </Button>
      </Flex>
    </GlassCard>
  );
}
