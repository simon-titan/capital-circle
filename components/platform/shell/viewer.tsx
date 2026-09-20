"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { berechneUmzugStand, type UmzugStand } from "@/lib/whop-umzug/stand";

/**
 * Wer da gerade guckt: einmal geladen, von der ganzen Schale gelesen.
 *
 * ── Warum das hier liegt und nicht in der Sidebar ───────────────────────────
 *
 * Bis zum 20.09.2026 fragte die Sidebar das Profil für sich allein ab, um zu
 * wissen, welche Navigationspunkte ein Schloss tragen. Seitdem braucht auch
 * das Hinweisband über dem Inhalt einen Profilwert, und die Dashboard-Karte
 * denselben. Drei Komponenten mit drei eigenen Abfragen wären drei Abfragen
 * pro Seitenaufruf für jedes Mitglied — und sie könnten sich obendrein
 * widersprechen, wenn eine davon älter ist als die andere.
 *
 * Also eine Abfrage an einer Stelle, deren Ergebnis alle drei lesen. Die
 * Spalten des Umzugs hängen dabei an der Abfrage, die es ohnehin gab: Für
 * niemanden entsteht dadurch ein zusätzlicher Zugriff.
 *
 * ── Die zweite Abfrage ──────────────────────────────────────────────────────
 *
 * Genau eine Ausnahme: Steht `whop_umzug_am`, wird zusätzlich der Status des
 * jüngsten Abos geholt. Das betrifft die 29 Konten aus dem Umzug und sonst
 * niemanden. Nötig ist sie, weil `membership_tier` allein einen Fall offen
 * lässt: Der Stripe-Webhook schreibt zuerst die Abo-Zeile und danach das
 * Profil. Zwischen beiden Schritten stünde das Band noch einmal vor jemandem,
 * der gerade bezahlt hat. Dieselbe doppelte Prüfung macht der Nachtlauf
 * (`lib/whop-umzug/ablauf.ts`), aus demselben Grund.
 */

export type Viewer = {
  isPaid: boolean;
  isPending: boolean;
  /** Free-Mitglied mit freigeschalteter Bewerbung, Step 2 noch offen. */
  showApplyCta: boolean;
  /** Stand aus dem Whop-Umzug; `null` heisst „nichts anzuzeigen". */
  umzug: UmzugStand | null;
};

/*
  Standard „bezahlt": gesperrte Punkte erscheinen erst, wenn das Profil sicher
  Free meldet — zahlende Mitglieder sehen so nie kurz Schlösser aufblitzen.
  `umzug: null` aus demselben Grund in die andere Richtung: Ein Hinweis, dass
  der Zugang endet, darf nicht aufblitzen und wieder verschwinden.
*/
const DEFAULT_VIEWER: Viewer = { isPaid: true, isPending: false, showApplyCta: false, umzug: null };

const ViewerContext = createContext<Viewer>(DEFAULT_VIEWER);

export function useViewer(): Viewer {
  return useContext(ViewerContext);
}

const SPALTEN_BASIS = "is_paid, application_status, step2_application_status, membership_tier";
const SPALTEN_MIT_UMZUG = `${SPALTEN_BASIS}, access_until, whop_umzug_am`;

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [viewer, setViewer] = useState<Viewer>(DEFAULT_VIEWER);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        /*
          Fehlt Migration 100, kennt PostgREST `whop_umzug_am` nicht und die
          ganze Abfrage scheitert — mitsamt der Auskunft, ob jemand zahlt.
          Die Navigation stünde dann für Free-Mitglieder offen. Deshalb ein
          zweiter Versuch ohne die Umzugsspalten; er kostet nur dort etwas, wo
          ohnehin schon etwas kaputt ist.
        */
        let profile: Record<string, unknown> | null = null;
        const ersteWahl = await supabase
          .from("profiles")
          .select(SPALTEN_MIT_UMZUG)
          .eq("id", user.id)
          .maybeSingle();
        if (ersteWahl.error) {
          const rueckfall = await supabase
            .from("profiles")
            .select(SPALTEN_BASIS)
            .eq("id", user.id)
            .maybeSingle();
          profile = (rueckfall.data as Record<string, unknown> | null) ?? null;
        } else {
          profile = (ersteWahl.data as Record<string, unknown> | null) ?? null;
        }
        if (!profile || cancelled) return;

        const isPaid = Boolean(profile.is_paid);
        const whopUmzugAm = (profile.whop_umzug_am as string | null) ?? null;

        // Nur für die 29 aus dem Umzug, für alle anderen entfällt sie.
        let aboStatus: string | null = null;
        if (whopUmzugAm) {
          const { data: abo } = await supabase
            .from("subscriptions")
            .select("status")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          aboStatus = (abo as { status?: string | null } | null)?.status ?? null;
        }
        if (cancelled) return;

        setViewer({
          isPaid,
          // Zahlende sperrt eine offene Bewerbung nicht (Regel wie in `proxy.ts`) —
          // sonst stünde ein Käufer mit Altbewerbung vor einer komplett gesperrten Navigation.
          isPending: !isPaid && profile.application_status === "pending",
          showApplyCta:
            !isPaid && profile.application_status === "approved" && profile.step2_application_status == null,
          umzug: berechneUmzugStand({
            whopUmzugAm,
            accessUntil: (profile.access_until as string | null) ?? null,
            isPaid,
            membershipTier: (profile.membership_tier as string | null) ?? null,
            aboStatus,
          }),
        });
      } catch {
        // Schale bleibt im Standardzustand.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>;
}
