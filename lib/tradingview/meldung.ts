import { sendSlackNotification } from "@/lib/notifications/slack";

/**
 * Meldungen ans Team zum TradingView-Indikator: Mail an `TEAM_POSTFACH` und
 * Slack (Entscheidung 25.09.2026: beides). **Wirft nie** — die Anfrage des
 * Mitglieds ist gespeichert, ob die Post rausgeht, darf daran nichts ändern.
 *
 * Testkonten des Kaufweg-Tests (`…@resend.dev`) lösen keine Meldung aus.
 */
function istTestadresse(email: string | null): boolean {
  return Boolean(email && /@(resend\.dev|example\.(com|org|net))$/i.test(email.trim()));
}

export async function meldeTvAnfrage(p: {
  name: string;
  email: string | null;
  tvName: string;
  vorher: string | null;
}): Promise<void> {
  if (istTestadresse(p.email)) return;
  const email = p.email ?? "ohne Adresse";
  try {
    const { sendTradingViewBetreiber } = await import("@/lib/email/templates/tradingview-betreiber");
    await sendTradingViewBetreiber({ art: "anfrage", name: p.name, email, tvName: p.tvName, vorher: p.vorher });
  } catch (err) {
    console.warn("[tradingview] Anfrage-Mail nicht verschickt:", err);
  }
  try {
    await sendSlackNotification(
      `:chart_with_upwards_trend: TradingView freischalten: *${p.tvName}* (${p.name}, ${email})` +
        (p.vorher ? ` · vorher „${p.vorher}“, bitte austragen` : ""),
    );
  } catch (err) {
    console.warn("[tradingview] Slack-Meldung nicht verschickt:", err);
  }
}

export async function meldeTvEntzug(eintraege: { name: string; email: string | null; tvName: string }[]): Promise<void> {
  const echte = eintraege
    .filter((e) => !istTestadresse(e.email))
    .map((e) => ({ name: e.name, email: e.email ?? "ohne Adresse", tvName: e.tvName }));
  if (echte.length === 0) return;
  try {
    const { sendTradingViewBetreiber } = await import("@/lib/email/templates/tradingview-betreiber");
    await sendTradingViewBetreiber({ art: "entzug", eintraege: echte });
  } catch (err) {
    console.warn("[tradingview] Entzugs-Mail nicht verschickt:", err);
  }
  try {
    await sendSlackNotification(
      `:no_entry: TradingView: ${echte.length} ${echte.length === 1 ? "Zugang" : "Zugänge"} entziehen: ` +
        echte.map((e) => `*${e.tvName}*`).join(", "),
    );
  } catch (err) {
    console.warn("[tradingview] Slack-Meldung nicht verschickt:", err);
  }
}
