"use client";

import { Box, Button, Flex, Grid, Text } from "@chakra-ui/react";
import { ArrowRight, Play } from "lucide-react";
import NextLink from "next/link";
import { InstitutMediaArea } from "@/components/platform/InstitutMediaArea";
import { CardValue, DashCard, Meta, ProgressBar, TitleWithMeta, clampLines } from "./primitives";
import type { ContinueItem } from "./types";

export function ContinueCard({ item }: { item: ContinueItem | null }) {
  if (!item) {
    return (
      <DashCard label="Institut" labelId="dash-continue" hero>
        <CardValue>Noch keine Inhalte</CardValue>
        <Meta mt={1}>Sobald Module freigeschaltet sind, geht es hier weiter.</Meta>
        <Box pt={6}>
          <Button as={NextLink} href="/ausbildung" variant="line">
            Zum Institut
          </Button>
        </Box>
      </DashCard>
    );
  }

  const resume = item.kind === "resume";
  const hasImage = Boolean(item.thumbnailUrl || item.videoStorageKey);
  const cta = resume ? "Weiterlernen" : "Jetzt starten";

  return (
    <DashCard label={resume ? "Weiter wo du warst" : "Dein nächstes Modul"} labelId="dash-continue" hero>
      <Grid
        templateColumns={{ base: "minmax(0, 1fr)", md: "minmax(0, 0.85fr) minmax(0, 1fr)" }}
        gap={{ base: 5, md: 8 }}
        alignItems="center"
      >
        <Box
          position="relative"
          borderRadius="10px"
          overflow="hidden"
          border="1px solid var(--cc-line-strong)"
          boxShadow="0 10px 28px rgba(0, 0, 0, 0.45)"
        >
          <InstitutMediaArea
            videoStorageKey={item.videoStorageKey}
            thumbnailUrl={item.thumbnailUrl}
            startAtSeconds={item.startAtSeconds}
            fallback={
              // Ohne Bild: der Lektionstitel wird zum Bildinhalt, auf warmem Gold-Schein.
              <Flex
                w="100%"
                h="100%"
                p={4}
                align="flex-end"
                bg="radial-gradient(circle at 80% 10%, rgba(212, 176, 128, 0.22), transparent 55%), linear-gradient(160deg, #1c2128 0%, #0f1318 100%)"
              >
                {item.videoTitle ? (
                  <Text fontSize="16px" fontWeight={600} lineHeight={1.35} color="var(--cc-text)" maxW="75%" sx={clampLines(2)}>
                    {item.videoTitle}
                  </Text>
                ) : null}
              </Flex>
            }
          >
            <Box
              as={NextLink}
              href={item.href}
              aria-label={`${cta}: ${item.moduleTitle}`}
              display="flex"
              w="64px"
              h="64px"
              borderRadius="full"
              alignItems="center"
              justifyContent="center"
              bg="var(--cc-gold-grad)"
              color="var(--cc-on-gold)"
              boxShadow="0 8px 20px rgba(0, 0, 0, 0.45), inset 0 2px 0 rgba(255, 255, 255, 0.35)"
              transition="transform 200ms var(--cc-ease), box-shadow 200ms var(--cc-ease)"
              _hover={{
                transform: "scale(1.07)",
                boxShadow:
                  "0 10px 24px rgba(0, 0, 0, 0.5), inset 0 2px 0 rgba(255, 255, 255, 0.4)",
              }}
            >
              <Play size={24} fill="currentColor" strokeWidth={0} style={{ marginLeft: 3 }} aria-hidden />
            </Box>
          </InstitutMediaArea>
          {item.videoTitle && hasImage ? (
            <Text
              position="absolute"
              left={3}
              right={3}
              bottom={2.5}
              zIndex={3}
              fontSize="12px"
              color="rgba(255, 255, 255, 0.92)"
              isTruncated
              pointerEvents="none"
            >
              {item.videoTitle}
            </Text>
          ) : null}
        </Box>

        <Box minW={0}>
          <TitleWithMeta title={item.moduleTitle} meta={item.lessonLabel} />
          <ProgressBar value={item.progressPercent} label={`Modul-Fortschritt ${item.progressPercent} Prozent`} tone="ink" mt={5} />
          <Button
            as={NextLink}
            href={item.href}
            variant="gold"
            mt={6}
            rightIcon={<ArrowRight size={16} strokeWidth={2} />}
          >
            {cta}
          </Button>
        </Box>
      </Grid>
    </DashCard>
  );
}
