import type { SupabaseClient } from "@supabase/supabase-js";
import { hatInhaltsZugang } from "@/lib/membership";
import { meldeTvEntzug } from "./meldung";
import { protokolliereTv, tabelleFehlt } from "./zugang";

export type TvAblaufErgebnis = {
  gelaufen: boolean;
  geprueft: number;
  /** aktiv → entzug_offen: das Team muss den Namen auf TradingView austragen. */
  zuEntziehen: number;
  /** angefragt → entzogen: nie freigeschaltet, es gibt nichts auszutragen. */
  verworfen: number;
  grund?: string;
  fehler: string[];
};

/**
 * Schritt des Nachtlaufs: Wer keinen Plattformzugang mehr hat, verliert auch
 * den TradingView-Indikator.
 *
 * Bewusst **eine** Stelle, die entzieht, und bewusst hier statt in jedem
 * Webhook: Kündigung, Zahlungsausfall, Widerruf und das Ende der
 * Whop-Übergangszeit laufen alle über `is_paid` — dieselbe Begründung wie im
 * Kopf von `lib/whop-umzug/ablauf.ts`. Der Schritt steht nach dem
 * Rollenabgleich, damit er auf dem Zustand der Nacht arbeitet.
 *
 * Er entzieht nichts selbst (TradingView hat keine API dafür), sondern setzt
 * `entzug_offen` und schickt dem Team eine Sammelmeldung. Ein falsch gesetztes
 * `is_paid` richtet so keinen Schaden an, den nicht vorher ein Mensch sieht.
 *
 * `schreiben = false` ist die Probe: zählen, nichts ändern, nichts melden.
 * Wirft nie; ohne Migration 105 meldet er `gelaufen: false`.
 */
export async function markiereTvEntzuege(supabase: SupabaseClient, schreiben: boolean): Promise<TvAblaufErgebnis> {
  const ergebnis: TvAblaufErgebnis = { gelaufen: false, geprueft: 0, zuEntziehen: 0, verworfen: 0, fehler: [] };
  try {
    const { data, error } = await supabase
      .from("tradingview_zugaenge")
      .select("user_id,tv_benutzername,status")
      .in("status", ["aktiv", "angefragt"]);
    if (error) {
      if (tabelleFehlt(error)) return { ...ergebnis, grund: "Migration 105 (tradingview_zugaenge) fehlt." };
      return { ...ergebnis, fehler: [error.message] };
    }

    const zeilen = (data ?? []) as { user_id: string; tv_benutzername: string; status: "aktiv" | "angefragt" }[];
    ergebnis.gelaufen = true;
    ergebnis.geprueft = zeilen.length;
    if (zeilen.length === 0) return ergebnis;

    const { data: profile, error: profilFehler } = await supabase
      .from("profiles")
      .select("id,is_paid,is_admin,full_name,username")
      .in(
        "id",
        zeilen.map((z) => z.user_id),
      );
    if (profilFehler) return { ...ergebnis, gelaufen: false, fehler: [profilFehler.message] };

    const profilVon = new Map(
      ((profile ?? []) as { id: string; is_paid: boolean | null; is_admin: boolean | null; full_name: string | null; username: string | null }[]).map(
        (p) => [p.id, p],
      ),
    );
    /*
      Ohne Profilzeile keine Entscheidung: Ein fehlendes Profil ist eher ein
      Lesefehler als ein Mitglied ohne Zugang.
    */
    const ohneZugang = zeilen.filter((z) => {
      const p = profilVon.get(z.user_id);
      return p && !hatInhaltsZugang(p);
    });

    const entziehen = ohneZugang.filter((z) => z.status === "aktiv");
    const verwerfen = ohneZugang.filter((z) => z.status === "angefragt");
    ergebnis.zuEntziehen = entziehen.length;
    ergebnis.verworfen = verwerfen.length;
    if (!schreiben || ohneZugang.length === 0) return ergebnis;

    const jetzt = new Date().toISOString();
    const gemeldet: { name: string; email: string | null; tvName: string }[] = [];

    for (const z of entziehen) {
      const { data: geaendert, error: e } = await supabase
        .from("tradingview_zugaenge")
        .update({ status: "entzug_offen", entzug_angefordert_am: jetzt, updated_at: jetzt })
        .eq("user_id", z.user_id)
        .eq("status", "aktiv")
        .select("user_id")
        .maybeSingle();
      if (e) {
        ergebnis.fehler.push(`${z.user_id}: ${e.message}`);
        continue;
      }
      if (!geaendert) continue;
      await protokolliereTv(supabase, { userId: z.user_id, adminId: null, aktion: "tradingview_entzug_offen", alt: "aktiv", neu: "entzug_offen" });
      const p = profilVon.get(z.user_id);
      let email: string | null = null;
      try {
        const { data: u } = await supabase.auth.admin.getUserById(z.user_id);
        email = u.user?.email ?? null;
      } catch {
        // ohne Adresse melden
      }
      gemeldet.push({ name: (p?.full_name || p?.username || "").trim() || "Ohne Namen", email, tvName: z.tv_benutzername });
    }

    for (const z of verwerfen) {
      const { error: e } = await supabase
        .from("tradingview_zugaenge")
        .update({ status: "entzogen", entzogen_am: jetzt, updated_at: jetzt })
        .eq("user_id", z.user_id)
        .eq("status", "angefragt");
      if (e) ergebnis.fehler.push(`${z.user_id}: ${e.message}`);
      else await protokolliereTv(supabase, { userId: z.user_id, adminId: null, aktion: "tradingview_anfrage_verworfen", alt: "angefragt", neu: "entzogen" });
    }

    if (gemeldet.length > 0) await meldeTvEntzug(gemeldet);
    return ergebnis;
  } catch (err) {
    return { ...ergebnis, fehler: [...ergebnis.fehler, err instanceof Error ? err.message : String(err)] };
  }
}
