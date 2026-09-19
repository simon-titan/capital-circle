import { redirect } from "next/navigation";
import { BookingSuccessToast } from "@/components/platform/BookingSuccessToast";
import { DashboardView } from "@/components/platform/dashboard/DashboardView";
import type {
  AppointmentSummary,
  ContinueItem,
  DashboardViewData,
  HomeworkSummary,
  LiveItem,
  StreakDay,
  TerminZeile,
} from "@/components/platform/dashboard/types";
import { evaluateAccess } from "@/lib/access-control/has-access";
import { getLektionsFenster } from "@/lib/dashboard-lektion";
import { clockLabel, daysFromToday, relativeDayLabel, shortDateLabel } from "@/lib/dashboard-time";
import {
  berlinCalendarDayKey,
  buildLearningWeekLast7,
  formatLearningDurationDe,
  mergeStreakActivityDay,
  parseStreakActivityByDay,
  resolveLearningSecondsByDay,
} from "@/lib/learning-daily";
import { resolveEventColor } from "@/config/event-colors";
import { istExtern, toAbsoluteUrl } from "@/lib/external-url";
import { moduleHref } from "@/lib/module-route";
import {
  getAcademyModulesOverview,
  getCurrentUserAndProfile,
  getHomeworkDashboardState,
  getHomeworkOverview,
  getHomeworkWeekTotal,
  getLastWatchedModule,
  getLatestAnalysisPost,
  getLiveWindowEvents,
  getRecommendedAcademyModuleFromOverview,
  getWelcomeDashboardMetricsFromOverview,
  type AcademyModuleRow,
  type EventRow,
  type HomeworkCustomTaskRow,
  type HomeworkRow,
  type LastWatchedModuleData,
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

/** „Heute“ → „heute“ im Fließtext hinter dem Titel; Datumsangaben bleiben groß. */
function inlineDay(label: string): string {
  return /^(Heute|Gestern|Morgen)$/.test(label) ? label.toLowerCase() : label;
}

/**
 * Ein Satz zum Modul — steckt bereits in der Institut-Übersicht, die das
 * Dashboard ohnehin lädt.
 */
function modulBeschreibung(rows: AcademyModuleRow[], moduleId: string): string | null {
  return rows.find((m) => m.id === moduleId)?.description?.trim() || null;
}

/**
 * Die Pfeile in „Als nächstes“ blättern Lektionen statt Module (Nutzerwunsch
 * 17.09.2026), und seit 20.09.2026 blättern sie die Karte selbst, statt ins
 * Institut zu navigieren. Welche Lektion gerade zu sehen ist und welche links
 * und rechts davon liegt, rechnet `getLektionsFenster` entlang des Lernpfads
 * aus — deshalb ist der Aufbau der Karte hier asynchron.
 */
async function toContinueItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lastWatched: LastWatchedModuleData | null,
  recommended: RecommendedModuleData | null,
  academyRows: AcademyModuleRow[],
): Promise<ContinueItem | null> {
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
      description: modulBeschreibung(academyRows, module.id),
      // `lessonNumber` zählt ab 1, die Playlist ab 0.
      ...(await getLektionsFenster(supabase, academyRows, module.id, (lessonNumber ?? 1) - 1)),
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
      description: modulBeschreibung(academyRows, module.id),
      // Noch nicht begonnen: Der Einstieg ist die erste Lektion des Moduls.
      ...(await getLektionsFenster(supabase, academyRows, module.id, 0)),
    };
  }

  return null;
}

/** „15:30 – 17:00 Uhr“, wenn ein Ende hinterlegt ist — sonst „15:30 Uhr“. */
function zeitraumLabel(startIso: string, endIso: string | null): string {
  const start = clockLabel(startIso);
  if (!endIso) return start;
  // `clockLabel` hängt „Uhr“ an; am Anfang des Bereichs stört das.
  return `${start.replace(/\s*Uhr$/, "")} – ${clockLabel(endIso)}`;
}

function toLiveItem(events: EventRow[], now: Date): LiveItem | null {
  const ev = events[0];
  if (!ev) return null;
  const start = new Date(ev.start_time);
  const running = start.getTime() <= now.getTime();
  const state: LiveItem["state"] = running ? "now" : daysFromToday(start, now) === 0 ? "today" : "upcoming";
  const minutenBisStart = Math.round((start.getTime() - now.getTime()) / 60000);
  // Im Admin wird der Link oft ohne Protokoll eingetippt („google.com“). Ohne
  // das Ergänzen wäre das für den Browser ein relativer Pfad, und „Beitreten“
  // landete auf /dashboard/google.com statt beim Anbieter.
  const extern = toAbsoluteUrl(ev.external_url);
  return {
    title: ev.title,
    state,
    dayLabel: relativeDayLabel(start, now),
    timeLabel: clockLabel(start),
    timeRangeLabel: zeitraumLabel(ev.start_time, ev.end_time),
    laeuft: running,
    // Die Restzeit wird hier ausgerechnet und fertig weitergereicht. Die Karte
    // ist eine Client-Komponente; ein `Date.now()` dort läge beim ersten Render
    // neben dem Server-HTML (Hydration-Mismatch). Ab wann daraus „In 28 Minuten“
    // und ein warmer Ton wird, entscheidet `zeit-ton.ts`.
    minutesUntilStart: running ? null : Math.max(0, minutenBisStart),
    href: extern ?? "/events",
    external: istExtern(extern),
    eventType: ev.event_type?.trim() || null,
    eventColor: resolveEventColor(ev.color).value,
  };
}

/**
 * Die nächsten Termine als Liste: Tag · Titel · Uhrzeit. Restzeit und
 * Laufzustand kommen wie in „Heute live“ fertig vom Server (siehe `toLiveItem`),
 * damit beide Karten dieselbe Zeitfarbe aus denselben Zahlen ziehen.
 */
function toTermine(events: EventRow[], now: Date): TerminZeile[] {
  return events.map((ev) => {
    const start = new Date(ev.start_time).getTime();
    const laeuft = start <= now.getTime();
    return {
      id: ev.id,
      dayLabel: relativeDayLabel(ev.start_time, now),
      title: ev.title,
      timeLabel: zeitraumLabel(ev.start_time, ev.end_time),
      farbe: resolveEventColor(ev.color).value,
      istHeute: daysFromToday(ev.start_time, now) === 0,
      laeuft,
      minutesUntilStart: laeuft ? null : Math.max(0, Math.round((start - now.getTime()) / 60000)),
    };
  });
}

/**
 * „Diese Woche“ zeigt eine Aufgabe: die erste noch offene aus der aktuellen
 * Liste (Reihenfolge aus `lib/hausaufgaben.ts`: überfällig → nach Frist → ohne
 * Frist). Hat das Mitglied alles abgehakt, steht die erste mit „erledigt“ da.
 * Fristlose Aufgaben bleiben aktuell, bis der Admin sie archiviert oder löscht —
 * wer sie erledigt hat, bekommt hier trotzdem die nächste offene zu sehen.
 */
function toHomework(
  aktuell: HomeworkRow[],
  state: { officialDone: Record<string, boolean>; customTasks: HomeworkCustomTaskRow[] },
  weekTotal: number | null,
  now: Date,
): HomeworkSummary {
  const customDone = state.customTasks.filter((t) => t.done).length;
  const customTotal = state.customTasks.length;
  // Die eigenen Aufgaben hängen nicht mehr an einer Hausaufgabe (siehe
  // `getHomeworkDashboardState`) und sammeln sich deshalb über die Wochen an.
  // Die Karte zeigt nur drei — offene zuerst, damit dort nicht Erledigtes steht.
  const tasks = [...state.customTasks]
    .sort((a, b) => Number(a.done) - Number(b.done))
    .map((t) => ({ id: t.id, title: t.title, done: t.done }));
  const offen = aktuell.filter((hw) => !state.officialDone[hw.id]);
  const homework = offen[0] ?? aktuell[0] ?? null;
  const moreOpen = offen.length > 1 ? offen.length - 1 : 0;
  if (!homework) return { official: null, tasks, customDone, customTotal, moreOpen };
  const officialDone = Boolean(state.officialDone[homework.id]);

  let dueLabel: string | null = null;
  let overdue = false;
  if (homework.due_date) {
    const diff = daysFromToday(homework.due_date, now);
    if (diff < 0) {
      overdue = !officialDone;
      dueLabel = diff === -1 ? "seit gestern fällig" : `seit ${-diff} Tagen fällig`;
    } else if (diff === 0) {
      dueLabel = "fällig heute";
    } else if (diff === 1) {
      dueLabel = "fällig morgen";
    } else {
      dueLabel = `fällig ${shortDateLabel(homework.due_date)}`;
    }
  } else {
    dueLabel = "ohne Frist";
  }

  // „Woche 4 von 12“, sobald es eine höchste Wochennummer gibt — sonst nur die
  // laufende Woche, statt eine Gesamtzahl zu erfinden.
  const weekLabel =
    homework.week_number == null
      ? null
      : weekTotal && weekTotal >= homework.week_number
        ? `Woche ${homework.week_number} von ${weekTotal}`
        : `Woche ${homework.week_number}`;

  return {
    official: {
      title: homework.title,
      subtitle: homework.description?.trim() || null,
      weekLabel,
      dueLabel,
      overdue,
      done: officialDone,
    },
    tasks,
    customDone,
    customTotal,
    moreOpen,
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

  const [
    lastWatched,
    recommended,
    homeworkOverview,
    homeworkWeekTotal,
    liveEvents,
    kommendeEvents,
    welcomeMetrics,
    latestAnalysis,
  ] = await Promise.all([
    getLastWatchedModule(userId),
    getRecommendedAcademyModuleFromOverview(supabase, academyRows),
    getHomeworkOverview(),
    getHomeworkWeekTotal(),
    getLiveWindowEvents(3),
    // Vier Zeilen wie im Kunden-Mockup; der laufende Termin bleibt drin, damit
    // „Heute“ auch dann oben steht, wenn die Session schon begonnen hat.
    getLiveWindowEvents(4),
    getWelcomeDashboardMetricsFromOverview(userId, academyRows, supabase),
    isPaid ? getLatestAnalysisPost() : Promise.resolve(null),
  ]);

  const now = new Date();
  const displayName = profile.full_name || profile.username || "Mitglied";
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

  /*
   * „N von 5 Tagen diese Woche“: Nur Werktage der laufenden Kalenderwoche
   * zählen. `week` deckt die letzten sieben Tage ab und reicht damit in die
   * Vorwoche hinein — deren Tage dürfen die aktuelle Woche nicht aufblähen.
   */
  const montagKey = berlinCalendarDayKey(
    new Date(now.getTime() - ((now.getDay() + 6) % 7) * 86_400_000),
  );
  const weekdaysActive = week.filter((d) => {
    if (d.dayKey < montagKey) return false;
    const [y, m, t] = d.dayKey.split("-").map(Number);
    const wochentag = new Date(Date.UTC(y, m - 1, t)).getUTCDay();
    return wochentag >= 1 && wochentag <= 5 && d.active;
  }).length;

  const homeworkState = await getHomeworkDashboardState(userId);

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

  const continueItem = await toContinueItem(supabase, lastWatched, recommended, academyRows);

  const data: DashboardViewData = {
    firstName: firstName(displayName),
    isPaid,
    canUseJournal: evaluateAccess(profile).hasAccess,
    showApplyPrompt,
    continueItem,
    streak: { days: streakDaysSanitized, week, weekdaysActive, weekdaysTotal: 5 },
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
    homework: toHomework(homeworkOverview.aktuell, homeworkState, homeworkWeekTotal, now),
    analysis: latestAnalysis
      ? {
          id: latestAnalysis.id,
          title: latestAnalysis.title,
          dayLabel: inlineDay(relativeDayLabel(latestAnalysis.analysis_date ?? latestAnalysis.published_at, now)),
          imageUrl: latestAnalysis.imageSignedUrl,
        }
      : null,
    appointment: toAppointment(step2, isPaid, now),
    termine: toTermine(kommendeEvents, now),
    // Sichtbar nur unterhalb von `lg` — darüber steht Discord in der Sidebar.
    discord: { visible: isPaid, username: (discordConnection?.discord_username as string | null) ?? null },
  };

  return (
    <>
      {showBookingSuccess && <BookingSuccessToast />}
      <DashboardView data={data} />
    </>
  );
}
