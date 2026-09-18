"use client";

import { Box, Button, HStack, Stack, Text } from "@chakra-ui/react";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { landingConfig } from "@/config/landing-config";
import { DisplayHeading, Eyebrow, Reveal } from "./landing-ui";

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
    <HStack spacing={0.5} role="img" aria-label={`${rating} von ${max} Sternen`}>
      {Array.from({ length: max }).map((_, i) => (
        <Box key={i} as="span" aria-hidden fontSize="13px" color={i < rating ? "var(--cc-gold-light)" : "var(--cc-track)"}>
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
    <Box as="li" py={5} borderBottom="1px solid var(--cc-line)" _last={{ borderBottom: "none" }}>
      <Stack spacing={3}>
        <HStack spacing={3} align="center">
          {review.avatar ? (
            <Box
              as="img"
              src={review.avatar}
              alt=""
              w="40px"
              h="40px"
              borderRadius="full"
              flexShrink={0}
              objectFit="cover"
              border="1px solid rgba(212, 176, 128, 0.3)"
              boxShadow="0 2px 8px rgba(0, 0, 0, 0.45)"
            />
          ) : (
            <Box
              aria-hidden
              w="40px"
              h="40px"
              borderRadius="full"
              flexShrink={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
              bg="var(--cc-gold-wash)"
              border="1px solid rgba(212, 176, 128, 0.3)"
              color="var(--cc-gold-light)"
              fontSize="12px"
              fontWeight={600}
            >
              {initials}
            </Box>
          )}
          <Stack spacing={0.5} flex={1} minW={0}>
            <HStack spacing={2} justify="space-between" flexWrap="wrap">
              <Text fontSize="15px" fontWeight={600} color="var(--cc-text)">
                {review.name}
              </Text>
              <Text fontSize="13px" color="var(--cc-text-3)">
                {review.date}
              </Text>
            </HStack>
            <StarRow rating={review.rating} />
          </Stack>
        </HStack>

        <Stack spacing={1.5}>
          <Text fontSize="15px" fontWeight={600} color="var(--cc-text)">
            {review.title}
          </Text>
          <Text fontSize="15px" lineHeight={1.65} color="var(--cc-text-2)">
            {displayText}
            {isLong && (
              <Box
                as="button"
                type="button"
                onClick={() => setExpanded((e) => !e)}
                aria-expanded={expanded}
                color="var(--cc-gold-light)"
                ml={1}
                fontSize="15px"
                fontWeight={600}
                bg="transparent"
                border="none"
                cursor="pointer"
                _hover={{ textDecoration: "underline" }}
                _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px", borderRadius: "4px" }}
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
  // Ohne `landingSlug` wird nichts geladen — dann ist der Zustand von Anfang
  // an fertig, statt ihn im Effekt nachzuziehen.
  const [geladen, setGeladen] = useState(!landingSlug);
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
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setGeladen(true);
      });
    return () => { cancelled = true; };
  }, [landingSlug]);

  /**
   * Der Rückfall auf `landingConfig.reviews` gilt nur ohne `landingSlug`.
   *
   * Grund: Dort stehen Stimmen über den **kostenlosen Kurs** („Der Free-Kurs
   * von Capital Circle …", Schnitt 4,8). Auf einer Seite, die 99 € im Monat
   * verkauft und zwei Bildschirme höher „5,0 ★ · 4 Bewertungen" zeigt, wäre
   * das beim ersten Anstrich ein sichtbarer Widerspruch — und bliebe stehen,
   * wenn der Abruf scheitert. Solange geladen wird, steht hier nichts; kommt
   * nichts zurück, verschwindet der Abschnitt ganz.
   */
  const reviews: DisplayReview[] = landingSlug
    ? dbReviews ?? []
    : landingConfig.reviews.map(configToDisplay);

  if (landingSlug && (!geladen || reviews.length === 0)) return null;

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
  const avgLabel = avgRating.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <Box as="section" aria-labelledby="reviews-title" w="100%" py={{ base: 16, md: 24 }} px={{ base: 4, md: 8, lg: 12 }}>
      <Box maxW="1200px" mx="auto">
        <Stack
          direction={{ base: "column", lg: "row" }}
          spacing={{ base: 10, lg: 16 }}
          align={{ base: "stretch", lg: "flex-start" }}
        >
          {/* Links: Übersicht */}
          <Reveal w={{ base: "100%", lg: "320px" }} flexShrink={0}>
            <Stack spacing={5} align={{ base: "center", lg: "flex-start" }} textAlign={{ base: "center", lg: "left" }}>
              <Eyebrow justify={{ base: "center", lg: "flex-start" }}>Was Mitglieder sagen</Eyebrow>
              <DisplayHeading id="reviews-title">Bewertungen</DisplayHeading>

              <HStack spacing={4} align="center">
                <Text
                  className="cc-num"
                  fontSize={{ base: "52px", md: "60px" }}
                  fontWeight={600}
                  lineHeight={1}
                  letterSpacing="-0.02em"
                  color="var(--cc-text)"
                >
                  {avgLabel}
                </Text>
                <Stack spacing={1} align="flex-start">
                  <StarRow rating={Math.round(avgRating)} />
                  <Text fontSize="13px" color="var(--cc-text-2)">
                    von 5 Sternen
                  </Text>
                </Stack>
              </HStack>

              <Stack spacing={2} w="full" maxW={{ base: "360px", lg: "none" }}>
                {ratingCounts.map(({ star, count }) => (
                  <HStack key={star} spacing={2} align="center">
                    <Text className="cc-num" fontSize="13px" color="var(--cc-text-2)" w="12px" textAlign="right">
                      {star}
                    </Text>
                    <Box aria-hidden fontSize="11px" color={star >= 4 ? "var(--cc-gold-light)" : "var(--cc-text-3)"}>
                      ★
                    </Box>
                    <Box flex={1} h="6px" borderRadius="full" bg="var(--cc-track)" overflow="hidden">
                      <Box
                        h="full"
                        w={maxCount > 0 ? `${(count / maxCount) * 100}%` : "0%"}
                        borderRadius="full"
                        bg={star >= 4 ? "var(--cc-gold-bar)" : "var(--cc-text-3)"}
                        opacity={star === 4 ? 0.7 : 1}
                        boxShadow={star === 5 ? "0 0 10px rgba(212, 176, 128, 0.4)" : undefined}
                        transition="width 0.6s var(--cc-ease)"
                      />
                    </Box>
                    <Text className="cc-num" fontSize="13px" color="var(--cc-text-3)" w="16px">
                      {count}
                    </Text>
                  </HStack>
                ))}
              </Stack>
            </Stack>
          </Reveal>

          {/* Rechts: Stimmen auf Glas */}
          <Reveal delay={90} flex={1} minW={0}>
            <Box className="cc-card cc-card--still" px={{ base: 5, md: 7 }} py={{ base: 1, md: 2 }}>
              <Stack as="ul" role="list" listStyleType="none" spacing={0}>
                {visibleReviews.map((review, i) => (
                  <ReviewCard key={`${review.name}-${i}`} review={review} />
                ))}
              </Stack>
            </Box>

            {hasMore && (
              <Button
                variant="line"
                w="full"
                mt={4}
                h="48px"
                onClick={() => setShowAll((v) => !v)}
                aria-expanded={showAll}
                rightIcon={
                  <Box
                    as="span"
                    display="inline-flex"
                    transition="transform 200ms var(--cc-ease)"
                    sx={{ transform: showAll ? "rotate(180deg)" : "rotate(0deg)" }}
                  >
                    <ChevronDown size={16} aria-hidden />
                  </Box>
                }
              >
                {showAll ? "Weniger anzeigen" : `Alle ${reviews.length} Bewertungen anzeigen`}
              </Button>
            )}
          </Reveal>
        </Stack>
      </Box>
    </Box>
  );
}
