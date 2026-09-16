"use client";

import { Box, Button, Flex } from "@chakra-ui/react";
import { Check } from "lucide-react";
import NextLink from "next/link";
import { CardValue, DashCard, LockedNote, Meta, clampLines } from "./primitives";
import type { HomeworkSummary } from "./types";

export function WeekTaskCard({ homework, isPaid }: { homework: HomeworkSummary; isPaid: boolean }) {
  if (!isPaid) {
    return (
      <DashCard label="Wochenaufgabe" labelId="dash-homework">
        <LockedNote text="Wochenaufgaben und persönliche Checklisten gehören zur Mitgliedschaft." />
      </DashCard>
    );
  }

  const { official, customDone, customTotal } = homework;
  const openButton = (
    <Box mt="auto" pt={5}>
      <Button as={NextLink} href="/hausaufgabe" variant="line">
        Öffnen
      </Button>
    </Box>
  );

  if (!official) {
    return (
      <DashCard label="Wochenaufgabe" labelId="dash-homework">
        <CardValue>Keine offene Wochenaufgabe</CardValue>
        <Meta mt={1} className="cc-num">
          {customTotal > 0
            ? `Eigene Aufgaben: ${customDone} von ${customTotal} erledigt`
            : "Lege eigene Aufgaben für diese Woche an."}
        </Meta>
        {openButton}
      </DashCard>
    );
  }

  return (
    <DashCard label={official.done ? "Wochenaufgabe" : "Offene Wochenaufgabe"} labelId="dash-homework">
      <CardValue sx={clampLines(2)}>{official.title}</CardValue>
      <Flex mt={2} gap={2} wrap="wrap" fontSize="14px" color="var(--cc-text-2)" className="cc-num">
        {official.weekLabel ? <span>{official.weekLabel}</span> : null}
        {official.weekLabel && (official.done || official.dueLabel) ? <span aria-hidden>·</span> : null}
        {official.done ? (
          <Flex as="span" align="center" gap={1} color="var(--cc-text)">
            <Check size={14} strokeWidth={2.25} aria-hidden />
            erledigt
          </Flex>
        ) : official.dueLabel ? (
          <Box as="span" color={official.overdue ? "var(--cc-danger)" : undefined}>
            {official.dueLabel}
          </Box>
        ) : null}
      </Flex>
      {openButton}
    </DashCard>
  );
}
