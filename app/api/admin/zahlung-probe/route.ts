import { NextResponse } from "next/server";
import { nachrichtErinnerung, nachrichtErster, nachrichtGesperrt } from "@/config/zahlung";
import { findeUserIdZuEmail } from "@/lib/checkout/user-lookup";
import { cronBefugt } from "@/lib/cron/auth";
import { discordIdFuerNachricht } from "@/lib/discord/konto";
import { requireAdminRole } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { eroeffneZahlungsfall, ladeNachrichtDaten, sendeFallNachricht } from "@/lib/zahlung/fall";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Einen Zahlungsfall zur Probe anlegen, die Nachricht schicken, wieder wegräumen.
 *
 * Übernommen aus MoonTrading. Der ganze Weg (Mail + Direktnachricht → Knopf →
 * Formular → Verlauf in der Fallakte) lässt sich sonst nur an einer echten
 * gescheiterten Abbuchung prüfen, also an einem Kunden.
 *
 * ── Was ihn ungefährlich macht ──────────────────────────────────────────────
 *
 * Die Rechnungsnummer beginnt mit `probe_`, ist also nie eine echte
 * Stripe-Rechnung. Der Fall hat **keine Frist** (`mitFrist: false`): Kein
 * Nachtlauf erinnert oder sperrt ihn. (Im Schwesterprojekt setzte die Probe
 * versehentlich doch eine Frist — sieben Tage später hätte der Nachtlauf das
 * eigene Testkonto gesperrt.) `aufraeumen` löscht nur Proben, erkennbar an der
 * Rechnungsnummer.
 *
 * ── Er schreibt einem echten Menschen ───────────────────────────────────────
 *
 * Deshalb nur an eine ausdrücklich genannte Adresse. **Nimm dein eigenes
 * Konto.** Zugang: Admin-Sitzung oder `Authorization: Bearer $CRON_SECRET`
 * (fail-closed), Bedienung über `npm run zahlung:probe`.
 */
export async function POST(request: Request) {
  if (!cronBefugt(request)) {
    const { error } = await requireAdminRole("admin");
    if (error) return error;
  }

  let koerper: { email?: unknown; art?: unknown; aufraeumen?: unknown; betragCents?: unknown; ohneDiscord?: unknown };
  try {
    koerper = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Kein gültiger Anfragekörper." }, { status: 400 });
  }

  const supabase = createServiceClient();

  if (koerper.aufraeumen === true) {
    const { data, error } = await supabase
      .from("zahlungsfall")
      .delete()
      .like("stripe_invoice_id", "probe\\_%")
      .select("id");
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, geloescht: (data ?? []).length });
  }

  const email = typeof koerper.email === "string" ? koerper.email.trim() : "";
  if (!email) return NextResponse.json({ ok: false, error: "email fehlt." }, { status: 400 });

  let userId: string | null;
  try {
    userId = await findeUserIdZuEmail(supabase, email);
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
  if (!userId) return NextResponse.json({ ok: false, error: `Kein Konto zu ${email}.` }, { status: 400 });

  /*
    Ohne Discord prüft die Probe nur die Mail. Das ist erlaubt (`ohneDiscord`),
    aber nicht der Normalfall: Der Knopf-Rückweg ist der Teil, der am ehesten
    still scheitert.
  */
  const discordId = await discordIdFuerNachricht(supabase, userId);
  if (!discordId && koerper.ohneDiscord !== true) {
    return NextResponse.json(
      {
        ok: false,
        error:
          `${email} hat kein Discord verknüpft (oder Direktnachrichten abbestellt). Verknüpfe es unter ` +
          "/einstellungen/profil, oder schick die Probe mit ohneDiscord: true nur als Mail.",
      },
      { status: 400 },
    );
  }

  const betragCents = typeof koerper.betragCents === "number" ? koerper.betragCents : 9900;
  const art = koerper.art === "erinnerung" || koerper.art === "gesperrt" ? koerper.art : "erster";

  const fall = await eroeffneZahlungsfall(supabase, {
    userId,
    stripeInvoiceId: `probe_${Date.now()}`,
    stripeSubscriptionId: null,
    betragCents,
    waehrung: "eur",
    versuche: 1,
    paket: "Monatlich",
    zahlungUrl: null,
    mitFrist: false,
  });
  if (!fall) {
    return NextResponse.json({ ok: false, error: "Fall nicht anlegbar (Migration 080 eingespielt?)." }, { status: 500 });
  }

  const daten = await ladeNachrichtDaten(supabase, {
    userId,
    betragCents,
    paket: "Monatlich",
    zahlungUrl: null,
    tageBisSperre: 4,
  });

  const textVon = art === "erinnerung" ? nachrichtErinnerung : art === "gesperrt" ? nachrichtGesperrt : nachrichtErster;

  const ergebnis = await sendeFallNachricht(supabase, {
    fallId: fall.fallId,
    userId,
    text: `[PROBE] ${textVon(daten)}`,
    autorId: null,
    vonAdmin: true,
    mail: {
      betreff: `[PROBE] Zahlungsfall, Nachricht „${art}“`,
      ueberschrift: `Probe: Nachricht „${art}“`,
      knopfText: "Zahlung erledigen",
      knopfUrl: daten.url,
      absaetze: textVon(daten, "mail").split("\n\n"),
    },
  });

  return NextResponse.json({
    ok: true,
    fallId: fall.fallId,
    art,
    discordId,
    dm: ergebnis.dm,
    mail: ergebnis.mail,
    hinweis:
      ergebnis.dm === true
        ? "Nachricht ist raus. Drück in Discord auf „Antworten“, schreib etwas, und sieh in der Fallakte " +
          `(/admin/zahlungsstoerungen/${fall.fallId}) nach. Danach mit aufraeumen: true wegräumen.`
        : "Die Direktnachricht kam nicht an (kein Discord, widersprochen, oder die Person lässt keine " +
          "Direktnachrichten von Servermitgliedern zu). Die Mail ist unabhängig davon verschickt worden.",
  });
}
