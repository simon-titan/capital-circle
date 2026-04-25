"use client";

import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { landingConfig } from "@/config/landing-config";

export function PhasesSection() {
  const { phases, product } = landingConfig;

  return (
    <Box
      as="section"
      w="100%"
      bg="var(--color-bg-secondary, #0C0D10)"
      py={{ base: 14, md: 24 }}
      px={{ base: 4, md: 8, lg: 12 }}
    >
      <Box maxW="1200px" mx="auto">
        {/* Header */}
        <Stack spacing={3} textAlign="center" mb={14}>
          <Text
            fontSize="xs"
            letterSpacing="0.20em"
            textTransform="uppercase"
            color="var(--color-accent-gold, #D4AF37)"
            className="inter-semibold"
          >
            So funktioniert's
          </Text>
          <Text
            as="h2"
            className="radley-regular"
            fontWeight={400}
            fontSize={{ base: "2xl", md: "3xl", lg: "4xl" }}
            color="var(--color-text-primary, #F0F0F2)"
            lineHeight="1.2"
          >
            Bring dein Trading aufs{" "}
            <Box
              as="span"
              px={2}
              py={0.5}
              borderRadius="6px"
              sx={{
                background: "linear-gradient(90deg, rgba(212,175,55,0.20), transparent 95%)",
                border: "1px solid rgba(212,175,55,0.25)",
                boxShadow: "0 0 24px rgba(212,175,55,0.08)",
              }}
            >
              nächste Level.
            </Box>
          </Text>
        </Stack>

        {/* Phase cards */}
        <Stack spacing={6}>
          {phases.map((phase, index) => {
            const isReversed = index % 2 === 1;

            return (
              <Box
                key={phase.label}
                borderRadius="20px"
                overflow="hidden"
                sx={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(212,175,55,0.16)",
                  boxShadow: "0 4px 32px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.03)",
                  transition: "all 300ms cubic-bezier(0.16,1,0.3,1)",
                  _hover: {
                    borderColor: "rgba(212,175,55,0.32)",
                    boxShadow: "0 8px 48px rgba(0,0,0,0.50), 0 0 32px rgba(212,175,55,0.08)",
                  },
                }}
              >
                <Stack
                  direction={{ base: "column", md: isReversed ? "row-reverse" : "row" }}
                  spacing={0}
                >
                  {/* Content side */}
                  <Box
                    flex={1}
                    p={{ base: 6, md: 8, lg: 10 }}
                  >
                    <Stack spacing={5}>
                      <Stack spacing={1}>
                        <Text
                          fontSize="xs"
                          letterSpacing="0.18em"
                          textTransform="uppercase"
                          color="var(--color-accent-gold, #D4AF37)"
                          className="inter-semibold"
                        >
                          {phase.label}
                        </Text>
                        <Text
                          as="h3"
                          className="radley-regular"
                          fontWeight={400}
                          fontSize={{ base: "xl", md: "2xl" }}
                          color="var(--color-text-primary, #F0F0F2)"
                          lineHeight="1.2"
                        >
                          {phase.title}
                        </Text>
                      </Stack>

                      <Text
                        fontSize={{ base: "sm", md: "md" }}
                        color="rgba(255,255,255,0.60)"
                        className="inter"
                        lineHeight="1.70"
                      >
                        {phase.description}
                      </Text>

                      {/* Bullets */}
                      <Stack spacing={2.5}>
                        {phase.bullets.map((bullet, i) => (
                          <HStack key={i} spacing={3} align="flex-start">
                            <Box
                              w="6px"
                              h="6px"
                              borderRadius="full"
                              bg="var(--color-accent-gold, #D4AF37)"
                              flexShrink={0}
                              mt="7px"
                              boxShadow="0 0 6px rgba(212,175,55,0.40)"
                            />
                            <Text
                              fontSize="sm"
                              color="rgba(255,255,255,0.72)"
                              className="inter"
                              lineHeight="1.55"
                            >
                              {bullet}
                            </Text>
                          </HStack>
                        ))}
                      </Stack>
                    </Stack>
                  </Box>

                  {/* Visual side (desktop only) */}
                  <Box
                    display={{ base: "none", md: "flex" }}
                    w={{ md: "200px", lg: "240px" }}
                    flexShrink={0}
                    alignItems="center"
                    justifyContent="center"
                    sx={{
                      background: isReversed
                        ? "linear-gradient(135deg, rgba(212,175,55,0.08) 0%, transparent 100%)"
                        : "linear-gradient(225deg, rgba(212,175,55,0.08) 0%, transparent 100%)",
                      borderLeft: isReversed ? "none" : "1px solid rgba(212,175,55,0.10)",
                      borderRight: isReversed ? "1px solid rgba(212,175,55,0.10)" : "none",
                    }}
                  >
                    <Stack spacing={2} align="center" p={6}>
                      <Box
                        w="70px"
                        h="70px"
                        borderRadius="18px"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        sx={{
                          background: "rgba(212,175,55,0.10)",
                          border: "1px solid rgba(212,175,55,0.22)",
                        }}
                      >
                        <Text
                          fontFamily="var(--font-mono, 'JetBrains Mono')"
                          fontSize="2xl"
                          fontWeight="700"
                          color="var(--color-accent-gold, #D4AF37)"
                        >
                          {index + 1}
                        </Text>
                      </Box>
                      <Text fontSize="xs" color="rgba(255,255,255,0.28)" className="inter" textAlign="center">
                        {phase.label}
                      </Text>
                    </Stack>
                  </Box>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}
