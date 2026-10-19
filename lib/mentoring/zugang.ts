import { hatInhaltsZugang } from "@/lib/membership";

/**
 * Live-Bereich (Live-Sessions und Analysen) für die Mentoring-Programme.
 *
 * Wer ein Programm kauft (`config/mentoring.ts`), behält Plattform, Kurse und
 * Journal dauerhaft; Live Trading, Daily Bias und Trade Recaps laufen 3 bzw.
 * 12 Monate (`profiles.live_bis`). Danach öffnet das Live-Trading-Abo
 * (99 €/Monat) sie wieder, indem es `live_bis` mit jeder bezahlten Periode
 * weiterschiebt.
 *
 * **Nur die Stufe `mentoring` ist befristet.** Abo-, Lifetime- und
 * 1:1-Mitglieder haben den Live-Bereich als Teil ihrer Mitgliedschaft und
 * sehen ihn wie bisher, solange `hatInhaltsZugang` gilt.
 *
 * Dieselbe Regel steht in der Datenbank als `public.hat_live_zugang()`
 * (Migration 108) und schützt dort `analysis_posts` und `live_session_videos`.
 * Wer eine der beiden Fassungen ändert, ändert die andere mit — sonst zeigt die
 * Seite eine Aufzeichnung, deren Videos die Datenbank nicht ausliefert.
 */

export interface LiveProfil {
  membership_tier?: string | null;
  is_paid?: boolean | null;
  is_admin?: boolean | null;
  live_bis?: string | null;
}

export function hatLiveZugang(profil: LiveProfil | null | undefined, jetzt: Date = new Date()): boolean {
  if (!profil) return false;
  if (profil.is_admin) return true;
  if (!hatInhaltsZugang(profil)) return false;
  if (profil.membership_tier !== "mentoring") return true;
  return liveBisInZukunft(profil.live_bis, jetzt);
}

/**
 * Ein Mentoring-Konto, dessen Live-Zeitraum abgelaufen ist — genau die Leute,
 * denen die Live-Seiten statt der Inhalte das Anschlussangebot zeigen.
 * Gesperrte Konten (geplatzte Rate) gehören nicht dazu: Denen fehlt nicht der
 * Live-Zugang, sondern eine Zahlung.
 */
export function liveZugangAbgelaufen(profil: LiveProfil | null | undefined, jetzt: Date = new Date()): boolean {
  if (!profil || profil.is_admin) return false;
  if (profil.membership_tier !== "mentoring" || !profil.is_paid) return false;
  return !liveBisInZukunft(profil.live_bis, jetzt);
}

function liveBisInZukunft(liveBis: string | null | undefined, jetzt: Date): boolean {
  if (!liveBis) return false;
  const ende = new Date(liveBis).getTime();
  return !Number.isNaN(ende) && ende > jetzt.getTime();
}

/** Das spätere von zwei Daten (ISO), `null` zählt als „keins". */
export function spaeteresDatum(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

/**
 * `monate` Kalendermonate nach `ab`, am selben Tag; fehlt der Tag im
 * Zielmonat (31. → Februar), gilt der letzte des Monats. Stripe rechnet
 * Monatsperioden genauso.
 */
export function plusMonate(ab: Date, monate: number): Date {
  const ziel = new Date(ab.getTime());
  const tag = ziel.getUTCDate();
  ziel.setUTCDate(1);
  ziel.setUTCMonth(ziel.getUTCMonth() + monate);
  const letzterTag = new Date(Date.UTC(ziel.getUTCFullYear(), ziel.getUTCMonth() + 1, 0)).getUTCDate();
  ziel.setUTCDate(Math.min(tag, letzterTag));
  return ziel;
}
