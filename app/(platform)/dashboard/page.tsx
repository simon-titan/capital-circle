import { Grid, GridItem } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { WelcomeCard } from "@/components/platform/WelcomeCard";
import { LastVideoCard } from "@/components/platform/LastVideoCard";
import { HomeworkCard } from "@/components/platform/HomeworkCard";
import { UpcomingEventsCard } from "@/components/platform/UpcomingEventsCard";
import {
  formatLearningTime,
  getActiveHomework,
  getCurrentUserAndProfile,
  getHomeworkDashboardState,
  getLastWatchedModule,
  getMemberDays,
  getRecommendedAcademyModule,
  getUpcomingEvents,
  getWelcomeDashboardMetrics,
} from "@/lib/server-data";
import { buildLearningWeekLast7, parseLearningMinutesByDay } from "@/lib/learning-daily";
import { createClient } from "@/lib/supabase/server";
import { maxPlausibleStreakDays, sanitizeStreakValue } from "@/lib/streak";

export default async function DashboardPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) {
    redirect("/einsteig");
  }

  const userId = user.id;

  const [lastWatched, recommended, homework, events, welcomeMetrics] = await Promise.all([
    getLastWatchedModule(userId),
    getRecommendedAcademyModule(userId),
    getActiveHomework(),
    getUpcomingEvents(3),
    getWelcomeDashboardMetrics(userId),
  ]);

  const currentDate = new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const displayName = profile.full_name || profile.username || "Mitglied";
  const memberDays = getMemberDays(profile.created_at);
  const maxStreakDays = maxPlausibleStreakDays(profile.created_at);
  const streakDaysSanitized = sanitizeStreakValue(profile.streak_current ?? 0, profile.created_at);
  const streakLongestSanitized = Math.min(
    Math.max(
      streakDaysSanitized,
      sanitizeStreakValue(profile.streak_longest ?? 0, profile.created_at),
    ),
    maxStreakDays,
  );
  if (
    streakDaysSanitized !== (profile.streak_current ?? 0) ||
    streakLongestSanitized !== (profile.streak_longest ?? 0)
  ) {
    const supabase = await createClient();
    await supabase
      .from("profiles")
      .update({
        streak_current: streakDaysSanitized,
        streak_longest: streakLongestSanitized,
      })
      .eq("id", userId);
  }
  const streakDays = streakDaysSanitized;
  const { label: learningLabel } = formatLearningTime(profile.total_learning_minutes);
  const learningWeekDays = buildLearningWeekLast7(
    parseLearningMinutesByDay((profile as { learning_minutes_by_day?: unknown }).learning_minutes_by_day),
  );
  const weekMinutesSum = learningWeekDays.reduce((s, d) => s + d.minutes, 0);
  const { label: weekLearningLabel } = formatLearningTime(weekMinutesSum);

  const homeworkState = await getHomeworkDashboardState(userId, homework);

  return (
    <Grid gap={{ base: 6, md: 8 }} templateColumns={{ base: "1fr", lg: "1fr 1fr" }}>
      <GridItem colSpan={{ base: 1, lg: 2 }}>
        <WelcomeCard
          displayName={displayName}
          dateLabel={currentDate}
          memberDays={memberDays}
          streakDays={streakDays}
          streakMaxDays={maxStreakDays}
          learningLabel={learningLabel}
          welcomeMetrics={welcomeMetrics}
          learningWeekDays={learningWeekDays}
          weekLearningLabel={weekLearningLabel}
        />
      </GridItem>

      <GridItem display="flex" flexDirection="column" minH={{ lg: "280px" }} colSpan={{ base: 1, lg: 2 }}>
        <LastVideoCard lastWatched={lastWatched} recommended={recommended} />
      </GridItem>

      <GridItem colSpan={{ base: 1, lg: 2 }}>
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={{ base: 6, md: 6 }} alignItems="stretch">
          <GridItem minH={0}>
            <HomeworkCard
              homework={homework}
              initialOfficialDone={homeworkState.officialDone}
              initialCustomTasks={homeworkState.customTasks}
              spotlight
            />
          </GridItem>
          <GridItem>
            <UpcomingEventsCard events={events} spotlight />
          </GridItem>
        </Grid>
      </GridItem>
    </Grid>
  );
}
