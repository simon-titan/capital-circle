import { createHmac } from "node:crypto";
import { findeUserIdZuEmail } from "@/lib/checkout/user-lookup";
import { ladeAboKontext, type AboZeile } from "@/lib/stripe/abo-kontext";
import { kuendigeAboZumPeriodenende } from "@/lib/stripe/kuendigung";
import { resolvePlanFromPriceId } from "@/lib/stripe/plan-map";
import { getStripe } from "@/lib/stripe/server";
import { createServiceClient } from "@/lib/supabase/service";
import { tagBerlin, type KuendigungsArt, type KuendigungsErgebnis } from "./shared";

/**
 * Kündigungsbutton (§ 312k BGB) — Zuordnung zu Konto und Vertrag und die
 * Entscheidung, ob die Kündigung sofort bei Stripe ausgeführt wird.
 *
 * ── Wann wird automatisch ausgeführt? ──────────────────────────────────────
 *
 * Nur bei einer **ordentlichen** Kündigung und nur, wenn alles eindeutig ist:
 *   - Die E-Mail gehört genau einem Konto. Eingeloggt: das Konto der Sitzung,
 *     sofern die eingegebene Adresse dessen Adresse ist. Nicht eingeloggt:
 *     exakter Treffer in `auth.users` (Supabase erzwingt eindeutige Adressen).
 *   - Zu dem Konto gibt es **genau ein** laufendes Stripe-Abo, und es ist das
 *     neueste — also genau das, das `/einstellungen/abonnement` anzeigt.
 *   - Das Abo ist `active`, `trialing` oder `past_due`, und das Profil steht
 *     auf einer Abo-Stufe (monthly/quarterly/yearly).
 *   - Ein Wunschtermin liegt nicht nach dem Periodenende.
 *
 * Auch **ohne Anmeldung** wird ausgeführt, weil der Kunde eine fälschlich
 * ausgelöste Kündigung selbst zurücknehmen kann: `/einstellungen/abonnement`
 * zeigt bei `cancel_at_period_end` den Knopf „Kündigung zurücknehmen"
 * (`components/billing/CancelFlow.tsx` → `DELETE /api/stripe/subscription/cancel`),
 * solange die Periode läuft. Genau diese Anzeige ist an die Bedingungen oben
 * gebunden (Abo-Stufe + neueste Abo-Zeile) — deshalb verlangen wir sie hier
 * ebenfalls, sonst gäbe es eine Kündigung ohne sichtbaren Rückweg.
 *
 * Die Kehrseite: Wer eine fremde Konto-Adresse kennt, kann dieses Abo zum
 * Periodenende kündigen. Kein Zugang geht dabei sofort verloren, und die
 * Bestätigung geht in dem Fall **immer auch an die Konto-Adresse**
 * (`/api/kuendigung`), sodass der Inhaber es erfährt und zurücknehmen kann.
 * Das ist der Preis eines Kündigungswegs ohne Anmeldung, den § 312k BGB
 * verlangt.
 *
 * Alles andere — außerordentliche Kündigung, mehrere Abos, von Hand
 * eingetragene Mitgliedschaft, Lifetime, 1:1, Stripe-Fehler — landet als
 * `manuell_pruefen` beim Betreiber.
 */

/** Laufend = nicht endgültig beendet. Mehr als eines davon ist nicht eindeutig. */
const BEENDET = new Set(["canceled", "incomplete_expired"]);

/** Stati, in denen `cancel_at_period_end` sinnvoll gesetzt werden kann. */
const AUSFUEHRBAR = new Set(["active", "trialing", "past_due"]);

/** Profilstufen, für die `/einstellungen/abonnement` die Rücknahme anbietet. */
const ABO_STUFEN = new Set(["monthly", "quarterly", "yearly"]);

export interface KuendigungsEingabe {
  art: KuendigungsArt;
  grund: string | null;
  name: string;
  /** Konto-Adresse, kleingeschrieben. */
  email: string;
  bestaetigungEmail: string;
  vertragAngabe: string | null;
  /** `YYYY-MM-DD` oder null = nächstmöglicher Zeitpunkt. */
  zeitpunktWunsch: string | null;
}

export interface Sitzung {
  userId: string;
  email: string | null;
}

export interface Zuordnung {
  userId: string | null;
  eingeloggt: boolean;
  /** Auth-Adresse des zugeordneten Kontos — Empfänger der Sicherheitskopie. */
  kontoEmail: string | null;
  plan: string | null;
  stripeSubscriptionId: string | null;
  status: "ausgefuehrt" | "manuell_pruefen" | "kein_vertrag";
  pruefHinweis: string | null;
  wirksamZum: string | null;
  ausgefuehrtAm: string | null;
  ergebnis: KuendigungsErgebnis;
}

interface AboRoh {
  id: string;
  stripe_subscription_id: string;
  status: string;
}

export async function ordneZuUndFuehreAus(eingabe: KuendigungsEingabe, sitzung: Sitzung | null): Promise<Zuordnung> {
  const service = createServiceClient();

  const leer = {
    userId: null,
    eingeloggt: false,
    kontoEmail: null,
    plan: null,
    stripeSubscriptionId: null,
    wirksamZum: null,
    ausgefuehrtAm: null,
  } as const;

  /* ── 1. Konto ─────────────────────────────────────────────────────────── */

  let userId: string | null = null;
  let eingeloggt = false;
  let kontoEmail: string | null = null;

  const sitzungsEmail = sitzung?.email?.trim().toLowerCase() ?? null;
  if (sitzung && sitzungsEmail && sitzungsEmail === eingabe.email) {
    userId = sitzung.userId;
    eingeloggt = true;
    kontoEmail = sitzungsEmail;
  } else {
    try {
      userId = await findeUserIdZuEmail(service, eingabe.email);
      kontoEmail = userId ? eingabe.email : null;
    } catch (err) {
      console.error("[kuendigung] Kontosuche fehlgeschlagen:", err);
      return {
        ...leer,
        status: "manuell_pruefen",
        pruefHinweis: `Kontosuche fehlgeschlagen: ${err instanceof Error ? err.message : "unbekannt"}`,
        ergebnis: { art: "manuell_pruefen", plan: null },
      };
    }
  }

  if (!userId) {
    return {
      ...leer,
      status: "kein_vertrag",
      pruefHinweis: "Zu dieser E-Mail-Adresse gibt es kein Konto.",
      ergebnis: { art: "kein_vertrag" },
    };
  }

  const basis = { userId, eingeloggt, kontoEmail };

  /* ── 2. Vertrag ───────────────────────────────────────────────────────── */

  const kontext = await ladeAboKontext(userId);
  if (!kontext) {
    return {
      ...leer,
      ...basis,
      status: "manuell_pruefen",
      pruefHinweis: "Konto gefunden, Profil aber nicht lesbar.",
      ergebnis: { art: "manuell_pruefen", plan: null },
    };
  }

  const { data: aboRoh, error: aboFehler } = await service
    .from("subscriptions")
    .select("id,stripe_subscription_id,status")
    .eq("user_id", userId);
  if (aboFehler) {
    return {
      ...leer,
      ...basis,
      status: "manuell_pruefen",
      pruefHinweis: `Abos nicht lesbar: ${aboFehler.message}`,
      ergebnis: { art: "manuell_pruefen", plan: null },
    };
  }
  const laufende = ((aboRoh ?? []) as AboRoh[]).filter((a) => !BEENDET.has(a.status));

  const abo: AboZeile | null = kontext.abo;
  const plan = planAus(kontext.tier, abo);
  const stripeSubscriptionId = abo?.stripeSubscriptionId ?? null;

  const manuell = (pruefHinweis: string): Zuordnung => ({
    ...leer,
    ...basis,
    plan,
    stripeSubscriptionId,
    status: "manuell_pruefen",
    pruefHinweis,
    ergebnis: { art: "manuell_pruefen", plan },
  });

  /*
    Mentoring-Programm (`config/mentoring.ts`): Das einzige kündbare
    Dauerschuldverhältnis ist das Live-Trading-Abo, und das steht bewusst nicht
    in `subscriptions` (siehe `lib/stripe/webhooks/mentoring.ts`). Ordentlich
    gekündigt wird es hier direkt bei Stripe zum Monatsende; der Live-Bereich
    bleibt bis dahin offen, weil `live_bis` nicht verkürzt wird. Die Raten
    eines Programms sind keine Laufzeit, sondern Zahlungen eines Kaufs — eine
    „Kündigung" dazu prüft der Betreiber.
  */
  if (kontext.tier === "mentoring" && laufende.length === 0) {
    return kuendigeLiveAbo(service, eingabe, { ...leer, ...basis });
  }

  if (laufende.length === 0) {
    if (kontext.tier === "free") {
      return {
        ...leer,
        ...basis,
        stripeSubscriptionId,
        status: "kein_vertrag",
        pruefHinweis: abo
          ? `Konto ohne laufendes Abo (letztes Abo: ${abo.status}).`
          : "Konto ohne Abo (Free-Zugang).",
        ergebnis: { art: "kein_vertrag" },
      };
    }
    // Lifetime, 1:1 oder eine von Hand eingetragene Mitgliedschaft: Es gibt
    // etwas zu beenden, aber nichts, was sich bei Stripe kündigen ließe.
    return manuell(`Stufe „${kontext.tier}" ohne laufendes Stripe-Abo: von Hand prüfen.`);
  }

  if (laufende.length > 1) {
    return manuell(`${laufende.length} laufende Stripe-Abos zu diesem Konto: nicht eindeutig.`);
  }

  if (!abo || laufende[0].id !== abo.id) {
    return manuell("Das laufende Abo ist nicht das neueste des Kontos. Die Einstellungsseite zeigt ein anderes.");
  }

  if (eingabe.art === "ausserordentlich") {
    return manuell("Außerordentliche Kündigung: Grund prüfen und Beendigung von Hand bestätigen.");
  }

  if (eingabe.zeitpunktWunsch && eingabe.zeitpunktWunsch > tagBerlin(abo.currentPeriodEnd)) {
    return manuell(
      `Wunschtermin ${eingabe.zeitpunktWunsch} liegt nach dem Periodenende ${tagBerlin(abo.currentPeriodEnd)}. ` +
        "Kündigung zum späteren Termin von Hand einplanen.",
    );
  }

  if (abo.cancelAtPeriodEnd) {
    return {
      ...leer,
      ...basis,
      plan,
      stripeSubscriptionId,
      status: "ausgefuehrt",
      pruefHinweis: "War bereits zum Periodenende gekündigt, nichts geändert.",
      wirksamZum: abo.currentPeriodEnd,
      ausgefuehrtAm: new Date().toISOString(),
      ergebnis: { art: "ausgefuehrt", plan, wirksamZum: abo.currentPeriodEnd, warBereitsGekuendigt: true },
    };
  }

  if (!AUSFUEHRBAR.has(abo.status)) {
    return manuell(`Abo-Status „${abo.status}": nicht automatisch kündbar.`);
  }

  if (!ABO_STUFEN.has(kontext.tier)) {
    return manuell(
      `Profilstufe „${kontext.tier}" passt nicht zum laufenden Abo. Ohne Abo-Stufe fehlt die Rücknahme in den Einstellungen.`,
    );
  }

  /* ── 3. Ausführen ─────────────────────────────────────────────────────── */

  const ausfuehrung = await kuendigeAboZumPeriodenende({
    userId,
    abo,
    grund: "other",
    freitext: null,
    statistikGrund: "kuendigungsbutton",
  });

  if (!ausfuehrung.ok) {
    return manuell(`Stripe-Kündigung fehlgeschlagen: ${ausfuehrung.detail}`);
  }

  return {
    ...leer,
    ...basis,
    plan,
    stripeSubscriptionId,
    status: "ausgefuehrt",
    pruefHinweis: null,
    wirksamZum: ausfuehrung.accessUntil,
    ausgefuehrtAm: new Date().toISOString(),
    ergebnis: { art: "ausgefuehrt", plan, wirksamZum: ausfuehrung.accessUntil, warBereitsGekuendigt: false },
  };
}

async function kuendigeLiveAbo(
  service: ReturnType<typeof createServiceClient>,
  eingabe: KuendigungsEingabe,
  basis: Omit<Zuordnung, "status" | "pruefHinweis" | "ergebnis" | "plan">,
): Promise<Zuordnung> {
  const plan = "Live-Trading-Abo";
  const manuell = (pruefHinweis: string): Zuordnung => ({
    ...basis,
    plan,
    status: "manuell_pruefen",
    pruefHinweis,
    ergebnis: { art: "manuell_pruefen", plan },
  });

  const { data, error } = await service
    .from("mentoring_kauf")
    .select("stripe_subscription_id")
    .eq("user_id", basis.userId as string)
    .eq("produkt", "live")
    .eq("status", "aktiv")
    .not("stripe_subscription_id", "is", null);
  if (error) return manuell(`Live-Abo nicht lesbar: ${error.message}`);
  const abos = (data ?? []) as Array<{ stripe_subscription_id: string }>;

  if (abos.length === 0) {
    return manuell("Mentoring-Programm ohne laufendes Live-Abo. Kündigung zu Programm oder Raten von Hand prüfen.");
  }
  if (abos.length > 1) return manuell(`${abos.length} laufende Live-Abos: nicht eindeutig.`);
  if (eingabe.art === "ausserordentlich") {
    return manuell("Außerordentliche Kündigung des Live-Abos: Grund prüfen und Beendigung von Hand bestätigen.");
  }

  const subId = abos[0].stripe_subscription_id;
  try {
    const sub = await getStripe().subscriptions.update(subId, {
      cancel_at_period_end: true,
      cancellation_details: { comment: "Kündigungsbutton (§ 312k BGB)" },
    });
    const ende = sub.items.data[0]?.current_period_end;
    if (!ende) {
      return { ...manuell("Live-Abo gekündigt, Monatsende aber nicht lesbar: Termin von Hand bestätigen."), stripeSubscriptionId: subId };
    }
    const wirksamZum = new Date(ende * 1000).toISOString();
    if (eingabe.zeitpunktWunsch && eingabe.zeitpunktWunsch > tagBerlin(wirksamZum)) {
      return { ...manuell(`Wunschtermin ${eingabe.zeitpunktWunsch} liegt nach dem Monatsende; zum Monatsende gekündigt.`), stripeSubscriptionId: subId };
    }
    return {
      ...basis,
      plan,
      stripeSubscriptionId: subId,
      status: "ausgefuehrt",
      pruefHinweis: null,
      wirksamZum,
      ausgefuehrtAm: new Date().toISOString(),
      ergebnis: { art: "ausgefuehrt", plan, wirksamZum, warBereitsGekuendigt: false },
    };
  } catch (err) {
    return { ...manuell(`Stripe-Kündigung des Live-Abos fehlgeschlagen: ${err instanceof Error ? err.message : "unbekannt"}`), stripeSubscriptionId: subId };
  }
}

/** Tarif für Anzeige und Beleg: Profilstufe, sonst aus der Preis-ID. */
function planAus(tier: string, abo: AboZeile | null): string | null {
  if (tier !== "free") return tier;
  if (abo) return resolvePlanFromPriceId(abo.stripePriceId);
  return null;
}

/* ── Missbrauchsschutz ────────────────────────────────────────────────────── */

/**
 * IP-Adresse als HMAC statt im Klartext: reicht zum Zählen („wie oft kam diese
 * Adresse in der letzten Stunde?"), lässt sich aber ohne das Secret nicht
 * zurückrechnen. Eigenes Secret optional, sonst die ohnehin geheimen Werte —
 * mit eigenem Zweck-Präfix, damit der Hash nirgends sonst passt.
 */
export function ipHash(ip: string | null): string | null {
  if (!ip) return null;
  const secret =
    process.env.KUENDIGUNG_IP_SECRET?.trim() ||
    process.env.UNSUBSCRIBE_TOKEN_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) return null;
  return createHmac("sha256", secret).update(`kuendigung-ip:${ip}`).digest("hex").slice(0, 32);
}

/** Höchstens so viele Einreichungen je Stunde. */
export const DROSSEL = {
  proEmail: 3,
  proIp: 10,
  fensterMs: 60 * 60 * 1000,
} as const;

/**
 * Drosselung über die Tabelle selbst (kein Upstash). Schlägt die Abfrage fehl
 * — etwa weil die Migration noch fehlt —, wird **nicht** gesperrt: Eine
 * Kündigung abzuweisen wiegt schwerer als ein paar Einreichungen zu viel.
 */
export async function istGedrosselt({
  email,
  bestaetigungEmail,
  ipHashWert,
}: {
  email: string;
  bestaetigungEmail: string;
  ipHashWert: string | null;
}): Promise<boolean> {
  const service = createServiceClient();
  const seit = new Date(Date.now() - DROSSEL.fensterMs).toISOString();

  const zaehle = async (spalte: string, wert: string) => {
    const { count, error } = await service
      .from("kuendigungen")
      .select("id", { count: "exact", head: true })
      .eq(spalte, wert)
      .gte("eingegangen_am", seit);
    if (error) {
      console.error(`[kuendigung] Drosselung (${spalte}) nicht prüfbar:`, error.message);
      return 0;
    }
    return count ?? 0;
  };

  const [proEmail, proBestaetigung, proIp] = await Promise.all([
    zaehle("email", email),
    bestaetigungEmail !== email ? zaehle("bestaetigung_email", bestaetigungEmail) : Promise.resolve(0),
    ipHashWert ? zaehle("ip_hash", ipHashWert) : Promise.resolve(0),
  ]);

  return proEmail >= DROSSEL.proEmail || proBestaetigung >= DROSSEL.proEmail || proIp >= DROSSEL.proIp;
}
