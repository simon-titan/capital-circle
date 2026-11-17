import { NextResponse } from "next/server";
import { cronBefugt } from "@/lib/cron/auth";
import { abmeldeUrl } from "@/lib/email/abmeldung";
import { kundeMail, type KundeMailId } from "@/lib/email/templates/playbook/kunde";
import { entscheideKunde, type KundeZustand } from "@/lib/mailsystem/kunde-entscheidung";
import { offenePausen } from "@/lib/mailsystem/pause";
import { letzteMarketingSendungen, normEmail, protokolliere, sendeVorlage } from "@/lib/mailsystem/versand";
import type { VorlageId } from "@/lib/mailsystem/vorlagen";
import { getAppUrl } from "@/lib/site-url";
import { createServiceClient } from "@/lib/supabase/service";
import { ladeAuthInfos } from "@/lib/training/board";
import { vornameAus } from "@/lib/training/zugang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Cron (stündlich): Kundenmails des E-Mail-Playbooks 1.0.
 *
 *   U01/U02  Ausbildung (799 €) gekauft, Tag 14 / 30 ab Freischaltung — nicht für Main/Premium
 *   V01/V02  enthaltener Live-Zugang (`profiles.live_bis`, Stufe mentoring) endet in 3 Tagen / ist beendet
 *
 * Entscheidung in `entscheideKunde` mit frischen Daten, Protokoll in
 * `mail_versand`. `?probe=1` entscheidet nur. Auth: Bearer $CRON_SECRET.
 */
const TAG_MS = 86_400_000;

type Kauf = { id: string; user_id: string | null; produkt: string; status: string; gekauft_am: string; email: string | null };

export async function GET(request: Request) {
  if (!cronBefugt(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const probe = new URL(request.url).searchParams.get("probe") === "1";
  const jetzt = new Date();
  const service = createServiceClient();

  const [{ data: kRoh, error }, { data: liveProfile }] = await Promise.all([
    service
      .from("mentoring_kauf")
      .select("id, user_id, produkt, status, gekauft_am, email")
      .gte("gekauft_am", new Date(jetzt.getTime() - 400 * TAG_MS).toISOString())
      .order("gekauft_am", { ascending: false })
      .limit(5000),
    // Live-Zugang endet bald oder endete gerade (V01 −3 Tage, V02 am Ende, 24 h Verzug).
    service
      .from("profiles")
      .select("id, full_name, live_bis, membership_tier, unsubscribed_at")
      .eq("membership_tier", "mentoring")
      .gte("live_bis", new Date(jetzt.getTime() - 2 * TAG_MS).toISOString())
      .lte("live_bis", new Date(jetzt.getTime() + 4 * TAG_MS).toISOString())
      .limit(2000),
  ]);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const kaeufe = (kRoh ?? []) as Kauf[];

  // Kandidaten: Ausbildungskäufe der letzten 32 Tage, Konten mit endendem Live-Zugang.
  const ausbildung = kaeufe.filter(
    (k) => k.produkt === "ausbildung" && k.user_id && jetzt.getTime() - new Date(k.gekauft_am).getTime() < 32 * TAG_MS,
  );
  const ids = [...new Set([...ausbildung.map((k) => k.user_id!), ...((liveProfile ?? []) as { id: string }[]).map((p) => p.id)])];
  if (!ids.length) return NextResponse.json({ ok: true, kontakte: 0, gesendet: 0 });

  const [auth, { data: profile, error: pFehler }, { data: tLeads, error: lFehler }, { data: protokoll, error: vFehler }] = await Promise.all([
    ladeAuthInfos(service, new Set(ids)),
    service.from("profiles").select("id, full_name, live_bis, membership_tier, unsubscribed_at").in("id", ids),
    service.from("training_leads").select("user_id, fragen_am").in("user_id", ids).not("fragen_am", "is", null),
    service.from("mail_versand").select("user_id, vorlage, bezug, status").in("user_id", ids).in("vorlage", ["U01", "U02", "V01", "V02"]),
  ]);
  if (pFehler || lFehler || vFehler) {
    // Ohne Abmeldungen/Anfragen/Protokoll lieber gar nicht senden als falsch.
    return NextResponse.json({ ok: false, error: (pFehler ?? lFehler ?? vFehler)!.message }, { status: 500 });
  }
  const emails = [...new Set(ids.map((id) => auth.get(id)?.email).filter((e): e is string => Boolean(e)).map(normEmail))];
  const [pausen, letzte, { data: sperren }, { data: termine, error: tFehler }, { data: dLeads, error: dFehler }] = await Promise.all([
    offenePausen(service, emails),
    letzteMarketingSendungen(service, emails),
    service.from("mail_sperre").select("email").in("email", emails),
    service.from("termine").select("email, created_at").in("email", emails),
    service.from("discord_leads").select("email, questions_completed_at").in("email", emails).not("questions_completed_at", "is", null),
  ]);
  if (tFehler || dFehler) return NextResponse.json({ ok: false, error: (tFehler ?? dFehler)!.message }, { status: 500 });
  const gesperrt = new Set(((sperren ?? []) as { email: string }[]).map((s) => s.email));
  const profilJe = new Map(((profile ?? []) as { id: string }[]).map((p) => [p.id, p as Record<string, unknown>]));
  const anfragenJe = new Map<string, Date[]>();
  const merkeAnfrage = (key: string, wann: string | null) => {
    if (!wann) return;
    anfragenJe.set(key, [...(anfragenJe.get(key) ?? []), new Date(wann)]);
  };
  for (const l of (tLeads ?? []) as { user_id: string; fragen_am: string }[]) merkeAnfrage(l.user_id, l.fragen_am);
  for (const t of (termine ?? []) as { email: string; created_at: string }[]) merkeAnfrage(normEmail(t.email), t.created_at);
  for (const l of (dLeads ?? []) as { email: string; questions_completed_at: string }[]) merkeAnfrage(normEmail(l.email), l.questions_completed_at);

  const appUrl = getAppUrl();
  const statistik = { kontakte: ids.length, gesendet: 0, protokolliert: 0, fehler: 0, entscheidungen: [] as string[] };

  for (const userId of ids) {
    const info = auth.get(userId);
    if (!info?.email) continue;
    const email = normEmail(info.email);
    const p = profilJe.get(userId) ?? {};
    const eigene = kaeufe.filter((k) => k.user_id === userId);
    const dauerzugang = p.membership_tier === "lifetime" || p.membership_tier === "ht_1on1";
    const kauf = dauerzugang
      ? undefined
      : ausbildung
          .filter((k) => k.user_id === userId && k.status !== "beendet")
          .sort((a, b) => b.gekauft_am.localeCompare(a.gekauft_am))[0];
    const liveBis = p.membership_tier === "mentoring" && p.live_bis ? new Date(p.live_bis as string) : null;
    const liveBezug = liveBis ? `live:${userId}:${liveBis.toISOString().slice(0, 10)}` : "";
    const kaufBezug = kauf ? `kauf:${kauf.id}` : "";
    const prot = (bezug: string) => {
      const m: Partial<Record<VorlageId, { status: string }>> = {};
      for (const z of (protokoll ?? []) as { user_id: string; vorlage: VorlageId; bezug: string; status: string }[])
        if (z.user_id === userId && z.bezug === bezug) m[z.vorlage] = { status: z.status };
      return m;
    };
    const anfragen = [...(anfragenJe.get(userId) ?? []), ...(anfragenJe.get(email) ?? [])];

    const zustand: KundeZustand = {
      jetzt,
      gesperrt: gesperrt.has(email),
      abgemeldet: Boolean(p.unsubscribed_at),
      pause: pausen.has(email),
      letzteMarketingAm: letzte.get(email) ?? null,
      ausbildung: kauf
        ? {
            freigeschaltetAm: new Date(kauf.gekauft_am),
            beendet:
              kauf.status === "erstattet"
                ? "erstattet"
                : eigene.some((k) => (k.produkt === "main" || k.produkt === "premium") && k.status !== "erstattet")
                  ? "upgrade"
                  : null,
            upgradeAnfrage: anfragen.some((d) => d.getTime() > new Date(kauf.gekauft_am).getTime()),
            protokoll: prot(kaufBezug),
          }
        : null,
      live: liveBis
        ? {
            endeAm: liveBis,
            // Jedes Live-Abo, auch ein beendetes: Dann stammt `live_bis` aus dem Abo, nicht aus dem Programm.
            aboGebucht: eigene.some((k) => k.produkt === "live"),
            erstattet: false,
            protokoll: prot(liveBezug),
          }
        : null,
    };

    const r = entscheideKunde(zustand);
    const bezugFuer = (v: VorlageId) => (r.bezugVon[v] === "live" ? liveBezug : kaufBezug);
    if (probe) {
      if (r.senden || r.protokoll.length)
        statistik.entscheidungen.push(`${email}: ${r.senden?.vorlage ?? "—"} ${r.protokoll.map((x) => `${x.vorlage}=${x.grund}`).join(", ")}`);
      continue;
    }
    if (r.protokoll.length) {
      await protokolliere(service, r.protokoll.map((x) => ({ ...x, bezug: bezugFuer(x.vorlage), email, userId })));
      statistik.protokolliert += r.protokoll.length;
    }
    if (!r.senden) continue;
    const id = r.senden.vorlage as KundeMailId;
    try {
      const mail = kundeMail(id, {
        vorname: vornameAus(p.full_name as string | null),
        gespraechUrl: `${appUrl}/programme?gespraech=1`,
        liveAboUrl: `${appUrl}/live-abo`,
        accountUrl: `${appUrl}/einstellungen`,
        endeAm: liveBis,
        unsubscribeUrl: abmeldeUrl({ userId, email }),
      });
      const s = await sendeVorlage(service, {
        vorlage: id,
        bezug: bezugFuer(id),
        email,
        userId,
        betreff: mail.betreff,
        jsx: mail.jsx,
        faelligAm: r.senden.faelligAm,
      });
      if (s === "gesendet") statistik.gesendet++;
    } catch (err) {
      statistik.fehler++;
      console.error(`[cron/mail-kunden] ${id} an ${email}:`, err);
    }
  }

  return NextResponse.json({ ok: true, probe, ...statistik });
}
