import {
  ERINNERUNG_VORLAUF_TAGE,
  WHOP_UMZUG_KAMPAGNE,
  WHOP_UMZUG_STUFEN,
  type WhopUmzugStufe,
} from "@/config/whop-umzug";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Wer aus dem Whop-Umzug stammt, und wie weit er ist.
 *
 * Eine Stelle für drei Leser: die Kampagnen-Route
 * (`app/api/admin/whop-umzug`), die Adminansicht („Whop-Umzug") und der
 * Trockenlauf im Skript. Sie sollen dieselbe Liste sehen — eine Ansicht, die
 * anders zählt als der Versand, ist schlimmer als keine.
 *
 * Der Kreis ist **`profiles.whop_umzug_am is not null`** (Migration 100) und
 * nichts sonst. Weder eine CSV noch ein Resend-Segment: Wer angeschrieben
 * wird, muss in derselben Datenbank stehen, in der auch sein Zugang steht.
 */

/** Was mit einem Konto aus dem Umzug los ist. */
export interface UmzugStufenStand {
  mail: boolean;
  dm: boolean;
  am: string;
}

export interface UmzugMitglied {
  userId: string;
  email: string;
  vorname: string | null;
  name: string | null;
  discordId: string | null;
  /** Direktnachrichten abbestellt (`profiles.discord_dm_widerspruch`). */
  dmWiderspruch: boolean;
  /** Werbewiderspruch (`profiles.unsubscribed_at`). */
  werbeWiderspruch: boolean;
  /** Ende des bei Whop bezahlten Zeitraums (`profiles.access_until`). */
  zugangBis: string | null;
  /** Hat das Konto heute Zugang (`is_paid`)? */
  zugangOffen: boolean;
  /** Ein Stripe-Abo, das Geld bringt — dann ist der Umzug für ihn erledigt. */
  hatStripeAbo: boolean;
  importiertAm: string;
  /** Was diese Adresse aus der Kampagne schon bekommen hat. */
  gesendet: Partial<Record<WhopUmzugStufe, UmzugStufenStand>>;
  /** Was als Nächstes fällig wäre — `null`, wenn nichts ansteht. */
  faellig: WhopUmzugStufe | null;
  /** Tage bis zum Ende des bezahlten Zeitraums (negativ = vorbei). */
  tageRest: number | null;
}

export interface UmzugKreis {
  mitglieder: UmzugMitglied[];
  /** Konten im Umzug, die keine Adresse in `auth.users` mehr haben. */
  ohneAdresse: number;
}

/** Abos, die als „zahlt bei uns" gelten. Alles andere bringt kein Geld. */
const ZAHLENDE_STATI: ReadonlySet<string> = new Set(["active", "trialing", "past_due"]);

function vornameAus(name: string | null): string | null {
  const erstes = name?.trim().split(/\s+/)[0];
  return erstes ? erstes : null;
}

/** Ganze Tage von jetzt bis zum Zeitpunkt. Negativ heisst: schon vorbei. */
export function tageBis(iso: string | null, jetzt = Date.now()): number | null {
  if (!iso) return null;
  const ziel = new Date(iso).getTime();
  if (Number.isNaN(ziel)) return null;
  return Math.ceil((ziel - jetzt) / 86_400_000);
}

/**
 * Welche Stufe für dieses Konto ansteht.
 *
 * Die Reihenfolge ist der ganze Inhalt dieser Funktion:
 *
 *   1. **Ohne Datum gar nichts.** In jeder der drei Mails steht das
 *      persönliche Ablaufdatum, in Betreff und Text; ohne `access_until` gibt
 *      es nichts zu schreiben. So jemand taucht nicht als „fällig" auf,
 *      sondern im Trockenlauf und in der Adminansicht als offener Punkt —
 *      eine Stufe, von der man vorher weiss, dass ihr Versand scheitert, ist
 *      keine Fälligkeit, sondern ein Datenfehler.
 *   2. Ohne Ankündigung fängt nichts an — auch dann nicht, wenn der Zeitraum
 *      schon fast abgelaufen ist. „Dein Zugang endet heute" als allererste
 *      Nachricht wäre unverschämt.
 *   3. Wer bei uns abgeschlossen hat, bekommt nichts mehr. Jede weitere Stufe
 *      erzählt ihm, sein Zugang ende — und das stimmt dann nicht mehr.
 *   4. Ist der Zeitraum vorbei, ist „Ende" dran und nicht mehr die Erinnerung —
 *      sonst käme fünf Tage nach dem Ablauf noch eine Vorwarnung.
 */
export function faelligeStufe(m: Omit<UmzugMitglied, "faellig" | "tageRest">, jetzt = Date.now()): WhopUmzugStufe | null {
  if (!m.zugangBis) return null;
  if (!m.gesendet.ankuendigung) return "ankuendigung";
  if (m.hatStripeAbo) return null;

  const rest = tageBis(m.zugangBis, jetzt);
  if (rest === null) return null;

  if (rest <= 0) return m.gesendet.ende ? null : "ende";
  if (rest <= ERINNERUNG_VORLAUF_TAGE) return m.gesendet.erinnerung ? null : "erinnerung";
  return null;
}

/**
 * Den Kreis laden, ohne etwas zu ändern.
 *
 * **Wirft** bei jedem Lesefehler, statt eine kurze Liste zurückzugeben: Eine
 * fehlgeschlagene Abfrage sähe sonst aus wie „niemand offen" — und eine leere
 * Merkliste wie „noch niemand angeschrieben". Beim Versand an echte Mitglieder
 * ist das der teuerste denkbare Irrtum.
 */
export async function ladeUmzugKreis(jetzt = Date.now()): Promise<UmzugKreis> {
  const supabase = createServiceClient();

  const { data: profile, error: pFehler } = await supabase
    .from("profiles")
    .select(
      "id,full_name,is_paid,access_until,whop_umzug_am,discord_id,discord_dm_widerspruch,unsubscribed_at",
    )
    .not("whop_umzug_am", "is", null)
    .limit(5000);
  if (pFehler) throw new Error(`profiles nicht lesbar (Migration 100 eingespielt?): ${pFehler.message}`);

  const zeilen = (profile ?? []) as Array<{
    id: string;
    full_name: string | null;
    is_paid: boolean | null;
    access_until: string | null;
    whop_umzug_am: string;
    discord_id: string | null;
    discord_dm_widerspruch: boolean | null;
    unsubscribed_at: string | null;
  }>;
  if (zeilen.length === 0) return { mitglieder: [], ohneAdresse: 0 };

  const ids = zeilen.map((z) => z.id);

  const [aboRes, merkRes, verbindungRes] = await Promise.all([
    supabase.from("subscriptions").select("user_id,status").in("user_id", ids),
    supabase
      .from("kampagne_versand")
      .select("email,stufe,mail_gesendet,dm_gesendet,gesendet_am")
      .eq("kampagne", WHOP_UMZUG_KAMPAGNE)
      .limit(20000),
    supabase.from("discord_connections").select("user_id,discord_user_id").in("user_id", ids),
  ]);
  if (aboRes.error) throw new Error(`subscriptions nicht lesbar: ${aboRes.error.message}`);
  if (merkRes.error) throw new Error(`kampagne_versand nicht lesbar (Migration 082?): ${merkRes.error.message}`);
  if (verbindungRes.error) throw new Error(`discord_connections nicht lesbar: ${verbindungRes.error.message}`);

  /*
    Zwei Quellen für dieselbe Kennung, `discord_connections` zuerst — die
    Begründung steht in `lib/discord/konto.ts`: Eine Stelle, die nur eine der
    beiden liest, hat im Schwesterprojekt die halbe Kundschaft unsichtbar
    gemacht. Hier wäre die Folge eine Direktnachricht, die nie ankommt.
  */
  const discordJeUser = new Map(
    ((verbindungRes.data ?? []) as Array<{ user_id: string; discord_user_id: string | null }>)
      .filter((v) => v.discord_user_id)
      .map((v) => [v.user_id, v.discord_user_id as string]),
  );

  const mitAbo = new Set<string>();
  for (const a of (aboRes.data ?? []) as Array<{ user_id: string; status: string }>) {
    if (ZAHLENDE_STATI.has(a.status)) mitAbo.add(a.user_id);
  }

  /*
    Die Merkliste hängt an der Adresse, nicht an der Konto-ID — so ist sie in
    `kampagne_versand` angelegt (Eindeutigkeit über `lower(email)`), und so
    trägt sie auch dann, wenn ein Konto zwischendurch neu entsteht.
  */
  const merk = new Map<string, Partial<Record<WhopUmzugStufe, UmzugStufenStand>>>();
  for (const m of (merkRes.data ?? []) as Array<{
    email: string;
    stufe: string;
    mail_gesendet: boolean;
    dm_gesendet: boolean;
    gesendet_am: string;
  }>) {
    if (!(WHOP_UMZUG_STUFEN as readonly string[]).includes(m.stufe)) continue;
    const key = m.email.trim().toLowerCase();
    const eintrag = merk.get(key) ?? {};
    eintrag[m.stufe as WhopUmzugStufe] = {
      mail: m.mail_gesendet,
      dm: m.dm_gesendet,
      am: m.gesendet_am,
    };
    merk.set(key, eintrag);
  }

  // Adressen stehen in `auth.users`, nicht in `profiles`. Seitenweise holen.
  const emailJeUser = new Map<string, string>();
  for (let seite = 1; seite <= 50; seite++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: seite, perPage: 1000 });
    if (error) throw new Error(`Konten nicht lesbar: ${error.message}`);
    for (const u of data.users) if (u.email) emailJeUser.set(u.id, u.email.trim().toLowerCase());
    if (data.users.length < 1000) break;
  }

  const mitglieder: UmzugMitglied[] = [];
  let ohneAdresse = 0;

  for (const z of zeilen) {
    const email = emailJeUser.get(z.id);
    if (!email) {
      ohneAdresse++;
      continue;
    }
    const basis = {
      userId: z.id,
      email,
      vorname: vornameAus(z.full_name),
      name: z.full_name?.trim() || null,
      discordId: discordJeUser.get(z.id) ?? z.discord_id ?? null,
      dmWiderspruch: Boolean(z.discord_dm_widerspruch),
      werbeWiderspruch: Boolean(z.unsubscribed_at),
      zugangBis: z.access_until,
      zugangOffen: Boolean(z.is_paid),
      hatStripeAbo: mitAbo.has(z.id),
      importiertAm: z.whop_umzug_am,
      gesendet: merk.get(email) ?? {},
    };
    mitglieder.push({
      ...basis,
      faellig: faelligeStufe(basis, jetzt),
      tageRest: tageBis(z.access_until, jetzt),
    });
  }

  // Nach Ablauf sortiert: Wer zuerst dran ist, steht oben — in der Liste wie
  // im Versand.
  mitglieder.sort((a, b) => (a.zugangBis ?? "9999").localeCompare(b.zugangBis ?? "9999"));
  return { mitglieder, ohneAdresse };
}

/** Kurzfassung für Trockenlauf und Adminansicht. */
export function zaehleKreis(kreis: UmzugKreis) {
  const m = kreis.mitglieder;
  const faellig: Record<string, number> = {};
  for (const stufe of WHOP_UMZUG_STUFEN) faellig[stufe] = m.filter((x) => x.faellig === stufe).length;
  return {
    gesamt: m.length,
    ohneAdresse: kreis.ohneAdresse,
    mitDiscord: m.filter((x) => x.discordId).length,
    dmMoeglich: m.filter((x) => x.discordId && !x.dmWiderspruch && !x.werbeWiderspruch).length,
    werbeWiderspruch: m.filter((x) => x.werbeWiderspruch).length,
    ohneDatum: m.filter((x) => !x.zugangBis).length,
    zugangOffen: m.filter((x) => x.zugangOffen).length,
    abgelaufen: m.filter((x) => x.tageRest !== null && x.tageRest <= 0).length,
    umgezogen: m.filter((x) => x.hatStripeAbo).length,
    faellig,
  };
}
