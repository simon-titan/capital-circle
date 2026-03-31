import { Box, Grid, GridItem, Heading, Text, VStack } from "@chakra-ui/react";
import { GlassCard } from "@/components/ui/GlassCard";
import { CalendarDays, Flame } from "lucide-react";
import type { LearningWeekDay } from "@/lib/learning-daily";
import type { WelcomeDashboardMetrics } from "@/lib/welcome-metrics";
import { WelcomeLearningWeek } from "@/components/platform/WelcomeLearningWeek";
import { WelcomeModuleRings } from "@/components/platform/WelcomeModuleRings";

function firstName(displayName: string): string {
  const t = displayName.trim();
  if (!t) return "du";
  return t.split(/\s+/)[0] ?? t;
}

type WelcomeCardProps = {
  displayName: string;
  dateLabel: string;
  memberDays: number;
  streakDays: number;
  streakMaxDays: number;
  learningLabel: string;
  welcomeMetrics: WelcomeDashboardMetrics;
  learningWeekDays: LearningWeekDay[];
  weekLearningLabel: string;
};

export function WelcomeCard({
  displayName,
  dateLabel,
  memberDays,
  streakDays,
  streakMaxDays,
  learningLabel,
  welcomeMetrics,
  learningWeekDays,
  weekLearningLabel,
}: WelcomeCardProps) {
  const name = firstName(displayName);
  const streakPraise =
    streakDays >= 7
      ? `Fantastisch — dein Streak steht bei ${streakDays} Tagen. Das ist echte Konstanz!`
      : streakDays >= 3
        ? `Stark: ${streakDays} Tage Streak in Folge — genau so baust du Routine auf.`
        : streakDays >= 1
          ? `Du bist ${streakDays} ${streakDays === 1 ? "Tag" : "Tage"} am Stück dabei — weiter so!`
          : "Starte heute deinen Streak: ein kurzer Besuch reicht, um die Serie zu beginnen.";

  const streakBarPct = streakMaxDays > 0 ? Math.min(100, Math.round((streakDays / streakMaxDays) * 100)) : 0;

  return (
    <GlassCard hero p={{ base: 4, md: 5 }} position="relative">
      <Box position="relative" zIndex={1}>
        <VStack spacing={{ base: 4, md: 5 }} align="stretch" w="100%">
          <Grid
            templateColumns={{ base: "1fr", md: "minmax(0,1fr) minmax(0,1fr)" }}
            gap={{ base: 4, md: 5 }}
            alignItems="stretch"
            w="100%"
          >
          <GridItem display="flex" flexDirection="column">
            <Box mb={3}>
              <Text
                as="span"
                display="inline-block"
                className="inter-medium"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="0.14em"
                color="rgba(255, 255, 255, 0.5)"
                mb={2}
              >
                Willkommen zurück
              </Text>
              <Text
                className="radley-regular-italic"
                fontSize={{ base: "lg", md: "xl" }}
                color="rgba(245, 236, 210, 0.88)"
                lineHeight={1.35}
              >
                Schön, dass du wieder da bist.
              </Text>
            </Box>
            <Heading
              as="h1"
              fontSize={{ base: "2xl", md: "3xl" }}
              className="inter-semibold"
              fontWeight={600}
              lineHeight={1.15}
              letterSpacing="-0.02em"
              color="var(--color-accent-gold-light)"
              mb={3}
            >
              Hallo {name}!
            </Heading>
            <Text className="inter" color="rgba(245, 236, 210, 0.92)" fontSize={{ base: "sm", md: "md" }} lineHeight="tall" maxW="56ch">
              {streakPraise}
            </Text>

            <Box
              mt={4}
              display="inline-flex"
              alignItems="center"
              gap={3}
              alignSelf="flex-start"
              px={4}
              py={3}
              borderRadius="14px"
              border="1px solid rgba(212, 175, 55, 0.35)"
              bg="linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(8, 8, 8, 0.35) 100%)"
              boxShadow="inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 24px rgba(0,0,0,0.25)"
            >
              <Box borderRadius="full" p={2} bg="rgba(212, 175, 55, 0.2)" color="var(--color-accent-gold-light)" aria-hidden>
                <CalendarDays size={20} strokeWidth={1.75} />
              </Box>
              <Box>
                <Text
                  className="inter-medium"
                  fontSize="xs"
                  letterSpacing="0.1em"
                  textTransform="uppercase"
                  color="rgba(255,255,255,0.45)"
                  mb={0.5}
                >
                  Heute
                </Text>
                <Text className="inter-semibold" fontSize={{ base: "sm", md: "md" }} color="var(--color-text-primary)" lineHeight={1.35}>
                  {dateLabel}
                </Text>
              </Box>
            </Box>
          </GridItem>

          <GridItem display="flex" flexDirection="column">
            <Box className="welcome-streak-hot" borderRadius="18px" p={{ base: 3, md: 4 }} position="relative" overflow="hidden" flex="1" minH={0}>
              <Box position="relative" zIndex={1} display="flex" flexDirection={{ base: "column", sm: "row" }} gap={4} alignItems={{ sm: "center" }} justifyContent="space-between" h="100%">
                <Box display="flex" alignItems="center" gap={4}>
                  <Box
                    className="welcome-streak-flame"
                    borderRadius="16px"
                    p={3}
                    bg="linear-gradient(145deg, rgba(255, 140, 60, 0.35) 0%, rgba(212, 175, 55, 0.2) 100%)"
                    border="1px solid rgba(255, 160, 80, 0.45)"
                    boxShadow="0 0 32px rgba(255, 140, 60, 0.25), inset 0 1px 0 rgba(255,255,255,0.15)"
                    aria-hidden
                  >
                    <Flame size={28} strokeWidth={1.6} color="#ffb454" fill="rgba(255, 120, 40, 0.35)" />
                  </Box>
                  <Box>
                    <Text className="inter-medium" fontSize="xs" letterSpacing="0.12em" textTransform="uppercase" color="rgba(255,220,200,0.65)" mb={1}>
                      Streak
                    </Text>
                    <Text
                      className="jetbrains-mono"
                      fontSize={{ base: "3xl", md: "4xl" }}
                      lineHeight={0.95}
                      fontWeight={800}
                      sx={{
                        background: "linear-gradient(135deg, #fff2d0 0%, #e8c547 45%, #c99500 100%)",
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        color: "transparent",
                      }}
                    >
                      {streakDays}
                    </Text>
                    <Text className="inter" fontSize="sm" color="rgba(255,255,255,0.55)" mt={1}>
                      {streakDays === 1 ? "Tag in Folge" : "Tage in Folge"}
                    </Text>
                  </Box>
                </Box>
                <Box flex="1" minW={{ sm: "140px" }}>
                  <Text className="inter-medium" fontSize="xs" color="rgba(255,255,255,0.4)" mb={2}>
                    Zur Bestleistung ({streakMaxDays} T. möglich)
                  </Text>
                  <Box h="7px" borderRadius="full" bg="rgba(0,0,0,0.35)" overflow="hidden" border="1px solid rgba(255,160,80,0.25)">
                    <Box
                      h="100%"
                      w={`${streakBarPct}%`}
                      borderRadius="full"
                      bg="linear-gradient(90deg, #ff8a3c 0%, #ffb454 40%, #e8c547 100%)"
                      boxShadow="0 0 18px rgba(255, 150, 60, 0.5)"
                      transition="width 0.5s ease"
                    />
                  </Box>
                </Box>
              </Box>
            </Box>
          </GridItem>
          </Grid>

          <Grid
            templateColumns={{ base: "1fr", sm: "minmax(0, 1fr) minmax(0, 1fr)" }}
            gap={{ base: 4, md: 5 }}
            alignItems="stretch"
            w="100%"
          >
            <GridItem minW={0} w="100%" display="flex" flexDirection="column">
              <WelcomeModuleRings metrics={welcomeMetrics} />
            </GridItem>
            <GridItem minW={0} w="100%" display="flex" flexDirection="column">
              <WelcomeLearningWeek days={learningWeekDays} weekTotalLabel={weekLearningLabel} />
            </GridItem>
          </Grid>

          <Box
              borderRadius="12px"
              border="1px solid rgba(212, 175, 55, 0.28)"
              bg="rgba(0,0,0,0.25)"
              px={4}
              py={3}
              display="flex"
              gap={4}
              justifyContent="space-between"
              alignItems="center"
              flexWrap="nowrap"
            >
              <Box minW={0}>
                <Text className="inter-medium" fontSize="xs" letterSpacing="0.08em" color="rgba(255,255,255,0.45)" mb={0.5}>
                  Mitgliedschaft
                </Text>
                <Text className="inter-semibold" fontSize="md" color="rgba(245, 236, 210, 0.95)" noOfLines={1}>
                  {memberDays} {memberDays === 1 ? "Tag" : "Tage"}
                </Text>
              </Box>
              <Box minW={0} textAlign="right">
                <Text className="inter-medium" fontSize="xs" letterSpacing="0.08em" color="rgba(255,255,255,0.45)" mb={0.5}>
                  Lernzeit gesamt
                </Text>
                <Text className="inter-semibold" fontSize="md" color="var(--color-accent-gold-light)" noOfLines={1}>
                  {learningLabel}
                </Text>
              </Box>
          </Box>
        </VStack>
      </Box>
    </GlassCard>
  );
}
