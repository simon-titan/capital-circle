"use client";

import { Box, Button, Flex } from "@chakra-ui/react";
import { ArrowRight, LineChart } from "lucide-react";
import NextLink from "next/link";
import { CardValue, DashCard, LockedNote, Meta, clampLines } from "./primitives";
import type { AnalysisSummary } from "./types";

const analysisIcon = <LineChart size={17} strokeWidth={1.5} />;

export function AnalysisCard({ analysis, isPaid }: { analysis: AnalysisSummary | null; isPaid: boolean }) {
  if (!isPaid) {
    return (
      <DashCard label="Neueste Analyse" labelId="dash-analysis" icon={analysisIcon}>
        <LockedNote text="Daily- und Weekly-Analysen gehören zur Mitgliedschaft." />
      </DashCard>
    );
  }

  if (!analysis) {
    return (
      <DashCard label="Neueste Analyse" labelId="dash-analysis" icon={analysisIcon}>
        <Meta>Noch keine Analyse veröffentlicht.</Meta>
      </DashCard>
    );
  }

  return (
    <DashCard label="Neueste Analyse" labelId="dash-analysis" icon={analysisIcon}>
      <Flex gap={5} align="stretch" direction={{ base: "column", sm: "row" }}>
        <Flex direction="column" flex="1" minW={0}>
          <CardValue sx={clampLines(2)}>{analysis.title}</CardValue>
          <Meta mt={1}>{analysis.dayLabel}</Meta>
          <Box mt="auto" pt={5}>
            <Button
              as={NextLink}
              href={`/analysis/${analysis.id}`}
              variant="line"
              rightIcon={<ArrowRight size={16} strokeWidth={1.75} />}
            >
              Analyse lesen
            </Button>
          </Box>
        </Flex>

        {/* Chartbild rechts; ohne Bild bleibt die Karte einspaltig statt leer zu klaffen. */}
        {analysis.imageUrl ? (
          <Box
            flexShrink={0}
            w={{ base: "100%", sm: "220px" }}
            minH="120px"
            borderRadius="10px"
            overflow="hidden"
            border="1px solid var(--cc-line-strong)"
            backgroundImage={`url(${analysis.imageUrl})`}
            backgroundSize="cover"
            backgroundPosition="center"
            role="img"
            aria-label={`Vorschau: ${analysis.title}`}
          />
        ) : null}
      </Flex>
    </DashCard>
  );
}
