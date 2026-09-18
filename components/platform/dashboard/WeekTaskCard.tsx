"use client";

import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react";
import { Check, FileText } from "lucide-react";
import NextLink from "next/link";
import { CardValue, DashCard, LockedNote, Meta, clampLines } from "./primitives";
import type { HomeworkSummary, WeekTask } from "./types";

const weekIcon = <FileText size={17} strokeWidth={1.5} />;

/** Höchstens drei Teilschritte — darunter wird die Karte höher als ihre Nachbarn. */
const MAX_TASKS = 3;

/**
 * Teilaufgabe als reine Anzeige: das Kästchen zeigt den Stand, abgehakt wird in
 * /hausaufgabe. Ein klickbares Kästchen, das nach dem Klick nichts speichert,
 * wäre schlimmer als gar keines.
 */
function TaskRow({ task }: { task: WeekTask }) {
  return (
    <Flex as="li" align="flex-start" gap={2.5}>
      <Flex
        w="18px"
        h="18px"
        mt="2px"
        flexShrink={0}
        align="center"
        justify="center"
        borderRadius="4px"
        border="1px solid"
        borderColor={task.done ? "transparent" : "var(--cc-line-strong)"}
        bg={task.done ? "var(--cc-ink)" : "transparent"}
        color="var(--cc-bg)"
        aria-hidden
      >
        {task.done ? <Check size={12} strokeWidth={3} /> : null}
      </Flex>
      <Text
        fontSize="14px"
        lineHeight={1.4}
        color={task.done ? "var(--cc-text-2)" : "var(--cc-text-soft)"}
        textDecoration={task.done ? "line-through" : undefined}
        sx={clampLines(1)}
      >
        {task.title}
      </Text>
    </Flex>
  );
}

export function WeekTaskCard({ homework, isPaid }: { homework: HomeworkSummary; isPaid: boolean }) {
  if (!isPaid) {
    return (
      <DashCard label="Diese Woche" labelId="dash-homework" icon={weekIcon}>
        <LockedNote text="Wochenaufgaben und persönliche Checklisten gehören zur Mitgliedschaft." />
      </DashCard>
    );
  }

  const { official, tasks, customDone, customTotal } = homework;
  const openButton = (
    <Box mt="auto" pt={5}>
      <Button as={NextLink} href="/hausaufgabe" variant="line">
        Aufgabe öffnen
      </Button>
    </Box>
  );

  if (!official) {
    return (
      <DashCard label="Diese Woche" labelId="dash-homework" icon={weekIcon}>
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

  const badge = official.weekLabel ? (
    <Text className="cc-num" fontSize="13px" color="var(--cc-text-2)" whiteSpace="nowrap">
      {official.weekLabel}
    </Text>
  ) : null;

  return (
    <DashCard label="Diese Woche" labelId="dash-homework" icon={weekIcon} badge={badge}>
      <CardValue sx={clampLines(2)}>{official.title}</CardValue>
      {official.subtitle ? (
        <Meta mt={1} sx={clampLines(2)}>
          {official.subtitle}
        </Meta>
      ) : null}

      {tasks.length > 0 ? (
        <Stack as="ul" listStyleType="none" spacing={2.5} mt={4}>
          {tasks.slice(0, MAX_TASKS).map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </Stack>
      ) : (
        <Flex mt={3} gap={2} wrap="wrap" fontSize="14px" color="var(--cc-text-2)" className="cc-num">
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
      )}

      {openButton}
    </DashCard>
  );
}
