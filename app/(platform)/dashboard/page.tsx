import { Grid, GridItem } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { DiscordBanner } from "@/components/platform/DiscordBanner";
import { DashboardAppointmentCard, type Step2AppointmentData } from "@/components/platform/DashboardAppointmentCard";
import { InsightBanner } from "@/components/platform/InsightBanner";
import { DashboardLiveBanner } from "@/components/platform/DashboardLiveBanner";
import { WelcomeCard } from "@/components/platform/WelcomeCard";
import {
  DashboardLastVideoCard,
  DashboardHomeworkCard,
  DashboardEventsCard,
} from "@/components/platform/DashboardCards";
import {
  formatLearningTime,
  getActiveHomework,
  getAcademyModulesOverview,
  getCurrentUserAndProfile,
  getHomeworkDashboardState,
  getLastWatchedModule,
  getMemberDays,
  getRecommendedAcademyModuleFromOverview,
  getUpcomingEvents,
  getWelcomeDashboardMetricsFromOverview,
} from "@/lib/server-data";
import {
  berlinCalendarDayKey,
  buildLearningWeekLast7,
  mergeStreakActivityDay,
  parseStreakActivityByDay,
  resolveLearningSecondsByDay,
  resolveTotalLearningSeconds,
} from "@/lib/learning-daily";
import { createClient } from "@/lib/supabase/server";
import { calculateStreak, maxPlausibleStreakDays, sanitizeStreakValue } from "@/lib/streak";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) {
    redirect("/einsteig");
  }

  const userId = user.id;
  const profileAny = profile as Record<string, unknown>;
  const showInsightBanner =
    String(profileAny.application_status) === "approved" &&
    (profileAny.membership_tier === "free" || !profileAny.is_paid) &&
    profileAny.step2_application_status == null;

  const academyRows = await getAcademyModulesOverview(userId);
  const supabase = await createClient();

  const [lastWatched, recommended, homework, events, welcomeMetrics] = await Promise.all([
    getLastWatchedModule(userId),
    getRecommendedAcademyModuleFromOverview(supabase, academyRows),
    getActiveHomework(),
    getUpcomingEvents(3),
    getWelcomeDashboardMetricsFromOverview(userId, academyRows, supabase),
  ]);

  const currentDate = new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const displayName = profile.full_name || profile.username || "Mitglied";
  const memberDays = getMemberDays(profile.created_at);
  const todayKey = berlinCalendarDayKey(new Date());
  const nowIso = new Date().toISOString();

  const storedStreakActivity = parseStreakActivityByDay(
    (profile as { streak_activity_by_day?: unknown }).streak_activity_by_day,
  );
  const alreadyActiveToday = Boolean(storedStreakActivity[todayKey]);

  // Streak beim Login/Dashboard-Besuch aktualisieren (falls heute noch nicht aktiv)
  const safeCurrent = sanitizeStreakValue(profile.streak_current ?? 0, profile.created_at);
  const maxPlausible = maxPlausibleStreakDays(profile.created_at);
  const rawNext = calculateStreak(
    profile.streak_last_activity ? new Date(profile.streak_last_activity as string) : null,
    safeCurrent,
  );
  const streakDaysSanitized = Math.min(rawNext, maxPlausible);
  const streakLongestSanitized = Math.min(
    Math.max(
      streakDaysSanitized,
      sanitizeStreakValue(profile.streak_longest ?? 0, profile.created_at),
    ),
    maxPlausible,
  );

  // Streak-Aktivität für heute mergen (Login zählt als Aktivität)
  const streakActivityByDay = alreadyActiveToday
    ? storedStreakActivity
    : mergeStreakActivityDay(storedStreakActivity, todayKey);

  const streakChanged =
    streakDaysSanitized !== (profile.streak_current ?? 0) ||
    streakLongestSanitized !== (profile.streak_longest ?? 0);

  if (!alreadyActiveToday || streakChanged) {
    const updatePayload: Record<string, unknown> = {
      streak_current: streakDaysSanitized,
      streak_longest: streakLongestSanitized,
      streak_activity_by_day: streakActivityByDay,
    };
    if (!alreadyActiveToday) {
      updatePayload.streak_last_activity = nowIso;
    }
    await supabase.from("profiles").update(updatePayload).eq("id", userId);
  }

  const streakDays = streakDaysSanitized;
  const totalLearnedSeconds = resolveTotalLearningSeconds(
    profile as { total_learning_seconds?: number | null; total_learning_minutes?: number | null },
  );
  const { label: learningLabel } = formatLearningTime(Math.floor(totalLearnedSeconds / 60));
  const learningWeekDays = buildLearningWeekLast7(
    resolveLearningSecondsByDay(
      profile as { learning_seconds_by_day?: unknown; learning_minutes_by_day?: unknown },
    ),
  );
  const weekSecondsSum = learningWeekDays.reduce((s, d) => s + d.seconds, 0);
  const { label: weekLearningLabel } = formatLearningTime(Math.floor(weekSecondsSum / 60));

  const homeworkState = await getHomeworkDashboardState(userId, homework);

  const isPaid = Boolean(profileAny.is_paid);

  const [{ data: discordConnection }, { data: step2Row }] = await Promise.all([
    isPaid
      ? supabase
          .from("discord_connections")
          .select("discord_username")
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("step2_applications")
      .select("status,calendly_booked_at,calendly_email_sent_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const step2Appointment: Step2AppointmentData | null = step2Row
    ? {
        status: (step2Row as Record<string, unknown>).status as string,
        calendlyBookedAt: ((step2Row as Record<string, unknown>).calendly_booked_at as string | null) ?? null,
        calendlyEmailSentAt: ((step2Row as Record<string, unknown>).calendly_email_sent_at as string | null) ?? null,
      }
    : null;

  return (
    <Grid gap={{ base: 6, md: 8 }} templateColumns={{ base: "1fr", lg: "1fr 1fr" }}>
      <GridItem colSpan={{ base: 1, lg: 2 }}>
        <WelcomeCard
          displayName={displayName}
          dateLabel={currentDate}
          memberDays={memberDays}
          streakDays={streakDays}
          streakActivityByDay={streakActivityByDay}
          learningLabel={learningLabel}
          welcomeMetrics={welcomeMetrics}
          learningWeekDays={learningWeekDays}
          weekLearningLabel={weekLearningLabel}
        />
      </GridItem>

      {/* Live-Stream-Banner: nur fuer Free-User (nicht is_paid) sichtbar, rendert sich aus wenn offline */}
      {!isPaid && (
        <GridItem colSpan={{ base: 1, lg: 2 }}>
          <DashboardLiveBanner />
        </GridItem>
      )}

      {showInsightBanner && (
        <GridItem colSpan={{ base: 1, lg: 2 }}>
          <InsightBanner />
        </GridItem>
      )}

      {step2Appointment && (
        <GridItem colSpan={{ base: 1, lg: 2 }}>
          <DashboardAppointmentCard data={step2Appointment} />
        </GridItem>
      )}

      {isPaid && (
        <GridItem colSpan={{ base: 1, lg: 2 }}>
          <DiscordBanner discordUsername={(discordConnection?.discord_username as string | null) ?? null} />
        </GridItem>
      )}

      <GridItem display="flex" flexDirection="column" minH={{ lg: "280px" }} colSpan={{ base: 1, lg: 2 }}>
        <DashboardLastVideoCard lastWatched={lastWatched} recommended={recommended} />
      </GridItem>

      <GridItem colSpan={{ base: 1, lg: 2 }}>
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={{ base: 6, md: 6 }} alignItems="stretch">
          <GridItem minH={0}>
            <DashboardHomeworkCard
              homework={homework}
              initialOfficialDone={homeworkState.officialDone}
              initialCustomTasks={homeworkState.customTasks}
              isPaid={isPaid}
            />
          </GridItem>
          <GridItem>
            <DashboardEventsCard events={events} isPaid={isPaid} />
          </GridItem>
        </Grid>
      </GridItem>
    </Grid>
  );
}
