/**
 * Die letzten Whop-Zahler in unsere Datenbank holen.
 *
 * Liest einen Whop-Mitgliederexport (CSV) und legt je Zeile ein Konto an
 * bzw. bringt ein vorhandenes auf Stand:
 *
 *   is_paid        = true              Zugang wie beim Whop-Altbestand
 *   membership_tier = 'free'           dieselbe Stufe wie der Altbestand —
 *                                      KEINE neue Stufe erfinden
 *   access_until   = Ende des bei Whop bezahlten Zeitraums
 *   whop_umzug_am  = jetzt             Herkunft (Migration 100). Daran hängt
 *                                      der Ablauf im Nachtlauf und der
 *                                      Empfängerkreis der Kampagne.
 *   discord_id / discord_username      aus der CSV, nur wo noch nichts steht
 *
 * und vergibt die Discord-Mitgliederrolle, wenn das Konto auf dem Server ist.
 *
 * ── Aufruf ──────────────────────────────────────────────────────────────────
 *
 *   npm run whop:import -- "C:/Pfad/zum/Whop-Export.csv"
 *       Trockenlauf (Standard). Zeigt Zeile für Zeile, was passieren würde,
 *       und schreibt nichts.
 *
 *   npm run whop:import -- "…/export.csv" --apply
 *       Scharf.
 *
 *   npm run whop:import -- "…/export.csv" --nur deva90@example.com [--apply]
 *       Nur diese eine Zeile.
 *
 *   npm run whop:import -- --testzeile [--apply]
 *       Ohne CSV: eine Wegwerf-Zeile auf `delivered+cc-whop-<zeit>@resend.dev`
 *       mit Ablauf in 7 Tagen. Zum Proben des ganzen Wegs, ohne eine echte
 *       Person anzufassen. Die angelegte User-ID steht am Ende — damit
 *       aufräumen:
 *
 *   npm run whop:import -- --testzeile --email ich@meine.de --discord 1234… --tage 3 --apply
 *       Dasselbe, aber an die eigene Adresse und das eigene Discord-Konto —
 *       nur so sieht man Mail und Direktnachricht wirklich. `--tage` steuert,
 *       welche Stufe danach fällig ist (≤ 5 ergibt die Erinnerung, 0 das
 *       Ende). Danach genauso aufräumen.
 *
 *   npm run whop:import -- --aufraeumen <user-id> --apply
 *       Löscht genau diese eine Zeile: erst das Profil, dann den Auth-User.
 *       Eine ID, kein Muster, kein „alle Testkonten".
 *
 * ── Was dieses Skript nicht tut ─────────────────────────────────────────────
 *
 * Es verschickt nichts. Mail und Direktnachricht laufen über
 * `npm run whop:umzug` bzw. `/api/admin/whop-umzug`. Getrennt, weil der Import
 * wiederholbar sein muss und Post an Menschen genau einmal rausgeht.
 *
 * ── Datenschutz ─────────────────────────────────────────────────────────────
 *
 * Die CSV enthält Namen, Adressen, Discord-Kennungen und Wohnorte von echten
 * Menschen. Sie gehört **nicht ins Repo**. Dieses Skript schreibt deshalb nie
 * eine vollständige Adresse ins Protokoll, sondern nur eine maskierte Form —
 * ein Terminal-Mitschnitt in einem Ticket ist schneller passiert, als man
 * denkt.
 */

import { existsSync, readFileSync } from "node:fs";
import { register } from "node:module";
import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

for (const file of [".env.local", ".env"]) {
  const full = path.resolve(process.cwd(), file);
  if (existsSync(full)) dotenv.config({ path: full, override: false, quiet: true });
}

// Erlaubt den direkten Import der .ts-Quellen (Alias @/ + Extension-Auflösung).
register("./ts-loader.mjs", import.meta.url);

/* ─── Argumente ──────────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
function arg(name) {
  const mitWert = argv.find((a) => a.startsWith(`--${name}=`));
  if (mitWert) return mitWert.split("=").slice(1).join("=");
  const i = argv.indexOf(`--${name}`);
  if (i !== -1) {
    const next = argv[i + 1];
    return next && !next.startsWith("--") ? next : true;
  }
  return undefined;
}

const schreiben = argv.includes("--apply");
const nurAdresse = typeof arg("nur") === "string" ? arg("nur").trim().toLowerCase() : null;
const testzeile = argv.includes("--testzeile");
const aufraeumenId = typeof arg("aufraeumen") === "string" ? arg("aufraeumen").trim() : null;
const csvPfad = argv.find((a) => !a.startsWith("--") && !a.startsWith("-"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !serviceRole) {
  console.error("✗ NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein (.env.local).");
  process.exit(1);
}
const supabase = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });

/* ─── Hilfsmittel ────────────────────────────────────────────────────────── */

/**
 * Adresse fürs Protokoll unkenntlich machen: `deva90@outlook.com` →
 * `de****@o******.com`. Genug, um Zeilen auseinanderzuhalten, zu wenig, um
 * jemanden zu identifizieren.
 */
function maskiere(email) {
  const [lokal = "", domain = ""] = String(email).split("@");
  const punkt = domain.lastIndexOf(".");
  const dName = punkt === -1 ? domain : domain.slice(0, punkt);
  const tld = punkt === -1 ? "" : domain.slice(punkt);
  return `${lokal.slice(0, 2)}${"*".repeat(Math.max(lokal.length - 2, 0))}@${dName.slice(0, 1)}${"*".repeat(Math.max(dName.length - 1, 0))}${tld}`;
}

/**
 * Whops Datumsformat in ein ISO-Datum. Der Export liefert
 * `2026-10-04 18:06:54 +0200` — das ist **kein** gültiges ISO-8601, und
 * `new Date(...)` darauf ist implementierungsabhängig. Also von Hand
 * normalisieren, statt darauf zu hoffen.
 *
 * Liefert `null`, wenn nichts Brauchbares dasteht. Geraten wird nie: Ein
 * falsches `access_until` nimmt jemandem den Zugang zu früh oder schenkt ihn
 * zu lange, und beides fällt erst auf, wenn es passiert ist.
 */
function parseWhopDatum(roh) {
  const s = String(roh ?? "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})\s*([+-]\d{2}):?(\d{2})?$/);
  const iso = m ? `${m[1]}T${m[2]}${m[3]}:${m[4] ?? "00"}` : s;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** CSV nach RFC 4180 (Anführungszeichen, doppelte Anführungszeichen, CRLF). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") continue;
    else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""));
}

/** Stufen, die bedeuten: Diese Person zahlt bereits bei uns. */
const EIGENE_STUFEN = new Set(["monthly", "quarterly", "yearly", "lifetime", "ht_1on1"]);
const ZAHLENDE_STATI = new Set(["active", "trialing", "past_due"]);

/* ─── Aufräumen (eine ID, explizit) ──────────────────────────────────────── */

if (aufraeumenId) {
  if (!/^[0-9a-f-]{36}$/i.test(aufraeumenId)) {
    console.error("✗ --aufraeumen erwartet genau eine User-ID (UUID).");
    process.exit(1);
  }
  if (!schreiben) {
    console.log(`Trockenlauf: würde Profil und Auth-User ${aufraeumenId} löschen. Mit --apply wirklich.`);
    process.exit(0);
  }
  /*
    Erst das Profil, dann der Auth-User — in dieser Reihenfolge und einzeln.
    `auth.users` löscht per Cascade das Profil gleich mit; darauf wird hier
    bewusst nicht vertraut, damit im Protokoll steht, dass beide Zeilen weg
    sind, und nicht nur, dass eine Cascade gelaufen sein müsste.
  */
  const { error: pFehler } = await supabase.from("profiles").delete().eq("id", aufraeumenId);
  if (pFehler) {
    console.error(`✗ Profil ${aufraeumenId} nicht gelöscht: ${pFehler.message}`);
    process.exit(1);
  }
  console.log(`✓ Profil ${aufraeumenId} gelöscht.`);
  const { error: uFehler } = await supabase.auth.admin.deleteUser(aufraeumenId);
  if (uFehler) {
    console.error(`✗ Auth-User ${aufraeumenId} nicht gelöscht: ${uFehler.message}`);
    process.exit(1);
  }
  console.log(`✓ Auth-User ${aufraeumenId} gelöscht.`);
  const { data: nachher } = await supabase.from("profiles").select("id").eq("id", aufraeumenId).maybeSingle();
  console.log(nachher ? "✗ Profil steht noch da!" : "✓ Beleg: Profil ist weg.");
  process.exit(0);
}

/* ─── Zeilen einlesen ────────────────────────────────────────────────────── */

/** @typedef {{email:string,name:string|null,discordId:string|null,discordName:string|null,ende:string|null,endeQuelle:string}} Zeile */

/** @type {Zeile[]} */
let zeilen = [];

if (testzeile) {
  const stempel = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const tage = Number(arg("tage", 7)) || 7;
  const ende = new Date(Date.now() + tage * 86_400_000).toISOString();
  /*
    `--email` und `--discord` sind für den Einzeltest gedacht: Eine
    `@resend.dev`-Adresse beweist, dass der Versand durchläuft, aber niemand
    sieht die Mail, und eine Direktnachricht geht ohne Discord-Kennung gar
    nicht erst raus. Wer den Weg wirklich prüfen will, setzt hier seine eigene
    Adresse und seine eigene Discord-ID ein — und räumt die Zeile danach mit
    `--aufraeumen` wieder ab.
  */
  const eigeneMail = typeof arg("email") === "string" ? arg("email").trim().toLowerCase() : null;
  const eigeneDiscordId = typeof arg("discord") === "string" ? arg("discord").trim() : null;
  zeilen = [
    {
      email: eigeneMail ?? `delivered+cc-whop-${stempel}@resend.dev`,
      name: "Wegwerf Testzeile",
      discordId: eigeneDiscordId && /^\d{5,25}$/.test(eigeneDiscordId) ? eigeneDiscordId : null,
      discordName: null,
      ende,
      endeQuelle: `Testzeile (+${tage} Tage)`,
    },
  ];
  console.log(
    `→ --testzeile: eine erfundene Zeile, keine CSV.` +
      `${eigeneMail ? "  ⚠ eigene Adresse statt Wegwerf-Adresse" : ""}` +
      `${eigeneDiscordId ? "  ⚠ mit Discord-ID (die DM geht wirklich raus)" : ""}\n`,
  );
} else {
  if (!csvPfad) {
    console.error('✗ Kein CSV-Pfad. Aufruf: npm run whop:import -- "C:/Pfad/export.csv" [--apply]');
    process.exit(1);
  }
  if (!existsSync(csvPfad)) {
    console.error(`✗ Datei nicht gefunden: ${csvPfad}`);
    process.exit(1);
  }

  const rows = parseCsv(readFileSync(csvPfad, "utf8").replace(/^\uFEFF/, ""));
  if (rows.length < 2) {
    console.error("✗ Die Datei enthält keine Datenzeilen.");
    process.exit(1);
  }
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const spalte = (name) => header.indexOf(name.toLowerCase());
  const iEmail = spalte("Email");
  if (iEmail === -1) {
    console.error(`✗ Keine Spalte „Email". Kopfzeile: ${rows[0].join(", ")}`);
    process.exit(1);
  }
  const iName = spalte("Name");
  const iDiscordId = spalte("Discord ID");
  const iDiscordName = spalte("Discord username");
  const iRenewal = spalte("Renewal date");
  const iExpiring = spalte("Expiring date");
  const iCanceling = spalte("Canceling date");

  const gesehen = new Set();
  const dubletten = [];
  for (const r of rows.slice(1)) {
    const email = (r[iEmail] ?? "").trim().toLowerCase();
    if (!email.includes("@")) continue;
    if (gesehen.has(email)) {
      dubletten.push(email);
      continue;
    }
    gesehen.add(email);

    /*
      Die Reihenfolge der Datumsquellen ist die Reihenfolge der Verbindlichkeit:
      `Renewal date` ist der Tag, an dem Whop das nächste Mal abbuchen würde —
      also genau bis dahin ist bezahlt. `Expiring`/`Canceling` stehen nur bei
      bereits gekündigten Mitgliedschaften. Steht nichts davon da, wird **nicht
      geraten**: Die Zeile kommt ohne Datum durch und in den Bericht.
    */
    const kandidaten = [
      ["Renewal date", iRenewal],
      ["Expiring date", iExpiring],
      ["Canceling date", iCanceling],
    ];
    let ende = null;
    let endeQuelle = "—";
    for (const [bez, idx] of kandidaten) {
      if (idx === -1) continue;
      const parsed = parseWhopDatum(r[idx]);
      if (parsed) {
        ende = parsed;
        endeQuelle = bez;
        break;
      }
    }

    const discordId = iDiscordId === -1 ? null : (r[iDiscordId] ?? "").trim() || null;
    const discordName = iDiscordName === -1 ? null : (r[iDiscordName] ?? "").trim() || null;

    zeilen.push({
      email,
      name: (iName === -1 ? "" : (r[iName] ?? "").trim()) || null,
      discordId: discordId && /^\d{5,25}$/.test(discordId) ? discordId : null,
      discordName: discordName && discordName !== " " ? discordName : null,
      ende,
      endeQuelle,
    });
  }

  console.log(`→ ${rows.length - 1} Datenzeilen, ${zeilen.length} eindeutige Adressen.`);
  if (dubletten.length > 0) {
    console.log(`  ⚠ ${dubletten.length} Dublette(n) übersprungen: ${dubletten.map(maskiere).join(", ")}`);
  }
}

if (nurAdresse) {
  zeilen = zeilen.filter((z) => z.email === nurAdresse);
  if (zeilen.length === 0) {
    console.error(`✗ ${maskiere(nurAdresse)} steht nicht in der Liste.`);
    process.exit(1);
  }
}

console.log(`\nWhop-Umzug — Import (${schreiben ? "APPLY" : "Trockenlauf"})\n`);

/* ─── Discord-Rolle (TS-Quelle) ──────────────────────────────────────────── */

let setzeMitgliedsrolle = null;
try {
  ({ setzeMitgliedsrolle } = await import("../lib/discord/mitgliedschaft.ts"));
} catch (err) {
  console.warn(`  ⚠ Discord-Modul nicht ladbar, Rollen werden übersprungen: ${err.message}`);
}
const { findeUserIdZuEmail } = await import("../lib/checkout/user-lookup.ts");

/* ─── Profil lesen, auch ohne Migration 100 ──────────────────────────────── */

const PROFIL_SPALTEN =
  "id,full_name,is_paid,membership_tier,access_until,discord_id,discord_username,lifetime_purchased_at";

/**
 * Ist Migration 100 noch nicht eingespielt, gibt es `whop_umzug_am` nicht.
 *
 * Gearbeitet wird in dieser Reihenfolge: erst der Trockenlauf, um zu sehen,
 * was auf einen zukommt, dann die Migration, dann `--apply`. Ein Trockenlauf,
 * der vorher an jeder bestehenden Zeile abbricht, macht den ersten Schritt
 * wertlos — also läuft er auch ohne die Spalte, mit einem Hinweis.
 *
 * **Geprüft wird vor der ersten Zeile**, nicht mittendrin. Ein `--apply`, das
 * erst nach dem Anlegen des Kontos merkt, dass die Herkunft nirgends
 * hinkann, liesse ein Konto ohne Merkmal zurück: Der Nachtlauf fände es nie
 * wieder, und sein Zugang liefe nie ab.
 */
let spalteFehlt = false;

async function pruefeSpalte() {
  const { error } = await supabase.from("profiles").select("whop_umzug_am").limit(1);
  if (!error) return;
  if (!/whop_umzug_am|does not exist|schema cache/i.test(error.message)) {
    console.error(`✗ profiles nicht lesbar: ${error.message}`);
    process.exit(1);
  }
  spalteFehlt = true;
  if (schreiben) {
    console.error(
      "\n✗ profiles.whop_umzug_am fehlt — Migration 100 ist nicht eingespielt.\n" +
        "  Ohne diese Spalte hätte kein Konto eine Herkunft: Der Nachtlauf beendete die Zugänge nie,\n" +
        "  und die Kampagne fände keinen Empfänger. Es wurde nichts angelegt und nichts geändert.\n" +
        "  Erst supabase/migrations/100_whop_umzug.sql im Supabase-SQL-Editor ausführen,\n" +
        "  danach `npm run db:check`, dann diesen Lauf wiederholen.\n",
    );
    process.exit(1);
  }
  console.log("⚠ profiles.whop_umzug_am fehlt (Migration 100 noch nicht eingespielt) — der Trockenlauf rechnet ohne.\n");
}

async function leseProfil(userId) {
  const spalten = spalteFehlt ? PROFIL_SPALTEN : `${PROFIL_SPALTEN},whop_umzug_am`;
  const { data, error } = await supabase.from("profiles").select(spalten).eq("id", userId).maybeSingle();
  if (error) throw new Error(`profiles nicht lesbar: ${error.message}`);
  if (!data) return null;
  return spalteFehlt ? { ...data, whop_umzug_am: null } : data;
}

/**
 * Die über OAuth verknüpfte Discord-Kennung, falls es eine gibt.
 *
 * `discord_connections` ist die belastbarere Quelle — sie entsteht nur, wenn
 * jemand selbst auf „Discord verbinden" geklickt hat. Die CSV ist ein Export
 * von gestern; eine Kennung daraus über eine bestehende Verknüpfung zu
 * schreiben, hiesse im schlechtesten Fall, einem Mitglied die Rolle auf einem
 * fremden Discord-Konto zu geben. Siehe `lib/discord/konto.ts`.
 */
async function verknuepfteDiscordId(userId) {
  const { data, error } = await supabase
    .from("discord_connections")
    .select("discord_user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`discord_connections nicht lesbar: ${error.message}`);
  return data?.discord_user_id ?? null;
}

/* ─── Lauf ───────────────────────────────────────────────────────────────── */

await pruefeSpalte();

const jetzt = new Date().toISOString();
const bilanz = {
  angelegt: 0,
  aktualisiert: 0,
  unveraendert: 0,
  uebersprungenStripe: 0,
  ohneDatum: 0,
  discordGesetzt: 0,
  discordNichtImServer: 0,
  fehler: 0,
};
const anmerkungen = [];
const neueIds = [];

for (const z of zeilen) {
  const tag = maskiere(z.email);
  try {
    /* 1. Konto finden oder anlegen. */
    let userId = await findeUserIdZuEmail(supabase, z.email);
    let neu = false;

    if (!userId) {
      if (!schreiben) {
        console.log(`  [neu]        ${tag}  Zugang bis ${z.ende ? z.ende.slice(0, 10) : "—"} (${z.endeQuelle})`);
        bilanz.angelegt++;
        if (!z.ende) {
          bilanz.ohneDatum++;
          anmerkungen.push(`${tag}: kein Ablaufdatum in der CSV — access_until bleibt leer, Kampagne überspringt ihn.`);
        }
        continue;
      }
      const { data, error } = await supabase.auth.admin.createUser({
        email: z.email,
        email_confirm: true,
        ...(z.name ? { user_metadata: { full_name: z.name } } : {}),
      });
      if (error || !data?.user) {
        // „already registered" kann zwischen Suche und Anlage passieren — dann nachsehen.
        userId = await findeUserIdZuEmail(supabase, z.email);
        if (!userId) throw new Error(`Konto nicht anlegbar: ${error?.message ?? "unbekannt"}`);
      } else {
        userId = data.user.id;
        neu = true;
        neueIds.push({ email: z.email, userId });
      }
    }

    /* 2. Profil lesen. */
    const profil = await leseProfil(userId);
    if (!profil) throw new Error("Konto da, aber keine profiles-Zeile (Trigger 003 kaputt?)");

    /* 3. Zahlt diese Person schon bei uns? Dann nichts anfassen. */
    const { data: abos, error: aboFehler } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", userId);
    if (aboFehler) throw new Error(`subscriptions nicht lesbar: ${aboFehler.message}`);
    const zahltBeiUns =
      (abos ?? []).some((a) => ZAHLENDE_STATI.has(a.status)) ||
      EIGENE_STUFEN.has(profil.membership_tier ?? "free") ||
      Boolean(profil.lifetime_purchased_at);

    if (zahltBeiUns) {
      bilanz.uebersprungenStripe++;
      console.log(`  [übersprungen] ${tag}  zahlt bereits bei uns (Stufe ${profil.membership_tier ?? "?"}) — nicht angefasst`);
      anmerkungen.push(`${tag}: hat bereits ein Abo/Lifetime bei uns. Weder Zugang noch Datum überschrieben.`);
      continue;
    }

    /* 4. Der Änderungssatz — nur, was wirklich abweicht. */
    const patch = {};
    if (profil.is_paid !== true) patch.is_paid = true;
    if ((profil.membership_tier ?? "free") !== "free") patch.membership_tier = "free";
    if (!profil.whop_umzug_am) patch.whop_umzug_am = jetzt;
    if (!profil.full_name && z.name) patch.full_name = z.name;

    if (z.ende) {
      /*
        `access_until` wird nur gesetzt, wenn es fehlt oder aus demselben
        Import stammt. Ein von Hand im Adminbereich gesetztes Datum sticht den
        CSV-Wert — sonst nähme ein zweiter Importlauf eine bewusste
        Entscheidung still wieder zurück.
      */
      const darfSetzen = !profil.access_until || Boolean(profil.whop_umzug_am);
      if (darfSetzen && profil.access_until !== z.ende) patch.access_until = z.ende;
      if (!darfSetzen) {
        anmerkungen.push(`${tag}: access_until war schon gesetzt (ohne Whop-Herkunft) — CSV-Datum ignoriert.`);
      }
    } else {
      bilanz.ohneDatum++;
      anmerkungen.push(`${tag}: kein Ablaufdatum in der CSV — access_until bleibt leer, Kampagne überspringt ihn.`);
    }

    /*
      Discord nur eintragen, wo noch nichts steht. Eine über OAuth verknüpfte
      Kennung ist die belastbarere Angabe; die CSV ist ein Export von gestern.
      Weichen beide ab, gewinnt das Profil, und die Abweichung kommt in den
      Bericht.
    */
    const verknuepft = await verknuepfteDiscordId(userId);
    const vorhanden = verknuepft ?? profil.discord_id ?? null;

    if (z.discordId) {
      if (!vorhanden) patch.discord_id = z.discordId;
      else if (vorhanden !== z.discordId) {
        anmerkungen.push(`${tag}: verknüpfte Discord-ID weicht von der CSV ab — die verknüpfte gilt.`);
      }
    }
    if (z.discordName && !profil.discord_username) patch.discord_username = z.discordName;

    const discordId = vorhanden ?? z.discordId ?? null;
    const aenderungen = Object.keys(patch);

    if (!schreiben) {
      const wort = neu ? "neu" : aenderungen.length > 0 ? "update" : "gleich";
      console.log(
        `  [${wort.padEnd(10)}] ${tag}  bis ${z.ende ? z.ende.slice(0, 10) : "—"}` +
          `${aenderungen.length > 0 ? `  → ${aenderungen.join(", ")}` : ""}` +
          `${discordId ? "  ·discord" : ""}`,
      );
      if (neu) bilanz.angelegt++;
      else if (aenderungen.length > 0) bilanz.aktualisiert++;
      else bilanz.unveraendert++;
      continue;
    }

    if (aenderungen.length > 0) {
      const { error: schreibFehler } = await supabase.from("profiles").update(patch).eq("id", userId);
      if (schreibFehler) throw new Error(`profiles nicht schreibbar: ${schreibFehler.message}`);
    }

    if (neu) bilanz.angelegt++;
    else if (aenderungen.length > 0) bilanz.aktualisiert++;
    else bilanz.unveraendert++;

    /* 5. Die Mitgliederrolle, wenn das Konto auf dem Server ist. */
    let rolle = "—";
    if (discordId && setzeMitgliedsrolle) {
      try {
        rolle = await setzeMitgliedsrolle(discordId, true);
        if (rolle === "gesetzt") bilanz.discordGesetzt++;
        if (rolle === "nicht_im_server") bilanz.discordNichtImServer++;
      } catch (err) {
        rolle = `fehler: ${err.message}`;
        anmerkungen.push(`${tag}: Discord-Rolle nicht vergeben (${err.message}).`);
      }
    }

    console.log(
      `  [${(neu ? "angelegt" : aenderungen.length > 0 ? "aktualisiert" : "unverändert").padEnd(12)}] ${tag}` +
        `  bis ${z.ende ? z.ende.slice(0, 10) : "—"}  rolle=${rolle}`,
    );
  } catch (err) {
    bilanz.fehler++;
    console.error(`  [FEHLER]     ${tag}  ${err.message}`);
    anmerkungen.push(`${tag}: ${err.message}`);
  }
}

/* ─── Bilanz ─────────────────────────────────────────────────────────────── */

console.log("\n─────────────────────────────────────────────");
console.log(`Zeilen                 ${zeilen.length}`);
console.log(`Konten neu             ${bilanz.angelegt}`);
console.log(`Konten aktualisiert    ${bilanz.aktualisiert}`);
console.log(`Konten unverändert     ${bilanz.unveraendert}`);
console.log(`Übersprungen (zahlt)   ${bilanz.uebersprungenStripe}`);
console.log(`Ohne Ablaufdatum       ${bilanz.ohneDatum}`);
if (schreiben) {
  console.log(`Discord-Rolle gesetzt  ${bilanz.discordGesetzt}`);
  console.log(`Nicht auf dem Server   ${bilanz.discordNichtImServer}`);
}
console.log(`Fehler                 ${bilanz.fehler}`);

if (anmerkungen.length > 0) {
  console.log("\nAnmerkungen:");
  for (const a of anmerkungen) console.log(`  · ${a}`);
}

if (neueIds.length > 0 && testzeile) {
  console.log("\nAngelegte Testkonten (zum Aufräumen):");
  for (const n of neueIds) {
    console.log(`  ${n.email}`);
    console.log(`  npm run whop:import -- --aufraeumen ${n.userId} --apply`);
  }
}

if (!schreiben) {
  console.log("\n→ Trockenlauf. Es wurde nichts geschrieben. Mit --apply wirklich ausführen.");
}

process.exit(bilanz.fehler > 0 ? 1 : 0);
