"use client";

import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { landingConfig } from "@/config/landing-config";

function StarRow({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <HStack spacing={0.5}>
      {Array.from({ length: max }).map((_, i) => (
        <Box
          key={i}
          fontSize="13px"
          color={i < rating ? "var(--color-accent-gold, #D4AF37)" : "rgba(255,255,255,0.15)"}
        >
          ★
        </Box>
      ))}
    </HStack>
  );
}

function ReviewCard({ review }: { review: (typeof landingConfig.reviews)[number] }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = review.text.length > 150;
  const displayText = !expanded && isLong ? review.text.slice(0, 150) + "…" : review.text;

  const initials = review.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Box
      py={5}
      borderBottom="1px solid rgba(255,255,255,0.06)"
      _last={{ borderBottom: "none" }}
    >
      <Stack spacing={3}>
        <HStack spacing={3} align="center">
          <Box
            w="38px"
            h="38px"
            borderRadius="full"
            flexShrink={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg="rgba(212,175,55,0.14)"
            border="1px solid rgba(212,175,55,0.25)"
            color="var(--color-accent-gold, #D4AF37)"
            fontSize="12px"
            className="inter-semibold"
          >
            {initials}
          </Box>
          <Stack spacing={0} flex={1}>
            <HStack spacing={2} justify="space-between" flexWrap="wrap">
              <Text fontSize="sm" color="var(--color-text-primary, #F0F0F2)" className="inter-semibold">
                {review.name}
              </Text>
              <Text fontSize="xs" color="rgba(255,255,255,0.32)" className="inter">
                {review.date}
              </Text>
            </HStack>
            <StarRow rating={review.rating} />
          </Stack>
        </HStack>

        <Stack spacing={1.5}>
          <Text fontSize="sm" color="var(--color-text-primary, #F0F0F2)" className="inter-semibold">
            {review.title}
          </Text>
          <Text fontSize="sm" color="rgba(255,255,255,0.62)" className="inter" lineHeight="1.65">
            {displayText}
            {isLong && (
              <Box
                as="button"
                onClick={() => setExpanded((e) => !e)}
                color="var(--color-accent-gold, #D4AF37)"
                ml={1}
                fontSize="sm"
                className="inter-semibold"
                _hover={{ textDecoration: "underline" }}
                bg="transparent"
                border="none"
                cursor="pointer"
              >
                {expanded ? " Weniger anzeigen" : " Mehr anzeigen ▼"}
              </Box>
            )}
          </Text>
        </Stack>
      </Stack>
    </Box>
  );
}

export function ReviewSection() {
  const { reviews } = landingConfig;

  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const maxCount = Math.max(...ratingCounts.map((r) => r.count));

  return (
    <Box
      as="section"
      w="100%"
      bg="var(--color-bg-primary, #07080A)"
      py={{ base: 14, md: 20 }}
      px={{ base: 4, md: 8, lg: 12 }}
    >
      <Box maxW="1200px" mx="auto">
        <Text
          fontSize="xs"
          letterSpacing="0.20em"
          textTransform="uppercase"
          color="var(--color-accent-gold, #D4AF37)"
          className="inter-semibold"
          mb={3}
          textAlign={{ base: "center", lg: "left" }}
        >
          Was Teilnehmer sagen
        </Text>

        <Stack
          direction={{ base: "column", lg: "row" }}
          spacing={{ base: 10, lg: 16 }}
          align={{ base: "stretch", lg: "flex-start" }}
        >
          {/* Left: rating overview */}
          <Box w={{ base: "100%", lg: "280px" }} flexShrink={0}>
            <Stack spacing={4}>
              <Text
                className="radley-regular"
                fontWeight={400}
                fontSize={{ base: "2xl", md: "3xl" }}
                color="var(--color-text-primary, #F0F0F2)"
              >
                Bewertungen
              </Text>

              <HStack spacing={3} align="center">
                <Text
                  fontFamily="var(--font-mono, 'JetBrains Mono')"
                  fontSize="4xl"
                  fontWeight="700"
                  color="var(--color-accent-gold, #D4AF37)"
                  lineHeight="1"
                >
                  {avgRating.toFixed(1)}
                </Text>
                <Stack spacing={1}>
                  <StarRow rating={Math.round(avgRating)} />
                  <Text fontSize="xs" color="rgba(255,255,255,0.40)" className="inter">
                    von 5 Sternen
                  </Text>
                </Stack>
              </HStack>

              {/* Rating bars */}
              <Stack spacing={2}>
                {ratingCounts.map(({ star, count }) => (
                  <HStack key={star} spacing={2} align="center">
                    <Text fontSize="xs" color="rgba(255,255,255,0.50)" className="inter" w="12px" textAlign="right">
                      {star}
                    </Text>
                    <Box fontSize="11px" color={star >= 4 ? "var(--color-accent-gold, #D4AF37)" : "rgba(255,255,255,0.30)"}>
                      ★
                    </Box>
                    <Box
                      flex={1}
                      h="6px"
                      borderRadius="full"
                      bg="rgba(255,255,255,0.07)"
                      overflow="hidden"
                    >
                      <Box
                        h="full"
                        w={maxCount > 0 ? `${(count / maxCount) * 100}%` : "0%"}
                        borderRadius="full"
                        bg={
                          star === 5
                            ? "var(--color-accent-gold, #D4AF37)"
                            : star === 4
                              ? "rgba(212,175,55,0.65)"
                              : "rgba(255,255,255,0.25)"
                        }
                        transition="width 0.6s cubic-bezier(0.16,1,0.3,1)"
                      />
                    </Box>
                    <Text fontSize="xs" color="rgba(255,255,255,0.35)" className="inter" w="14px">
                      {count}
                    </Text>
                  </HStack>
                ))}
              </Stack>
            </Stack>
          </Box>

          {/* Right: review cards */}
          <Box flex={1}>
            <Stack spacing={0}>
              {reviews.map((review, i) => (
                <ReviewCard key={i} review={review} />
              ))}
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
