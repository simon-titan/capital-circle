"use client";

import { Box, Button, Flex, Grid, Heading, Stack, Text, type FlexProps } from "@chakra-ui/react";
import NextLink from "next/link";
import type { CSSProperties } from "react";
import { AnalysisCard } from "./AnalysisCard";
import { AppointmentCard } from "./AppointmentCard";
import { ContinueCard } from "./ContinueCard";
import { DiscordCard } from "./DiscordCard";
import { JournalCard } from "./JournalCard";
import { LiveCard } from "./LiveCard";
import { OnboardingCheckliste } from "./OnboardingCheckliste";
import { ProgressCard } from "./ProgressCard";
import { UmzugCard } from "./UmzugCard";
import { WeekTaskCard } from "./WeekTaskCard";
import type { DashboardViewData } from "./types";

function ApplyPrompt({ className, ...props }: FlexProps) {
  return (
    <Flex
      className={["cc-card cc-card--hero", className].filter(Boolean).join(" ")}
      p={{ base: 5, md: 6 }}
      direction={{ base: "column", md: "row" }}
      align={{ base: "stretch", md: "center" }}
      justify="space-between"
      gap={5}
      {...props}
    >
      <Box minW={0}>
        <Text fontSize="18px" fontWeight={600} lineHeight={1.35} color="var(--cc-text)">
          Sichere dir deinen Platz im Capital Circle
        </Text>
        <Text fontSize="14px" lineHeight={1.55} color="var(--cc-text-2)" mt={1} maxW="62ch">
          Fülle die erweiterte Bewerbung aus und erhalte Zugang zu exklusiven Premium-Inhalten und unserer handverlesenen
          Community.
        </Text>
      </Box>
      <Button as={NextLink} href="/bewerbung" variant="gold" flexShrink={0}>
        Jetzt bewerben
      </Button>
    </Flex>
  );
}

/** Karten steigen beim Laden nacheinander auf (`.cc-rise`). */
function rise(step: number): { className: string; style: CSSProperties } {
  return { className: "cc-rise", style: { animationDelay: `${80 + step * 70}ms` } };
}

/**
 * Drei Reihen wie im Kunden-Mockup (09/2026), jede mit eigener Spaltenteilung:
 * oben „Als nächstes“ und der Fortschritt, in der Mitte die drei Handlungskarten,
 * unten Analyse und Termine.
 *
 * Vorher waren es zwei durchlaufende Spalten, deren Karten mobil per
 * `display: contents` und `order` neu sortiert wurden. Reihen brauchen das
 * nicht: Sie stapeln von selbst in der Reihenfolge, in der sie im Markup stehen —
 * und die ist bereits die nach Dringlichkeit.
 */
export function DashboardView({ data }: { data: DashboardViewData }) {
  return (
    // `cc-neutral`: Dashboard ohne Gold-Glow, mit neutralen grauen Kanten
    // (Nutzerwunsch 16.09.2026). Die Regeln stehen in app/globals.css.
    <Box className="cc-neutral">
      <Box as="header" mb={{ base: 6, md: 8 }} {...rise(0)}>
        <Heading
          as="h1"
          fontSize={{ base: "28px", md: "36px" }}
          lineHeight={1.15}
          fontWeight={600}
          letterSpacing="-0.01em"
          color="var(--cc-text)"
        >
          Hallo{" "}
          <Box as="span" color="var(--cc-gold-light)">
            {data.firstName}
          </Box>
          .
        </Heading>
        <Text fontSize={{ base: "16px", md: "18px" }} color="var(--cc-text-2)" mt={2}>
          Was ist jetzt dran?
        </Text>
      </Box>

      {/*
        Nur für die Mitglieder aus dem Whop-Umzug, sonst rendert die Karte
        nichts. Ganz oben, weil ein endender Zugang jede andere Karte auf
        dieser Seite überholt: Ohne ihn gibt es weder Lektion noch Aufgabe.
      */}
      <UmzugCard mb={5} {...rise(0)} />

      {/*
        Nur mobil sichtbar; auf dem Desktop trägt die Sidebar den Discord-Punkt.
        Solange die Start-Checkliste steht, ist Discord dort Schritt 1 — nicht doppelt.
      */}
      {data.onboarding ? null : <DiscordCard discord={data.discord} mb={5} {...rise(0)} />}

      {data.showApplyPrompt ? <ApplyPrompt mb={5} {...rise(0)} /> : null}

      {/* Nur für Neukäufer bis zum Abschluss des Onboardings, über „Als nächstes“. */}
      {data.onboarding ? <OnboardingCheckliste zustand={data.onboarding} mb={5} {...rise(0)} /> : null}

      <Stack spacing={5}>
        <Grid templateColumns={{ base: "minmax(0, 1fr)", xl: "minmax(0, 1.8fr) minmax(0, 1fr)" }} gap={5}>
          <Flex minW={0} {...rise(1)}>
            <ContinueCard item={data.continueItem} />
          </Flex>
          <Flex minW={0} {...rise(2)}>
            <ProgressCard progress={data.progress} streak={data.streak} />
          </Flex>
        </Grid>

        {/*
          Ohne Journal-Zugang (Free) bleibt die Reihe zweispaltig, statt eine
          leere dritte Spalte offenzulassen.
        */}
        <Grid
          templateColumns={{
            base: "minmax(0, 1fr)",
            md: "repeat(2, minmax(0, 1fr))",
            xl: data.canUseJournal ? "repeat(3, minmax(0, 1fr))" : "repeat(2, minmax(0, 1fr))",
          }}
          gap={5}
        >
          <Flex minW={0} {...rise(3)}>
            <LiveCard live={data.live} isPaid={data.isPaid} />
          </Flex>
          <Flex minW={0} {...rise(4)}>
            <WeekTaskCard homework={data.homework} isPaid={data.isPaid} />
          </Flex>
          {data.canUseJournal ? (
            <Flex minW={0} {...rise(5)}>
              <JournalCard />
            </Flex>
          ) : null}
        </Grid>

        <Grid templateColumns={{ base: "minmax(0, 1fr)", xl: "minmax(0, 1fr) minmax(0, 1.25fr)" }} gap={5}>
          <Flex minW={0} {...rise(6)}>
            <AnalysisCard analysis={data.analysis} isPaid={data.isPaid} />
          </Flex>
          <Flex minW={0} {...rise(7)}>
            <AppointmentCard appointment={data.appointment} termine={data.termine} />
          </Flex>
        </Grid>
      </Stack>
    </Box>
  );
}
