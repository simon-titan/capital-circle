/**
 * Verknuepft bereits in Cloudflare Stream liegende Videos mit den DB-Zeilen in
 * `public.videos` — ueber den Dateinamen. Hintergrund: die Institut-Videos wurden
 * bereits nach Cloudflare hochgeladen, bevor `videos.cloudflare_uid` existierte;
 * ein erneuter Upload (migrate-videos-to-cloudflare.mjs) waere also doppelt.
 *
 * Zusaetzlich schaltet das Skript `requireSignedURLs` fuer die verknuepften
 * Videos ein — ohne das waere jedes Kursvideo allein ueber seine UID oeffentlich
 * abrufbar. Oeffentliche Funnel-Videos werden ueber SCHUTZ_AUSNAHMEN ausgenommen.
 *
 *   node --experimental-strip-types scripts/link-cloudflare-videos.mjs
 *       Dry-Run: zeigt Treffer, Mehrdeutigkeiten und Nicht-Zuordenbare
 *   node --experimental-strip-types scripts/link-cloudflare-videos.mjs --apply
 *       schreibt cloudflare_uid/-status in die DB und aktiviert den Signatur-Zwang
 *   ... --apply --nur-verknuepfen    nur DB-Verknuepfung, kein Signatur-Zwang
 *   ... --apply --nur-signieren      nur Signatur-Zwang fuer bereits verknuepfte
 */
import { existsSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

for (const file of [".env.local", ".env"]) {
  const full = path.resolve(process.cwd(), file);
  if (existsSync(full)) dotenv.config({ path: full, override: false });
}

/**
 * Eigener Service-Client statt `@/lib/supabase/service` — der Re-Export dort
 * haengt an `lib/supabase/server.ts`, und das importiert `next/headers`, was
 * ausserhalb des Next-Runtimes nicht aufloest.
 */
function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const argv = process.argv.slice(2);
const apply = argv.includes("--apply");
const nurVerknuepfen = argv.includes("--nur-verknuepfen");
const nurSignieren = argv.includes("--nur-signieren");
/**
 * Ohne diese Flagge werden nur Treffer geschrieben, bei denen die Videodauer auf
 * die Sekunde passt. Rein namensbasierte Treffer sind plausibel, aber eine falsche
 * Verknuepfung zeigt Mitgliedern das falsche Video — deshalb nur auf Ansage.
 */
const auchUnsicher = argv.includes("--auch-unsicher");

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const API_TOKEN = process.env.CLOUDFLARE_STREAM_API_TOKEN?.trim();
if (!ACCOUNT_ID || !API_TOKEN) throw new Error("CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_STREAM_API_TOKEN fehlen");

/**
 * UIDs, die oeffentlich bleiben muessen (kein Signatur-Zwang). Aktuell das
 * Funnel-Video aus NEXT_PUBLIC_DISCORD_TERMIN_VIDEO_URL — das laeuft auf
 * oeffentlichen Landingpages ohne Login und wuerde signiert sofort brechen.
 */
const SCHUTZ_AUSNAHMEN = new Set(
  [process.env.NEXT_PUBLIC_DISCORD_TERMIN_VIDEO_URL, process.env.NEXT_PUBLIC_DISCORD_TERMIN_VIDEO_POSTER]
    .filter(Boolean)
    .map((url) => url.match(/cloudflarestream\.com\/([a-f0-9]{32})\//)?.[1])
    .filter(Boolean),
);

/**
 * Dateiname ohne Pfad, Endung und fuehrende Kapitelnummer, klein, ohne Sonderzeichen.
 * Die Cloudflare-Namen tragen ein Nummern-Praefix ("19 Big Trades verstehen.mp4"),
 * die DB-Titel nicht — ohne das Abschneiden trifft nichts aufeinander.
 */
function normalisiere(name) {
  if (!name) return "";
  const basis = name.split(/[\\/]/).pop() ?? name;
  return basis
    .replace(/\.[a-z0-9]{2,4}$/i, "")
    .replace(/^\s*\d+(?:[.,]\d+)*\s*[.)-]?\s*/, "") // "19 ", "4.2 ", "3. ", "12) "
    .toLowerCase()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Fuellwoerter, die in den Titeln beliebig mal da sind und mal nicht. */
const STOPP = new Set(["verstehen", "verstehn", "richtig", "nutzen", "das", "der", "die", "im", "und", "vs", "wirklich"]);

function tokens(s) {
  return new Set(
    s
      .split(" ")
      .filter((t) => t.length > 1 && !STOPP.has(t)),
  );
}

/** Dice-Koeffizient ueber die Token-Mengen: 1 = identisch, 0 = keine Ueberschneidung. */
function aehnlichkeit(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let gemeinsam = 0;
  for (const t of ta) if (tb.has(t)) gemeinsam++;
  return (2 * gemeinsam) / (ta.size + tb.size);
}

async function cfFetch(pfad, init) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream${pfad}`, {
    ...init,
    headers: { Authorization: `Bearer ${API_TOKEN}`, ...(init?.headers ?? {}) },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(json?.errors?.map((e) => e.message).join("; ") || `Cloudflare-Fehler (${res.status})`);
  }
  return json.result;
}

const supabase = createServiceClient();

// ── Daten holen ──────────────────────────────────────────────────────────────
const cfVideos = await cfFetch("?per_page=1000");
const { data: dbVideos, error: dbError } = await supabase
  .from("videos")
  .select("id,title,storage_key,duration_seconds")
  .order("created_at", { ascending: true });
if (dbError) throw new Error(`videos-Abfrage fehlgeschlagen: ${dbError.message}`);

console.log(`Cloudflare: ${cfVideos.length} Videos · Datenbank: ${dbVideos.length} Zeilen`);
console.log(`Modus: ${apply ? "APPLY" : "DRY-RUN"}${nurVerknuepfen ? " (nur verknuepfen)" : ""}${nurSignieren ? " (nur signieren)" : ""}`);

// ── Kandidaten bewerten ──────────────────────────────────────────────────────
const cfBereit = cfVideos.filter((v) => v.status?.state === "ready");

/**
 * Bewertet ein Paar (DB-Zeile, Cloudflare-Video):
 *   Name  — Dice ueber die Token-Mengen von storage_key-Basisnamen und Titel
 *   Dauer — exakte Uebereinstimmung ist das staerkste Signal, ±2 s zaehlt als Treffer
 * Ohne Dauer in der DB entscheidet der Name allein; dann ist die Schwelle hoeher.
 */
function bewerte(row, cf) {
  const cfName = normalisiere(cf.meta?.name);
  const nameScore = Math.max(aehnlichkeit(normalisiere(row.storage_key), cfName), aehnlichkeit(normalisiere(row.title), cfName));
  const cfDauer = Math.round(cf.duration ?? 0);
  const dauerBekannt = row.duration_seconds != null && row.duration_seconds > 0 && cfDauer > 0;
  const dauerPasst = dauerBekannt && Math.abs(cfDauer - row.duration_seconds) <= 2;
  return { nameScore, dauerBekannt, dauerPasst };
}

const MIN_NAME_MIT_DAUER = 0.5; // Dauer bestaetigt, Name muss nur plausibel sein
const MIN_NAME_OHNE_DAUER = 0.8; // Name allein — deutlich strenger

const treffer = [];
const mehrdeutig = [];
const ohneTreffer = [];

for (const row of dbVideos) {
  const bewertet = cfBereit
    .map((cf) => ({ cf, ...bewerte(row, cf) }))
    .filter((b) => (b.dauerPasst ? b.nameScore >= MIN_NAME_MIT_DAUER : b.nameScore >= MIN_NAME_OHNE_DAUER))
    // Dauer-bestaetigte Treffer zuerst, dann nach Namensaehnlichkeit
    .sort((a, b) => Number(b.dauerPasst) - Number(a.dauerPasst) || b.nameScore - a.nameScore);

  if (bewertet.length === 0) {
    ohneTreffer.push(row);
    continue;
  }
  const beste = bewertet[0];
  const zweite = bewertet[1];
  // Eindeutig, wenn der beste Treffer klar vor dem zweiten liegt oder als einziger
  // von der Dauer bestaetigt wird.
  const klar =
    !zweite ||
    (beste.dauerPasst && !zweite.dauerPasst) ||
    beste.nameScore - zweite.nameScore >= 0.15;

  if (klar) treffer.push({ row, cf: beste.cf, score: beste.nameScore, dauerPasst: beste.dauerPasst });
  else mehrdeutig.push({ row, kandidaten: bewertet.slice(0, 4) });
}

// Mehrfachbelegung derselben UID ausschliessen (sonst verletzt der UNIQUE-Index).
const uidZaehler = new Map();
for (const t of treffer) uidZaehler.set(t.cf.uid, (uidZaehler.get(t.cf.uid) ?? 0) + 1);
const doppelt = treffer.filter((t) => uidZaehler.get(t.cf.uid) > 1);
const eindeutig = treffer.filter((t) => uidZaehler.get(t.cf.uid) === 1);

console.log(`\n── Abgleich ──`);
console.log(`  eindeutig zugeordnet: ${eindeutig.length}  (davon ${eindeutig.filter((t) => t.dauerPasst).length} per Dauer bestaetigt)`);
console.log(`  UID mehrfach belegt:  ${doppelt.length}`);
console.log(`  mehrdeutig:           ${mehrdeutig.length}`);
console.log(`  ohne Treffer:         ${ohneTreffer.length}`);

if (doppelt.length > 0) {
  console.log(`\n── Dieselbe Cloudflare-UID fuer mehrere DB-Zeilen (nicht geschrieben) ──`);
  for (const d of doppelt) {
    console.log(`  ${d.cf.uid.slice(0, 8)} "${d.cf.meta?.name}" ← "${d.row.title}"`);
  }
}

const verwaisteCf = cfVideos.filter(
  (v) => v.status?.state === "ready" && !eindeutig.some((t) => t.cf.uid === v.uid),
);
console.log(`  Cloudflare-Videos ohne DB-Zeile: ${verwaisteCf.length}`);

if (mehrdeutig.length > 0) {
  console.log(`\n── Mehrdeutig (bitte pruefen) ──`);
  for (const m of mehrdeutig.slice(0, 20)) {
    console.log(`  "${m.row.title}" (${m.row.duration_seconds ?? "?"}s)`);
    for (const k of m.kandidaten) {
      console.log(`      ${k.cf.uid.slice(0, 8)}  ${String(Math.round(k.cf.duration ?? 0)).padStart(5)}s  ${k.nameScore.toFixed(2)}${k.dauerPasst ? " ✓Dauer" : ""}  ${k.cf.meta?.name}`);
    }
  }
  if (mehrdeutig.length > 20) console.log(`  … und ${mehrdeutig.length - 20} weitere`);
}

if (ohneTreffer.length > 0) {
  console.log(`\n── Ohne Cloudflare-Treffer (bleiben auf Hetzner) ──`);
  for (const r of ohneTreffer.slice(0, 25)) {
    console.log(`  "${r.title}"  ←  ${(r.storage_key ?? "").split(/[\\/]/).pop()}`);
  }
  if (ohneTreffer.length > 25) console.log(`  … und ${ohneTreffer.length - 25} weitere`);
}

if (verwaisteCf.length > 0) {
  console.log(`\n── Cloudflare-Videos ohne DB-Zeile ──`);
  for (const v of verwaisteCf.slice(0, 25)) {
    console.log(`  ${v.uid.slice(0, 8)}  ${Math.round((v.duration ?? 0) / 60)}min  ${(v.meta?.name ?? "(ohne Name)").slice(0, 60)}`);
  }
  if (verwaisteCf.length > 25) console.log(`  … und ${verwaisteCf.length - 25} weitere`);
}

// ── Prüfbericht ──────────────────────────────────────────────────────────────
// Semikolon-getrennt und mit BOM, damit Excel die Datei ohne Import-Dialog
// richtig öffnet (deutsche Gebietsschema-Voreinstellung).
{
  const { writeFileSync } = await import("node:fs");
  const zeilen = [["status", "db_titel", "db_dauer_s", "cf_uid", "cf_name", "cf_dauer_s", "namens_score"]];

  for (const t of eindeutig) {
    zeilen.push([
      t.dauerPasst ? "sicher (Dauer bestaetigt)" : "unsicher (nur Name)",
      t.row.title,
      t.row.duration_seconds ?? "",
      t.cf.uid,
      t.cf.meta?.name ?? "",
      Math.round(t.cf.duration ?? 0),
      t.score.toFixed(2),
    ]);
  }
  for (const m of mehrdeutig) {
    for (const k of m.kandidaten) {
      zeilen.push([
        "mehrdeutig",
        m.row.title,
        m.row.duration_seconds ?? "",
        k.cf.uid,
        k.cf.meta?.name ?? "",
        Math.round(k.cf.duration ?? 0),
        k.nameScore.toFixed(2),
      ]);
    }
  }
  for (const r of ohneTreffer) {
    zeilen.push(["ohne Treffer", r.title, r.duration_seconds ?? "", "", "", "", ""]);
  }
  for (const v of verwaisteCf) {
    zeilen.push(["nur in Cloudflare", "", "", v.uid, v.meta?.name ?? "", Math.round(v.duration ?? 0), ""]);
  }

  const csv =
    "﻿" +
    zeilen.map((z) => z.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const pfad = path.resolve(process.cwd(), "exports/cloudflare-video-abgleich.csv");
  writeFileSync(pfad, csv, "utf8");
  console.log(`\nPrüfbericht: ${path.relative(process.cwd(), pfad)} (${zeilen.length - 1} Zeilen)`);
}

if (!apply) {
  console.log(`\nDry-Run — nichts geschrieben. Mit --apply erneut aufrufen.`);
  process.exit(0);
}

// ── DB verknuepfen ───────────────────────────────────────────────────────────
if (!nurSignieren) {
  const zuSchreiben = auchUnsicher ? eindeutig : eindeutig.filter((t) => t.dauerPasst);
  console.log(`\n── DB-Verknuepfung ──`);
  console.log(
    auchUnsicher
      ? `  ${zuSchreiben.length} Treffer (inkl. rein namensbasierter)`
      : `  ${zuSchreiben.length} per Dauer bestaetigte Treffer — ${eindeutig.length - zuSchreiben.length} nur namensbasierte uebersprungen (mit --auch-unsicher einschliessen)`,
  );
  let ok = 0;
  for (const t of zuSchreiben) {
    const dauer = Math.round(t.cf.duration ?? 0);
    const { error } = await supabase
      .from("videos")
      .update({
        cloudflare_uid: t.cf.uid,
        cloudflare_status: "ready",
        cloudflare_error: null,
        cloudflare_ready_at: t.cf.readyToStreamAt ?? new Date().toISOString(),
        // Fehlende Dauer aus Cloudflare nachtragen (54 Zeilen hatten keine).
        ...(t.row.duration_seconds == null && dauer > 0 ? { duration_seconds: dauer } : {}),
      })
      .eq("id", t.row.id);
    if (error) console.log(`  FEHLER "${t.row.title}": ${error.message}`);
    else ok++;
  }
  console.log(`  ${ok}/${zuSchreiben.length} Zeilen verknuepft`);
}

// ── Signatur-Zwang aktivieren ────────────────────────────────────────────────
if (!nurVerknuepfen) {
  console.log(`\n── Signatur-Zwang ──`);
  const { data: verknuepft, error } = await supabase
    .from("videos")
    .select("id,title,cloudflare_uid")
    .not("cloudflare_uid", "is", null);
  if (error) throw new Error(error.message);

  let ok = 0;
  let uebersprungen = 0;
  for (const row of verknuepft ?? []) {
    if (SCHUTZ_AUSNAHMEN.has(row.cloudflare_uid)) {
      uebersprungen++;
      continue;
    }
    try {
      await cfFetch(`/${row.cloudflare_uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requireSignedURLs: true }),
      });
      ok++;
    } catch (e) {
      console.log(`  FEHLER ${row.cloudflare_uid.slice(0, 8)} "${row.title}": ${e.message}`);
    }
  }
  console.log(`  ${ok} Videos signaturpflichtig, ${uebersprungen} als oeffentlich ausgenommen`);
}

console.log(`\nFertig.`);
