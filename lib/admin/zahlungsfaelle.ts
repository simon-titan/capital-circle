import { nachrichtAufschub, rueckweg } from "@/config/zahlung";
import { synchronisiereRollen } from "@/lib/discord/mitgliedschaft";
import { resolvePlanFromPriceId } from "@/lib/stripe/plan-map";
import { getAppUrl } from "@/lib/site-url";
import { createServiceClient } from "@/lib/supabase/service";
import type { ZahlungsfallStatus } from "@/lib/zahlung/aufschub";
import { datumVon, euroVon, paketName, schreibeVerlauf, sendeFallNachricht } from "@/lib/zahlung/fall";

/**
 * Zahlungsfälle im Adminbereich: lesen, antworten, stunden, schliessen.
 *
 * Übernommen aus MoonTrading (`lib/admin/zahlungsfaelle.ts`). Ersetzt die
 * Liste „Zahlungsstörungen" (Profile mit Mahn-Stempeln und einer Notizspalte):
 * Jetzt ist jede gescheiterte Rechnung ein Fall mit Verlauf, und der Kunde
 * kann über den Knopf in Discord antworten.
 *
 * ── Warum kein Support-Ticket ───────────────────────────────────────────────
 *
 * Ein Ticket eröffnet der Kunde, weil er etwas will. Einen Zahlungsfall
 * eröffnet Stripe, weil wir etwas wollen, und er trägt Betrag, Rechnung und
 * Frist. Beides in einem Postfach hiesse, dass die Antwortzeit der Tickets
 * künftig Mahnungen mitmisst.
 *
 * ── Die eine Handlung, die etwas kostet ─────────────────────────────────────
 *
 * `gewaehreAufschub`: Sie hält einen Zugang aufrecht, für den kein Geld
 * geflossen ist. Alles andere hier ist Lesen und Schreiben von Text. Die
 * Rechte prüft die Route (`app/api/admin/zahlungen`), nicht diese Datei.
 */

export interface ZahlungsfallZeile {
  id: string;
  userId: string;
  email: string | null;
  name: string | null;
  tier: string | null;
  /** Zugang laut Profil, als Datum. Die Schranke in Capital Circle. */
  accessUntil: string | null;
  /** Ohne Verknüpfung erreicht ihn keine Direktnachricht, nur die Mail. */
  discordVerknuepft: boolean;
  betragCents: number;
  versuche: number;
  status: ZahlungsfallStatus;
  aufschubBis: string | null;
  aufschubGrund: string | null;
  frist: string | null;
  erinnerungen: number;
  paket: string | null;
  zahlungUrl: string | null;
  stripeInvoiceId: string;
  eroeffnetAm: string;
  letzteNachrichtAm: string | null;
  geschlossenAm: string | null;
  geschlossenGrund: string | null;
  /** Wartet der Kunde auf uns? Die eine Frage an eine Arbeitsliste. */
  letzteVonKunde: boolean;
  /** Aufschub abgelaufen, Fall noch nicht vom Nachtlauf beendet. */
  ueberfaellig: boolean;
  /** Probefall aus `npm run zahlung:probe`. */
  probe: boolean;
}

export interface ZahlungsfallNachricht {
  id: string;
  vonAdmin: boolean;
  autorName: string | null;
  text: string;
  kanal: "discord" | "mail" | "notiz" | "system";
  zugestellt: boolean | null;
  mailGesendet: boolean | null;
  erstelltAm: string;
}

export interface ZahlungsfallStand {
  faelle: ZahlungsfallZeile[];
  /** Fehlt die Tabelle, ist Migration 080 nicht eingespielt. */
  fehlt: boolean;
  fehler: string | null;
}

function tabelleFehlt(code: string | undefined): boolean {
  return code === "PGRST205" || code === "42P01";
}

/** Leerer Text ist kein Wert — sonst rendert die Liste einen Link ohne Beschriftung. */
function textOderNull(wert: string | null | undefined): string | null {
  const t = (wert ?? "").trim();
  return t.length > 0 ? t : null;
}

interface RohFall {
  id: string;
  user_id: string;
  stripe_invoice_id: string;
  betrag_cents: number;
  versuche: number;
  status: ZahlungsfallStatus;
  aufschub_bis: string | null;
  aufschub_grund: string | null;
  frist: string | null;
  erinnerungen: number | null;
  paket: string | null;
  zahlung_url: string | null;
  eroeffnet_am: string;
  letzte_nachricht_am: string | null;
  geschlossen_am: string | null;
  geschlossen_grund: string | null;
}

/**
 * Alle Fälle, offene zuerst. Geschlossene bleiben stehen: Wer wann wem
 * gestundet hat, ist die eigentliche Auskunft dieser Liste.
 */
export async function ladeZahlungsfaelle(nurId?: string): Promise<ZahlungsfallStand> {
  const supabase = createServiceClient();

  let abfrage = supabase
    .from("zahlungsfall")
    .select(
      "id,user_id,stripe_invoice_id,betrag_cents,versuche,status,aufschub_bis,aufschub_grund,frist,erinnerungen,paket,zahlung_url,eroeffnet_am,letzte_nachricht_am,geschlossen_am,geschlossen_grund",
    )
    .order("geschlossen_am", { ascending: true, nullsFirst: true })
    .order("eroeffnet_am", { ascending: false })
    .limit(500);
  if (nurId) abfrage = abfrage.eq("id", nurId);

  const { data, error } = await abfrage;
  if (error) {
    return { faelle: [], fehlt: tabelleFehlt(error.code), fehler: tabelleFehlt(error.code) ? null : error.message };
  }

  const roh = (data ?? []) as RohFall[];
  if (roh.length === 0) return { faelle: [], fehlt: false, fehler: null };

  const ids = [...new Set(roh.map((r) => r.user_id))];

  const [profileRes, verbindungRes, nachrichtenRes] = await Promise.all([
    supabase.from("profiles").select("id,full_name,username,membership_tier,access_until,discord_id").in("id", ids),
    supabase.from("discord_connections").select("user_id").in("user_id", ids),
    supabase
      .from("zahlungsfall_nachricht")
      .select("fall_id,von_admin,kanal,erstellt_am")
      .in(
        "fall_id",
        roh.map((r) => r.id),
      )
      .order("erstellt_am", { ascending: true }),
  ]);

  const profil = new Map(
    (
      (profileRes.data ?? []) as Array<{
        id: string;
        full_name: string | null;
        username: string | null;
        membership_tier: string | null;
        access_until: string | null;
        discord_id: string | null;
      }>
    ).map((p) => [p.id, p]),
  );
  const verknuepft = new Set(((verbindungRes.data ?? []) as Array<{ user_id: string }>).map((v) => v.user_id));

  // Adressen aus `auth.users` — `profiles` hat keine E-Mail-Spalte.
  const emails = new Map<string, string | null>();
  await Promise.all(
    ids.map(async (id) => {
      const { data: nutzer } = await supabase.auth.admin.getUserById(id);
      emails.set(id, nutzer?.user?.email ?? null);
    }),
  );

  /*
    Die letzte **echte** Nachricht je Fall: Eine Systemzeile oder Notiz ist
    keine Antwort an den Kunden und darf „wer ist dran" nicht beantworten.
  */
  const letzte = new Map<string, boolean>();
  for (const n of (nachrichtenRes.data ?? []) as Array<{ fall_id: string; von_admin: boolean; kanal: string }>) {
    if (n.kanal === "system" || n.kanal === "notiz") continue;
    letzte.set(n.fall_id, !n.von_admin);
  }

  // Zeitabhängiges hier und nicht im Render-Körper (react-hooks/purity).
  const jetzt = Date.now();

  const faelle = roh.map((r) => {
    const p = profil.get(r.user_id);
    return {
      id: r.id,
      userId: r.user_id,
      email: textOderNull(emails.get(r.user_id)),
      name: textOderNull(p?.full_name) ?? textOderNull(p?.username),
      tier: textOderNull(p?.membership_tier),
      accessUntil: p?.access_until ?? null,
      discordVerknuepft: Boolean(p?.discord_id) || verknuepft.has(r.user_id),
      betragCents: r.betrag_cents,
      versuche: r.versuche,
      status: r.status,
      aufschubBis: r.aufschub_bis,
      aufschubGrund: r.aufschub_grund,
      frist: r.frist,
      erinnerungen: r.erinnerungen ?? 0,
      paket: r.paket,
      zahlungUrl: r.zahlung_url,
      stripeInvoiceId: r.stripe_invoice_id,
      eroeffnetAm: r.eroeffnet_am,
      letzteNachrichtAm: r.letzte_nachricht_am,
      geschlossenAm: r.geschlossen_am,
      geschlossenGrund: r.geschlossen_grund,
      letzteVonKunde: letzte.get(r.id) ?? false,
      ueberfaellig: Boolean(r.status === "aufschub" && r.aufschub_bis && new Date(r.aufschub_bis).getTime() < jetzt),
      probe: r.stripe_invoice_id.startsWith("probe_"),
    };
  });

  return { faelle, fehlt: false, fehler: null };
}

/** Vorgabe im Datumsfeld: zwei Wochen. Lang genug für ein Gehalt, kurz genug zum Nachhalten. */
export const VORSCHLAG_TAGE = 14;

/**
 * Wie weit ein Aufschub höchstens reichen darf. Ein Aufschub über ein
 * Vierteljahr ist kein Aufschub mehr, sondern ein Freizugang.
 */
export const AUFSCHUB_MAX_TAGE = 90;

/** Höchstlänge einer Antwort. Discord nimmt in einer Nachricht 2000 Zeichen. */
export const GRENZE_ANTWORT = 1800;

export async function ladeZahlungsfall(id: string): Promise<{
  fall: ZahlungsfallZeile;
  nachrichten: ZahlungsfallNachricht[];
  /** Vorgeschlagenes Datum und Grenzen fürs Datumsfeld, serverseitig gerechnet. */
  vorschlagBis: string;
  heute: string;
  spaetestens: string;
} | null> {
  const stand = await ladeZahlungsfaelle(id);
  const fall = stand.faelle[0];
  if (!fall) return null;

  const jetzt = Date.now();
  const vorschlagBis = new Date(jetzt + VORSCHLAG_TAGE * 86400000).toISOString().slice(0, 10);
  const heute = new Date(jetzt + 86400000).toISOString().slice(0, 10);
  const spaetestens = new Date(jetzt + AUFSCHUB_MAX_TAGE * 86400000).toISOString().slice(0, 10);

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("zahlungsfall_nachricht")
    .select("id,von_admin,autor_id,text,kanal,zugestellt,mail_gesendet,erstellt_am")
    .eq("fall_id", id)
    .order("erstellt_am", { ascending: true });

  if (error) {
    console.error("[admin] Verlauf nicht ladbar:", error.message);
    return { fall, nachrichten: [], vorschlagBis, heute, spaetestens };
  }

  const roh = (data ?? []) as Array<{
    id: string;
    von_admin: boolean;
    autor_id: string | null;
    text: string;
    kanal: ZahlungsfallNachricht["kanal"];
    zugestellt: boolean | null;
    mail_gesendet: boolean | null;
    erstellt_am: string;
  }>;

  const autorIds = [...new Set(roh.filter((n) => n.von_admin && n.autor_id).map((n) => n.autor_id as string))];
  const autoren = new Map<string, string | null>();
  if (autorIds.length > 0) {
    const { data: profile } = await supabase.from("profiles").select("id,full_name,username").in("id", autorIds);
    for (const p of (profile ?? []) as Array<{ id: string; full_name: string | null; username: string | null }>) {
      autoren.set(p.id, textOderNull(p.full_name) ?? textOderNull(p.username));
    }
  }

  return {
    fall,
    vorschlagBis,
    heute,
    spaetestens,
    nachrichten: roh.map((n) => ({
      id: n.id,
      vonAdmin: n.von_admin,
      autorName: n.von_admin && n.autor_id ? (autoren.get(n.autor_id) ?? null) : null,
      text: n.text,
      kanal: n.kanal,
      zugestellt: n.zugestellt,
      mailGesendet: n.mail_gesendet,
      erstelltAm: n.erstellt_am,
    })),
  };
}

export interface FallErgebnis {
  ok: boolean;
  fehler?: string;
  hinweise: string[];
}

/**
 * Dem Kunden antworten: als Direktnachricht (mit Antworten-Knopf) **und** als
 * Mail. Oder als interne Notiz, die nie rausgeht — in einer Notiz steht im
 * Zweifel „hat schon zweimal storniert", und dafür braucht es einen Ort, der
 * nicht versehentlich beim Kunden landet.
 */
export async function antworteKunde(params: {
  fallId: string;
  adminId: string;
  text: string;
  alsNotiz: boolean;
  perMail: boolean;
}): Promise<FallErgebnis> {
  const text = params.text.trim().slice(0, GRENZE_ANTWORT);
  if (!text) return { ok: false, fehler: "Da stand nichts drin.", hinweise: [] };

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("zahlungsfall")
    .select("id,user_id,geschlossen_am,zahlung_url")
    .eq("id", params.fallId)
    .maybeSingle();

  if (error) return { ok: false, fehler: `Fall nicht lesbar: ${error.message}`, hinweise: [] };
  if (!data) return { ok: false, fehler: "Diesen Fall gibt es nicht.", hinweise: [] };
  const fall = data as { id: string; user_id: string; geschlossen_am: string | null; zahlung_url: string | null };

  if (params.alsNotiz) {
    await schreibeVerlauf(supabase, { fallId: fall.id, vonAdmin: true, autorId: params.adminId, text, kanal: "notiz" });
    return { ok: true, hinweise: ["Interne Notiz, sie geht nicht an den Kunden."] };
  }

  const appUrl = getAppUrl();
  const zahlUrl = fall.zahlung_url || `${appUrl}/einstellungen/abonnement`;

  const ergebnis = await sendeFallNachricht(supabase, {
    fallId: fall.id,
    userId: fall.user_id,
    // Der Knopf hängt dran; der Satz sagt, dass man ihn benutzen muss.
    text: `${text}\n\n— Das Capital-Circle-Team. Antworten kannst du über den Knopf „Antworten“ unten.`,
    autorId: params.adminId,
    vonAdmin: true,
    mail: params.perMail
      ? {
          betreff: "Antwort zu deiner Zahlung",
          ueberschrift: "Antwort vom Capital-Circle-Team",
          knopfText: "Zahlung ansehen",
          knopfUrl: zahlUrl,
          absaetze: [...text.split("\n\n"), rueckweg("mail", appUrl)],
        }
      : undefined,
  });

  const hinweise: string[] = [];
  if (ergebnis.dm === null) hinweise.push("Keine Direktnachricht: kein Discord verknüpft oder Direktnachrichten abbestellt.");
  if (ergebnis.dm === false) {
    hinweise.push(
      "Die Direktnachricht kam nicht durch. Meist lässt die Person keine Nachrichten von Servermitgliedern zu.",
    );
  }
  if (params.perMail && ergebnis.mail === false) hinweise.push("Die Mail ging nicht raus (keine Adresse oder Resend-Fehler).");
  if (!params.perMail && ergebnis.dm !== true) {
    hinweise.push("Ohne Mail und ohne zugestellte Direktnachricht hat der Kunde nichts bekommen. Die Antwort steht nur im Verlauf.");
  }
  if (fall.geschlossen_am) hinweise.push("Der Fall ist geschlossen. Die Nachricht ist trotzdem rausgegangen.");
  return { ok: true, hinweise };
}

/**
 * Einen Zahlungsaufschub gewähren.
 *
 * Er verhindert, dass dieser Person Zugang und Mitgliederrolle entzogen
 * werden, solange er läuft, und er setzt die Sieben-Tage-Uhr aus. **Bei Stripe
 * ändert sich nichts**: Die Rechnung bleibt offen, Stripe versucht weiter, und
 * wenn es das Abo beendet, bleibt es beendet.
 *
 * ── Capital-Circle-Besonderheit: `access_until` ist die Schranke ────────────
 *
 * Deshalb wird es bis zum Ende des Aufschubs verlängert (nie verkürzt), und
 * war der Zugang schon gesperrt, wird er zurückgegeben: `is_paid` wahr, und —
 * falls das Abo inzwischen beendet und die Stufe `free` ist — die Stufe aus
 * dem letzten Abo. Genau dieser Fall ist der häufigste: Der Kunde meldet sich,
 * **weil** ihm aufgefallen ist, dass der Zugang weg ist.
 */
export async function gewaehreAufschub(params: {
  fallId: string;
  adminId: string;
  bis: string;
  grund: string | null;
  benachrichtigen: boolean;
}): Promise<FallErgebnis> {
  // Das Datum aus dem Feld ist ein Kalendertag; gemeint ist dessen Ende.
  const bis = new Date(/^\d{4}-\d{2}-\d{2}$/.test(params.bis) ? `${params.bis}T23:59:00+02:00` : params.bis);
  if (Number.isNaN(bis.getTime())) return { ok: false, fehler: "Das ist kein Datum.", hinweise: [] };

  const jetzt = Date.now();
  if (bis.getTime() <= jetzt) return { ok: false, fehler: "Der Aufschub liegt in der Vergangenheit.", hinweise: [] };
  if (bis.getTime() - jetzt > (AUFSCHUB_MAX_TAGE + 1) * 86400000) {
    return { ok: false, fehler: `Höchstens ${AUFSCHUB_MAX_TAGE} Tage.`, hinweise: [] };
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("zahlungsfall")
    .select("id,user_id,aufschub_bis,betrag_cents,zahlung_url")
    .eq("id", params.fallId)
    .maybeSingle();

  if (error) return { ok: false, fehler: `Fall nicht lesbar: ${error.message}`, hinweise: [] };
  if (!data) return { ok: false, fehler: "Diesen Fall gibt es nicht.", hinweise: [] };
  const fall = data as {
    id: string;
    user_id: string;
    aufschub_bis: string | null;
    betrag_cents: number;
    zahlung_url: string | null;
  };

  const { error: schreibFehler } = await supabase
    .from("zahlungsfall")
    .update({
      status: "aufschub",
      aufschub_bis: bis.toISOString(),
      aufschub_grund: params.grund?.trim() || null,
      aufschub_von: params.adminId,
      // Die Frist wandert mit: Fiele der Fall je wieder auf `offen`, sperrte
      // sonst der nächste Lauf noch in derselben Nacht.
      frist: bis.toISOString(),
      geschlossen_am: null,
      geschlossen_grund: null,
    })
    .eq("id", fall.id);

  if (schreibFehler) return { ok: false, fehler: `Aufschub nicht setzbar: ${schreibFehler.message}`, hinweise: [] };

  const datum = datumVon(bis);
  await schreibeVerlauf(supabase, {
    fallId: fall.id,
    vonAdmin: true,
    autorId: params.adminId,
    text:
      (fall.aufschub_bis
        ? `Aufschub verlängert bis ${datum} (vorher ${datumVon(fall.aufschub_bis)}).`
        : `Aufschub gewährt bis ${datum}.`) + (params.grund?.trim() ? ` Grund: ${params.grund.trim()}` : ""),
    kanal: "system",
  });

  const hinweise: string[] = [];

  // Den Zugang bis zum Ende des Aufschubs halten, und einen gesperrten zurückgeben.
  const { data: profilDaten } = await supabase
    .from("profiles")
    .select("membership_tier,is_paid,access_until")
    .eq("id", fall.user_id)
    .maybeSingle();
  const profil = profilDaten as { membership_tier: string | null; is_paid: boolean | null; access_until: string | null } | null;

  const update: Record<string, unknown> = { is_paid: true };
  if (!profil?.access_until || new Date(profil.access_until).getTime() < bis.getTime()) {
    update.access_until = bis.toISOString();
  }

  const tier = profil?.membership_tier ?? "free";
  if (tier === "free") {
    const { data: abos } = await supabase
      .from("subscriptions")
      .select("stripe_price_id")
      .eq("user_id", fall.user_id)
      .order("current_period_end", { ascending: false })
      .limit(1);
    const preis = ((abos ?? []) as Array<{ stripe_price_id: string }>)[0]?.stripe_price_id ?? null;
    const plan = preis ? resolvePlanFromPriceId(preis) : null;
    update.membership_tier = plan ?? "monthly";
    hinweise.push(
      plan
        ? `Das Abo war bereits beendet. Der Zugang wurde als „${paketName(plan)}“ bis ${datum} zurückgegeben.`
        : `Das Abo war bereits beendet und der Tarif nicht mehr ablesbar. Der Zugang wurde als „Monatlich“ bis ${datum} zurückgegeben.`,
    );
  }

  const { error: zugangFehler } = await supabase.from("profiles").update(update).eq("id", fall.user_id);
  if (zugangFehler) {
    hinweise.push(`Der Aufschub steht, der Zugang liess sich aber nicht verlängern: ${zugangFehler.message}`);
  } else {
    const rollenOk = await synchronisiereRollen(supabase, fall.user_id, true, "Aufschub gewährt");
    if (!rollenOk) hinweise.push("Die Discord-Rolle liess sich nicht bestätigen, bitte in Discord nachsehen.");
  }

  if (params.benachrichtigen) {
    const appUrl = getAppUrl();
    const daten = {
      betrag: euroVon(fall.betrag_cents),
      datum,
      url: fall.zahlung_url || `${appUrl}/einstellungen/abonnement`,
      appUrl,
    };
    const ergebnis = await sendeFallNachricht(supabase, {
      fallId: fall.id,
      userId: fall.user_id,
      text: nachrichtAufschub(daten),
      autorId: params.adminId,
      vonAdmin: true,
      mail: {
        betreff: `Du hast Zeit bis zum ${datum}`,
        ueberschrift: "Wir haben dir mehr Zeit gegeben",
        knopfText: "Rechnung bezahlen",
        knopfUrl: daten.url,
        absaetze: nachrichtAufschub(daten, "mail").split("\n\n"),
      },
    });
    if (ergebnis.dm !== true) hinweise.push("Die Direktnachricht kam nicht durch oder war nicht möglich. Die Mail ist raus.");
  }

  return { ok: true, hinweise };
}

/**
 * Einen Fall von Hand schliessen, ohne dass Geld geflossen ist.
 *
 * Ein laufender Aufschub wird nicht nebenbei beendet — das nähme dem Kunden
 * den Schutz, den ihm jemand zugesagt hat. Und der Zugang wird **nicht**
 * angefasst: Das Schliessen ist eine Aussage über die Bearbeitung. Weil in
 * Capital Circle `access_until` die Schranke ist, sagt die Rückmeldung, bis
 * wann der Zugang dann noch läuft.
 */
export async function schliesseFall(params: { fallId: string; adminId: string; grund: string }): Promise<FallErgebnis> {
  const supabase = createServiceClient();

  const { data: vorher, error: leseFehler } = await supabase
    .from("zahlungsfall")
    .select("status,aufschub_bis,user_id")
    .eq("id", params.fallId)
    .maybeSingle();

  if (leseFehler) return { ok: false, fehler: `Fall nicht lesbar: ${leseFehler.message}`, hinweise: [] };
  if (!vorher) return { ok: false, fehler: "Diesen Fall gibt es nicht.", hinweise: [] };
  const fall = vorher as { status: string; aufschub_bis: string | null; user_id: string };

  if (fall.status === "aufschub") {
    return {
      ok: false,
      fehler:
        `Für diesen Fall läuft ein Aufschub${fall.aufschub_bis ? ` bis zum ${datumVon(fall.aufschub_bis)}` : ""}. ` +
        "Ihn zu schliessen nähme dem Kunden den Schutz, den du ihm zugesagt hast. Wenn die Zusage nicht mehr " +
        "gilt, setz den Aufschub auf ein früheres Datum, dann beendet ihn der Nachtlauf sauber.",
      hinweise: [],
    };
  }

  const grund = params.grund.trim().slice(0, 200) || "Von Hand geschlossen";
  const { error } = await supabase
    .from("zahlungsfall")
    .update({ status: "beendet", geschlossen_am: new Date().toISOString(), geschlossen_grund: grund })
    .eq("id", params.fallId);
  if (error) return { ok: false, fehler: `Fall nicht schliessbar: ${error.message}`, hinweise: [] };

  await schreibeVerlauf(supabase, {
    fallId: params.fallId,
    vonAdmin: true,
    autorId: params.adminId,
    text: `Fall geschlossen: ${grund}`,
    kanal: "system",
  });

  const { data: profil } = await supabase.from("profiles").select("access_until").eq("id", fall.user_id).maybeSingle();
  const bis = (profil as { access_until: string | null } | null)?.access_until ?? null;
  return {
    ok: true,
    hinweise: [
      "Es wird nicht mehr erinnert oder gesperrt. Am Zugang ändert das nichts" +
        (bis ? `: Er läuft bis ${datumVon(bis)}` : "") +
        " — wer länger Zugang braucht, bekommt einen Aufschub statt eines geschlossenen Falls.",
    ],
  };
}
