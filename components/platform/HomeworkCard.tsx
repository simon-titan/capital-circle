"use client";

import { Box, Button, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import { GlassCard } from "@/components/ui/GlassCard";
import type { HomeworkCustomTaskRow, HomeworkRow } from "@/lib/server-data";
import { ArrowRight, ClipboardList } from "lucide-react";
import Link from "next/link";

type HomeworkCardProps = {
  homework: HomeworkRow | null;
  initialOfficialDone: boolean;
  initialCustomTasks: HomeworkCustomTaskRow[];
  spotlight?: boolean;
};

const kicker = {
  className: "inter-medium",
  fontSize: "xs",
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
  color: "rgba(255, 255, 255, 0.5)",
};

function dueStatus(due: string | null): "overdue" | "soon" | "ok" | "none" {
  if (!due) return "none";
  const d = new Date(due + (due.includes("T") ? "" : "T12:00:00"));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "overdue";
  if (diff <= 3) return "soon";
  return "ok";
}

export function HomeworkCard({
  homework,
  initialOfficialDone,
  initialCustomTasks,
  spotlight = true,
}: HomeworkCardProps) {
  const customDoneCount = initialCustomTasks.filter((t) => t.done).length;
  const customTotal = initialCustomTasks.length;
  const hasOfficial = Boolean(homework);
  const hasContent = hasOfficial || customTotal > 0;

  const due = homework?.due_date ?? null;
  const status = dueStatus(due);
  const dueDate = due ? new Date(due + (due.includes("T") ? "" : "T12:00:00")) : null;
  const dayNum = dueDate ? dueDate.toLocaleDateString("de-DE", { day: "2-digit" }) : "—";
  const month = dueDate ? dueDate.toLocaleDateString("de-DE", { month: "short" }) : "";
  const weekdayShort = dueDate ? dueDate.toLocaleDateString("de-DE", { weekday: "short" }) : null;

  const badgeColor =
    status === "overdue"
      ? "#fca5a5"
      : status === "soon"
        ? "var(--color-accent-gold-light)"
        : "rgba(245, 236, 210, 0.85)";
  const badgeBg =
    status === "overdue"
      ? "rgba(239, 68, 68, 0.12)"
      : status === "soon"
        ? "rgba(212, 175, 55, 0.12)"
        : "rgba(255,255,255,0.06)";
  const badgeBorder =
    status === "overdue"
      ? "rgba(248, 113, 113, 0.35)"
      : status === "soon"
        ? "rgba(212, 175, 55, 0.38)"
        : "rgba(212, 175, 55, 0.22)";

  return (
    <GlassCard dashboard={!spotlight} spotlight={spotlight} h="100%" position="relative" overflow="hidden">
      <Box display="flex" alignItems="flex-start" gap={3} mb={{ base: 4, md: 4 }}>
        <Box color="var(--color-accent-gold)" aria-hidden flexShrink={0} mt={0.5}>
          <ClipboardList size={26} strokeWidth={1.7} />
        </Box>
        <Box minW={0}>
          <Text {...kicker} mb={1.5}>
            Wochenaufgabe
          </Text>
          <Heading as="h2" size="md" className="inter-semibold" fontWeight={600} lineHeight="short">
            Hausaufgabe & Checkliste
          </Heading>
          <Text
            className="radley-regular-italic"
            fontSize={{ base: "sm", md: "sm" }}
            color="rgba(245, 236, 210, 0.88)"
            lineHeight={1.35}
            mt={2}
          >
            Kurzüberblick — Details und eigene Aufgaben auf der Unterseite.
          </Text>
        </Box>
      </Box>

      {!hasContent ? (
        <VStack spacing={4} align="stretch" py={2}>
          <Box py={5} px={3} textAlign="center" borderRadius="12px" border="1px dashed var(--color-border)" bg="rgba(255,255,255,0.02)">
            <Text className="inter" color="var(--color-text-muted)" fontSize="sm" mb={4}>
              Es gibt keine aktive Wochenaufgabe. Lege auf der Unterseite eigene Aufgaben an.
            </Text>
          </Box>
          <Button
            as={Link}
            href="/hausaufgabe"
            size="sm"
            w="100%"
            rightIcon={<ArrowRight size={16} />}
            borderRadius="10px"
            bg="linear-gradient(135deg, var(--color-accent-gold-light) 0%, var(--color-accent-gold) 45%, var(--color-accent-gold-dark) 100%)"
            color="#0a0a0a"
            className="inter-semibold"
            _hover={{ boxShadow: "0 0 20px var(--color-accent-glow)" }}
          >
            Zur Hausaufgabe
          </Button>
        </VStack>
      ) : (
        <Box
          as={Link}
          href="/hausaufgabe"
          display="block"
          position="relative"
          overflow="hidden"
          p={{ base: 3, md: 3.5 }}
          borderRadius="12px"
          border="1px solid rgba(212, 175, 55, 0.32)"
          bg="linear-gradient(165deg, rgba(212, 175, 55, 0.08) 0%, rgba(8, 8, 8, 0.38) 55%)"
          transition="border-color 0.2s ease, box-shadow 0.2s ease"
          _hover={{ borderColor: "rgba(212, 175, 55, 0.55)", boxShadow: "0 8px 28px rgba(0,0,0,0.35)" }}
          cursor="pointer"
          textDecoration="none"
          color="inherit"
        >
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            h="3px"
            bgGradient="linear(to-r, #E8C547, rgba(212, 175, 55, 0.2))"
            pointerEvents="none"
          />

          <VStack align="stretch" spacing={3}>
            {hasOfficial && homework ? (
              <>
                <HStack spacing={2} flexWrap="wrap" align="center">
                  <HStack
                    spacing={2}
                    py={1.5}
                    px={2.5}
                    borderRadius="10px"
                    bg="rgba(212, 175, 55, 0.12)"
                    border="1px solid rgba(212, 175, 55, 0.28)"
                  >
                    <Text className="jetbrains-mono" fontSize="md" fontWeight={500} color="var(--color-text-primary)">
                      {dayNum}
                    </Text>
                    {month ? (
                      <Text
                        className="inter-medium"
                        fontSize="10px"
                        textTransform="uppercase"
                        letterSpacing="0.12em"
                        color="var(--color-accent-gold-light)"
                      >
                        {month}
                      </Text>
                    ) : null}
                  </HStack>
                  {weekdayShort ? (
                    <Text className="inter" fontSize="xs" color="var(--color-text-muted)">
                      {weekdayShort}
                      {homework.week_number != null ? ` · Woche ${homework.week_number}` : ""}
                    </Text>
                  ) : null}
                  {dueDate ? (
                    <Text
                      className="jetbrains-mono"
                      fontSize="10px"
                      px={2}
                      py={1}
                      borderRadius="md"
                      bg={badgeBg}
                      color={badgeColor}
                      borderWidth="1px"
                      borderColor={badgeBorder}
                    >
                      {status === "overdue" ? "überfällig" : status === "soon" ? "bald fällig" : "im Plan"}
                    </Text>
                  ) : null}
                </HStack>

                <Text as="span" className="radley-regular" fontSize="md" fontWeight={400} lineHeight="short" noOfLines={2} color="var(--color-text-primary)">
                  {homework.title}
                </Text>

                {homework.description ? (
                  <Text className="inter" fontSize="xs" color="rgba(240, 240, 242, 0.65)" lineHeight="tall" noOfLines={2}>
                    {homework.description}
                  </Text>
                ) : null}

                <Text className="inter" fontSize="xs" color={initialOfficialDone ? "rgba(187, 247, 208, 0.9)" : "rgba(255,255,255,0.55)"}>
                  Offizielle Aufgabe: {initialOfficialDone ? "erledigt" : "offen"}
                </Text>
              </>
            ) : (
              <Text className="inter" fontSize="sm" color="var(--color-text-muted)">
                Keine aktive Wochenaufgabe — nur deine eigenen Schritte.
              </Text>
            )}

            {customTotal > 0 ? (
              <Text className="jetbrains-mono" fontSize="xs" color="rgba(255,255,255,0.65)">
                Eigene Aufgaben: {customDoneCount}/{customTotal} erledigt
              </Text>
            ) : (
              <Text className="inter" fontSize="xs" color="rgba(255,255,255,0.45)">
                Noch keine eigenen Aufgaben
              </Text>
            )}

            <HStack justify="flex-end" pt={1}>
              <Text className="inter-semibold" fontSize="sm" color="var(--color-accent-gold-light)">
                Details & Checkliste
              </Text>
              <Box color="var(--color-accent-gold-light)" aria-hidden>
                <ArrowRight size={18} />
              </Box>
            </HStack>
          </VStack>
        </Box>
      )}
    </GlassCard>
  );
}
