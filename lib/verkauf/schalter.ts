import { createServiceClient } from "@/lib/supabase/service";

/**
 * Verkaufsschalter: Ist der normale Zugang (Verkaufsseite + Abo-/Lifetime-Kauf)
 * geschlossen? (Entscheidung Simon, 02.11.2026)
 *
 * Der Zugang läuft dann nur noch über den Funnel (vorerst `/call`, später das
 * kostenlose Training). Umgelegt wird unter `/admin/verkauf`, gespeichert in
 * `app_settings` unter `verkauf_geschlossen` — dieselbe Tabelle wie der
 * Wartungsmodus, öffentlich lesbar, Schreiben nur über die Admin-API.
 *
 * Was „geschlossen" sperrt — und was ausdrücklich nicht:
 *   - `/` zeigt statt der Verkaufsseite die Hinweisseite `/geschlossen`
 *     (Rewrite in `proxy.ts`, die Adresse bleibt `/`; die Verkaufsseite selbst
 *     bleibt statisch). `/vorschau` zeigt die Verkaufsseite weiterhin.
 *   - `/go/<plan>` — die Gast-Kasse, **auch** die Whop-Umzugslinks
 *     (`?src=whop`) — leitet auf `/` und legt keine Stripe-Session an.
 *   - `/api/stripe/create-checkout-session` lehnt Abo **und** Lifetime ab.
 *     Die Abo-Seite im Mitgliederbereich zeigt Konten ohne laufendes Abo statt
 *     der Paketreihe den Hinweis.
 *   - Lifetime: `pruefeLifetimeAngebot()` antwortet `verkauf_geschlossen`,
 *     damit verschwinden Karte, Popup und die Lifetime-Absätze in Mails.
 *   - Werbe-Folgemails, die auf die gesperrte Kasse zeigen (Whop- und
 *     Plattform-Umzug), pausieren.
 *
 *   Offen bleiben: laufende Abos (Verlängerung, Jahreswechsel, Kündigung,
 *   Zahlungsstörungen), der Mentoring-Verkauf über Kassenlinks (`/kasse`),
 *   `/call`, Login und Rechtsseiten.
 *
 * **Fehlt die Zeile oder ist sie nicht lesbar, gilt „offen".** Ein DB-Aussetzer
 * soll die Seite nicht wie geschlossen aussehen lassen — die Kasse funktionierte
 * in dem Moment ohnehin nicht.
 */

export const VERKAUF_SCHLUESSEL = "verkauf_geschlossen";

/** Request-Header, den `proxy.ts` beim Rewrite von `/` auf `/geschlossen` setzt. */
export const VERKAUF_REWRITE_HEADER = "x-cc-verkauf";

export type VerkaufsSchalter = {
  geschlossen: boolean;
  /** Überschrift der Hinweisseite. */
  ueberschrift: string;
  /** Fließtext darunter. */
  nachricht: string;
  /** Wohin der Hauptknopf führt: interner Pfad (`/call`) oder `https://…`. */
  zielUrl: string;
  /** Beschriftung des Hauptknopfs. */
  zielLabel: string;
};

export const VERKAUF_STANDARD: Omit<VerkaufsSchalter, "geschlossen"> = {
  ueberschrift: "Die Aufnahme läuft ab sofort nur noch über ein persönliches Gespräch.",
  nachricht:
    "Wir nehmen neue Mitglieder nicht mehr direkt über diese Seite auf. Sprich mit uns: Wir schauen uns deine Situation an und sagen dir ehrlich, welcher Weg für dich passt.",
  zielUrl: "/call",
  zielLabel: "Kostenloses Gespräch anfragen",
};

const GRENZEN = { ueberschrift: 160, nachricht: 1000, zielUrl: 300, zielLabel: 60 } as const;

/**
 * Ziel des Knopfs: nur ein interner Pfad (`/…`, aber nicht `//…`) oder eine
 * `https://`-Adresse. Alles andere (`javascript:`, `http:`, Tippfehler) wird
 * verworfen — der Wert landet als `href` auf einer öffentlichen Seite.
 */
export function istGueltigesZiel(wert: string): boolean {
  if (wert.startsWith("/")) return !wert.startsWith("//") && !/\s/.test(wert);
  try {
    const url = new URL(wert);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function text(roh: unknown, grenze: number): string {
  return typeof roh === "string" ? roh.trim().slice(0, grenze) : "";
}

/** Liest den gespeicherten Wert tolerant; leere Felder fallen auf den Standard. */
export function leseVerkaufsSchalter(roh: unknown): VerkaufsSchalter {
  const v = (roh && typeof roh === "object" ? roh : {}) as Record<string, unknown>;
  const ziel = text(v.zielUrl, GRENZEN.zielUrl);
  return {
    geschlossen: v.geschlossen === true,
    ueberschrift: text(v.ueberschrift, GRENZEN.ueberschrift) || VERKAUF_STANDARD.ueberschrift,
    nachricht: text(v.nachricht, GRENZEN.nachricht) || VERKAUF_STANDARD.nachricht,
    zielUrl: ziel && istGueltigesZiel(ziel) ? ziel : VERKAUF_STANDARD.zielUrl,
    zielLabel: text(v.zielLabel, GRENZEN.zielLabel) || VERKAUF_STANDARD.zielLabel,
  };
}

/**
 * Prüft eine Eingabe aus dem Admin. Anders als `leseVerkaufsSchalter` lehnt sie
 * ein ungültiges Ziel ab, statt es still zu ersetzen — wer sich vertippt, soll
 * das sehen.
 */
export function pruefeEingabe(
  roh: unknown,
): { ok: true; wert: VerkaufsSchalter } | { ok: false; fehler: string } {
  const v = (roh && typeof roh === "object" ? roh : {}) as Record<string, unknown>;
  if (typeof v.geschlossen !== "boolean") return { ok: false, fehler: "geschlossen_muss_boolean_sein" };
  const ziel = text(v.zielUrl, GRENZEN.zielUrl);
  if (ziel && !istGueltigesZiel(ziel)) {
    return { ok: false, fehler: "Ziel muss ein Pfad wie /call oder eine https://-Adresse sein." };
  }
  return {
    ok: true,
    wert: {
      geschlossen: v.geschlossen,
      ueberschrift: text(v.ueberschrift, GRENZEN.ueberschrift),
      nachricht: text(v.nachricht, GRENZEN.nachricht),
      zielUrl: ziel,
      zielLabel: text(v.zielLabel, GRENZEN.zielLabel),
    },
  };
}

/** Frisch aus der Datenbank, ohne Zwischenspeicher. Für Kasse und Seiten. */
export async function ladeVerkaufsSchalter(): Promise<VerkaufsSchalter & { updatedAt: string | null }> {
  try {
    const { data, error } = await createServiceClient()
      .from("app_settings")
      .select("value, updated_at")
      .eq("key", VERKAUF_SCHLUESSEL)
      .maybeSingle();
    if (error || !data) return { ...leseVerkaufsSchalter(null), updatedAt: null };
    return {
      ...leseVerkaufsSchalter((data as { value: unknown }).value),
      updatedAt: ((data as { updated_at?: string | null }).updated_at as string | null) ?? null,
    };
  } catch {
    return { ...leseVerkaufsSchalter(null), updatedAt: null };
  }
}

/** Kurzform für Riegel: Ist der Verkauf gerade geschlossen? */
export async function istVerkaufGeschlossen(): Promise<boolean> {
  return (await ladeVerkaufsSchalter()).geschlossen;
}
