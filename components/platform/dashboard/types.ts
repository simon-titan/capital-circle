/** Reine Anzeige-Daten fürs Dashboard — die Page berechnet, die Karten zeigen nur an. */

export type ContinueItem = {
  kind: "resume" | "start";
  href: string;
  moduleTitle: string;
  /** „Lektion 7 von 24“ bzw. „24 Lektionen“ */
  lessonLabel: string | null;
  videoTitle: string | null;
  progressPercent: number;
  thumbnailUrl: string | null;
  videoStorageKey: string | null;
  startAtSeconds: number;
};

export type StreakDay = {
  dayKey: string;
  weekdayShort: string;
  active: boolean;
  isToday: boolean;
  detail: string;
};

export type ProgressSummary = {
  /** Angesehene Videos in Prozent (abgerundet). */
  percent: number;
  completedModules: number;
  totalModules: number;
  completedVideos: number;
  totalVideos: number;
};

export type LiveItem = {
  title: string;
  state: "now" | "today" | "upcoming";
  /** „Heute“, „Morgen“, „Do, 18. Sept“ */
  dayLabel: string;
  /** „15:00 Uhr“ */
  timeLabel: string;
  href: string;
  external: boolean;
  /** Art des Events („Livetrading“, „BIAS“ …) — als Badge oben rechts. */
  eventType: string | null;
  /** Farbe des Badges, bereits auf die Markenpalette abgebildet. */
  eventColor: string;
};

export type HomeworkSummary = {
  official: {
    title: string;
    weekLabel: string | null;
    dueLabel: string | null;
    overdue: boolean;
    done: boolean;
  } | null;
  customDone: number;
  customTotal: number;
};

export type AnalysisSummary = {
  id: string;
  title: string;
  dayLabel: string;
};

/** Eine Zelle im Mini-Kalender. `tag: null` = Leerfeld vor dem Monatsersten. */
export type KalenderTag = {
  key: string;
  tag: number | null;
  istHeute: boolean;
  /** Liegt der Tag heute oder später? Für „nächster Termin“. */
  istZukunft: boolean;
  /** „Do, 18. Sept“ */
  tagLabel: string;
  termine: { titel: string; zeitLabel: string; farbe: string }[];
};

export type AppointmentSummary =
  | { state: "booked"; title: string; dayLabel: string; timeLabel: string }
  | { state: "open"; title: string }
  | { state: "none" };

export type StatusSummary = {
  learningLabel: string;
  memberDays: number;
  discord: { visible: boolean; username: string | null };
};

export type DashboardViewData = {
  firstName: string;
  isPaid: boolean;
  canUseJournal: boolean;
  showApplyPrompt: boolean;
  continueItem: ContinueItem | null;
  streak: { days: number; week: StreakDay[] };
  progress: ProgressSummary;
  live: LiveItem | null;
  homework: HomeworkSummary;
  analysis: AnalysisSummary | null;
  appointment: AppointmentSummary;
  kalender: KalenderTag[];
  status: StatusSummary;
};
