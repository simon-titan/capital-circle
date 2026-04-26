"use client";

import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { landingConfig } from "@/config/landing-config";

const DEFAULT_VISIBLE = 3;

interface DbReview {
  id: string;
  name: string;
  rating: number;
  title: string;
  body: string;
  date_label: string;
  avatar_url: string | null;
}

type DisplayReview = {
  name: string;
  rating: number;
  title: string;
  text: string;
  date: string;
  avatar?: string | null;
};

function toDisplayReview(r: DbReview): DisplayReview {
  return { name: r.name, rating: r.rating, title: r.title, text: r.body, date: r.date_label, avatar: r.avatar_url };
}

function configToDisplay(r: (typeof landingConfig.reviews)[number]): DisplayReview {
  return { name: r.name, rating: r.rating, title: r.title, text: r.text, date: r.date, avatar: r.avatar };
}

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

function ReviewCard({ review }: { review: DisplayReview }) {
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
          {review.avatar ? (
            <Box
              as="img"
              src={review.avatar}
              alt={review.name}
              w="38px"
              h="38px"
              borderRadius="full"
              flexShrink={0}
              objectFit="cover"
              border="1px solid rgba(212,175,55,0.25)"
              boxShadow="0 2px 8px rgba(0,0,0,0.45)"
            />
          ) : (
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
          )}
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

interface ReviewSectionProps {
  landingSlug?: string;
}

export function ReviewSection({ landingSlug }: ReviewSectionProps) {
  const [dbReviews, setDbReviews] = useState<DisplayReview[] | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!landingSlug) return;
    let cancelled = false;
    fetch(`/api/reviews?landing=${encodeURIComponent(landingSlug)}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.ok && Array.isArray(json.items) && json.items.length > 0) {
          setDbReviews((json.items as DbReview[]).map(toDisplayReview));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [landingSlug]);

  const reviews: DisplayReview[] = dbReviews ?? landingConfig.reviews.map(configToDisplay);

  const visibleReviews = showAll ? reviews : reviews.slice(0, DEFAULT_VISIBLE);
  const hasMore = reviews.length > DEFAULT_VISIBLE;

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const maxCount = Math.max(...ratingCounts.map((r) => r.count), 1);

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
              {visibleReviews.map((review, i) => (
                <ReviewCard key={`${review.name}-${i}`} review={review} />
              ))}
            </Stack>

            {hasMore && (
              <Box
                as="button"
                onClick={() => setShowAll((v) => !v)}
                display="flex"
                alignItems="center"
                justifyContent="center"
                gap={2}
                w="full"
                mt={4}
                py={3}
                borderRadius="12px"
                bg="rgba(255,255,255,0.03)"
                border="1px solid rgba(255,255,255,0.08)"
                color="var(--color-accent-gold, #D4AF37)"
                fontSize="sm"
                fontWeight={500}
                className="inter-medium"
                cursor="pointer"
                transition="all 200ms ease"
                sx={{
                  _hover: {
                    bg: "rgba(212,175,55,0.08)",
                    borderColor: "rgba(212,175,55,0.25)",
                  },
                }}
              >
                {showAll ? "Weniger anzeigen" : `Alle ${reviews.length} Bewertungen anzeigen`}
                <Box
                  as="span"
                  display="inline-flex"
                  transition="transform 200ms ease"
                  sx={{ transform: showAll ? "rotate(180deg)" : "rotate(0deg)" }}
                >
                  <ChevronDown size={16} />
                </Box>
              </Box>
            )}
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
