import type { SupabaseClient } from "@supabase/supabase-js";
import { ENTFERNEN_MAX_PRO_NACHT, KARENZ_TAGE, SCHUTZROLLEN, abschiedNachKarenz } from "@/config/discord";
import {
  discordBotConfigured,
  kickGuildMember,
  listGuildMembers,
  listGuildRoles,
  sendeDirektnachricht,
} from "@/lib/discord/api";
import { hatZugang, mitgliedsRolleId, setzeMitgliedsrolle, warteraumRolleId } from "@/lib/discord/mitgliedschaft";
import { getAppUrl } from "@/lib/site-url";

/**
 * Der Rauswurf vom Discord-Server nach der Karenz — mit Abschiedsnachricht.
 *
 * Übernommen aus MoonTrading (`lib/admin/discord-aufraeumen.ts`), auf das
 * reduziert, was Capital Circle entschieden hat (Simon, 19.09.2026): **Wer
 * seit `KARENZ_TAGE` keinen Zugang mehr hat, wird vom Server entfernt**,
 * vorher bekommt er eine Direktnachricht. Die Einordnung Unzuordenbarer
 * („wer trägt eine Rolle ohne Konto?") aus MoonTrading gibt es hier bewusst
 * nicht: Entfernt wird ausschliesslich, wer ein verknüpftes Konto hat, dessen
 * Zugang nachweislich seit dreissig Tagen vorbei ist.
 *
 * ── Warum das die heikelste Datei des ganzen Systems ist ────────────────────
 *
 * Ein Rauswurf ist die einzige Handlung, die sich nicht zurücknehmen lässt:
 * Danach braucht die Person eine neue Einladung. Im Schwesterprojekt hat ein
 * Rauswurf einmal einen zahlenden Kunden erwischt, ein anderes Mal hätte eine
 * Liste zehn Freunde des Betreibers getroffen. Was ein Mensch vor dem Knopf
 * geleistet hätte, leisten hier die Schranken:
 *
 * 1. **Die Spur.** Angesehen wird nur, wer die Mitglieder- oder die
 *    Warteraumrolle trägt. Wer beides nicht hat (etwa weil er nach einem
 *    Rauswurf über den Funnel zurückkam), wird nie fällig.
 * 2. **Ein verknüpftes Konto** — ohne Konto keine Zahlungsdaten, also auch
 *    kein Urteil.
 * 3. **Kein Zugang** (`hatZugang`: `is_paid` oder Admin, dieselbe Regel wie
 *    bei den Inhalten — der Whop-Altbestand mit `free` und `is_paid` ist
 *    damit geschützt), **kein Lifetime/1:1**, **kein laufendes Abo**, **kein
 *    Aufschub**. Jede davon schützt, vor allem anderen.
 * 4. **Keine Schutzrolle** (`SCHUTZROLLEN`). Fehlt eine davon auf dem Server,
 *    läuft gar nichts, bis die Liste stimmt.
 * 5. **Ein Datum.** Fällig ist nur, wessen `access_until` länger als
 *    `KARENZ_TAGE` zurückliegt. Ohne Datum keine Fälligkeit.
 * 6. **Eine Obergrenze je Nacht** (`ENTFERNEN_MAX_PRO_NACHT`). Darüber passiert
 *    **nichts**: Das ist fast immer ein Datenfehler.
 * 7. **Abbruch bei 403.** Fehlt `Kick Members` oder steht jemand über dem Bot,
 *    bricht der Lauf ab, statt jede Nacht dieselben Abschiedsnachrichten an
 *    dieselben Menschen zu schicken.
 *
 * Ausser `kickGuildMember` hier gibt es keinen zweiten Aufrufer eines
 * Rauswurfs, und das soll so bleiben.
 */

export type Einordnung = "zahlt" | "geschuetzt" | "ohne_konto" | "ausgelaufen";

export interface AufraeumPerson {
  discordId: string;
  username: string;
  userId: string | null;
  einordnung: Einordnung;
  warteraum: boolean;
  /** Seit wann kein Zugang mehr besteht, aus `profiles.access_until`. */
  gesperrtSeit: string | null;
  /** Wann die Person entfernt wird, wenn nichts passiert. `null` = nie. */
  faelligAm: string | null;
  /** Werbung widersprochen (`unsubscribed_at`) — dann ohne Lifetime-Hinweis. */
  werbungWiderspruch: boolean;
  /** Direktnachrichten widersprochen — dann keine Abschiedsnachricht. */
  dmWiderspruch: boolean;
}

export interface Aufraeumstand {
  personen: AufraeumPerson[];
  zaehler: Record<Einordnung, number>;
  schutzrollenGefunden: string[];
  schutzrollenFehlend: string[];
  fehler: string[];
}

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
const TAG_MS = 86_400_000;

/**
 * Den Serverbestand gegen die Datenbank halten. **Liest ausschliesslich.**
 *
 * Bricht bei jedem Abfragefehler ab, statt eine Liste zu liefern, die nur so
 * aussieht wie eine: Eine leere Abo- oder Aufschubliste hiesse hier
 * „niemand zahlt", und dann wäre jeder fällig.
 */
export async function ladeAufraeumstand(service: SupabaseClient): Promise<Aufraeumstand> {
  const leer: Aufraeumstand = {
    personen: [],
    zaehler: { zahlt: 0, geschuetzt: 0, ohne_konto: 0, ausgelaufen: 0 },
    schutzrollenGefunden: [],
    schutzrollenFehlend: [],
    fehler: [],
  };

  const mitglied = mitgliedsRolleId();
  if (!discordBotConfigured() || !mitglied) {
    return { ...leer, fehler: ["Discord-Bot oder DISCORD_ROLE_ID ist nicht eingerichtet."] };
  }
  const warteraum = warteraumRolleId();

  let mitglieder: Awaited<ReturnType<typeof listGuildMembers>>;
  let rollen: Awaited<ReturnType<typeof listGuildRoles>>;
  try {
    [mitglieder, rollen] = await Promise.all([listGuildMembers(), listGuildRoles()]);
  } catch (err) {
    return { ...leer, fehler: [`Discord antwortet nicht: ${(err as Error).message}`] };
  }

  const profilSpalten = "id,discord_id,membership_tier,is_paid,is_admin,access_until,unsubscribed_at";
  const [ersterProfilRes, verbindungRes, aboRes, aufschubRes] = await Promise.all([
    service.from("profiles").select(`${profilSpalten},discord_dm_widerspruch`).limit(20000),
    service.from("discord_connections").select("user_id,discord_user_id").limit(20000),
    service.from("subscriptions").select("user_id").in("status", ["active", "trialing"]).limit(20000),
    service
      .from("zahlungsfall")
      .select("user_id")
      .eq("status", "aufschub")
      .gt("aufschub_bis", new Date().toISOString())
      .limit(20000),
  ]);

  /*
    Fehlt `discord_dm_widerspruch` (Migration 081 nicht eingespielt), wird ohne
    die Spalte gelesen — dann gibt es auch noch keinen Widerspruch. Ohne diesen
    Rückfall stünde der Rauswurf bis zur Migration still, und der Nachtlauf
    meldete jede Nacht einen Fehler.
  */
  const profilRes =
    ersterProfilRes.error && (ersterProfilRes.error.code === "42703" || ersterProfilRes.error.code === "PGRST204")
      ? await service.from("profiles").select(profilSpalten).limit(20000)
      : ersterProfilRes;

  const fehler: string[] = [];
  if (profilRes.error) fehler.push(`profiles: ${profilRes.error.message}`);
  if (verbindungRes.error) fehler.push(`discord_connections: ${verbindungRes.error.message}`);
  if (aboRes.error) fehler.push(`subscriptions: ${aboRes.error.message}`);
  // Fehlt die Tabelle (Migration 080), gibt es keine Aufschübe; jeder andere Fehler bricht ab.
  if (aufschubRes.error && aufschubRes.error.code !== "PGRST205" && aufschubRes.error.code !== "42P01") {
    fehler.push(`zahlungsfall: ${aufschubRes.error.message}`);
  }
  if (fehler.length > 0) return { ...leer, fehler };

  type P = {
    id: string;
    discord_id: string | null;
    membership_tier: string | null;
    is_paid: boolean | null;
    is_admin: boolean | null;
    access_until: string | null;
    unsubscribed_at: string | null;
    discord_dm_widerspruch?: boolean | null;
  };
  const profile = (profilRes.data ?? []) as P[];
  const profilPerId = new Map(profile.map((p) => [p.id, p]));
  const profilPerDiscord = new Map<string, P>();
  for (const p of profile) if (p.discord_id) profilPerDiscord.set(p.discord_id, p);
  for (const v of (verbindungRes.data ?? []) as Array<{ user_id: string; discord_user_id: string }>) {
    const p = profilPerId.get(v.user_id);
    if (p) profilPerDiscord.set(v.discord_user_id, p);
  }

  const mitAbo = new Set(((aboRes.data ?? []) as Array<{ user_id: string }>).map((a) => a.user_id));
  const mitAufschub = new Set(((aufschubRes.data ?? []) as Array<{ user_id: string }>).map((a) => a.user_id));

  const schutzIds = new Set(
    rollen.filter((r) => (SCHUTZROLLEN as readonly string[]).some((s) => norm(s) === norm(r.name))).map((r) => r.id),
  );
  const schutzrollenGefunden = rollen.filter((r) => schutzIds.has(r.id)).map((r) => r.name);
  const schutzrollenFehlend = (SCHUTZROLLEN as readonly string[]).filter(
    (s) => !rollen.some((r) => norm(r.name) === norm(s)),
  );

  const personen: AufraeumPerson[] = [];
  const jetzt = Date.now();

  for (const m of mitglieder) {
    const hatMitglied = m.roles.includes(mitglied);
    const imWarteraum = warteraum !== null && m.roles.includes(warteraum);
    // Die Spur: Wer weder Mitglieder- noch Warteraumrolle trägt, wird nie angesehen.
    if (!hatMitglied && !imWarteraum) continue;

    const profil = profilPerDiscord.get(m.id);
    let einordnung: Einordnung;

    if (m.roles.some((r) => schutzIds.has(r))) {
      einordnung = "geschuetzt";
    } else if (!profil) {
      einordnung = "ohne_konto";
    } else if (
      hatZugang(profil) ||
      profil.membership_tier === "lifetime" ||
      profil.membership_tier === "ht_1on1" ||
      mitAbo.has(profil.id) ||
      mitAufschub.has(profil.id)
    ) {
      einordnung = "zahlt";
    } else {
      einordnung = "ausgelaufen";
    }

    const gesperrtSeit = einordnung === "ausgelaufen" ? (profil?.access_until ?? null) : null;
    const gesperrtMs = gesperrtSeit ? Date.parse(gesperrtSeit) : NaN;
    const faelligAm =
      gesperrtSeit && !Number.isNaN(gesperrtMs) && gesperrtMs <= jetzt
        ? new Date(gesperrtMs + KARENZ_TAGE * TAG_MS).toISOString()
        : null;

    personen.push({
      discordId: m.id,
      username: m.username,
      userId: profil?.id ?? null,
      einordnung,
      warteraum: imWarteraum,
      gesperrtSeit,
      faelligAm,
      werbungWiderspruch: Boolean(profil?.unsubscribed_at),
      dmWiderspruch: Boolean(profil?.discord_dm_widerspruch),
    });
  }

  const zaehler = { ...leer.zaehler };
  for (const p of personen) zaehler[p.einordnung] += 1;

  return { personen, zaehler, schutzrollenGefunden, schutzrollenFehlend, fehler: [] };
}

/** Wer heute fällig ist. */
export function faelligeEntfernungen(stand: Aufraeumstand, jetzt = Date.now()): AufraeumPerson[] {
  return stand.personen.filter((p) => p.faelligAm && new Date(p.faelligAm).getTime() <= jetzt);
}

/** Wer in den nächsten `tage` Tagen fällig wird. */
export function baldFaellig(stand: Aufraeumstand, tage = 7, jetzt = Date.now()): AufraeumPerson[] {
  const grenze = jetzt + tage * TAG_MS;
  return stand.personen.filter((p) => {
    if (!p.faelligAm) return false;
    const t = new Date(p.faelligAm).getTime();
    return t > jetzt && t <= grenze;
  });
}

export interface EntfernErgebnis {
  discordId: string;
  username: string;
  userId: string | null;
  nachricht: "zugestellt" | "abgelehnt" | "widersprochen";
  rauswurf: "entfernt" | "war_nicht_da" | "keine_berechtigung" | "fehlgeschlagen";
  hinweis?: string;
}

export interface AutomatikBericht {
  gelaufen: boolean;
  faellig: number;
  entfernt: number;
  ergebnisse: EntfernErgebnis[];
  /** Warum nichts (oder nicht alles) passiert ist. */
  grund?: string;
}

/**
 * Der nächtliche Rauswurf. Erst die Abschiedsnachricht, dann der Rauswurf —
 * danach teilt der Bot keinen Server mehr mit der Person und kann ihr nichts
 * mehr schreiben. Eine abgelehnte Nachricht hält den Rauswurf nicht auf.
 *
 * Jeder Rauswurf landet in `user_audit_log` (`action = 'discord_rauswurf'`),
 * ein angehaltener Lauf ebenfalls: „Die Grenze war überschritten" ist die
 * wichtigste Zeile, die dieses Protokoll je enthalten wird.
 */
export async function entferneFaelligeAutomatisch(service: SupabaseClient): Promise<AutomatikBericht> {
  const stand = await ladeAufraeumstand(service);
  if (stand.fehler.length > 0) {
    return { gelaufen: false, faellig: 0, entfernt: 0, ergebnisse: [], grund: stand.fehler.join(" ") };
  }

  if (stand.schutzrollenFehlend.length > 0) {
    return {
      gelaufen: false,
      faellig: 0,
      entfernt: 0,
      ergebnisse: [],
      grund:
        `Diese Schutzrollen gibt es auf dem Server nicht: ${stand.schutzrollenFehlend.join(", ")}. ` +
        "Solange sie niemanden schützen, wird nichts entfernt. Wurden sie umbenannt, gehört der neue Name " +
        "in config/discord.ts (SCHUTZROLLEN).",
    };
  }

  const faellig = faelligeEntfernungen(stand);
  if (faellig.length === 0) return { gelaufen: true, faellig: 0, entfernt: 0, ergebnisse: [] };

  if (faellig.length > ENTFERNEN_MAX_PRO_NACHT) {
    const grund =
      `${faellig.length} fällige Entfernungen überschreiten die Grenze von ${ENTFERNEN_MAX_PRO_NACHT} je Nacht. ` +
      "Es wurde niemand entfernt. Das ist fast immer ein Datenfehler und keine echte Abwanderung.";
    await protokolliere(service, null, "discord_rauswurf_angehalten", { grund, faellig: faellig.length });
    return { gelaufen: false, faellig: faellig.length, entfernt: 0, ergebnisse: [], grund };
  }

  const appUrl = getAppUrl();
  const ergebnisse: EntfernErgebnis[] = [];

  for (const person of faellig) {
    let nachricht: EntfernErgebnis["nachricht"] = "widersprochen";
    if (!person.dmWiderspruch) {
      const mitLifetime = !person.werbungWiderspruch && person.userId ? await lifetimeKaufbar(person.userId) : false;
      nachricht = (await sendeDirektnachricht(
        person.discordId,
        abschiedNachKarenz({ appUrl, tage: KARENZ_TAGE, mitLifetime }),
      ))
        ? "zugestellt"
        : "abgelehnt";
    }

    let hinweis: string | undefined;
    try {
      // Falls der Rauswurf scheitert, ist wenigstens die Mitgliederrolle weg.
      await setzeMitgliedsrolle(person.discordId, false);
    } catch (err) {
      hinweis = (err as Error).message;
    }

    let raus: Awaited<ReturnType<typeof kickGuildMember>>;
    try {
      raus = await kickGuildMember(person.discordId, `Mitgliedschaft seit ${KARENZ_TAGE} Tagen beendet`);
    } catch (err) {
      raus = { art: "fehler", status: 0, text: (err as Error).message };
    }
    const rauswurf: EntfernErgebnis["rauswurf"] = raus.art === "fehler" ? "fehlgeschlagen" : raus.art;
    if (raus.art === "fehler") hinweis = `${raus.status}: ${raus.text.slice(0, 200)}`;

    ergebnisse.push({ discordId: person.discordId, username: person.username, userId: person.userId, nachricht, rauswurf, hinweis });

    if (rauswurf === "entfernt" && person.userId) {
      await protokolliere(service, person.userId, "discord_rauswurf", {
        discordId: person.discordId,
        username: person.username,
        gesperrtSeit: person.gesperrtSeit,
        nachricht,
      });
    }

    /*
      ── Ein 403 beendet den ganzen Lauf ───────────────────────────────────────

      Fehlt `Kick Members`, betrifft das jeden Folgenden; trägt die Person eine
      höhere Rolle, ist sie ausgerechnet jemand, den man nie entfernen wollte.
      Weiterzumachen hiesse, jede Nacht dieselbe Abschiedsnachricht an
      dieselben Menschen zu schicken.
    */
    if (rauswurf === "keine_berechtigung") {
      const grund =
        `Discord hat den Rauswurf von ${person.username} mit 403 abgelehnt. Der Lauf wurde abgebrochen, damit nicht ` +
        "jede Nacht dieselbe Abschiedsnachricht rausgeht. Fast immer fehlt dem Bot „Kick Members“ oder die " +
        "Person steht über dem Bot — prüfen mit npm run discord:check.";
      await protokolliere(service, person.userId, "discord_rauswurf_angehalten", { grund });
      return {
        gelaufen: false,
        faellig: faellig.length,
        entfernt: ergebnisse.filter((e) => e.rauswurf === "entfernt").length,
        ergebnisse,
        grund,
      };
    }
  }

  return {
    gelaufen: true,
    faellig: faellig.length,
    entfernt: ergebnisse.filter((e) => e.rauswurf === "entfernt").length,
    ergebnisse,
  };
}

async function lifetimeKaufbar(userId: string): Promise<boolean> {
  try {
    const { pruefeLifetimeAngebot } = await import("@/lib/access-control/lifetime-offer");
    return (await pruefeLifetimeAngebot(userId)).erlaubt;
  } catch {
    return false;
  }
}

/** Ins Admin-Protokoll. Wirft nie. */
async function protokolliere(
  service: SupabaseClient,
  userId: string | null,
  aktion: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await service.from("user_audit_log").insert({
    target_user_id: userId,
    admin_user_id: null,
    action: aktion,
    metadata,
  });
  if (error) console.warn(`[discord/aufraeumen] Protokoll nicht schreibbar (${aktion}): ${error.message}`);
}
