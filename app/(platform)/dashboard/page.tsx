import { redirect } from "next/navigation";
import { BookingSuccessToast } from "@/components/platform/BookingSuccessToast";
import { DashboardView } from "@/components/platform/dashboard/DashboardView";
import type {
  AppointmentSummary,
  ContinueItem,
  DashboardViewData,
  HomeworkSummary,
  KalenderTag,
  LiveItem,
  StreakDay,
} from "@/components/platform/dashboard/types";
import { evaluateAccess } from "@/lib/access-control/has-access";
import { clockLabel, daysFromToday, relativeDayLabel, shortDateLabel } from "@/lib/dashboard-time";
import {
  berlinCalendarDayKey,
  buildLearningWeekLast7,
  formatLearningDurationDe,
  mergeStreakActivityDay,
  parseStreakActivityByDay,
  resolveLearningSecondsByDay,
  resolveTotalLearningSeconds,
} from "@/lib/learning-daily";
import { resolveEventColor } from "@/config/event-colors";
import { istExtern, toAbsoluteUrl } from "@/lib/external-url";
import { moduleHref } from "@/lib/module-route";
import {
  getActiveHomework,
  getAcademyModulesOverview,
  getCurrentUserAndProfile,
  getHomeworkDashboardState,
  getLastWatchedModule,
  getLatestAnalysisPost,
  getLiveWindowEvents,
  getMonatsTermine,
  getMemberDays,
  getRecommendedAcademyModuleFromOverview,
  getWelcomeDashboardMetricsFromOverview,
  type EventRow,
  type HomeworkCustomTaskRow,
  type HomeworkRow,
  type LastWatchedModuleData,
  type MonatsTermin,
  type RecommendedModuleData,
} from "@/lib/server-data";
import { createClient } from "@/lib/supabase/server";
import { calculateStreak, maxPlausibleStreakDays, sanitizeStreakValue } from "@/lib/streak";

export const dynamic = "force-dynamic";

function firstName(displayName: string): string {
  const t = displayName.trim();
  if (!t) return "du";
  return t.split(/\s+/)[0] ?? t;
}

function clampPercent(v: number | null | undefined): number {
  return Math.max(0, Math.min(100, Math.round(v ?? 0)));
}

/** „38 h 20 Min“ */
function learningLabel(totalSeconds: number): string {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} Min`;
  return m === 0 ? `${h} h` : `${h} h ${m} Min`;
}

/** „Heute“ → „heute“ im Fließtext hinter dem Titel; Datumsangaben bleiben groß. */
function inlineDay(label: string): string {
  return /^(Heute|Gestern|Morgen)$/.test(label) ? label.toLowerCase() : label;
}

function toContinueItem(
  lastWatched: LastWatchedModuleData | null,
  recommended: RecommendedModuleData | null,
): ContinueItem | null {
  if (lastWatched) {
    const { module, lessonNumber, lessonCount, videoProgressSeconds, lastVideoDurationSeconds } = lastWatched;
    const startAtSeconds =
      lastVideoDurationSeconds > 0
        ? Math.min(Math.max(0, videoProgressSeconds), lastVideoDurationSeconds - 0.25)
        : Math.max(0, videoProgressSeconds);
    return {
      kind: "resume",
      href: moduleHref({ id: module.id, slug: module.slug }),
      moduleTitle: module.title,
      lessonLabel: lessonNumber && lessonCount > 0 ? `Lektion ${lessonNumber} von ${lessonCount}` : null,
      videoTitle: lastWatched.lastVideoTitle,
      progressPercent: clampPercent(lastWatched.progressPercent),
      thumbnailUrl: lastWatched.thumbnailSignedUrl,
      videoStorageKey: lastWatched.lastVideoStorageKey,
      startAtSeconds,
    };
  }

  if (recommended) {
    const { module, videoCount } = recommended;
    return {
      kind: "start",
      href: moduleHref({ id: module.id, slug: module.slug }),
      moduleTitle: module.title,
      lessonLabel: videoCount > 0 ? `${videoCount} ${videoCount === 1 ? "Lektion" : "Lektionen"}` : null,
      videoTitle: null,
      progressPercent: clampPercent(recommended.progressPercent),
      thumbnailUrl: recommended.thumbnailSignedUrl,
      videoStorageKey: recommended.previewVideoStorageKey,
      startAtSeconds: 0,
    };
  }

  return null;
}

function toLiveItem(events: EventRow[], now: Date): LiveItem | null {
  const ev = events[0];
  if (!ev) return null;
  const start = new Date(ev.start_time);
  const running = start.getTime() <= now.getTime();
  const state: LiveItem["state"] = running ? "now" : daysFromToday(start, now) === 0 ? "today" : "upcoming";
  // Im Admin wird der Link oft ohne Protokoll eingetippt („google.com“). Ohne
  // das Ergänzen wäre das für den Browser ein relativer Pfad, und „Beitreten“
  // landete auf /dashboard/google.com statt beim Anbieter.
  const extern = toAbsoluteUrl(ev.external_url);
  return {
    title: ev.title,
    state,
    dayLabel: relativeDayLabel(start, now),
    timeLabel: clockLabel(start),
    href: extern ?? "/events",
    external: istExtern(extern),
    eventType: ev.event_type?.trim() || null,
    eventColor: resolveEventColor(ev.color).value,
  };
}

/**
 * Baut das Monatsraster für den Mini-Kalender: führende Leerfelder bis zum
 * Monatsersten (Woche beginnt montags), danach jeder Tag mit seinen Terminen.
 */
function toKalender(termine: MonatsTermin[], now: Date): KalenderTag[] {
  const jahr = now.getFullYear();
  const monat = now.getMonth();
  const tageImMonat = new Date(jahr, monat + 1, 0).getDate();
  // getDay(): 0 = Sonntag. Wir starten montags, also verschieben.
  const ersterWochentag = (new Date(jahr, monat, 1).getDay() + 6) % 7;
  const heute = now.getDate();

  const proTag = new Map<number, KalenderTag["termine"]>();
  for (const t of termine) {
    const liste = proTag.get(t.tag) ?? [];
    liste.push({ titel: t.titel, zeitLabel: clockLabel(t.startIso), farbe: t.farbe });
    proTag.set(t.tag, liste);
  }

  const zellen: KalenderTag[] = [];
  for (let i = 0; i < ersterWochentag; i++) {
    zellen.push({ key: `leer-${i}`, tag: null, istHeute: false, istZukunft: false, tagLabel: "", termine: [] });
  }
  for (let tag = 1; tag <= tageImMonat; tag++) {
    zellen.push({
      key: `tag-${tag}`,
      tag,
      istHeute: tag === heute,
      istZukunft: tag >= heute,
      tagLabel: shortDateLabel(new Date(jahr, monat, tag).toISOString()),
      termine: proTag.get(tag) ?? [],
    });
  }
  return zellen;
}

function toHomework(
  homework: HomeworkRow | null,
  state: { officialDone: boolean; customTasks: HomeworkCustomTaskRow[] },
  now: Date,
): HomeworkSummary {
  const customDone = state.customTasks.filter((t) => t.done).length;
  const customTotal = state.customTasks.length;
  if (!homework) return { official: null, customDone, customTotal };

  let dueLabel: string | null = null;
  let overdue = false;
  if (homework.due_date) {
    const diff = daysFromToday(homework.due_date, now);
    if (diff < 0) {
      overdue = !state.officialDone;
      dueLabel = diff === -1 ? "seit gestern fällig" : `seit ${-diff} Tagen fällig`;
    } else if (diff === 0) {
      dueLabel = "fällig heute";
    } else if (diff === 1) {
      dueLabel = "fällig morgen";
    } else {
      dueLabel = `fällig ${shortDateLabel(homework.due_date)}`;
    }
  }

  return {
    official: {
      title: homework.title,
      weekLabel: homework.week_number != null ? `Woche ${homework.week_number}` : null,
      dueLabel,
      overdue,
      done: state.officialDone,
    },
    customDone,
    customTotal,
  };
}

/**
 * Persönlicher Termin = Bewerbungsgespräch aus Step 2. Nur solange jemand noch
 * nicht Mitglied ist — danach ist der Termin Geschichte.
 */
function toAppointment(
  step2: { status: string; calendlyBookedAt: string | null } | null,
  isPaid: boolean,
  now: Date,
): AppointmentSummary {
  if (isPaid || !step2 || step2.status === "rejected") return { state: "none" };
  if (step2.calendlyBookedAt) {
    return {
      state: "booked",
      title: "Bewerbungsgespräch",
      dayLabel: relativeDayLabel(step2.calendlyBookedAt, now),
      timeLabel: clockLabel(step2.calendlyBookedAt),
    };
  }
  return { state: "open", title: "Bewerbungsgespräch" };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const showBookingSuccess = params.booking_success === "1";
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) {
    redirect("/einsteig");
  }

  const userId = user.id;
  const profileAny = profile as Record<string, unknown>;
  const isPaid = Boolean(profileAny.is_paid);
  const showApplyPrompt =
    String(profileAny.application_status) === "approved" &&
    (profileAny.membership_tier === "free" || !profileAny.is_paid) &&
    profileAny.step2_application_status == null;

  const academyRows = await getAcademyModulesOverview(userId);
  const supabase = await createClient();

  const [lastWatched, recommended, homework, liveEvents, monatsTermine, welcomeMetrics, latestAnalysis] = await Promise.all([
    getLastWatchedModule(userId),
    getRecommendedAcademyModuleFromOverview(supabase, academyRows),
    getActiveHomework(),
    getLiveWindowEvents(3),
    getMonatsTermine(new Date()),
    getWelcomeDashboardMetricsFromOverview(userId, academyRows, supabase),
    isPaid ? getLatestAnalysisPost() : Promise.resolve(null),
  ]);

  const now = new Date();
  const displayName = profile.full_name || profile.username || "Mitglied";
  const memberDays = getMemberDays(profile.created_at);
  const todayKey = berlinCalendarDayKey(now);
  const nowIso = now.toISOString();

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

  const totalLearnedSeconds = resolveTotalLearningSeconds(
    profile as { total_learning_seconds?: number | null; total_learning_minutes?: number | null },
  );
  const learningWeekDays = buildLearningWeekLast7(
    resolveLearningSecondsByDay(
      profile as { learning_seconds_by_day?: unknown; learning_minutes_by_day?: unknown },
    ),
  );
  const week: StreakDay[] = learningWeekDays.map((d) => {
    const hasStreakActivity = Boolean(streakActivityByDay[d.dayKey]);
    return {
      dayKey: d.dayKey,
      weekdayShort: d.weekdayShort,
      active: d.seconds > 0 || hasStreakActivity,
      isToday: d.dayKey === todayKey,
      detail:
        d.seconds > 0
          ? `${d.labelDe}: aktiv (${formatLearningDurationDe(d.seconds)})`
          : hasStreakActivity
            ? `${d.labelDe}: Streak-Aktivität`
            : `${d.labelDe}: keine Aktivität`,
    };
  });

  const homeworkState = await getHomeworkDashboardState(userId, homework);

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
      .select("status,calendly_booked_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const step2 = step2Row
    ? {
        status: String((step2Row as Record<string, unknown>).status ?? ""),
        calendlyBookedAt: ((step2Row as Record<string, unknown>).calendly_booked_at as string | null) ?? null,
      }
    : null;

  const data: DashboardViewData = {
    firstName: firstName(displayName),
    isPaid,
    canUseJournal: evaluateAccess(profile).hasAccess,
    showApplyPrompt,
    continueItem: toContinueItem(lastWatched, recommended),
    streak: { days: streakDaysSanitized, week },
    progress: {
      // Prozent = angesehene Videos, damit die Zahl zur Zeile „x von y Videos“ darunter passt.
      // Abgerundet, damit 100 % erst erscheint, wenn wirklich alles angesehen ist.
      percent:
        welcomeMetrics.totalVideos > 0
          ? Math.floor((welcomeMetrics.completedVideos / welcomeMetrics.totalVideos) * 100)
          : clampPercent(welcomeMetrics.overallProgressPercent),
      completedModules: welcomeMetrics.completedModules,
      totalModules: welcomeMetrics.totalModules,
      completedVideos: welcomeMetrics.completedVideos,
      totalVideos: welcomeMetrics.totalVideos,
    },
    live: toLiveItem(liveEvents, now),
    homework: toHomework(homework, homeworkState, now),
    analysis: latestAnalysis
      ? {
          id: latestAnalysis.id,
          title: latestAnalysis.title,
          dayLabel: inlineDay(relativeDayLabel(latestAnalysis.analysis_date ?? latestAnalysis.published_at, now)),
        }
      : null,
    appointment: toAppointment(step2, isPaid, now),
    kalender: toKalender(monatsTermine, now),
    status: {
      learningLabel: learningLabel(totalLearnedSeconds),
      memberDays,
      discord: { visible: isPaid, username: (discordConnection?.discord_username as string | null) ?? null },
    },
  };

  return (
    <>
      {showBookingSuccess && <BookingSuccessToast />}
      <DashboardView data={data} />
    </>
  );
}
