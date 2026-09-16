"use client";

import { Button } from "@chakra-ui/react";
import NextLink from "next/link";
import { DashCard, LockedNote, Meta, TitleWithMeta } from "./primitives";
import type { AnalysisSummary } from "./types";

export function AnalysisCard({ analysis, isPaid }: { analysis: AnalysisSummary | null; isPaid: boolean }) {
  if (!isPaid) {
    return (
      <DashCard label="Neueste Analyse" labelId="dash-analysis">
        <LockedNote text="Daily- und Weekly-Analysen gehören zur Mitgliedschaft." />
      </DashCard>
    );
  }

  if (!analysis) {
    return (
      <DashCard label="Neueste Analyse" labelId="dash-analysis">
        <Meta>Noch keine Analyse veröffentlicht.</Meta>
      </DashCard>
    );
  }

  return (
    <DashCard
      label="Neueste Analyse"
      labelId="dash-analysis"
      action={
        <Button as={NextLink} href={`/analysis/${analysis.id}`} variant="line">
          Lesen
        </Button>
      }
    >
      <TitleWithMeta title={analysis.title} meta={analysis.dayLabel} />
    </DashCard>
  );
}
