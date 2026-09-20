import { createHmac } from "node:crypto";
import { findeUserIdZuEmail } from "@/lib/checkout/user-lookup";
import { tagBerlin } from "@/lib/kuendigung/shared";
import { ladeAboKontext, type AboKontext } from "@/lib/stripe/abo-kontext";
import { resolvePlanFromPriceId } from "@/lib/stripe/plan-map";
import { createServiceClient } from "@/lib/supabase/service";
import { PLAN_LABEL } from "./shared";

/**
 * Widerrufsfunktion (§ 356a BGB) — Zuordnung zu Konto und Vertrag.
 *
 * ── Was hier bewusst NICHT passiert ────────────────────────────────────────
 *
 * Kein Abo-Ende, keine Erstattung, kein Entzug des Zugangs. Anders als beim
 * Kündigungsbutton (`lib/kuendigung/verarbeiten.ts`) gibt es beim Widerruf
 * nichts, was sich ohne Abwägung ausführen ließe:
 *   - Ob das Widerrufsrecht überhaupt noch besteht, hängt an der Zustimmung
 *     zum sofortigen Leistungsbeginn in der Kasse (digitale Inhalte,
 *     § 356 Abs. 5 BGB) und an der Frist.
 *   - Wie viel zu erstatten ist, hängt am Wertersatz für bereits erbrachte
 *     Dienstleistungen (§ 357a Abs. 2 BGB).
 * Beides entscheidet der Betreiber. Jede Zeile landet deshalb als
 * `manuell_pruefen` in `/admin/widerrufe`, und diese Datei sammelt nur, was
 * er für die Entscheidung braucht.
 *
 * ── Frist ──────────────────────────────────────────────────────────────────
 *
 * Bei Dienstleistungen und digitalen Inhalten beginnt die Widerrufsfrist mit
 * Vertragsschluss (§ 356 Abs. 2 Nr. 2 BGB) und endet 14 Tage später mit
 * Ablauf des Tages (§§ 187 Abs. 1, 188 Abs. 1 BGB). Als Vertragsschluss gilt
 * hier das Anlegen der Abo-Zeile bzw. `lifetime_purchased_at` — beides
 * entsteht per Webhook Sekunden nach der Zahlung. Das Ergebnis ist ein
 * Hinweis, keine Entscheidung: Bei fehlerhafter Belehrung läuft die Frist bis
 * zu zwölf Monate länger (§ 356 Abs. 3 BGB), und nach § 356a Abs. 5 BGB zählt
 * das Absenden, nicht das Lesen.
 *
 * Kein Stripe-Aufruf: Alles, was die Zuordnung braucht, spiegelt der Webhook
 * bereits in `subscriptions`, `payments` und `profiles`.
 */

export interface WiderrufsEingabe {
  name: string;
  /** Konto- bzw. Kauf-Adresse, kleingeschrieben. */
  email: string;
  bestaetigungEmail: string;
  vertragAngabe: string | null;
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
  vertragsschlussAm: string | null;
  /** Letzter Tag der regulären Frist (`YYYY-MM-DD`). */
  fristEnde: string | null;
  fristgerecht: boolean | null;
  /**
   * Vertragsbezeichnung für den Beleg — nur für eingeloggte Absender, die sie
   * auf der Seite gesehen haben. Für alle anderen `null` (keine Kontoauskunft).
   */
  vertragBezeichnung: string | null;
  pruefHinweis: string;
}

/** Ein Vertrag, den das Konto geschlossen hat, mit dem Tag des Abschlusses. */
interface Vertrag {
  plan: string | null;
  stripeSubscriptionId: string | null;
  schlussAm: string;
  status: string | null;
}

/** `YYYY-MM-DD` + n Kalendertage. */
function plusTage(tag: string, tage: number): string {
  const d = new Date(`${tag}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
}

/** Die Verträge eines Kontos, neuester zuerst. */
export function vertraegeAus(kontext: AboKontext): Vertrag[] {
  const liste: Vertrag[] = [];
  if (kontext.abo) {
    const plan = ["monthly", "quarterly", "yearly"].includes(kontext.tier)
      ? kontext.tier
      : resolvePlanFromPriceId(kontext.abo.stripePriceId);
    liste.push({
      plan: plan ?? null,
      stripeSubscriptionId: kontext.abo.stripeSubscriptionId,
      schlussAm: kontext.abo.createdAt ?? kontext.abo.currentPeriodStart,
      status: kontext.abo.status,
    });
  }
  if (kontext.lifetimePurchasedAt) {
    liste.push({ plan: "lifetime", stripeSubscriptionId: null, schlussAm: kontext.lifetimePurchasedAt, status: null });
  }
  return liste.sort((a, b) => b.schlussAm.localeCompare(a.schlussAm));
}

/** Vertragsbezeichnung für Seite und Beleg, z. B. „Mitgliedschaft · Monatlich, abgeschlossen am 12. September 2026". */
export function vertragsBezeichnung(v: Vertrag): string {
  const name = (v.plan && PLAN_LABEL[v.plan]) || "Capital-Circle-Mitgliedschaft";
  const tag = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(v.schlussAm));
  return `${name}, abgeschlossen am ${tag}`;
}

export async function ordneZu(
  eingabe: WiderrufsEingabe,
  sitzung: Sitzung | null,
  eingegangenAm: string,
): Promise<Zuordnung> {
  const service = createServiceClient();

  const leer = {
    userId: null,
    eingeloggt: false,
    kontoEmail: null,
    plan: null,
    stripeSubscriptionId: null,
    vertragsschlussAm: null,
    fristEnde: null,
    fristgerecht: null,
    vertragBezeichnung: null,
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
      console.error("[widerruf] Kontosuche fehlgeschlagen:", err);
      return {
        ...leer,
        pruefHinweis: `Kontosuche fehlgeschlagen (${err instanceof Error ? err.message : "unbekannt"}): Konto von Hand suchen.`,
      };
    }
  }

  if (!userId) {
    return {
      ...leer,
      pruefHinweis:
        "Kein Konto zu dieser E-Mail-Adresse. In Stripe nach E-Mail und Name suchen; die Angaben zum Vertrag beachten.",
    };
  }

  const basis = { userId, eingeloggt, kontoEmail };

  /* ── 2. Vertrag ───────────────────────────────────────────────────────── */

  const kontext = await ladeAboKontext(userId);
  if (!kontext) {
    return { ...leer, ...basis, pruefHinweis: "Konto gefunden, Profil aber nicht lesbar: von Hand prüfen." };
  }

  const vertraege = vertraegeAus(kontext);
  const zahlung = await letzteZahlung(userId);
  const zahlungsText = zahlung ? ` Letzte Zahlung: ${zahlung}.` : "";

  if (vertraege.length === 0) {
    const stufe =
      kontext.tier === "free"
        ? "Konto ohne bezahlten Vertrag (Free-Zugang)."
        : `Stufe „${kontext.tier}" ohne Stripe-Vertrag (von Hand eingetragen?).`;
    return { ...leer, ...basis, pruefHinweis: `${stufe}${zahlungsText} Vertrag von Hand zuordnen.` };
  }

  const [vertrag, ...aeltere] = vertraege;
  const schlussTag = tagBerlin(vertrag.schlussAm);
  const fristEnde = plusTage(schlussTag, 14);
  const eingangTag = tagBerlin(eingegangenAm);
  const fristgerecht = eingangTag <= fristEnde;
  const tageSeitSchluss = Math.round(
    (Date.parse(`${eingangTag}T12:00:00Z`) - Date.parse(`${schlussTag}T12:00:00Z`)) / 86_400_000,
  );

  const teile = [
    `Vertrag: ${vertragsBezeichnung(vertrag)}` +
      (vertrag.status ? ` (Abo-Status ${vertrag.status})` : "") +
      ".",
    fristgerecht
      ? `Eingang ${tageSeitSchluss} Tag(e) nach Vertragsschluss, innerhalb der regulären Frist bis ${fristEnde}.`
      : `Eingang ${tageSeitSchluss} Tage nach Vertragsschluss. Die reguläre Frist endete ${fristEnde}. ` +
        "Nur wirksam, wenn die Frist wegen fehlerhafter Belehrung länger lief.",
    ...(aeltere.length > 0 ? [`Außerdem: ${aeltere.map(vertragsBezeichnung).join("; ")}.`] : []),
    ...(zahlung ? [`Letzte Zahlung: ${zahlung}.`] : []),
    "Widerrufsrecht, Wertersatz und Erstattung von Hand prüfen; nichts wurde automatisch beendet.",
  ];

  return {
    ...basis,
    plan: vertrag.plan,
    stripeSubscriptionId: vertrag.stripeSubscriptionId,
    vertragsschlussAm: vertrag.schlussAm,
    fristEnde,
    fristgerecht,
    vertragBezeichnung: eingeloggt ? vertragsBezeichnung(vertrag) : null,
    pruefHinweis: teile.join(" "),
  };
}

/** Letzte erfolgreiche Zahlung als Text („99,00 EUR am 12.09.2026") — best-effort. */
async function letzteZahlung(userId: string): Promise<string | null> {
  try {
    const { data, error } = await createServiceClient()
      .from("payments")
      .select("amount_cents,currency,paid_at,created_at")
      .eq("user_id", userId)
      .eq("status", "succeeded")
      .order("created_at", { ascending: false })
      .limit(1);
    if (error || !data?.[0]) return null;
    const z = data[0] as { amount_cents: number; currency: string | null; paid_at: string | null; created_at: string };
    const betrag = new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: (z.currency ?? "eur").toUpperCase(),
    }).format(z.amount_cents / 100);
    const tag = new Intl.DateTimeFormat("de-DE", {
      timeZone: "Europe/Berlin",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(z.paid_at ?? z.created_at));
    return `${betrag} am ${tag}`;
  } catch {
    return null;
  }
}

/* ── Missbrauchsschutz ────────────────────────────────────────────────────── */

/**
 * IP-Adresse als HMAC statt im Klartext — wie beim Kündigungsbutton, aber mit
 * eigenem Zweck-Präfix, damit der Hash nirgends sonst passt.
 */
export function ipHash(ip: string | null): string | null {
  if (!ip) return null;
  const secret =
    process.env.KUENDIGUNG_IP_SECRET?.trim() ||
    process.env.UNSUBSCRIBE_TOKEN_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) return null;
  return createHmac("sha256", secret).update(`widerruf-ip:${ip}`).digest("hex").slice(0, 32);
}

/** Höchstens so viele Einreichungen je Stunde. */
export const DROSSEL = {
  proEmail: 3,
  proIp: 10,
  fensterMs: 60 * 60 * 1000,
} as const;

/**
 * Drosselung über die Tabelle selbst. Schlägt die Abfrage fehl — etwa weil
 * Migration 090 noch fehlt —, wird **nicht** gesperrt: Einen Widerruf
 * abzuweisen wiegt schwerer als ein paar Einreichungen zu viel.
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
      .from("widerrufe")
      .select("id", { count: "exact", head: true })
      .eq(spalte, wert)
      .gte("eingegangen_am", seit);
    if (error) {
      console.error(`[widerruf] Drosselung (${spalte}) nicht prüfbar:`, error.message);
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
