/** Reine Anzeige-Daten fürs Dashboard — die Page berechnet, die Karten zeigen nur an. */

import type { ZeitBezug } from "./zeit-ton";

export type ContinueItem = {
  kind: "resume" | "start";
  /**
   * Die gezeigte Lektion. Schlüssel fürs Blättern in der Karte: Damit findet
   * sie sich nach einem Hin und Her im eigenen Zwischenspeicher wieder.
   * `null`, wenn das Modul (noch) keine veröffentlichte Lektion hat.
   */
  videoId: string | null;
  href: string;
  moduleTitle: string;
  /** „Lektion 7 von 24“ bzw. „24 Lektionen“ */
  lessonLabel: string | null;
  videoTitle: string | null;
  /** Ein Satz zum Modul, unter der Meta-Zeile. */
  description: string | null;
  progressPercent: number;
  thumbnailUrl: string | null;
  videoStorageKey: string | null;
  startAtSeconds: number;
  /**
   * Nachbarlektionen im Lernpfad — die Pfeile oben rechts in der Karte. Sie
   * springen über die Modulgrenze hinaus: Am Modulende führt „weiter“ zur
   * ersten Lektion des nächsten Moduls, nicht einfach zum Modul.
   *
   * IDs, keine Adressen: Die Pfeile blättern die Karte (nachgeladen über
   * `GET /api/dashboard/lektion`), sie navigieren nicht mehr weg vom Dashboard.
   */
  prevVideoId: string | null;
  nextVideoId: string | null;
};

export type StreakDay = {
  dayKey: string;
  weekdayShort: string;
  active: boolean;
  isToday: boolean;
  detail: string;
};

export type StreakSummary = {
  days: number;
  week: StreakDay[];
  /** Aktive Werktage dieser Woche — „4 von 5 Tagen“ im Fortschritt. */
  weekdaysActive: number;
  weekdaysTotal: number;
};

export type ProgressSummary = {
  /** Angesehene Videos in Prozent (abgerundet). */
  percent: number;
  completedModules: number;
  totalModules: number;
  completedVideos: number;
  totalVideos: number;
};

export type LiveItem = ZeitBezug & {
  title: string;
  /**
   * Der Kalenderbezug für die Überschrift („Jetzt live“ / „Heute live“ /
   * „Nächstes Live“). `laeuft` aus `ZeitBezug` sagt dasselbe wie `"now"`,
   * trägt aber die Farbe — die Unterscheidung heute/später steckt nur hier.
   */
  state: "now" | "today" | "upcoming";
  /** „Heute“, „Morgen“, „Do, 18. Sept“ */
  dayLabel: string;
  /** „15:00 Uhr“ */
  timeLabel: string;
  /** „15:30 – 17:00 Uhr“, wenn ein Ende hinterlegt ist — sonst wie `timeLabel`. */
  timeRangeLabel: string;
  href: string;
  external: boolean;
  /** Art des Events („Livetrading“, „BIAS“ …) — als Badge oben rechts. */
  eventType: string | null;
  /** Farbe des Badges, bereits auf die Markenpalette abgebildet. */
  eventColor: string;
};

/** Eine Teilaufgabe der Woche — im Dashboard nur angezeigt, abgehakt wird in /hausaufgabe. */
export type WeekTask = {
  id: string;
  title: string;
  done: boolean;
};

export type HomeworkSummary = {
  official: {
    title: string;
    /** Ein Satz unter dem Titel (Beschreibung der Aufgabe). */
    subtitle: string | null;
    /** „Woche 4 von 12“ bzw. „Woche 4“, wenn die Gesamtzahl unbekannt ist. */
    weekLabel: string | null;
    /** „fällig morgen“, „seit 3 Tagen fällig“ — bei Aufgaben ohne Datum „ohne Frist“. */
    dueLabel: string | null;
    overdue: boolean;
    done: boolean;
  } | null;
  tasks: WeekTask[];
  customDone: number;
  customTotal: number;
  /**
   * Weitere offene Hausaufgaben neben der gezeigten. Seit 19.09.2026 können
   * mehrere gleichzeitig aktuell sein (z. B. fristlose neben einer mit Frist).
   */
  moreOpen: number;
};

export type AnalysisSummary = {
  id: string;
  title: string;
  dayLabel: string;
  /** Vorschaubild rechts in der Karte; null = Karte bleibt textlich. */
  imageUrl: string | null;
};

/** Eine Zeile in „Nächste Termine“: Tag · Titel · Uhrzeit. */
export type TerminZeile = ZeitBezug & {
  id: string;
  /** „Heute“, „Morgen“, „So, 21. Sep“ */
  dayLabel: string;
  title: string;
  /** „15:30 – 17:00 Uhr“ */
  timeLabel: string;
  farbe: string;
  istHeute: boolean;
};

export type AppointmentSummary =
  | { state: "booked"; title: string; dayLabel: string; timeLabel: string }
  | { state: "open"; title: string }
  | { state: "none" };

/**
 * Discord-Status für die Karte über „Als nächstes“. Sie erscheint nur unterhalb
 * von `lg` — auf dem Desktop steht Discord in der Seitennavigation.
 */
export type DiscordStatus = {
  visible: boolean;
  username: string | null;
};

/**
 * Start-Checkliste über „Als nächstes“ („Dein Start bei Capital Circle“) —
 * nur für Neukäufer bis zum Abschluss des Onboardings, sonst `null`.
 * Zustand und Erkennung: `lib/onboarding/checkliste.ts`.
 */
export type OnboardingCheckliste = {
  discord: boolean;
  community: boolean;
  communityLinkGeoeffnet: boolean;
  kurs: boolean;
  passwortOffen: boolean;
  fertig: boolean;
  vorstellungsLink: string | null;
  /** Erste Lektion des empfohlenen Moduls bzw. das zuletzt gesehene. */
  lernpfadHref: string;
};

export type DashboardViewData = {
  firstName: string;
  isPaid: boolean;
  canUseJournal: boolean;
  showApplyPrompt: boolean;
  continueItem: ContinueItem | null;
  streak: StreakSummary;
  progress: ProgressSummary;
  live: LiveItem | null;
  homework: HomeworkSummary;
  analysis: AnalysisSummary | null;
  appointment: AppointmentSummary;
  termine: TerminZeile[];
  discord: DiscordStatus;
  onboarding: OnboardingCheckliste | null;
};
