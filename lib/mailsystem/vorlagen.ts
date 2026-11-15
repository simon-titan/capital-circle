/**
 * Das Vorlagenregister des E-Mail-Playbooks 1.0 (Emre, 07.11.2026), Kapitel 15.
 *
 * Klasse (Kapitel 09):
 *   S — anlassgebundene Bestätigung / Organisation
 *   K — Nachfassen zur ausdrücklich gestellten Gesprächsanfrage
 *   M — Lernen, Nurturing und Angebote (nur ohne Werbewiderspruch)
 *
 * Priorität (Kapitel 08, Kollision unter M/K): kleiner = wichtiger. S-Mails
 * konkurrieren nicht, sie gehen zu ihrem Anlass.
 *
 * Die Texte stehen unverändert in `lib/email/templates/playbook/*`; hier nur,
 * was die Versandsteuerung wissen muss. Bewusst ohne Abhängigkeiten (Tests).
 */

export type Klasse = "S" | "K" | "M";

export type VorlageId =
  | "A01" | "A02" | "A03"
  | "S01" | "S02"
  | "L01" | "L02" | "L03" | "L04"
  | "I01" | "I02" | "I03"
  | "B01" | "B02" | "B03"
  | "T01" | "T02" | "T03" | "T04"
  | "R01" | "R02" | "R03"
  | "N01" | "N02"
  | "E01" | "E02" | "E03" | "E04" | "E05"
  | "W01"
  | "U01" | "U02"
  | "V01" | "V02"
  | "Q01" | "Q02"
  // Einmal-Kampagnen (15.11.2026, `/admin/kampagnen`), nicht Teil des Playbooks.
  | "RT01" | "TP01";

export type VorlageMeta = {
  id: VorlageId;
  titel: string;
  klasse: Klasse;
  /** Kollisionspriorität unter M/K (1 = höchste). S: 0. */
  prioritaet: number;
  /** Wer unterschreibt: Emre oder der zuständige Berater. */
  absender: "emre" | "berater";
};

const v = (id: VorlageId, titel: string, klasse: Klasse, prioritaet: number, absender: "emre" | "berater" = "emre"): VorlageMeta => ({
  id,
  titel,
  klasse,
  prioritaet,
  absender,
});

export const VORLAGEN: Record<VorlageId, VorlageMeta> = {
  A01: v("A01", "Bewerbung eingegangen", "S", 0),
  A02: v("A02", "Bewerbung angenommen", "S", 0),
  A03: v("A03", "Bewerbung abgelehnt", "S", 0),
  S01: v("S01", "Kein Lernstart nach 24 Stunden", "M", 6),
  S02: v("S02", "Kein Lernstart nach 72 Stunden", "M", 6),
  L01: v("L01", "AMT-Lektion vertiefen", "M", 6),
  L02: v("L02", "Tradingansatz und Alltag", "M", 6),
  L03: v("L03", "Einblick in Capital Circle", "M", 6),
  L04: v("L04", "Erste direkte Gesprächseinladung", "M", 6),
  I01: v("I01", "Offene Frage vor der Anfrage", "M", 6),
  I02: v("I02", "Gesprächsablauf erklären", "M", 6),
  I03: v("I03", "Letzter allgemeiner Gesprächsimpuls", "M", 6),
  B01: v("B01", "Formular fertig, Termin fehlt", "K", 3),
  B02: v("B02", "Buchungshindernis klären", "K", 3),
  B03: v("B03", "Letzter Buchungsimpuls", "K", 3),
  T01: v("T01", "Terminbestätigung", "S", 0, "berater"),
  T02: v("T02", "Video 5 vor dem Gespräch", "M", 1),
  T03: v("T03", "Vorbereitung am Vortag", "S", 0, "berater"),
  T04: v("T04", "Letzter Terminreminder", "S", 0, "berater"),
  R01: v("R01", "Umbuchung bestätigt", "S", 0, "berater"),
  R02: v("R02", "Absage durch Interessenten", "S", 0, "berater"),
  R03: v("R03", "Ausfall durch Capital Circle", "S", 0, "berater"),
  N01: v("N01", "No-Show: neue Buchung verlangen", "K", 3, "berater"),
  N02: v("N02", "No-Show: Folge abschließen", "K", 3, "berater"),
  E01: v("E01", "Free-Zugang endet morgen", "M", 2),
  E02: v("E02", "Free-Zugang abgelaufen", "M", 4),
  E03: v("E03", "Verlängerung bestätigt", "S", 0),
  E04: v("E04", "Verlängerung endet morgen", "M", 2),
  E05: v("E05", "Verlängerung beendet mit Gesprächshinweis", "M", 4),
  W01: v("W01", "Einzige Kunden-Willkommensmail", "S", 0),
  U01: v("U01", "799-Euro-Käufer: Tag 14", "M", 5),
  U02: v("U02", "799-Euro-Käufer: Tag 30", "M", 5),
  V01: v("V01", "Regulärer Live-Zugang endet bald", "M", 2),
  V02: v("V02", "Regulärer Live-Zugang beendet", "M", 4),
  Q01: v("Q01", "Live-Abo bestätigt", "S", 0),
  Q02: v("Q02", "Live-Abo-Kündigung bestätigt", "S", 0),
  RT01: v("RT01", "Retargeting ehemalige Free-Kurs-Mitglieder", "M", 9),
  TP01: v("TP01", "Bitte um Trustpilot-Bewertung", "M", 9),
};

/** Verständliche Gründe für das Versandprotokoll im Admin. */
export const GRUND_LABEL: Record<string, string> = {
  zustellsperre: "Adresse gesperrt (Bounce/Beschwerde)",
  abgemeldet: "Werbe-Mails abbestellt",
  kauf: "Programm gekauft",
  bestand: "Bestandskonto (keine Start-/Lernfolge)",
  free_ende: "Free-Zugang beendet",
  anfrage: "Gesprächsanfrage gestellt",
  termin: "Termin gebucht oder Gespräch geführt",
  lernstart: "Training bereits gestartet",
  video3_fertig: "AMT-Lektion schon abgeschlossen",
  video4_fertig: "Video 4 schon abgeschlossen",
  video5_fertig: "Video 5 / Kurs abgeschlossen — L04 vorgezogen",
  kurs_fertig: "Kurs abgeschlossen",
  verlaengert: "Zugang bereits verlängert",
  verlaengerung: "Verlängerung angefragt oder gewährt",
  verpasst: "Zeitpunkt verpasst (nicht nachgeholt)",
  bereits_gesendet: "Schon verschickt",
  kuendigungsbestaetigung: "Ende schon in der Eingangsbestätigung (Kündigungsbutton)",
  zu_kurzfristig: "Zu kurzfristig gebucht (Abstand zur Bestätigung)",
  kein_video: "Video 5 nicht verfügbar",
  neu_gebucht: "Neuer Termin gebucht",
  zweiter_no_show: "Zweiter No-Show — persönlich klären",
  abgeschlossen: "Lead entschieden (gewonnen/verloren)",
  upgrade: "Upgrade auf Main/Premium",
  upgrade_anfrage: "Gesprächsanfrage nach dem Kauf",
  erstattet: "Kauf erstattet",
  live_abo: "Live-Abo gebucht",
};
