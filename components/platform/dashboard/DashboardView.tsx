"use client";

import { Box, Button, Flex, Grid, Heading, Text, type FlexProps } from "@chakra-ui/react";
import { ArrowRight, Plus } from "lucide-react";
import NextLink from "next/link";
import type { CSSProperties } from "react";
import { AnalysisCard } from "./AnalysisCard";
import { AppointmentCard } from "./AppointmentCard";
import { ContinueCard } from "./ContinueCard";
import { LiveCard } from "./LiveCard";
import { ProgressCard } from "./ProgressCard";
import { StatusCards } from "./StatusCards";
import { StreakCard } from "./StreakCard";
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

/** „Trade erfassen“ als Aktionskarte: ganze Fläche klickbar, Gold-Icon, Pfeil schiebt beim Hover nach. */
function TradeCta() {
  return (
    <Flex
      as={NextLink}
      href="/trading-journal?neu=1"
      className="cc-card"
      role="group"
      align="center"
      gap={4}
      p={{ base: 4, md: 5 }}
      style={{ borderColor: "rgba(255, 255, 255, 0.24)" }}
    >
      <Flex
        w="52px"
        h="52px"
        flexShrink={0}
        align="center"
        justify="center"
        borderRadius="12px"
        bg="var(--cc-gold-grad)"
        color="var(--cc-on-gold)"
        boxShadow="inset 0 1px 0 rgba(255, 255, 255, 0.35)"
        aria-hidden
      >
        <Plus size={24} strokeWidth={2.25} />
      </Flex>
      <Box flex="1" minW={0}>
        <Text fontSize={{ base: "17px", md: "18px" }} fontWeight={600} lineHeight={1.3} color="var(--cc-text)">
          Trade erfassen
        </Text>
        <Text fontSize="14px" lineHeight={1.5} color="var(--cc-text-2)" mt={0.5}>
          Halte deinen letzten Trade im Journal fest, solange er frisch ist.
        </Text>
      </Box>
      <Flex
        w="40px"
        h="40px"
        flexShrink={0}
        align="center"
        justify="center"
        borderRadius="full"
        border="1px solid var(--cc-line-strong)"
        color="var(--cc-text-soft)"
        transition="transform 200ms var(--cc-ease), background-color 200ms var(--cc-ease)"
        _groupHover={{ transform: "translateX(3px)", bg: "rgba(255, 255, 255, 0.08)" }}
        aria-hidden
      >
        <ArrowRight size={18} strokeWidth={2} />
      </Flex>
    </Flex>
  );
}

/** Karten steigen beim Laden nacheinander auf (`.cc-rise`), Reihenfolge = `order`. */
function rise(step: number): { className: string; style: CSSProperties } {
  return { className: "cc-rise", style: { animationDelay: `${80 + step * 70}ms` } };
}

/**
 * Zwei unabhängige Spalten ab `xl` (wie im Mockup), darunter eine Spalte.
 * Die Spalten-Wrapper sind unter `xl` `display: contents`, damit `order` die
 * Karten mobil nach Dringlichkeit sortiert statt erst links, dann rechts.
 */
export function DashboardView({ data }: { data: DashboardViewData }) {
  const column = { display: { base: "contents", xl: "flex" }, flexDirection: "column" as const, gap: 5, minW: 0 };

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

      {data.showApplyPrompt ? <ApplyPrompt mb={5} {...rise(0)} /> : null}

      {/*
        Ohne `alignItems="start"` sind beide Spalten gleich hoch. Erst dadurch
        kann die Fortschritts-Karte rechts den Rest ausfüllen und schließt unten
        bündig mit „Heute live“ und „Wochenaufgabe“ ab, statt gestaucht darüber
        zu schweben.
      */}
      <Grid templateColumns={{ base: "minmax(0, 1fr)", xl: "minmax(0, 1.8fr) minmax(0, 1fr)" }} gap={5}>
        <Box {...column}>
          <Box order={1} minW={0} {...rise(1)}>
            <ContinueCard item={data.continueItem} />
          </Box>
          <Grid
            order={3}
            display={{ base: "contents", md: "grid" }}
            templateColumns="repeat(2, minmax(0, 1fr))"
            gap={5}
          >
            <Flex order={3} minW={0} {...rise(3)}>
              <LiveCard live={data.live} isPaid={data.isPaid} />
            </Flex>
            <Flex order={4} minW={0} {...rise(4)}>
              <WeekTaskCard homework={data.homework} isPaid={data.isPaid} />
            </Flex>
          </Grid>
          <Box order={6} minW={0} {...rise(6)}>
            <AnalysisCard analysis={data.analysis} isPaid={data.isPaid} />
          </Box>
          {data.canUseJournal ? (
            <Box order={8} {...rise(8)}>
              <TradeCta />
            </Box>
          ) : null}
        </Box>

        <Box {...column}>
          <Box order={2} minW={0} {...rise(2)}>
            <StreakCard days={data.streak.days} week={data.streak.week} />
          </Box>
          {/* `flex="1"` nur ab xl, wo die Spalten nebeneinander stehen — darunter
              liegen alle Karten untereinander und sollen normal hoch bleiben. */}
          <Box order={5} minW={0} flex={{ base: undefined, xl: "1" }} {...rise(5)}>
            <ProgressCard progress={data.progress} />
          </Box>
          <Box order={7} minW={0} {...rise(7)}>
            <AppointmentCard appointment={data.appointment} kalender={data.kalender} />
          </Box>
        </Box>
      </Grid>

      <StatusCards status={data.status} mt={5} {...rise(9)} />
    </Box>
  );
}
