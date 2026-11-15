import { NextResponse } from "next/server";
import { ANRUF_ERGEBNISSE } from "@/config/crm";
import { CLOSER_AUSWAHL } from "@/config/mentoring";
import { pruefeErgebnis, speichereErgebnis, type ErgebnisEingabe } from "@/lib/crm/ergebnis";
import { requireCrm } from "@/lib/crm/zugang";
import { kontaktPauseAufheben, kontaktPauseSetzen } from "@/lib/mailsystem/pause";
import { setzeTerminStatus, type TerminAktion } from "@/lib/mailsystem/termine";
import { legeKassenlinkAn } from "@/lib/mentoring/kassenlink-anlage";
import { getAppUrl } from "@/lib/site-url";

export const runtime = "nodejs";

const TERMIN_AKTION_TEXT: Partial<Record<TerminAktion, string>> = {
  gefuehrt: "Gespräch geführt",
  no_show: "No-Show bestätigt",
  gebucht: "No-Show zurückgenommen",
  abgesagt_kunde: "Termin abgesagt (Kunde)",
  kein_interesse: "Termin abgesagt: kein Interesse",
  abgesagt_team: "Termin abgesagt (wir)",
};

/**
 * POST /api/crm/kontakte/[id]/aktion — alles, was ein Closer am Kontakt tut:
 *
 *   { art: "notiz", text }
 *   { art: "anruf", ergebnis, text? }          erreicht, nicht_erreicht, mailbox, rueckruf, termin_vereinbart
 *   { art: "whatsapp", text? }                 Nachricht geschickt (Link öffnet die Ansicht selbst)
 *   { art: "pause", aktiv, grund | naechsterSchritt }   persönliche Kontaktpause (stoppt Automatik)
 *   { art: "termin", terminId, aktion, ergebnis? }  geführt / no_show / abgesagt_kunde / kein_interesse / abgesagt_team / gebucht
 *                                              („geführt" mit Ergebnis-Maske: outcome, produkt, grund, notiz, followUpAm)
 *   { art: "ergebnis", terminId, ergebnis }    Ergebnis eines geführten Calls nachtragen/ändern (neue Version)
 *   { art: "kassenlink", produkt, raten, gueltig_tage? }  Kassenlink an diesen Kontakt
 *
 * Anruf/Notiz/WhatsApp heben „Neu" auf „Kontaktiert".
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { nutzer, service, error } = await requireCrm();
  if (error) return error;
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { data: k } = await service.from("crm_kontakte").select("id, email, name, phase, closer_id").eq("id", id).maybeSingle();
  if (!k) return NextResponse.json({ ok: false, error: "nicht_gefunden" }, { status: 404 });
  const kontakt = k as { id: string; email: string; name: string | null; phase: string; closer_id: string | null };
  const jetzt = new Date().toISOString();
  const text = (v: unknown, max = 4000) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
  const logge = (art: string, t: string | null, ergebnis: string | null = null, daten: Record<string, unknown> = {}) =>
    service.from("crm_aktivitaeten").insert({ kontakt_id: id, art, text: t, ergebnis, von: nutzer.user.id, daten });
  const kontaktiert = async () => {
    const u: Record<string, unknown> = { letzte_aktivitaet_am: jetzt, updated_at: jetzt };
    if (kontakt.phase === "neu") u.phase = "kontaktiert";
    // Wer zuerst anruft, übernimmt einen Kontakt aus dem Pool.
    if (!kontakt.closer_id && nutzer.team) u.closer_id = nutzer.team.user_id;
    await service.from("crm_kontakte").update(u).eq("id", id);
  };

  switch (body.art) {
    case "notiz": {
      const t = text(body.text);
      if (!t) return NextResponse.json({ ok: false, error: "text" }, { status: 400 });
      await logge("notiz", t);
      await service.from("crm_kontakte").update({ letzte_aktivitaet_am: jetzt, updated_at: jetzt }).eq("id", id);
      return NextResponse.json({ ok: true });
    }
    case "anruf": {
      const ergebnis = String(body.ergebnis ?? "");
      if (!ANRUF_ERGEBNISSE.some((e) => e.id === ergebnis)) return NextResponse.json({ ok: false, error: "ergebnis" }, { status: 400 });
      await logge("anruf", text(body.text), ergebnis);
      await kontaktiert();
      return NextResponse.json({ ok: true });
    }
    case "whatsapp": {
      await logge("whatsapp", text(body.text) ?? "WhatsApp-Nachricht");
      await kontaktiert();
      return NextResponse.json({ ok: true });
    }
    case "pause": {
      if (body.aktiv === true) {
        const grund = text(body.grund, 500);
        if (!grund) return NextResponse.json({ ok: false, error: "grund" }, { status: 400 });
        await kontaktPauseSetzen(service, { email: kontakt.email, userId: null, grund, von: nutzer.user.id });
        await logge("system", `Kontaktpause: ${grund}`);
      } else {
        const naechster = text(body.naechsterSchritt, 500);
        if (!naechster) return NextResponse.json({ ok: false, error: "naechster_schritt" }, { status: 400 });
        await kontaktPauseAufheben(service, { email: kontakt.email, naechsterSchritt: naechster, von: nutzer.user.id });
        await logge("system", `Kontaktpause aufgehoben. Nächster Schritt: ${naechster}`);
      }
      return NextResponse.json({ ok: true });
    }
    case "ergebnis": {
      // Ergebnis eines schon geführten Calls erfassen oder ändern (neue Version).
      const terminId = String(body.terminId ?? "");
      const { data: t } = await service.from("termine").select("id, email, status").eq("id", terminId).maybeSingle();
      const termin = t as { id: string; email: string; status: string } | null;
      if (!termin || termin.email !== kontakt.email) return NextResponse.json({ ok: false, error: "termin" }, { status: 404 });
      if (termin.status !== "gefuehrt") return NextResponse.json({ ok: false, error: "nicht_gefuehrt" }, { status: 409 });
      const e = pruefeErgebnis(body.ergebnis);
      if (!e.ok) return NextResponse.json({ ok: false, error: e.fehler }, { status: 400 });
      if (e.wert.outcome === "no_show") return NextResponse.json({ ok: false, error: "no_show_ueber_termin" }, { status: 400 });
      const r = await speichereErgebnis(service, { terminId, kontaktId: id, phaseVorher: kontakt.phase, eingabe: e.wert, von: nutzer.user.id });
      return r.ok ? NextResponse.json({ ok: true, neu: r.neu }) : NextResponse.json({ ok: false, error: r.fehler }, { status: 409 });
    }
    case "termin": {
      const terminId = String(body.terminId ?? "");
      let aktion = String(body.aktion ?? "") as TerminAktion;
      const { data: t } = await service.from("termine").select("id, email").eq("id", terminId).maybeSingle();
      if (!t || (t as { email: string }).email !== kontakt.email) return NextResponse.json({ ok: false, error: "termin" }, { status: 404 });
      /*
        „Geführt" kommt aus dem CRM mit der Ergebnis-Maske (Playbook 9.2): erst
        prüfen, dann Status setzen, dann Ergebnis speichern. Wählt der Closer in
        der Maske „Nicht erschienen", wird der Termin zum No-Show.
      */
      let ergebnis: ErgebnisEingabe | null = null;
      if (aktion === "gefuehrt" && body.ergebnis !== undefined) {
        const e = pruefeErgebnis(body.ergebnis);
        if (!e.ok) return NextResponse.json({ ok: false, error: e.fehler }, { status: 400 });
        if (e.wert.outcome === "no_show") aktion = "no_show";
        ergebnis = e.wert;
      }
      const r = await setzeTerminStatus(service, terminId, aktion, nutzer.user.id);
      if (!r.ok) return NextResponse.json({ ok: false, error: r.fehler }, { status: 409 });
      const phase = aktion === "gefuehrt" ? "gespraech" : aktion === "no_show" ? "no_show" : aktion === "kein_interesse" ? "verloren" : null;
      if (phase) {
        await service
          .from("crm_kontakte")
          .update({
            phase,
            phase_gesetzt_am: jetzt,
            updated_at: jetzt,
            letzte_aktivitaet_am: jetzt,
            ...(phase === "verloren" ? { verlust_grund: "kein_interesse", verloren_am: jetzt } : {}),
          })
          .eq("id", id)
          .not("phase", "eq", "gewonnen");
      }
      await logge("termin", TERMIN_AKTION_TEXT[aktion] ?? `Termin: ${aktion}`);
      if (ergebnis) {
        const s = await speichereErgebnis(service, { terminId, kontaktId: id, phaseVorher: kontakt.phase, eingabe: ergebnis, von: nutzer.user.id });
        if (!s.ok) return NextResponse.json({ ok: false, error: `ergebnis_${s.fehler}` }, { status: 409 });
      }
      return NextResponse.json({ ok: true });
    }
    case "kassenlink": {
      const kuerzel = nutzer.team?.kuerzel;
      const r = await legeKassenlinkAn(
        service,
        {
          produkt: body.produkt,
          raten: body.raten,
          email: kontakt.email,
          name: kontakt.name,
          closer: kuerzel && CLOSER_AUSWAHL.some((c) => c.id === kuerzel) ? kuerzel : null,
          gueltig_tage: body.gueltig_tage,
          notiz: `Aus dem CRM (${nutzer.team?.name ?? nutzer.user.email})`,
        },
        nutzer.user.id,
        getAppUrl(),
      );
      if (!r.ok) return NextResponse.json({ ok: false, error: r.fehler }, { status: r.status });
      await logge("kassenlink", `Kassenlink ${String(body.produkt)} · ${String(body.raten ?? 1)} Rate(n)`, null, { url: r.item.url });
      await service
        .from("crm_kontakte")
        .update({ phase: "angebot", phase_gesetzt_am: jetzt, updated_at: jetzt, letzte_aktivitaet_am: jetzt })
        .eq("id", id)
        .not("phase", "in", "(gewonnen)");
      return NextResponse.json({ ok: true, url: r.item.url });
    }
  }
  return NextResponse.json({ ok: false, error: "art" }, { status: 400 });
}
